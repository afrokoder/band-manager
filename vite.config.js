import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function messagingConfigSource(mode, root) {
  const env = loadEnv(mode, root, 'VITE_FIREBASE_')
  const value = key => process.env[key] || env[key] || ''
  const config = {
    apiKey: value('VITE_FIREBASE_API_KEY'),
    authDomain: value('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: value('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: value('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: value('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: value('VITE_FIREBASE_APP_ID'),
  }
  return `self.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};\n`
}

// The service worker has to be able to initialize Firebase even when the app is
// fully closed. Emit the public Firebase web config as its own static asset at
// build time instead of relying on a page message that disappears when iOS or
// Android terminates the web app.
function firebaseMessagingConfig() {
  let resolved
  return {
    name: 'firebase-messaging-config',
    configResolved(config) { resolved = config },
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-config.js', (_req, res) => {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.end(messagingConfigSource(resolved.mode, resolved.root))
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-messaging-config.js',
        source: messagingConfigSource(resolved.mode, resolved.root),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), firebaseMessagingConfig()],
  server: { port: 5173 },
})
