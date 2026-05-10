import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import { youtubeEmbedUrl } from '../../utils/youtube'

export default function LyricsSheet({ song, onClose, onDelete, onEdit }) {
  const [confirm,    setConfirm]    = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  if (!song) return null

  const handleDelete = async () => {
    await onDelete(song)
    onClose()
  }

  const embedUrl = youtubeEmbedUrl(song.youtubeVideoId)

  return (
    <BottomSheet open onClose={onClose}
      title={song.title}
      subtitle={`Key: ${song.key} · ${song.bpm} BPM`}
      action={onEdit ? { label: 'Edit', onPress: () => { onClose(); onEdit(song) } } : null}>

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
