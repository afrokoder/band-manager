import { useState, useEffect } from 'react'
import BottomSheet from '../ui/BottomSheet'
import { useAuth } from '../../contexts/AuthContext'
import { extractYouTubeId, youtubeThumbnail } from '../../utils/youtube'
import { uploadMediaFile } from '../../utils/mediaUpload'
import SongMediaFields from './SongMediaFields'

const KEYS  = ['A','Bb','B','C','C#','D','Eb','E','F','F#','G','Ab']
const TAGS  = ['slow','medium','upbeat','anthem']
const COLORS= ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#f97316','#06b6d4','#84cc16']

const empty = () => ({ label: 'Verse 1', chords: '', lyrics: '' })

/**
 * AddSongSheet — handles both Add and Edit modes.
 * Edit mode: pass `song` prop (existing song object). onSave receives (data, song).
 * Add  mode: song is null/undefined.           onSave receives (data, null).
 */
export default function AddSongSheet({ open, onClose, onSave, song: editSong }) {
  const { user } = useAuth()
  const isEdit = !!editSong

  const [title,    setTitle]    = useState('')
  const [key,      setKey]      = useState('D')
  const [bpm,      setBpm]      = useState('')
  const [tag,      setTag]      = useState('slow')
  const [notes,    setNotes]    = useState('')
  const [sections, setSections] = useState([empty()])
  const [ytUrl,    setYtUrl]    = useState('')
  const [busy,     setBusy]     = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [voiceMemo, setVoiceMemo] = useState(null)

  // Populate form when editing
  useEffect(() => {
    if (editSong) {
      setTitle(editSong.title || '')
      setKey(editSong.key || 'D')
      setBpm(editSong.bpm?.toString() || '')
      setTag(editSong.tags?.[0] || 'slow')
      setNotes(editSong.notes || '')
      setSections(editSong.sections?.length ? editSong.sections : [empty()])
      setYtUrl(editSong.youtubeUrl || '')
      setAttachment(null)
      setVoiceMemo(null)
    } else {
      // Reset for add mode
      setTitle(''); setKey('D'); setBpm(''); setTag('slow')
      setNotes(''); setSections([empty()]); setYtUrl('')
      setAttachment(null); setVoiceMemo(null)
    }
  }, [editSong, open])

  const addSection = () => setSections(s => [...s, empty()])
  const updSection = (i, field, val) => setSections(s => s.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const delSection = (i) => setSections(s => s.filter((_, j) => j !== i))

  const ytVideoId = extractYouTubeId(ytUrl)
  const hasLyrics = sections.some(section => section.lyrics?.trim())
  const hasMedia = !!(ytVideoId || attachment || voiceMemo || editSong?.attachment || editSong?.voiceMemo || editSong?.fileUrl)
  const canSubmit = !!title.trim() && hasMedia && hasLyrics

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      const [uploadedAttachment, uploadedVoiceMemo] = await Promise.all([
        attachment ? uploadMediaFile(attachment, user?.uid, 'songs') : Promise.resolve(null),
        voiceMemo ? uploadMediaFile(voiceMemo, user?.uid, 'songs') : Promise.resolve(null),
      ])

      const data = {
        title: title.trim(),
        key,
        bpm: parseInt(bpm) || 80,
        tags: [tag],
        notes,
        sections,
        youtubeUrl:     ytUrl.trim() || null,
        youtubeVideoId: ytVideoId || null,
        attachment: uploadedAttachment || editSong?.attachment || null,
        voiceMemo: uploadedVoiceMemo || editSong?.voiceMemo || null,
      }
      if (!isEdit) {
        data.color   = COLORS[Math.floor(Math.random() * COLORS.length)]
        data.addedBy = user?.uid
      }
      await onSave(data, editSong || null)
      onClose()
    } catch (e) {
      console.error(e)
    }
    setBusy(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit Song' : 'Add Song'}>
      <div className="form-row">
        <label className="form-label">Title <span style={{ color: 'var(--danger)' }}>*</span></label>
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

      {/* YouTube link */}
      <div className="form-row">
        <label className="form-label">YouTube Link <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(YouTube link, attachment, or voice memo required)</span></label>
        <input className="form-input" placeholder="https://youtu.be/..." value={ytUrl}
          onChange={e => setYtUrl(e.target.value)} />
        {ytUrl && !ytVideoId && (
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Couldn't recognise that YouTube URL — try copying the link again.</p>
        )}
        {ytVideoId && (
          <div style={{ marginTop: 8, borderRadius: 'var(--r-sm)', overflow: 'hidden', position: 'relative', aspectRatio: '16/9' }}>
            <img src={youtubeThumbnail(ytVideoId)} alt="YouTube thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
        )}
      </div>


      <SongMediaFields
        attachment={attachment}
        voiceMemo={voiceMemo}
        onAttachmentChange={setAttachment}
        onVoiceMemoChange={setVoiceMemo}
        requireOne
      />
      {!hasMedia && (
        <p style={{ fontSize: 12, color: 'var(--danger)', margin: '-6px 0 14px' }}>
          Add a valid YouTube link, attach a file, or record a voice memo.
        </p>
      )}

      {/* Sections */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span className="form-label" style={{ marginBottom: 0 }}>Sections / Lyrics <span style={{ color: 'var(--danger)' }}>*</span></span>
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

      {!hasLyrics && (
        <p style={{ fontSize: 12, color: 'var(--danger)', margin: '-6px 0 14px' }}>
          Lyrics are required. Add lyrics to at least one section.
        </p>
      )}

      <div className="form-row">
        <label className="form-label">Notes (optional)</label>
        <textarea className="form-textarea" rows={2} placeholder="e.g. Capo 2, transpose for vocalists, tempo notes…"
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="btn-primary" disabled={busy || !canSubmit} onClick={submit}>
        {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Library'}
      </button>
    </BottomSheet>
  )
}
