import { useEffect } from 'react'

export default function NotifBanner({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [msg])

  return (
    <div className="notif-banner">
      <span style={{ fontSize: 18 }}>💬</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  )
}
