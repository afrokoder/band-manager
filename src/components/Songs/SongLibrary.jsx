import { useState } from 'react'
import { useSongs } from '../../hooks/useSongs'
import { useAuth } from '../../contexts/AuthContext'
import SongCard from './SongCard'
import LyricsSheet from './LyricsSheet'
import AddSongSheet from './AddSongSheet'

const FILTERS = ['All','Slow','Medium','Upbeat','Anthem']

export default function SongLibrary({ showAdd, onAddClose }) {
  const { songs, loading, addSong, updateSong, deleteSong } = useSongs()
  const { profile, isAdmin } = useAuth()
  const [filter,   setFilter]   = useState('All')
  const [query,    setQuery]    = useState('')
  const [active,   setActive]   = useState(null)   // song shown in LyricsSheet
  const [editing,  setEditing]  = useState(null)   // song being edited

  const isBand    = (profile?.groups || [profile?.group]).includes('band')
  const canManage = isAdmin || isBand

  const visible = songs.filter(s => {
    const matchQ = !query || s.title?.toLowerCase().includes(query.toLowerCase()) || s.key?.toLowerCase().includes(query.toLowerCase())
    const matchF = filter === 'All' || s.tags?.includes(filter.toLowerCase())
    return matchQ && matchF
  })

  const handleSave = async (data, songToEdit) => {
    if (songToEdit) {
      await updateSong(songToEdit, data)
    } else {
      await addSong(data)
    }
  }

  const handleAddClose = () => {
    setEditing(null)
    onAddClose?.()
  }

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

      {/* Lyrics / detail sheet */}
      <LyricsSheet
        song={active}
        onClose={() => setActive(null)}
        onEdit={canManage ? (song) => setEditing(song) : null}
        onDelete={canManage ? deleteSong : null}
      />

      {/* Add / Edit sheet — edit mode when `editing` is set */}
      <AddSongSheet
        open={showAdd || !!editing}
        onClose={handleAddClose}
        onSave={handleSave}
        song={editing}
      />
    </>
  )
}
