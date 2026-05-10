import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMessages, useThread, sendReply, editMessage, deleteMessage } from '../../hooks/useMessages'
import { useAuth } from '../../contexts/AuthContext'
import { onForegroundMessage } from '../../utils/notifications'
import Avatar from '../ui/Avatar'
import BottomSheet from '../ui/BottomSheet'
import Pinboard from './Pinboard'
import config from '../../config'

const AUD_LABELS = config.audiences

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

// Splits text into plain-text and URL segments and renders URLs as links
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g

function Linkified({ text }) {
  const parts = []
  let last = 0, m
  URL_RE.lastIndex = 0
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', val: text.slice(last, m.index) })
    const href = m[0].startsWith('http') ? m[0] : `https://${m[0]}`
    // Only render as a link if the final href is http/https — never javascript: etc.
    const safe = /^https?:\/\//i.test(href)
    parts.push(safe ? { type: 'link', val: m[0], href } : { type: 'text', val: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', val: text.slice(last) })
  return (
    <>
      {parts.map((p, i) =>
        p.type === 'link'
          ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)', wordBreak: 'break-all' }}
              onClick={e => e.stopPropagation()}>
              {p.val}
            </a>
          : <span key={i}>{p.val}</span>
      )}
    </>
  )
}

const IconEdit  = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)

// ─── Swipeable card ───────────────────────────────────────────────────────────
// Swipe LEFT  → Edit  button revealed on the RIGHT
// Swipe RIGHT → Delete button revealed on the LEFT
//
// All drag math happens on the DOM directly (no React setState during move).
// React state is only set on snap completion to trigger re-render of actions.

const TRAY_W   = 80   // px each side tray
const SNAP_AT  = 36   // px finger must travel to snap open

function SwipeableMessageCard({ msg, isOwn, onReply, onEdit, onDelete, compact }) {
  // 'none' | 'edit' | 'delete'
  const [snapped,    setSnapped]    = useState('none')
  const [editMode,   setEditMode]   = useState(false)
  const [editText,   setEditText]   = useState(msg.text)
  const [confirmDel, setConfirmDel] = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [menuPos,    setMenuPos]    = useState(null)   // { top, right } in viewport px

  const cardRef  = useRef(null)
  // All mutable drag state lives here — never causes a re-render
  const g = useRef({ dragging: false, startX: 0, startY: 0, dirLocked: null, snapOffset: 0 })

  useEffect(() => { setEditText(msg.text) }, [msg.text])

  // Close the ··· menu when clicking anywhere outside it
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close, { once: true })
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  // ── Imperative helpers ────────────────────────────────────────────────────
  const setCardX = (x, animated = false) => {
    const el = cardRef.current
    if (!el) return
    el.style.transition = animated ? 'transform 0.28s cubic-bezier(0.25,1,0.5,1)' : 'none'
    el.style.transform  = `translateX(${x}px)`
  }

  const snapTo = (state) => {
    const target = state === 'edit' ? -TRAY_W : state === 'delete' ? TRAY_W : 0
    g.current.snapOffset = target
    setCardX(target, true)
    setSnapped(state)
  }

  const reset = () => snapTo('none')

  // ── Attach document-level drag listeners once per mount ───────────────────
  useEffect(() => {
    if (!isOwn || compact) return

    const onDown = (e) => {
      const card = cardRef.current
      if (!card || !card.contains(e.target)) return
      if (editMode || confirmDel) return

      g.current.dragging  = true
      g.current.startX    = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      g.current.startY    = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      g.current.dirLocked = null
    }

    const onMove = (e) => {
      if (!g.current.dragging) return
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? g.current.startX
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? g.current.startY
      const dx = cx - g.current.startX
      const dy = cy - g.current.startY

      // Lock to horizontal or vertical on first significant move
      if (!g.current.dirLocked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return      // too small to decide
        g.current.dirLocked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
      }
      if (g.current.dirLocked === 'v') { g.current.dragging = false; return }

      // Horizontal — update card position directly (no React)
      e.preventDefault?.()
      const raw     = g.current.snapOffset + dx
      const clamped = Math.max(-TRAY_W - 16, Math.min(TRAY_W + 16, raw))
      setCardX(clamped)
    }

    const onUp = (e) => {
      if (!g.current.dragging) return
      g.current.dragging = false
      const cx = e.clientX ?? e.changedTouches?.[0]?.clientX ?? g.current.startX
      const dx = cx - g.current.startX
      // finalOffset = where the card lands if we let go now
      const finalOffset = g.current.snapOffset + dx

      if (finalOffset < -SNAP_AT)      snapTo('edit')
      else if (finalOffset > SNAP_AT)  snapTo('delete')
      else                             reset()
    }

    document.addEventListener('mousedown',  onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('mousemove',  onMove)
    document.addEventListener('touchmove',  onMove, { passive: false })
    document.addEventListener('mouseup',    onUp)
    document.addEventListener('touchend',   onUp)

    return () => {
      document.removeEventListener('mousedown',  onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('mousemove',  onMove)
      document.removeEventListener('touchmove',  onMove)
      document.removeEventListener('mouseup',    onUp)
      document.removeEventListener('touchend',   onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn, compact, editMode, confirmDel])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleEdit = () => {
    reset()
    setEditText(msg.text)
    setEditMode(true)
  }

  const handleDelete = () => {
    reset()
    setConfirmDel(true)
  }

  const submitEdit = async (e) => {
    e?.stopPropagation()
    const t = editText.trim()
    try {
      if (t && t !== msg.text) await onEdit(msg, t)
    } catch (err) {
      console.error('Edit failed:', err)
    }
    setEditMode(false)
  }

  const confirmDelete = async () => {
    setConfirmDel(false)
    // Slide card off screen then remove
    setCardX(-(window.innerWidth || 500), true)
    await new Promise(r => setTimeout(r, 300))
    onDelete(msg)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const wrapStyle = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: compact ? 0 : 'var(--r-md)',
    borderBottom: compact ? '1px solid var(--border)' : undefined,
    background: 'var(--surface)',
    // Shadow lives on the wrapper so the card can be border-radius:0
    boxShadow: compact ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
  }

  return (
    <div style={wrapStyle}>

      {/* Swipe trays — main feed only */}
      {isOwn && !compact && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: TRAY_W }}>
            <button onClick={handleDelete} style={{
              width: '100%', height: '100%', background: '#ff3b30', border: 'none', color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
            }}>
              <IconTrash />Delete
            </button>
          </div>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: TRAY_W }}>
            <button onClick={handleEdit} style={{
              width: '100%', height: '100%', background: config.accentColor, border: 'none', color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700,
            }}>
              <IconEdit />Edit
            </button>
          </div>
        </>
      )}

      {/* Card — moves over the trays */}
      <div
        ref={cardRef}
        className={compact ? undefined : 'msg-card'}
        style={{
          position: 'relative', zIndex: 1,
          // border-radius must be 0 so the card is a solid rectangle
          // that fully covers both trays at rest. The wrapper's
          // overflow:hidden + border-radius clips the whole assembly.
          borderRadius: 0,
          boxShadow: 'none',
          touchAction: isOwn && !compact ? 'pan-y' : 'auto',
          userSelect: 'none',
          ...(compact ? { padding: '10px 0' } : {}),
        }}
        onClick={() => { if (snapped !== 'none') reset(); if (menuOpen) setMenuOpen(false) }}
      >
        <div className="msg-head">
          <Avatar photoURL={msg.senderPhotoURL} initial={msg.senderInitial || '?'} color={msg.senderColor || '#999'} />
          <div className="msg-info">
            <div className="msg-sender">{msg.senderName}</div>
            <div className="msg-time">
              {timeAgo(msg.createdAt)}
              {msg.editedAt && <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 10 }}>edited</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span className={`msg-badge ${msg.audience}`}>{AUD_LABELS[msg.audience]}</span>
            {/* ··· menu — compact (reply) mode only */}
            {isOwn && compact && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (menuOpen) { setMenuOpen(false); return }
                    const r = e.currentTarget.getBoundingClientRect()
                    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
                    setMenuOpen(true)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 18, lineHeight: 1, color: 'var(--text3)', borderRadius: 6 }}
                >
                  ···
                </button>
                {menuOpen && menuPos && createPortal(
                  <div style={{
                    position: 'fixed',
                    top: menuPos.top,
                    right: menuPos.right,
                    zIndex: 9999,
                    background: 'var(--surface)', borderRadius: 10,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.16)',
                    minWidth: 140, overflow: 'hidden',
                  }}>
                    <button onClick={() => { setMenuOpen(false); handleEdit() }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>
                      <IconEdit /> Edit
                    </button>
                    <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />
                    <button onClick={() => { setMenuOpen(false); handleDelete() }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#ff3b30', fontWeight: 500 }}>
                      <IconTrash /> Delete
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
        </div>

        {editMode ? (
          <div style={{ marginTop: 8 }}>
            <textarea className="compose-area" rows={3} autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitEdit() }}
              style={{ width: '100%', margin: 0 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button onClick={e => { e.stopPropagation(); setEditMode(false) }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text2)' }}>
                Cancel
              </button>
              <button onClick={e => submitEdit(e)}
                style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-pill)', padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="msg-text"><Linkified text={msg.text} /></div>
        )}

        {!compact && !editMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button onClick={e => { e.stopPropagation(); onReply?.(msg) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 500, padding: 0 }}>
              Reply
            </button>
            {msg.replyCount > 0 && (
              <button onClick={e => { e.stopPropagation(); onReply?.(msg) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', padding: 0 }}>
                {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'} →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirm overlay */}
      {confirmDel && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,59,48,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          borderRadius: 'var(--r-md)', zIndex: 20,
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Delete this message?</span>
          <button onClick={() => setConfirmDel(false)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--r-pill)', color: '#fff', padding: '5px 14px', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={confirmDelete}
            style={{ background: '#fff', border: 'none', borderRadius: 'var(--r-pill)', color: '#ff3b30', padding: '5px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Thread sheet ─────────────────────────────────────────────────────────────

function ThreadSheet({ parent, onClose, user, profile }) {
  const { replies, loading } = useThread(parent?.id)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  const submit = async () => {
    if (!text.trim() || !profile) return
    setBusy(true)
    await sendReply(parent.id, {
      senderId:       user.uid,
      senderName:     profile.name,
      senderInitial:  profile.initial,
      senderColor:    profile.color,
      senderPhotoURL: profile.photoURL || null,
      audience:       parent.audience,
      text:           text.trim(),
    })
    setText('')
    setBusy(false)
  }

  const handleEdit   = (msg, newText) => editMessage(msg.id, newText)
  const handleDelete = (msg) => deleteMessage(msg.id, msg.parentId)

  return (
    <BottomSheet open onClose={onClose} title="Thread">
      <div style={{ marginBottom: 12 }}>
        <SwipeableMessageCard msg={parent} isOwn={parent.senderId === user?.uid}
          compact onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text3)', marginBottom: 10 }}>
        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
      ) : (
        <div>
          {replies.map(r => (
            <SwipeableMessageCard key={r.id} msg={r} isOwn={r.senderId === user?.uid}
              compact onEdit={handleEdit} onDelete={handleDelete} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ marginTop: 16, background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Avatar photoURL={profile?.photoURL} initial={profile?.initial || '?'} color={profile?.color || '#999'} style={{ marginTop: 2 }} />
          <textarea className="compose-area" rows={2} placeholder="Write a reply…"
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submit() }}
            style={{ flex: 1, margin: 0 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="send-btn" disabled={busy || !text.trim()} onClick={submit}>
            {busy ? '…' : 'Reply'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Main Comms view ──────────────────────────────────────────────────────────

export default function Comms({ onNewMessage }) {
  const { messages, loading, sendMessage } = useMessages()
  const { user, profile, isAdmin } = useAuth()
  const [text,   setText]   = useState('')
  const [aud,    setAud]    = useState('all')
  const [busy,   setBusy]   = useState(false)
  const [thread, setThread] = useState(null)
  const prevCount = useRef(0)

  useEffect(() => {
    let cleanup = () => {}
    onForegroundMessage(onNewMessage).then(fn => { cleanup = fn })
    return () => cleanup()
  }, [])

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
      senderId:       user.uid,
      senderName:     profile.name,
      senderInitial:  profile.initial,
      senderColor:    profile.color,
      senderPhotoURL: profile.photoURL || null,
      senderGroup:    (profile.groups || [profile.group]).join(', '),
      audience:       aud,
      text:           text.trim(),
    })
    setText('')
    setBusy(false)
  }

  const handleEdit   = (msg, newText) => editMessage(msg.id, newText)
  const handleDelete = (msg) => deleteMessage(msg.id, msg.parentId)

  // Keep the thread parent fresh — Firestore updates messages[] but not the thread state object
  const liveThread = thread ? (messages.find(m => m.id === thread.id) ?? thread) : null

  const userGroups = profile?.groups || (profile?.group ? [profile.group] : [])
  const visible = messages.filter(m =>
    m.audience === 'all' || userGroups.includes(m.audience) || m.senderId === user?.uid
  )

  return (
    <>
      <span className="page-title">Comms</span>

      <Pinboard isAdmin={isAdmin} />

      <div className="compose-card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Avatar photoURL={profile?.photoURL} initial={profile?.initial || '?'} color={profile?.color || '#999'} style={{ marginTop: 4 }} />
          <textarea className="compose-area" rows={3}
            placeholder="Share an update with the team…"
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) send() }}
            style={{ flex: 1, margin: 0 }} />
        </div>
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

      {visible.some(m => m.senderId === user?.uid) && (
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', margin: '-4px 0 12px' }}>
          ← swipe left to edit · swipe right to delete →
        </p>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="msg-empty">No messages yet.<br />Be the first to say something! 👋</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(m => (
            <SwipeableMessageCard key={m.id} msg={m} isOwn={m.senderId === user?.uid}
              onReply={setThread} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {liveThread && (
        <ThreadSheet parent={liveThread} onClose={() => setThread(null)} user={user} profile={profile} />
      )}
    </>
  )
}
