import { youtubeThumbnail } from '../../utils/youtube'

export default function SongCard({ song, onClick }) {
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
        <div className="song-generated-thumb song-generated-thumb-light">
          <div className="song-cover-wave wave-one" aria-hidden="true" />
          <div className="song-cover-wave wave-two" aria-hidden="true" />
          <div className="song-cover-wave wave-three" aria-hidden="true" />
          <div className="song-generated-copy">
            <strong>{song.title}</strong>
            <span>{song.author || 'Amazing Voices'}</span>
          </div>
          <div className="song-thumb-footer"><b>AGM</b><i/><span>AMAZING VOICES · MUSIC LIBRARY</span></div>
        </div>
      )}
      <div className="song-card-title">{song.title}</div>
      {song.author && <div className="song-card-author">{song.author}</div>}
      <div className="song-card-tags">
        {song.tags?.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </div>
  )
}
