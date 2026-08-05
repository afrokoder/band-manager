import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import BottomSheet from '../ui/BottomSheet'
import { youtubeEmbedUrl } from '../../utils/youtube'

function SheetMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close, { once: true })
    return () => document.removeEventListener('click', close)
  }, [open])

  const toggle = (e) => {
    e.stopPropagation()
    if (open) { setOpen(false); return }
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    setOpen(true)
  }

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', fontSize: 20, lineHeight: 1, color: 'var(--text2)', borderRadius: 6 }}>
        ···
      </button>
      {open && pos && createPortal(
        <div style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999,
          background: 'var(--surface)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.16)', minWidth: 160, overflow: 'hidden' }}>
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit() }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>
              ✏️ Edit Song
            </button>
          )}
          {onEdit && onDelete && <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#ff3b30', fontWeight: 500 }}>
              🗑️ Remove from Library
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

export default function LyricsSheet({ song, onClose, onDelete, onEdit }) {
  const [confirm,    setConfirm]    = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  if (!song) return null

  const handleDelete = async () => {
    await onDelete(song)
    onClose()
  }

  const embedUrl = youtubeEmbedUrl(song.youtubeVideoId)

  const menuAction = (onEdit || onDelete) ? (
    <SheetMenu
      onEdit={onEdit ? () => { onClose(); onEdit(song) } : null}
      onDelete={onDelete ? () => setConfirm(true) : null}
    />
  ) : null

  return (
    <BottomSheet open onClose={onClose}
      title={song.title}
      subtitle={`Key: ${song.key} · ${song.bpm} BPM`}
      action={menuAction}>

      {/* YouTube player */}
      {embedUrl && (
        <div style={{ marginBottom: 16 }}>
          {showPlayer ? (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#000' }}>
              <iframe
                src={embedUrl + '&autoplay=1'}
                title={song.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            </div>
          ) : (
            <button onClick={() => setShowPlayer(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: 'none', borderRadius: 'var(--r-md)', padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Play on YouTube</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Tap to load video</div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Sections */}
      {song.sections?.length > 0 ? (
        song.sections.map((sec, i) => (
          <div key={i} className="lyric-section">
            <div className="lyric-label">{sec.label}</div>
            {sec.chords && <span className="chord-line">{sec.chords}</span>}
            <div className="lyric-text">{sec.lyrics}</div>
          </div>
        ))
      ) : (
        <div style={{ color: 'var(--text3)', fontSize: 15, paddingTop: 8 }}>No lyrics added yet.</div>
      )}

      {/* Notes */}
      {song.notes && (
        <div style={{ background: 'rgba(255,149,0,0.08)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b45309', marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{song.notes}</div>
        </div>
      )}

      {/* Confirm delete */}
      {confirm && (
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete Song</button>
        </div>
      )}
    </BottomSheet>
  )
}
