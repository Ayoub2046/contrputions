export const VAPID_PUBLIC_KEY =
  'BIQ74Oz-r2eA4OauixHmwq8IWIGoEynmNUQ65D4cebpBe0p_JKdPkAk6oMjwxnHC1XdG4Z8zk1UzhmznPf8mCvk'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function getActiveServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  // 1. Check existing active registrations first
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const r of registrations) {
      if (r.active) return r
    }
    if (registrations.length > 0) return registrations[0]
  } catch {}

  // 2. Try registering /sw.js with activation wait
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    if (reg.active) return reg
    if (reg.installing || reg.waiting) {
      await new Promise<void>((resolve) => {
        const worker = reg.installing || reg.waiting
        if (worker) {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve()
          })
        }
        setTimeout(resolve, 1500)
      })
      return reg
    }
    return reg
  } catch (err) {
    console.warn('[WebPush] /sw.js registration attempt failed, trying /custom-sw.js fallback:', err)
    try {
      return await navigator.serviceWorker.register('/custom-sw.js', { scope: '/' })
    } catch (fallbackErr) {
      console.warn('[WebPush] Fallback registration failed:', fallbackErr)
    }
  }

  // 3. Race against navigator.serviceWorker.ready with a 3.5s timeout so client never hangs
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
    ])
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
    !('PushManager' in window)
  ) {
    return null
  }

  // Only attempt if permission is granted
  if (Notification.permission !== 'granted') {
    return null
  }

  try {
    const reg = await getActiveServiceWorker()
    if (!reg || !reg.pushManager) {
      console.warn('[WebPush] No active PushManager found')
      return null
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
      } catch (err) {
        console.warn('[WebPush] Subscription error, attempting clean resubscribe:', err)
        // If an old subscription existed with a different key, unsubscribe first
        try {
          const oldSub = await reg.pushManager.getSubscription()
          if (oldSub) await oldSub.unsubscribe()
        } catch {}
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
      }
    }

    if (sub) {
      const subJson = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJson,
          userId: userId || null,
          classId: classId || null,
        }),
      })
      console.log('[WebPush Success]: Mobile device registered for background push notifications')
      return sub
    }
  } catch (err) {
    console.warn('[WebPush Subscribe Notice]:', err)
  }
  return null
}
