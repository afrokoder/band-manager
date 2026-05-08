import { useState } from 'react'
import { useSongs } from '../../hooks/useSongs'
import { useAuth } from '../../contexts/AuthContext'
import SongCard from './SongCard'
import LyricsSheet from './LyricsSheet'
import AddSongSheet from './AddSongSheet'

const FILTERS = ['All','Slow','Medium','Upbeat','Anthem']

export default function SongLibrary({ showAdd, onAddClose }) {
  const { songs, loading, addSong, deleteSong } = useSongs()
  const { profile } = useAuth()
  const [filter, setFilter] = useState('All')
  const [query,  setQuery]  = useState('')
  const [active, setActive] = useState(null)   // song to show lyrics

  const visible = songs.filter(s => {
    const matchQ = !query || s.title?.toLowerCase().includes(query.toLowerCase()) || s.key?.toLowerCase().includes(query.toLowerCase())
    const matchF = filter === 'All' || s.tags?.includes(filter.toLowerCase())
    return matchQ && matchF
  })

  return (
    <>
      {/* Search */}
      <div className="search-wrap">
        <svg className="search-ico" viewBox="0 0 24 24">
          <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input className="search-input" placeholder="Search songs…"
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Filters */}
      <div className="chips">
        {FILTERS.map(f => (
          <div key={f} className={`chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>{f}</div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎵</div>
          <div className="empty-state-title">No songs yet</div>
          <div className="empty-state-text">Tap + to add your first song to the library</div>
        </div>
      ) : (
        <div className="song-grid">
          {visible.map(s => (
            <SongCard key={s.id} song={s} onClick={() => setActive(s)} />
          ))}
        </div>
      )}

      {/* Lyrics sheet */}
      <LyricsSheet song={active} onClose={() => setActive(null)}
        onDelete={profile?.group === 'band' ? deleteSong : null} />

      {/* Add song sheet */}
      <AddSongSheet open={showAdd} onClose={onAddClose} onSave={addSong} />
    </>
  )
}
