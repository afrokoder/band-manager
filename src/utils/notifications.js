import { getMessagingInstance } from '../firebase'
import { getToken } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
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
    // iOS/iPadOS Web Push is available to installed Home Screen web apps.
    needsHomeScreen: isIos() && !isStandalone(),
  }
}

async function registerMessagingWorker() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  await navigator.serviceWorker.ready
  return reg
}

// Registers/refreshes the FCM token without asking for permission. Safe to call
// after login so a device that already granted notifications stays registered.
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
    if (token && userId) await updateDoc(doc(db, 'users', userId), { fcmToken: token })
    return !!token
  } catch (e) {
    console.warn('FCM token error:', e)
    return false
  }
}

// Must be called from a user gesture on iOS/Safari. The notification bell's
// "Enable phone notifications" button is the intended entry point.
export async function requestNotifPermission(userId) {
  const capability = notificationCapability()
  if (!capability.supported || capability.needsHomeScreen) return false

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') return false

  return syncNotifRegistration(userId)
}

// Listen for foreground FCM messages. While the app is open we still surface a
// real OS notification so the same alert can appear on an unlocked phone, and
// also pass the message body to the existing in-app banner callback.
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
          data: { link: payload.data?.link || '/', tab: payload.data?.tab || '' },
        })
      } catch (e) {
        console.warn('Could not display foreground phone notification:', e)
      }
    }

    callback?.(body)
  })
}
