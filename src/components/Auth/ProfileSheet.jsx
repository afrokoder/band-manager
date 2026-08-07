import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import BottomSheet from '../ui/BottomSheet'
import Avatar from '../ui/Avatar'
import config from '../../config'

const GROUP_LABEL = config.groups

const toArray = (plural, singular) => (
  Array.isArray(plural) ? plural : (singular ? [singular] : [])
)

export default function ProfileSheet({ onClose }) {
  const { profile, user, logout, isAdmin, updateProfile } = useAuth()
  const originalGroups = useMemo(
    () => toArray(profile?.groups, profile?.group),
    [profile]
  )
  const originalRoles = useMemo(
    () => toArray(profile?.roles, profile?.role),
    [profile]
  )

  const [editing, setEditing] = useState(false)
  const [groups, setGroups] = useState(originalGroups.filter(group => group !== 'admin'))
  const [roles, setRoles] = useState(originalRoles)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!profile) return null

  const displayedGroups = originalGroups
  const displayedRoles = originalRoles
  const availableRoles = [...new Set(groups.flatMap(group => config.roles[group] || []))]
  const canSave = groups.length > 0 && roles.length > 0 && !busy

  const resetForm = () => {
    setGroups(originalGroups.filter(group => group !== 'admin'))
    setRoles(originalRoles)
    setError('')
  }

  const startEditing = () => {
    resetForm()
    setEditing(true)
  }

  const cancelEditing = () => {
    resetForm()
    setEditing(false)
  }

  const toggleGroup = (group) => {
    setGroups(current => {
      const next = current.includes(group)
        ? current.filter(item => item !== group)
        : [...current, group]
      const allowedRoles = new Set(next.flatMap(item => config.roles[item] || []))
      setRoles(currentRoles => currentRoles.filter(role => allowedRoles.has(role)))
      return next
    })
  }

  const toggleRole = (role) => {
    setRoles(current => current.includes(role)
      ? current.filter(item => item !== role)
      : [...current, role]
    )
  }

  const saveChanges = async () => {
    if (!canSave) return
    setBusy(true)
    setError('')
    try {
      await updateProfile({ groups, roles })
      setEditing(false)
    } catch (err) {
      console.error('Profile update failed:', err)
      setError('We could not update your profile. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    onClose()
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? 'Edit profile' : 'Profile'}
      subtitle={editing ? 'Update your teams and serving roles' : undefined}
      action={!editing ? { label: 'Edit', onPress: startEditing } : undefined}
    >
      {!editing ? (
        <>
          <div className="profile-header">
            <Avatar photoURL={profile.photoURL} initial={profile.initial} color={profile.color}
              size="lg" style={{ width: 72, height: 72, fontSize: 28 }} />
            <div className="profile-name">{profile.name}</div>
            <div className="profile-role">{displayedRoles.join(', ')}</div>
            {isAdmin && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff', background: 'var(--accent)', borderRadius: 20, padding: '3px 10px', marginTop: 2 }}>
                ⚙️ Admin
              </span>
            )}
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{user?.email}</div>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--text2)' }}>Member since</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {profile.createdAt?.toDate
                  ? profile.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : 'Recently joined'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ fontSize: 14, color: 'var(--text2)', paddingTop: 3 }}>Groups</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {displayedGroups.map(group => (
                  <span key={group} className={`group-pill ${group}`}>{GROUP_LABEL[group] || group}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--text2)', paddingTop: 3 }}>Roles</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '70%' }}>
                {displayedRoles.map(role => (
                  <span key={role} style={{ fontSize: 12, background: 'var(--surface)', borderRadius: 20, padding: '3px 10px', color: 'var(--text1)', fontWeight: 500 }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button className="btn-danger" onClick={handleLogout}>Sign Out</button>
        </>
      ) : (
        <>
          <div className="profile-edit-summary">
            <Avatar photoURL={profile.photoURL} initial={profile.initial} color={profile.color}
              style={{ width: 48, height: 48, fontSize: 18 }} />
            <div>
              <div style={{ fontWeight: 650 }}>{profile.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">
              Groups <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(select all that apply)</span>
            </label>
            <div className="profile-edit-grid">
              {Object.entries(config.groups)
                .filter(([group]) => group !== 'admin')
                .map(([group, label]) => (
                  <button key={group} type="button" onClick={() => toggleGroup(group)}
                    className={`chip profile-choice ${groups.includes(group) ? 'active' : ''}`}>
                    {label}
                  </button>
                ))}
            </div>
            {isAdmin && (
              <p className="profile-edit-note">Your admin access is managed separately and will not be changed.</p>
            )}
          </div>

          <div className="form-row">
            <label className="form-label">
              Roles / Instruments <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(select all that apply)</span>
            </label>
            {availableRoles.length > 0 ? (
              <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible', paddingBottom: 0 }}>
                {availableRoles.map(role => (
                  <button key={role} type="button"
                    className={`chip ${roles.includes(role) ? 'active' : ''}`}
                    onClick={() => toggleRole(role)}>
                    {role}
                  </button>
                ))}
              </div>
            ) : (
              <p className="profile-edit-note">Select at least one group to see its available roles.</p>
            )}
          </div>

          {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="profile-edit-actions">
            <button className="btn-secondary" type="button" onClick={cancelEditing} disabled={busy}>Cancel</button>
            <button className="btn-primary" type="button" onClick={saveChanges} disabled={!canSave}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
