import { useAuth } from '../../contexts/AuthContext'
import BottomSheet from '../ui/BottomSheet'

const GROUP_LABEL = { band: '🎸 Band', vocals: '🎤 Vocals' }

export default function ProfileSheet({ onClose }) {
  const { profile, user, logout } = useAuth()
  if (!profile) return null

  const handleLogout = async () => { await logout(); onClose() }

  return (
    <BottomSheet open onClose={onClose} title="Profile">
      <div className="profile-header">
        <div className="avatar lg" style={{ background: profile.color }}>{profile.initial}</div>
        <div className="profile-name">{profile.name}</div>
        <div className="profile-role">{profile.role} · {GROUP_LABEL[profile.group]}</div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: 'var(--text2)' }}>Group</span>
          <span className={`group-pill ${profile.group}`}>{GROUP_LABEL[profile.group]}</span>
        </div>
      </div>

      <button className="btn-danger" onClick={handleLogout}>Sign Out</button>
    </BottomSheet>
  )
}
