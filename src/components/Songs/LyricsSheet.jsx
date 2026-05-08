import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'

export default function LyricsSheet({ song, onClose, onDelete }) {
  const [confirm, setConfirm] = useState(false)

  if (!song) return null

  const handleDelete = async () => {
    await onDelete(song)
    onClose()
  }

  return (
    <BottomSheet open onClose={onClose}
      title={song.title}
      subtitle={`Key: ${song.key} · ${song.bpm} BPM`}>

      {/* Attached file */}
      {song.fileUrl && (
        <a className="file-link" href={song.fileUrl} target="_blank" rel="noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {song.fileName || 'View attached file'}
        </a>
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

      {/* Delete */}
      {onDelete && (
        <div style={{ marginTop: 24 }}>
          {confirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete Song</button>
            </div>
          ) : (
            <button className="btn-danger" onClick={() => setConfirm(true)}>Remove from Library</button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
