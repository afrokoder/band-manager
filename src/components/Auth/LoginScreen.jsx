import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import config from '../../config'

export default function LoginScreen() {
  const { loginEmail, registerEmail, loginGoogle } = useAuth()
  const [mode,       setMode]       = useState('login')   // 'login' | 'register'
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error,      setError]      = useState('')
  const [busy,       setBusy]       = useState(false)

  const friendlyError = (code) => ({
    'auth/invalid-email':         'Invalid email address.',
    'auth/user-not-found':        'No account found with that email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/email-already-in-use':  'That email is already registered.',
    'auth/weak-password':         'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
    'auth/popup-closed-by-user':  'Sign-in cancelled.',
    'auth/popup-blocked':         'Popup was blocked by your browser. Please use email/password to sign in, or allow popups for this site.',
    'auth/cancelled-popup-request': 'Sign-in cancelled.',
  }[code] ?? `Something went wrong (${code ?? 'unknown'}). Please try again.`)

  const handle = async (fn) => {
    setError('')
    setBusy(true)
    try { await fn() }
    catch (e) { console.error('Auth error:', e.code, e.message); setError(friendlyError(e.code)) }
    finally { setBusy(false) }
  }

  const handleRegister = () => {
    // Validate access code before touching Firebase Auth
    if (accessCode.trim().toUpperCase() !== config.accessCode.toUpperCase()) {
      setError('Incorrect access code. Please check with your team admin.')
      return
    }
    handle(() => registerEmail(email, password))
  }

  const handleLogin = () => handle(() => loginEmail(email, password))

  // Google sign-in: if registering, still require access code
  const handleGoogle = () => {
    if (mode === 'register' &&
        accessCode.trim().toUpperCase() !== config.accessCode.toUpperCase()) {
      setError('Incorrect access code. Please check with your team admin.')
      return
    }
    handle(loginGoogle)
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
    setAccessCode('')
  }

  return (
    <div className="login-screen">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill={config.accentColor}/>
            <path d="M14 32V18l10-4 10 4v14M14 22h20M24 14v4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="19" cy="34" r="3" stroke="#fff" strokeWidth="2"/>
            <circle cx="29" cy="32" r="3" stroke="#fff" strokeWidth="2"/>
          </svg>
        </div>

        <h1 className="login-title" style={{ fontSize: 26, marginBottom: 4 }}>{config.orgName}</h1>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', margin: '0 0 14px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', width: '100%' }}>
          Band Manager
        </p>
        <p className="login-subtitle" style={{ marginTop: 0 }}>
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>

        {error && <div className="login-error">{error}</div>}

        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
          />
        </div>

        <div className="form-row">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
          />
        </div>

        {/* Access code — only shown when registering */}
        {mode === 'register' && (
          <div className="form-row">
            <label className="form-label">
              Access Code
              <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 6 }}>
                — ask your team admin
              </span>
            </label>
            <input className="form-input" type="text"
              placeholder="Enter access code"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              autoComplete="off"
              style={{ letterSpacing: '1px', textTransform: 'uppercase' }}
            />
          </div>
        )}

        <button className="btn-primary" disabled={busy}
          onClick={mode === 'login' ? handleLogin : handleRegister}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div className="login-divider"><span>or</span></div>

        <button className="btn-google" disabled={busy} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {mode === 'register' ? 'Sign up with Google' : 'Continue with Google'}
        </button>

        <p className="login-toggle">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

      </div>
    </div>
  )
}
