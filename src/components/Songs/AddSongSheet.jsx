import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import { useAuth } from '../../contexts/AuthContext'

const KEYS  = ['A','Bb','B','C','C#','D','Eb','E','F','F#','G','Ab']
const TAGS  = ['slow','medium','upbeat','anthem']
const COLORS= ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#f97316','#06b6d4','#84cc16']

const empty = () => ({ label: 'Verse 1', chords: '', lyrics: '' })

export default function AddSongSheet({ open, onClose, onSave }) {
  const { user } = useAuth()
  const [title,    setTitle]    = useState('')
  const [key,      setKey]      = useState('D')
  const [bpm,      setBpm]      = useState('')
  const [tag,      setTag]      = useState('slow')
  const [notes,    setNotes]    = useState('')
  const [sections, setSections] = useState([empty()])
  const [busy,     setBusy]     = useState(false)

  const reset = () => { setTitle(''); setKey('D'); setBpm(''); setTag('slow'); setNotes(''); setSections([empty()]) }

  const addSection = () => setSections(s => [...s, empty()])
  const updSection = (i, field, val) => setSections(s => s.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const delSection = (i) => setSections(s => s.filter((_, j) => j !== i))

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      await onSave({
        title: title.trim(),
        key, bpm: parseInt(bpm) || 80,
        tags: [tag],
        color, notes, sections,
        addedBy: user?.uid,
      })
      reset()
      onClose()
    } catch (e) {
      console.error(e)
    }
    setBusy(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Song">
      <div className="form-row">
        <label className="form-label">Title</label>
        <input className="form-input" placeholder="Song title" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-row">
          <label className="form-label">Key</label>
          <select className="form-select" value={key} onChange={e => setKey(e.target.value)}>
            {KEYS.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">BPM</label>
          <input className="form-input" type="number" placeholder="72" value={bpm} onChange={e => setBpm(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">Mood</label>
        <div className="chips" style={{ paddingBottom: 0 }}>
          {TAGS.map(t => (
            <div key={t} className={`chip ${tag === t ? 'active' : ''}`} onClick={() => setTag(t)}>{t}</div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="form-label" style={{ marginBottom: 0 }}>Sections (Verse / Chorus / Bridge)</span>
          <button onClick={addSection} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
        </div>
        {sections.map((sec, i) => (
          <div key={i} style={{ background: 'var(--bg)', borderRadius: 'var(--r-sm)', padding: '12px', marginBottom: 8, position: 'relative' }}>
            {sections.length > 1 && (
              <button onClick={() => delSection(i)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            )}
            <input className="form-input" placeholder="Section name (e.g. Verse 1)" value={sec.label}
              onChange={e => updSection(i, 'label', e.target.value)} style={{ marginBottom: 6 }} />
            <input className="form-input" placeholder="Chords (e.g. D  A  Bm  G)" value={sec.chords}
              onChange={e => updSection(i, 'chords', e.target.value)} style={{ marginBottom: 6, fontFamily: 'monospace', fontSize: 13 }} />
            <textarea className="form-textarea" placeholder="Lyrics…" rows={4} value={sec.lyrics}
              onChange={e => updSection(i, 'lyrics', e.target.value)} />
          </div>
        ))}
      </div>

      <div className="form-row">
        <label className="form-label">Notes (optional)</label>
        <textarea className="form-textarea" rows={2} placeholder="e.g. Capo 2, transpose for vocalists, tempo notes…"
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="btn-primary" disabled={busy || !title.trim()} onClick={submit}>
        {busy ? 'Saving…' : 'Add to Library'}
      </button>
    </BottomSheet>
  )
}
