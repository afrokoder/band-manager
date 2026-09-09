import { getMessagingInstance } from '../firebase'
import { deleteToken, getToken } from 'firebase/messaging'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

export function notificationCapability() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported', needsHomeScreen: isIos() && !isStandalone() }
  }
  return {
    supported: true,
    permission: Notification.permission,
    needsHomeScreen: isIos() && !isStandalone(),
  }
}

async function registerMessagingWorker() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  return reg
}

async function tokenDocumentId(token) {
  try {
    const bytes = new TextEncoder().encode(token)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 40)
  } catch {
    return token.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
  }
}

async function saveDeviceToken(userId, token) {
  if (!userId || !token) return
  const tokenId = await tokenDocumentId(token)
  const platform = isIos() ? 'ios-pwa' : /android/i.test(navigator.userAgent) ? 'android-web' : 'web'

  await setDoc(doc(db, 'users', userId, 'pushTokens', tokenId), {
    token,
    platform,
    standalone: isStandalone(),
    userAgent: String(navigator.userAgent || '').slice(0, 400),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  // Keep the legacy field during the migration so already-deployed Functions
  // continue to work until the new multi-device Functions are deployed.
  await updateDoc(doc(db, 'users', userId), { fcmToken: token }).catch(() => {})
}

// Refresh an existing push registration without opening the browser permission
// prompt. Each installation gets its own Firestore token document, so opening
// Band Manager on a laptop no longer replaces the installed phone's token.
export async function syncNotifRegistration(userId) {
  const capability = notificationCapability()
  if (!capability.supported || capability.needsHomeScreen || capability.permission !== 'granted') return false

  const messaging = await getMessagingInstance()
  if (!messaging) return false
  const reg = await registerMessagingWorker()
  if (!reg) return false

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not configured; phone push notifications are disabled.')
    return false
  }

  try {
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
    if (token && userId) await saveDeviceToken(userId, token)
    return !!token
  } catch (e) {
    console.warn('FCM token error:', e)
    return false
  }
}

// Must be called from a user gesture on iOS/Safari. iOS Web Push requires an
// installed Home Screen web app (iOS/iPadOS 16.4+) and explicit permission.
export async function requestNotifPermission(userId) {
  const capability = notificationCapability()
  if (!capability.supported || capability.needsHomeScreen) return false

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') return false

  return syncNotifRegistration(userId)
}

export async function disableNotifOnThisDevice() {
  const messaging = await getMessagingInstance()
  if (!messaging) return false
  try {
    return await deleteToken(messaging)
  } catch (e) {
    console.warn('Could not remove this device notification token:', e)
    return false
  }
}

// Foreground messages also use the service-worker registration to surface a
// system notification. The Cloud Functions payload uses a stable tag, so the
// operating system can replace duplicate alerts rather than stacking them.
export async function onForegroundMessage(callback) {
  const { onMessage } = await import('firebase/messaging')
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}

  return onMessage(messaging, async payload => {
    const title = payload.data?.title || payload.notification?.title || 'Band Manager'
    const body = payload.data?.body || payload.notification?.body || payload.data?.text || 'New update'

    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: payload.data?.tag || undefined,
          renotify: false,
          data: {
            link: payload.data?.link || '/',
            tab: payload.data?.tab || '',
            serviceId: payload.data?.serviceId || '',
            setlistId: payload.data?.setlistId || '',
          },
        })
      } catch (e) {
        console.warn('Could not display foreground phone notification:', e)
      }
    }

    callback?.(body)
  })
}
