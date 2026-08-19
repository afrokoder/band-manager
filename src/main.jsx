import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import config from './config'

// Apply org accent colour as CSS custom properties so the whole app re-themes
// when config.accentColor changes — no CSS edits needed for a new deployment.
const root = document.documentElement
root.style.setProperty('--accent',      config.accentColor)
root.style.setProperty('--accent-dark', config.accentColorDark)

// Keep the app shell aligned with the real iOS viewport. CSS viewport units can
// lag behind Safari/PWA chrome changes, while VisualViewport tracks the area
// that is actually visible (including when the keyboard is open).
const syncViewportSize = () => {
  const appHeight = window.innerHeight
  const visualHeight = window.visualViewport?.height || appHeight
  root.style.setProperty('--app-height', `${appHeight}px`)
  root.style.setProperty('--visual-height', `${visualHeight}px`)
}

syncViewportSize()
window.addEventListener('resize', syncViewportSize)
window.addEventListener('orientationchange', syncViewportSize)
window.visualViewport?.addEventListener('resize', syncViewportSize)
window.visualViewport?.addEventListener('scroll', syncViewportSize)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
