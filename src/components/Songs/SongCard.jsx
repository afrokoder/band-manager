const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#f97316','#06b6d4','#84cc16']

export default function SongCard({ song, onClick }) {
  const color = song.color || COLORS[song.title?.charCodeAt(0) % COLORS.length] || COLORS[0]
  return (
    <div className="song-card" onClick={onClick}>
      <div className="song-card-bar" style={{ background: color }} />
      <div className="song-card-title">{song.title}</div>
      <div className="song-card-meta">{song.key} · {song.bpm} BPM</div>
      <div className="song-card-tags">
        {song.tags?.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </div>
  )
}
