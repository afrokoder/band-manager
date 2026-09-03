import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/Auth/LoginScreen'
import ProfileSetup from './components/Auth/ProfileSetup'
import SongLibrary from './components/Songs/SongLibrary'
import SetlistBuilder from './components/Setlist/SetlistBuilder'
import Schedule from './components/Schedule/Schedule'
import Comms from './components/Comms/Comms'
import ProfileSheet from './components/Auth/ProfileSheet'
import NotifBanner from './components/ui/NotifBanner'
import NotificationBell from './components/ui/NotificationBell'
import { syncNotifRegistration } from './utils/notifications'

const TABS = [
  { id: 'songs',    label: 'Library',  icon: <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
  { id: 'setlist',  label: 'Setlist',  icon: <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { id: 'schedule', label: 'Schedule', icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id: 'comms',    label: 'Comms',    icon: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
]

const TAB_TITLES = { songs: 'Song Library', setlist: 'Set Lists', schedule: 'Schedule', comms: 'Comms' }

export default function App() {
  const { user, profile, loading, needsProfile, isAdmin } = useAuth()
  const [tab, setTab]               = useState('songs')
  const [showAdd, setShowAdd]       = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [banner, setBanner]         = useState(null)

  // Refresh an existing push registration after login, but never pop the OS
  // permission prompt automatically. iPhone requires that prompt to come from
  // a user gesture, so the notification bell owns the opt-in button.
  useEffect(() => {
    if (user && profile) syncNotifRegistration(user.uid).catch(() => {})
  }, [user, profile])

  // Notification taps can launch the installed PWA from a closed state. Honor
  // the URL route written by the service worker / Cloud Function.
  useEffect(() => {
    if (!user || !profile) return
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get('tab')
    if (TABS.some(item => item.id === requestedTab)) setTab(requestedTab)
    else if (params.get('service')) setTab('schedule')
    else if (params.get('setlist')) setTab('setlist')
  }, [user, profile])

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  if (!user)        return <LoginScreen />
  if (needsProfile) return <ProfileSetup />

  const profileGroups = profile?.groups || (profile?.group ? [profile.group] : [])
  const canAddSchedule = isAdmin || profileGroups.includes('admin') || profile?.group === 'admin'
  const noAdd = tab === 'comms' || (tab === 'schedule' && !canAddSchedule)

  const handleNotificationNavigate = (item) => {
    const url = new URL(window.location.href)
    if (item?.setlistId) {
      url.searchParams.set('setlist', item.setlistId)
      url.searchParams.delete('service')
    } else if (item?.serviceId) {
      url.searchParams.set('service', item.serviceId)
      url.searchParams.delete('setlist')
    }
    if (item?.tab) url.searchParams.set('tab', item.tab)
    window.history.replaceState({}, '', url)

    if (item?.setlistId) window.dispatchEvent(new Event('setlist-link-change'))
    if (item?.serviceId) window.dispatchEvent(new CustomEvent('schedule-service-focus', { detail: { serviceId: item.serviceId } }))
    if (item?.tab) setTab(item.tab)
    setShowAdd(false)
  }

  return (
    <div className="app">
      {/* Banner */}
      {banner && <NotifBanner msg={banner} onClose={() => setBanner(null)} />}

      {/* Top Nav */}
      <nav className="top-nav">
        <NotificationBell onNavigate={handleNotificationNavigate} />
        <span className="nav-title">{TAB_TITLES[tab]}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!noAdd && (
            <button className="nav-btn" onClick={() => setShowAdd(true)} aria-label="Add">+</button>
          )}
          {profile && (
            <button className="nav-avatar" style={{ background: profile.color }}
              onClick={() => setShowProfile(true)}>
              {profile.initial}
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="content">
        <div className={`section ${tab === 'songs'    ? 'active' : ''}`}>
          <SongLibrary showAdd={showAdd && tab === 'songs'} onAddClose={() => setShowAdd(false)} />
        </div>
        <div className={`section ${tab === 'setlist'  ? 'active' : ''}`}>
          <SetlistBuilder showAdd={showAdd && tab === 'setlist'} onAddClose={() => setShowAdd(false)} />
        </div>
        <div className={`section ${tab === 'schedule' ? 'active' : ''}`}>
          <Schedule showAdd={showAdd && tab === 'schedule'} onAddClose={() => setShowAdd(false)} />
        </div>
        <div className={`section ${tab === 'comms'    ? 'active' : ''}`}>
          <Comms onNewMessage={(msg) => setBanner(msg)} />
        </div>
      </main>

      {/* Tab Bar */}
      <nav className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); setShowAdd(false) }}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Profile Sheet */}
      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
    </div>
  )
}
