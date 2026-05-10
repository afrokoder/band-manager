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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
