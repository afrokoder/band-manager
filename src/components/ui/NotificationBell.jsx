import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../contexts/AuthContext'
import { notificationCapability, requestNotifPermission } from '../../utils/notifications'

const iconFor = type => type === 'rehearsal' ? '🎵' : type === 'service' ? '🎙️' : type === 'setlist' ? '♫' : type === 'comms' ? '💬' : '⏰'

export default function NotificationBell({ onNavigate }) {
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const [pushState, setPushState] = useState(() => notificationCapability())
  const [enabling, setEnabling] = useState(false)
  const panelRef = useRef(null)
  const bellRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = event => { if (event.key === 'Escape') setOpen(false) }
    const onPointer = event => {
      if (bellRef.current?.contains(event.target)) return
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const openItem = async item => {
    await markRead(item.id).catch(() => {})
    setOpen(false)
    onNavigate?.(item)
  }

  const enablePush = async () => {
    if (!user) return
    setEnabling(true)
    try {
      await requestNotifPermission(user.uid)
      setPushState(notificationCapability())
    } finally {
      setEnabling(false)
    }
  }

  const panel = open ? (
    <>
      <button className="notif-scrim" aria-label="Close notifications" onClick={() => setOpen(false)} />
      <section ref={panelRef} className="notif-panel" aria-label="Notifications">
        <div className="notif-panel-head">
          <div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</span></div>
          {unreadCount > 0 && <button type="button" onClick={() => markAllRead().catch(() => {})}>Mark all read</button>}
        </div>

        {pushState.needsHomeScreen && (
          <div className="notif-push-card">
            <strong>Phone notifications</strong>
            <span>Add Band Manager to your iPhone/iPad Home Screen, then open it there and enable notifications from this bell.</span>
          </div>
        )}
        {!pushState.needsHomeScreen && pushState.supported && pushState.permission === 'default' && (
          <div className="notif-push-card">
            <div><strong>Get phone notifications</strong><span>Allow important schedule, set list, rehearsal and Comms alerts on your lock screen.</span></div>
            <button type="button" onClick={enablePush} disabled={enabling}>{enabling ? 'Enabling…' : 'Enable'}</button>
          </div>
        )}
        {pushState.supported && pushState.permission === 'denied' && (
          <div className="notif-push-card blocked">
            <strong>Phone notifications are blocked</strong>
            <span>Enable notifications for Band Manager in your phone/browser notification settings to receive lock-screen alerts.</span>
          </div>
        )}

        <div className="notif-list">
          {notifications.length === 0 ? <div className="notif-empty"><span>🔔</span><strong>No notifications yet</strong><small>Schedule, set list and group updates will appear here.</small></div> : notifications.map(item => (
            <button type="button" key={item.id} className={`notif-item ${item.read ? '' : 'unread'}`} onClick={() => openItem(item)}>
              <span className="notif-item-icon">{iconFor(item.type)}</span>
              <span className="notif-item-copy"><strong>{item.title}</strong><small>{item.body}</small></span>
              {!item.read && <span className="notif-dot" />}
            </button>
          ))}
        </div>
      </section>
    </>
  ) : null

  return (
    <div className="notif-bell-wrap">
      <button ref={bellRef} type="button" className="notif-bell" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} onClick={() => { setPushState(notificationCapability()); setOpen(v => !v) }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {panel && createPortal(panel, document.body)}
    </div>
  )
}
