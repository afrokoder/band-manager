import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const ROLES = {
  band:   ['Guitar Lead','Guitar Rhythm','Keys','Bass','Drums','Brass','Strings','Other Instrument'],
  vocals: ['Lead Vocal','Vocal 2','Vocal 3','Backing Vocal','Choir'],
}

export default function ProfileSetup() {
  const { saveProfile, logout } = useAuth()
  const [name, setName]   = useState('')
  const [group, setGroup] = useState('band')
  const [role, setRole]   = useState(ROLES.band[0])
  const [busy, setBusy]   = useState(false)

  const handleGroup = (g) => { setGroup(g); setRole(ROLES[g][0]) }

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    await saveProfile({ name, role, group })
    setBusy(false)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title" style={{ fontSize: 24 }}>Set up your profile</h1>
        <p className="login-subtitle">Tell the band who you are</p>

        <div className="form-row">
          <label className="form-label">Your Name</label>
          <input className="form-input" placeholder="e.g. Chiamaka" value={name}
            onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-row">
          <label className="form-label">Group</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['band','vocals'].map(g => (
              <button key={g} onClick={() => handleGroup(g)}
                className={`chip ${group === g ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer' }}>
                {g === 'band' ? '🎸 Band' : '🎤 Vocals'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Role</label>
          <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
            {ROLES[group].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <button className="btn-primary" disabled={busy || !name.trim()} onClick={submit}>
          {busy ? 'Saving…' : 'Join the Band →'}
        </button>

        <p className="login-toggle" style={{ marginTop: 16 }}>
          Wrong account? <button onClick={logout}>Sign out</button>
        </p>
      </div>
    </div>
  )
}
