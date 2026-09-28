import { useState } from 'react'
import { usePinboard } from '../../hooks/usePinboard'
import BottomSheet from '../ui/BottomSheet'

// ─── Tiny uid generator ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

// ─── Preset emojis for quick picking ─────────────────────────────────────────
const EMOJIS = ['📌','📅','🔗','🙏','🎵','📣','ℹ️','🎉','⚠️','📞']

// ─── Single pin row ───────────────────────────────────────────────────────────
function PinRow({ pin }) {
  const [open, setOpen] = useState(false)
  const hasBody = !!pin.body?.trim()

  return (
    <div className="pinboard-pin">
      <div
        className="pinboard-pin-row"
        onClick={() => hasBody && setOpen(o => !o)}
        style={{ cursor: hasBody ? 'pointer' : 'default' }}
      >
        <span className="pinboard-pin-icon">{pin.emoji || '📌'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {pin.url ? (
            <a href={pin.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', wordBreak: 'break-word' }}>
              {pin.title}
            </a>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{pin.title}</div>
          )}
          {hasBody && (
            <div style={{
              fontSize: 12, color: open ? 'var(--text2)' : 'var(--text3)', marginTop: 3, lineHeight: 1.45,
              whiteSpace: open ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {pin.body}
            </div>
          )}
          {pin.url && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Open link ↗</div>
          )}
        </div>
        {hasBody && (
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, marginTop: 4 }}>{open ? '▲' : '▼'}</span>
        )}
      </div>
    </div>
  )
}

// Only allow http/https URLs — blocks javascript: and other schemes
function safeUrl(raw) {
  const u = raw.trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  if (/^www\./i.test(u)) return `https://${u}`
  return ''   // reject anything else
}

// ─── Add / Edit pin form (inside ManagePinsSheet) ─────────────────────────────
function PinForm({ initial, onSave, onCancel }) {
  const [emoji,    setEmoji]    = useState(initial?.emoji || '📌')
  const [title,    setTitle]    = useState(initial?.title || '')
  const [body,     setBody]     = useState(initial?.body  || '')
  const [url,      setUrl]      = useState(initial?.url   || '')
  const [urlError, setUrlError] = useState('')

  const rawUrl = url.trim()
  const valid  = title.trim().length > 0 && !urlError

  const handleUrlBlur = () => {
    if (!rawUrl) { setUrlError(''); return }
    const safe = safeUrl(rawUrl)
    if (!safe) setUrlError('URL must start with https:// or http://')
    else       setUrlError('')
  }

  const handleSave = () => {
    const safe = safeUrl(rawUrl)
    if (rawUrl && !safe) { setUrlError('URL must start with https:// or http://'); return }
    onSave({ emoji, title: title.trim(), body: body.trim(), url: safe })
  }

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 12 }}>
      {/* Emoji row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            style={{
              width: 36, height: 36, border: emoji === e ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 8, background: 'var(--surface)', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {e}
          </button>
        ))}
      </div>

      <input className="form-input" placeholder="Title *" value={title}
        onChange={e => setTitle(e.target.value)} style={{ marginBottom: 8 }} />

      <input className="form-input" placeholder="https://… (optional)" value={url}
        onChange={e => { setUrl(e.target.value); setUrlError('') }}
        onBlur={handleUrlBlur}
        style={{ marginBottom: urlError ? 4 : 8 }} />
      {urlError && (
        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{urlError}</div>
      )}

      <textarea className="compose-area" rows={2} placeholder="Body text (optional)"
        value={body} onChange={e => setBody(e.target.value)}
        style={{ margin: 0, marginBottom: 10, width: '100%' }} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '5px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--text2)' }}>
          Cancel
        </button>
        <button disabled={!valid} onClick={handleSave}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-pill)', padding: '5px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: valid ? 1 : 0.4 }}>
          Save Pin
        </button>
      </div>
    </div>
  )
}

// ─── Admin manage sheet ───────────────────────────────────────────────────────
function ManagePinsSheet({ pins, savePins, onClose }) {
  const [localPins, setLocalPins] = useState(pins)
  const [adding,    setAdding]    = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [busy,      setBusy]      = useState(false)

  const commit = async (newPins) => {
    setBusy(true)
    try { await savePins(newPins) } catch (e) { console.error(e) }
    setBusy(false)
  }

  const handleAdd = async (data) => {
    const newPins = [...localPins, { id: uid(), ...data, order: localPins.length }]
    setLocalPins(newPins)
    setAdding(false)
    await commit(newPins)
  }

  const handleEdit = async (id, data) => {
    const newPins = localPins.map(p => p.id === id ? { ...p, ...data } : p)
    setLocalPins(newPins)
    setEditId(null)
    await commit(newPins)
  }

  const handleDelete = async (id) => {
    const newPins = localPins.filter(p => p.id !== id)
    setLocalPins(newPins)
    await commit(newPins)
  }

  const move = async (idx, dir) => {
    const arr   = [...localPins]
    const swap  = idx + dir
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setLocalPins(arr)
    await commit(arr)
  }

  return (
    <BottomSheet open onClose={onClose} title="Manage Pinboard"
      action={{ label: '+ Add pin', onPress: () => { setAdding(true); setEditId(null) } }}>

      {busy && (
        <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 8 }}>Saving…</div>
      )}

      {adding && (
        <PinForm onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}

      {localPins.length === 0 && !adding && (
        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 14, padding: '20px 0' }}>
          No pins yet. Tap "+ Add pin" to get started.
        </div>
      )}

      {localPins.map((pin, idx) => (
        <div key={pin.id}>
          {editId === pin.id ? (
            <PinForm initial={pin}
              onSave={(data) => handleEdit(pin.id, data)}
              onCancel={() => setEditId(null)} />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              {/* Reorder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', padding: '1px 4px', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => move(idx, 1)} disabled={idx === localPins.length - 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', padding: '1px 4px', opacity: idx === localPins.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>

              <span style={{ fontSize: 20, flexShrink: 0 }}>{pin.emoji || '📌'}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.title}</div>
                {pin.url && <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.url}</div>}
              </div>

              <button onClick={() => { setEditId(pin.id); setAdding(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 600, padding: '4px 8px', flexShrink: 0 }}>
                Edit
              </button>
              <button onClick={() => handleDelete(pin.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ff3b30', fontWeight: 600, padding: '4px 8px', flexShrink: 0 }}>
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </BottomSheet>
  )
}

// ─── Main Pinboard card ───────────────────────────────────────────────────────
export default function Pinboard({ isAdmin }) {
  const { pins, loading, savePins } = usePinboard()
  const [collapsed, setCollapsed] = useState(false)
  const [managing,  setManaging]  = useState(false)

  if (!loading && pins.length === 0 && !isAdmin) return null

  return (
    <>
      <div className="pinboard-card">
        <div className="pinboard-head" onClick={() => setCollapsed(c => !c)}>
          <span className="pinboard-head-icon">📌</span>
          <div className="pinboard-title">
            <strong>Pinned Info</strong>
            <span>{pins.length > 0 ? `${pins.length} ${pins.length === 1 ? 'important item' : 'important items'}` : 'Important team info in one place'}</span>
          </div>

          {isAdmin && (
            <button className="pinboard-edit" onClick={e => { e.stopPropagation(); setManaging(true) }}>
              Edit
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 1 }}>{collapsed ? '▼' : '▲'}</span>
        </div>

        {!collapsed && (
          <div className="pinboard-body">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><div className="spinner" /></div>
            ) : pins.length === 0 ? (
              <div className="pinboard-empty">No pins yet — tap Edit to add links and announcements.</div>
            ) : (
              <div className="pinboard-list">
                {pins.map(pin => <PinRow key={pin.id} pin={pin} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {managing && (
        <ManagePinsSheet pins={pins} savePins={savePins} onClose={() => setManaging(false)} />
      )}
    </>
  )
}
