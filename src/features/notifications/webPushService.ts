import { supabase } from '../../lib/supabase'

export const VAPID_PUBLIC_KEY =
  'BIQ74Oz-r2eA4OauixHmwq8IWIGoEynmNUQ65D4cebpBe0p_JKdPkAk6oMjwxnHC1XdG4Z8zk1UzhmznPf8mCvk'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function keysMatch(existingKeyBuffer: ArrayBuffer | null | undefined, expectedKey: Uint8Array): boolean {
  if (!existingKeyBuffer) return false
  const existing = new Uint8Array(existingKeyBuffer)
  if (existing.length !== expectedKey.length) return false
  for (let i = 0; i < existing.length; i++) {
    if (existing[i] !== expectedKey[i]) return false
  }
  return true
}

function waitForActivation(reg: ServiceWorkerRegistration, timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  if (reg.active) return Promise.resolve(reg)
  return new Promise((resolve) => {
    const worker = reg.installing || reg.waiting
    const timer = setTimeout(() => resolve(reg), timeoutMs)
    if (!worker) {
      navigator.serviceWorker.ready.then((readyReg) => {
        clearTimeout(timer)
        resolve(readyReg)
      }).catch(() => resolve(reg))
      return
    }
    const onStateChange = () => {
      if (worker.state === 'activated' || reg.active) {
        worker.removeEventListener('statechange', onStateChange)
        clearTimeout(timer)
        resolve(reg)
      }
    }
    worker.addEventListener('statechange', onStateChange)
  })
}

export async function getActiveServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  // 1. Check existing registrations and ensure one is activated
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const activeReg = registrations.find((r) => r.active)
    if (activeReg) return activeReg
    if (registrations.length > 0) {
      const waited = await waitForActivation(registrations[0], 6000)
      if (waited.active) return waited
    }
  } catch {}

  // 2. Register /sw.js (or fallback /custom-sw.js) and wait for activation
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    const activated = await waitForActivation(reg, 8000)
    if (activated.active) return activated
  } catch (err) {
    console.warn('[WebPush] /sw.js registration attempt failed, trying /custom-sw.js fallback:', err)
    try {
      const fallbackReg = await navigator.serviceWorker.register('/custom-sw.js', { scope: '/' })
      const activated = await waitForActivation(fallbackReg, 6000)
      if (activated.active) return activated
    } catch (fallbackErr) {
      console.warn('[WebPush] Fallback registration failed:', fallbackErr)
    }
  }

  // 3. Final fallback: race navigator.serviceWorker.ready
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ])
  } catch {
    return null
  }
}

export async function getCurrentPushEndpoint(): Promise<string | null> {
  try {
    const reg = await getActiveServiceWorker()
    const sub = await reg?.pushManager?.getSubscription()
    return sub?.endpoint || null
  } catch {
    return null
  }
}

export async function subscribeToWebPush(
  userId?: string | null,
  classId?: string | null
): Promise<PushSubscription | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return null
  }

  if (Notification.permission !== 'granted') {
    return null
  }

  try {
    const reg = await getActiveServiceWorker()
    if (!reg || !reg.active || !reg.pushManager) {
      console.warn('[WebPush] Active ServiceWorker PushManager not ready yet')
      return null
    }

    const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    let sub = await reg.pushManager.getSubscription()

    // Self-heal if an existing subscription was created with a different/stale VAPID key (e.g. legacy Firebase key)
    if (sub && !keysMatch(sub.options?.applicationServerKey, expectedKey)) {
      console.info('[WebPush] Replacing stale subscription with updated VAPID key')
      try {
        await sub.unsubscribe()
      } catch {}
      sub = null
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKey.buffer as ArrayBuffer,
      })
    }

    if (sub) {
      const subJson = sub.toJSON()
      const endpoint = subJson.endpoint
      const p256dh = subJson.keys?.p256dh
      const auth = subJson.keys?.auth

      if (!endpoint || !p256dh || !auth) return null

      // Grab auth token if logged in so both API & Supabase RLS work seamlessly
      let accessToken: string | null = null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        accessToken = sessionData.session?.access_token || null
      } catch {}

      let persisted = false

      // 1. Direct authenticated upsert into Supabase push_subscriptions (guaranteed persistence)
      if (accessToken) {
        try {
          const { error: dbErr } = await supabase.from('push_subscriptions').upsert(
            {
              endpoint,
              p256dh,
              auth,
              user_id: userId || null,
              class_id: classId || null,
              user_agent: navigator.userAgent,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: 'endpoint' }
          )
          if (!dbErr) {
            persisted = true
            // Delete stale subscriptions for the same user so only the freshest endpoint is kept.
            // Multiple endpoints per user causes Android to receive 3 pushes at once → they collapse.
            if (userId) {
              try {
                await supabase
                  .from('push_subscriptions' as never)
                  .delete()
                  .eq('user_id', userId)
                  .neq('endpoint', endpoint)
              } catch {
                // Non-critical — stale cleanup is best-effort
              }
            }
          } else {
            console.warn('[WebPush Supabase Upsert Notice]:', dbErr.message)
          }
        } catch {}
      }

      // 2. Also register with serverless API (/api/push?action=subscribe works directly on Vercel & local dev)
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`

        const resp = await fetch('/api/push?action=subscribe', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'subscribe',
            subscription: subJson,
            userId: userId || null,
            classId: classId || null,
          }),
        })
        const contentType = resp.headers.get('content-type') || ''
        if (resp.ok && contentType.includes('application/json')) {
          const resJson = await resp.json()
          if (resJson?.ok && resJson?.dbSaved) persisted = true
        }
      } catch (apiErr) {
        console.warn('[WebPush API Subscribe Notice]:', apiErr)
      }

      if (persisted) {
        console.log('[WebPush Success]: Device registered in database for background push alerts')
      }
      return sub
    }
  } catch (err) {
    console.warn('[WebPush Subscribe Notice]:', err)
  }
  return null
}
