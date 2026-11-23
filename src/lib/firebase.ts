import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: "AIzaSyCl15fU_i_oe4cln4_P8JYDyMmfAw9sUGk",
  authDomain: "gen-lang-client-0499661664.firebaseapp.com",
  projectId: "gen-lang-client-0499661664",
  storageBucket: "gen-lang-client-0499661664.firebasestorage.app",
  messagingSenderId: "582138858269",
  appId: "1:582138858269:web:8bce82576766298b2a6ff4"
}

export const VAPID_KEY = "BGHsIc47m1pdbbMhLXZs6iwdkTk129rJX55xrwYMoIFjUKAFl5ns8Z1OBAs7_pBsLGVhtKYvTINMSk12SjB-Wyc"

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

let messagingInstance: Messaging | null = null

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  try {
    const supported = await isSupported()
    if (!supported) return null
    if (!messagingInstance) {
      messagingInstance = getMessaging(firebaseApp)
    }
    return messagingInstance
  } catch (err) {
    console.warn('Firebase Messaging not supported in this environment:', err)
    return null
  }
}
