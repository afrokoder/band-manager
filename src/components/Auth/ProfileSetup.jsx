import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../ui/Avatar'
import config from '../../config'

const ROLES = config.roles

export default function ProfileSetup() {
  const { saveProfile, logout, user } = useAuth()
  const [name,     setName]     = useState(user?.displayName || '')
  const [groups,   setGroups]   = useState([])
  const [roles,    setRoles]    = useState([])
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '')
  const [urlInput, setUrlInput] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')

  // Google users already have a photo — show it automatically
  const googlePhoto = user?.photoURL || null
  const isGoogleUser = !!googlePhoto

  const toggleGroup = (g) => {
    setGroups(prev => {
      const next = prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
      const allowed = next.flatMap(grp => ROLES[grp])
      setRoles(r => r.filter(x => allowed.includes(x)))
      return next
    })
  }

  const toggleRole = (r) => {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  const applyUrl = () => {
    const trimmed = urlInput.trim()
    if (trimmed) setPhotoURL(trimmed)
  }

  const availableRoles = [...new Set(groups.flatMap(g => ROLES[g]))]
  const canSubmit = name.trim() && groups.length > 0 && roles.length > 0
  const displayInitial = name.trim()[0]?.toUpperCase() || '?'

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await saveProfile({ name, roles, groups, photoURL: photoURL || null })
    } catch (e) {
      console.error('Profile save failed:', e)
      setError('Failed to save profile. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title" style={{ fontSize: 24 }}>Set up your profile</h1>
        <p className="login-subtitle">Tell the band who you are</p>

        {/* Avatar preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, gap: 10 }}>
          <Avatar photoURL={photoURL} initial={displayInitial} color={config.accentColor} size="lg"
            style={{ width: 72, height: 72, fontSize: 28 }} />

          {isGoogleUser ? (
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>Using your Google photo</p>
          ) : (
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <input className="form-input" placeholder="Paste a photo URL (optional)"
                value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onBlur={applyUrl}
                style={{ flex: 1, fontSize: 12 }} />
              <button onClick={applyUrl}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', color: 'var(--text1)' }}>
                Preview
              </button>
            </div>
          )}
        </div>

        <div className="form-row">
          <label className="form-label">Your Name</label>
          <input className="form-input" placeholder="e.g. Chiamaka" value={name}
            onChange={e => setName(e.target.value)} />
        </div>

        {/* Group — multi-select toggle chips */}
        <div className="form-row">
          <label className="form-label">Group <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(select all that apply)</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(config.groups)
              .filter(([g]) => g !== 'admin')   // admin is Firestore-only, not self-selectable
              .map(([g, label]) => (
                <button key={g} onClick={() => toggleGroup(g)}
                  className={`chip ${groups.includes(g) ? 'active' : ''}`}
                  style={{ flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer' }}>
                  {label}
                </button>
            ))}
          </div>
        </div>

        {/* Roles — shown only when at least one group is selected */}
        {availableRoles.length > 0 && (
          <div className="form-row">
            <label className="form-label">Role / Instrument <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(select all that apply)</span></label>
            <div className="chips" style={{ flexWrap: 'wrap', paddingBottom: 0 }}>
              {availableRoles.map(r => (
                <div key={r} className={`chip ${roles.includes(r) ? 'active' : ''}`}
                  onClick={() => toggleRole(r)} style={{ cursor: 'pointer' }}>
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Select at least one group to see available roles.
          </p>
        )}

        {error && (
          <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>
        )}
        <button className="btn-primary" disabled={busy || !canSubmit} onClick={submit}>
          {busy ? 'Saving…' : 'Join the Band →'}
        </button>

        <p className="login-toggle" style={{ marginTop: 16 }}>
          Wrong account? <button onClick={logout}>Sign out</button>
        </p>
      </div>
    </div>
  )
}
