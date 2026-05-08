import { getMessagingInstance, firebaseConfig } from '../firebase'
import { getToken } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export async function requestNotifPermission(userId) {
  if (!('Notification' in window)) return

  const messaging = await getMessagingInstance()
  if (!messaging) return

  // Register the service worker and pass Firebase config to it
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  reg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) return

  try {
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
    if (token && userId) {
      await updateDoc(doc(db, 'users', userId), { fcmToken: token })
    }
  } catch (e) {
    console.warn('FCM token error:', e)
  }
}

// Listen for foreground messages (in-app banner)
export async function onForegroundMessage(callback) {
  const { onMessage } = await import('firebase/messaging')
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    callback(payload.notification?.body || payload.data?.text || 'New message')
  })
}
