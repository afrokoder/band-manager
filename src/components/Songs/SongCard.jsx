import { youtubeThumbnail } from '../../utils/youtube'

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#f97316','#06b6d4','#84cc16']

export default function SongCard({ song, onClick }) {
  const color = song.color || COLORS[song.title?.charCodeAt(0) % COLORS.length] || COLORS[0]
  const thumb = song.youtubeVideoId ? youtubeThumbnail(song.youtubeVideoId) : null

  return (
    <div className="song-card" onClick={onClick}>
      {thumb ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: 10 }}>
          <img src={thumb} alt={song.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>YouTube</span>
          </div>
        </div>
      ) : (
        <div className="song-card-bar" style={{ background: color }} />
      )}
      <div className="song-card-title">{song.title}</div>
      <div className="song-card-meta">{song.key} · {song.bpm} BPM</div>
      <div className="song-card-tags">
        {song.tags?.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </div>
  )
}
