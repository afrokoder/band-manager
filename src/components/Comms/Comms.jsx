import { useState, useEffect, useRef } from 'react'
import { useMessages } from '../../hooks/useMessages'
import { useAuth } from '../../contexts/AuthContext'
import { onForegroundMessage } from '../../utils/notifications'

const AUD_LABELS = { all: '@all', band: '@band', vocals: '@vocals' }

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts.toDate().getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function MessageCard({ msg }) {
  return (
    <div className="msg-card">
      <div className="msg-head">
        <div className="avatar" style={{ background: msg.senderColor || '#999' }}>{msg.senderInitial || '?'}</div>
        <div className="msg-info">
          <div className="msg-sender">{msg.senderName}</div>
          <div className="msg-time">{timeAgo(msg.createdAt)}</div>
        </div>
        <span className={`msg-badge ${msg.audience}`}>{AUD_LABELS[msg.audience]}</span>
      </div>
      <div className="msg-text">{msg.text}</div>
    </div>
  )
}

export default function Comms({ onNewMessage }) {
  const { messages, loading, sendMessage } = useMessages()
  const { user, profile } = useAuth()
  const [text,   setText]   = useState('')
  const [aud,    setAud]    = useState('all')
  const [busy,   setBusy]   = useState(false)
  const prevCount = useRef(0)

  // Foreground notification banner when new messages arrive
  useEffect(() => {
    let cleanup = () => {}
    onForegroundMessage(onNewMessage).then(fn => { cleanup = fn })
    return () => cleanup()
  }, [])

  // In-app banner for messages received while on Comms tab
  useEffect(() => {
    if (messages.length > prevCount.current && prevCount.current > 0) {
      const latest = messages[0]
      if (latest.senderId !== user?.uid) {
        onNewMessage?.(`${latest.senderName}: ${latest.text.slice(0, 60)}`)
      }
    }
    prevCount.current = messages.length
  }, [messages])

  const send = async () => {
    if (!text.trim() || !profile) return
    setBusy(true)
    await sendMessage({
      senderId:      user.uid,
      senderName:    profile.name,
      senderInitial: profile.initial,
      senderColor:   profile.color,
      senderGroup:   profile.group,
      audience:      aud,
      text:          text.trim(),
    })
    setText('')
    setBusy(false)
  }

  // Filter messages the current user should see
  const visible = messages.filter(m =>
    m.audience === 'all' || m.audience === profile?.group || m.senderId === user?.uid
  )

  return (
    <>
      <span className="page-title">Comms</span>

      {/* Compose */}
      <div className="compose-card">
        <textarea className="compose-area" rows={3}
          placeholder="Share an update with the team…"
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) send() }} />
        <div className="compose-footer">
          <div className="aud-row">
            {['all','band','vocals'].map(a => (
              <button key={a} className={`aud-btn ${aud === a ? `sel-${a}` : ''}`}
                onClick={() => setAud(a)}>{AUD_LABELS[a]}</button>
            ))}
          </div>
          <button className="send-btn" disabled={busy || !text.trim()} onClick={send}>
            {busy ? '…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="msg-empty">No messages yet.<br />Be the first to say something! 👋</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(m => <MessageCard key={m.id} msg={m} />)}
        </div>
      )}
    </>
  )
}
