import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// App Check attaches an attestation token to Storage/Firestore requests so the
// backend can reject calls that don't originate from this app (raw SDK/REST
// abuse). It only activates when a reCAPTCHA v3 site key is configured, so the
// app still runs before the App Check console setup is complete.
//
// Local dev: set VITE_FIREBASE_APPCHECK_DEBUG=true, run once, and copy the
// debug token printed in the console into Firebase Console → App Check →
// Manage debug tokens.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
if (appCheckSiteKey) {
  if (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === 'true') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const db       = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Storage powers song/set-list file attachments and voice memos.
// The app still loads if Storage is unavailable; uploads will surface an error to the user.
export const storage  = firebaseConfig.storageBucket ? getStorage(app) : null

// Messaging is only available in secure contexts (HTTPS / localhost)
export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}

export { firebaseConfig }
