import { useAuth } from '../../contexts/AuthContext'
import BottomSheet from '../ui/BottomSheet'
import Avatar from '../ui/Avatar'
import config from '../../config'

const GROUP_LABEL = config.groups

export default function ProfileSheet({ onClose }) {
  const { profile, user, logout, isAdmin } = useAuth()
  if (!profile) return null

  const handleLogout = async () => { await logout(); onClose() }

  // Support both old (string) and new (array) data shapes
  const groups = Array.isArray(profile.groups)
    ? profile.groups
    : (profile.group ? [profile.group] : [])

  const roles = Array.isArray(profile.roles)
    ? profile.roles
    : (profile.role ? [profile.role] : [])

  return (
    <BottomSheet open onClose={onClose} title="Profile">
      <div className="profile-header">
        <Avatar photoURL={profile.photoURL} initial={profile.initial} color={profile.color}
          size="lg" style={{ width: 72, height: 72, fontSize: 28 }} />
        <div className="profile-name">{profile.name}</div>
        <div className="profile-role">{roles.join(', ')}</div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--text2)' }}>Group</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {groups.map(g => (
              <span key={g} className={`group-pill ${g}`}>{GROUP_LABEL[g] || g}</span>
            ))}
          </div>
        </div>
        {roles.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>Roles</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '65%' }}>
              {roles.map(r => (
                <span key={r} style={{
                  fontSize: 12, background: 'var(--surface)', borderRadius: 20,
                  padding: '3px 10px', color: 'var(--text1)', fontWeight: 500
                }}>{r}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button className="btn-danger" onClick={handleLogout}>Sign Out</button>
    </BottomSheet>
  )
}
