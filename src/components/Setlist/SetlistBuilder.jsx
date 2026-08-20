import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../../contexts/AuthContext'
import { useSetlists, useSetlistViews } from '../../hooks/useSetlists'
import { useServices } from '../../hooks/useServices'
import { useSongs } from '../../hooks/useSongs'
import { extractYouTubeId, youtubeThumbnail } from '../../utils/youtube'
import { uploadMediaFile } from '../../utils/mediaUpload'
import BottomSheet from '../ui/BottomSheet'
import SongMediaFields from '../Songs/SongMediaFields'

const ELIGIBLE_SECTIONS = ['Praise', 'Worship']
const KEYS = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab']
const TAGS = ['slow', 'medium', 'upbeat', 'anthem']
const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#f97316','#06b6d4','#84cc16']
const STEPS = ['Details', 'Songs', 'Set Settings', 'Review']
const emptySongSection = () => ({ label: 'Verse 1', chords: '', lyrics: '' })
const isPublished = status => status === 'submitted' || status === 'published'

const formatUpdated = (value) => {
  if (!value?.toDate) return 'Saved recently'
  const date = value.toDate()
  const diff = Date.now() - date.getTime()
  if (diff < 60 * 60 * 1000) return 'Updated recently'
  if (diff < 24 * 60 * 60 * 1000) return `Updated ${Math.max(1, Math.round(diff / 3600000))}h ago`
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function Stepper({ step }) {
  return (
    <div className="setlist-stepper">
      {STEPS.map((label, index) => (
        <div key={label} className={`setlist-step ${index + 1 <= step ? 'active' : ''}`}>
          <span>{index + 1}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  )
}

function SortableSong({ item, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="setlist-song-item">
      <button className="setlist-grab" type="button" {...attributes} {...listeners} aria-label={`Reorder ${item.title}`}>⋮⋮</button>
      <span className="setlist-song-number">{index + 1}</span>
      <div className="setlist-song-copy">
        <div className="setlist-song-title">{item.title}</div>
        <div className="setlist-song-source">From Library{item.link ? ' · Link attached' : ''}</div>
      </div>
      <button className="setlist-remove" type="button" onClick={() => onRemove(item.uid)} aria-label={`Remove ${item.title}`}>✕</button>
    </div>
  )
}

function ManualSongForm({ onAdd, userId }) {
  const { addSong } = useSongs()
  const [title, setTitle] = useState('')
  const [key, setKey] = useState('D')
  const [bpm, setBpm] = useState('')
  const [tag, setTag] = useState('slow')
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState([emptySongSection()])
  const [ytUrl, setYtUrl] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [voiceMemo, setVoiceMemo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const videoId = extractYouTubeId(ytUrl)
  const hasLyrics = sections.some(section => section.lyrics?.trim())
  const hasMedia = !!(videoId || attachment || voiceMemo)
  const canAdd = !!title.trim() && hasMedia && hasLyrics

  const reset = () => {
    setTitle(''); setKey('D'); setBpm(''); setTag('slow'); setNotes('')
    setSections([emptySongSection()]); setYtUrl(''); setAttachment(null); setVoiceMemo(null); setError('')
  }

  const submit = async () => {
    if (!canAdd) {
      setError('Title, lyrics, and either a valid YouTube link, attached file, or voice memo are required.')
      return
    }
    setBusy(true); setError('')
    try {
      const [uploadedAttachment, uploadedVoiceMemo] = await Promise.all([
        attachment ? uploadMediaFile(attachment, userId, 'songs') : Promise.resolve(null),
        voiceMemo ? uploadMediaFile(voiceMemo, userId, 'songs') : Promise.resolve(null),
      ])
      const data = {
        title: title.trim(), key, bpm: parseInt(bpm) || 80, tags: [tag], notes,
        sections, youtubeUrl: ytUrl.trim() || null, youtubeVideoId: videoId || null,
        attachment: uploadedAttachment, voiceMemo: uploadedVoiceMemo,
        color: COLORS[Math.floor(Math.random() * COLORS.length)], addedBy: userId,
      }
      const ref = await addSong(data)
      onAdd({
        uid: `library-${ref.id}-${Date.now()}`, source: 'library', songId: ref.id,
        title: data.title, link: data.youtubeUrl, attachment: data.attachment, voiceMemo: data.voiceMemo,
      })
      reset()
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Could not add this song.')
    } finally {
      setBusy(false)
    }
  }

  const updSection = (i, field, val) => setSections(items => items.map((item, index) => index === i ? { ...item, [field]: val } : item))

  return (
    <div className="setlist-manual-card">
      <div className="form-row"><label className="form-label">Title <span style={{ color: 'var(--danger)' }}>*</span></label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title" /></div>
      <div className="setlist-two-col">
        <div className="form-row"><label className="form-label">Key</label><select className="form-select" value={key} onChange={e => setKey(e.target.value)}>{KEYS.map(item => <option key={item}>{item}</option>)}</select></div>
        <div className="form-row"><label className="form-label">BPM</label><input className="form-input" type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="72" /></div>
      </div>
      <div className="form-row"><label className="form-label">Mood</label><div className="chips">{TAGS.map(item => <button type="button" key={item} className={`chip ${tag === item ? 'active' : ''}`} onClick={() => setTag(item)}>{item}</button>)}</div></div>
      <div className="form-row">
        <label className="form-label">YouTube Link <span className="optional">(YouTube link, attachment, or voice memo required)</span></label>
        <input className="form-input" value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="https://youtu.be/..." />
        {ytUrl && !videoId && <div className="setlist-link-help error">That does not look like a YouTube link yet.</div>}
        {videoId && <div className="setlist-manual-preview"><img src={youtubeThumbnail(videoId)} alt="YouTube preview" /><span>Link ready</span></div>}
      </div>
      <SongMediaFields attachment={attachment} voiceMemo={voiceMemo} onAttachmentChange={setAttachment} onVoiceMemoChange={setVoiceMemo} requireOne />
      {!hasMedia && <div className="setlist-link-help error">Add a valid YouTube link, attach a file, or record a voice memo.</div>}
      <div className="setlist-manual-sections">
        <div className="between"><span className="form-label">Sections / Lyrics <span style={{ color: 'var(--danger)' }}>*</span></span><button className="setlist-text-btn" type="button" onClick={() => setSections(items => [...items, emptySongSection()])}>+ Add</button></div>
        {sections.map((sec, i) => (
          <div className="setlist-manual-section" key={i}>
            {sections.length > 1 && <button className="setlist-section-x" type="button" onClick={() => setSections(items => items.filter((_, index) => index !== i))}>✕</button>}
            <input className="form-input" value={sec.label} onChange={e => updSection(i, 'label', e.target.value)} placeholder="Section name" />
            <input className="form-input" value={sec.chords} onChange={e => updSection(i, 'chords', e.target.value)} placeholder="Chords (e.g. D A Bm G)" />
            <textarea className="form-textarea" rows={3} value={sec.lyrics} onChange={e => updSection(i, 'lyrics', e.target.value)} placeholder="Lyrics…" />
          </div>
        ))}
      </div>
      {!hasLyrics && <div className="setlist-link-help error">Lyrics are required. Add lyrics to at least one section.</div>}
      <div className="form-row"><label className="form-label">Notes <span className="optional">(optional)</span></label><textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Capo, arrangement, vocal notes…" /></div>
      {error && <div className="setlist-error">{error}</div>}
      <button className="btn-primary" type="button" disabled={busy || !canAdd} onClick={submit}>{busy ? 'Adding…' : 'Add to Library & Set List'}</button>
    </div>
  )
}

function MediaLink({ media, voice = false }) {
  if (!media?.url) return null
  return voice ? (
    <div className="setlist-media-item"><strong>Voice memo</strong><audio controls preload="metadata" src={media.url} /></div>
  ) : (
    <a className="setlist-media-download" href={media.url} target="_blank" rel="noreferrer">⌁ {media.name || 'Download attachment'}</a>
  )
}

function formatAuditTime(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : null)
  if (!date) return ''
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit',
  })
}

function SongAction({ song }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  if (song.link) {
    return <a href={song.link} target="_blank" rel="noreferrer" aria-label={`Open link for ${song.title}`}>↗</a>
  }
  if (!song.voiceMemo?.url) return null

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try { await audio.play(); setPlaying(true) } catch (e) { console.error(e) }
    } else {
      audio.pause(); setPlaying(false)
    }
  }

  return (
    <div className="setlist-song-audio-action">
      <button type="button" className="setlist-song-play" onClick={toggle} aria-label={`${playing ? 'Pause' : 'Play'} voice memo for ${song.title}`}>
        {playing ? '❚❚' : '▶'}
      </button>
      <audio ref={audioRef} src={song.voiceMemo.url} preload="metadata" onEnded={() => setPlaying(false)} />
    </div>
  )
}

function SetlistViewer({ setlist, onClose, canEdit = false, canDelete = canEdit, onEdit, onDelete }) {
  const { user, isAdmin } = useAuth()
  const canSeeViews = !!setlist && (isAdmin || setlist.createdBy === user?.uid)
  const { views, loading: viewsLoading, recordView } = useSetlistViews(setlist?.id, canSeeViews)
  const [showViews, setShowViews] = useState(false)
  const recordedRef = useRef(new Set())

  useEffect(() => {
    if (!setlist?.id || recordedRef.current.has(setlist.id)) return
    recordedRef.current.add(setlist.id)
    recordView(setlist).catch(err => console.error('Could not record set list view:', err))
  }, [setlist?.id])

  if (!setlist) return null
  const submittedTime = formatAuditTime(setlist.submittedAt || setlist.createdAt)
  const editedTime = formatAuditTime(setlist.lastEditedAt || setlist.updatedAt)

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Set List"
      subtitle={`${setlist.serviceDateStr || 'Service'} · ${setlist.section}`}
      action={canEdit && onEdit ? { label: 'Edit', onPress: onEdit } : null}
    >
      <div className="setlist-view-hero">
        <div><div className="label-caps">{setlist.section}</div><div className="setlist-view-title">{setlist.title || `${setlist.section} Set List`}</div></div>
        <div className="setlist-status published">Published</div>
      </div>
      <div className="setlist-meta-row">
        <span>Key <strong>{setlist.setKey || '—'}</strong></span>
        <span>Tempo <strong>{setlist.tempo ? `${setlist.tempo} BPM` : '—'}</strong></span>
        <span>Loop <strong>{setlist.loopName || 'None'}</strong></span>
      </div>
      <div className="setlist-view-list">
        {(setlist.songs || []).map((song, index) => (
          <div className="setlist-view-song" key={song.uid || `${song.title}-${index}`}>
            <span>{index + 1}</span><div><strong>{song.title}</strong><small>Library song</small></div>
            <SongAction song={song} />
          </div>
        ))}
      </div>
      {setlist.notes && <div className="setlist-team-notes"><span className="form-label">Team notes</span><p>{setlist.notes}</p></div>}
      {(setlist.attachment?.url || setlist.voiceMemo?.url) && (
        <div className="setlist-submission-media"><span className="form-label">Set list media</span><MediaLink media={setlist.voiceMemo} voice /><MediaLink media={setlist.attachment} /></div>
      )}

      <div className="setlist-audit-card">
        <div><span>Submitted by</span><strong>{setlist.createdByName || 'Team member'}</strong>{submittedTime && <small>{submittedTime}</small>}</div>
        {setlist.lastEditedByName && (
          <div><span>Last edited by</span><strong>{setlist.lastEditedByName}</strong>{editedTime && <small>{editedTime}</small>}</div>
        )}
      </div>

      {canSeeViews && (
        <div className="setlist-views-card">
          <button type="button" className="setlist-views-toggle" onClick={() => setShowViews(value => !value)}>
            <span><strong>View activity</strong><small>{views.length} recorded view{views.length === 1 ? '' : 's'}</small></span>
            <span>{showViews ? '⌃' : '⌄'}</span>
          </button>
          {showViews && (
            <div className="setlist-view-activity-list">
              {viewsLoading ? <div className="setlist-view-activity-empty">Loading…</div> : views.length === 0 ? <div className="setlist-view-activity-empty">No team members have opened this set list yet.</div> : views.map(view => (
                <div className="setlist-view-activity-row" key={view.id}>
                  <div><strong>{view.viewerName || 'Team member'}</strong><small>{formatAuditTime(view.viewedAt) || 'Just now'}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canDelete && onDelete && <button type="button" className="btn-danger" style={{ marginTop: 18 }} onClick={onDelete}>Delete Set List</button>}
    </BottomSheet>
  )
}

export { SetlistViewer }

export default function SetlistBuilder({ showAdd, onAddClose }) {
  const { user, profile, isAdmin } = useAuth()
  const { songs: librarySongs } = useSongs()
  const { services } = useServices()
  const { setlists, loading, createSetlist, updateSetlist, deleteSetlist } = useSetlists()

  const [tab, setTab] = useState('upcoming')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState('')
  const [section, setSection] = useState('')
  const [title, setTitle] = useState('')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [songMode, setSongMode] = useState('library')
  const [songQuery, setSongQuery] = useState('')
  const [setKey, setSetKey] = useState('')
  const [tempo, setTempo] = useState('')
  const [loopName, setLoopName] = useState('')
  const [notes, setNotes] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [voiceMemo, setVoiceMemo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const myId = user?.uid
  const byServiceDate = (a, b) => (a.serviceDateTs || Number.MAX_SAFE_INTEGER) - (b.serviceDateTs || Number.MAX_SAFE_INTEGER)
  const futurePublished = setlists.filter(s => isPublished(s.status) && (s.serviceDateTs || 0) >= today.getTime()).sort(byServiceDate)
  const drafts = setlists.filter(s => s.status === 'draft' && s.createdBy === myId).sort(byServiceDate)
  const past = setlists.filter(s => isPublished(s.status) && (s.serviceDateTs || 0) < today.getTime()).sort(byServiceDate)
  const visibleRows = tab === 'drafts' ? drafts : tab === 'past' ? past : futurePublished
  const selectedService = services.find(s => s.id === serviceId)
  const futureServices = useMemo(() => services.filter(s => (s.dateTs || 0) >= today.getTime()), [services])
  const availableSections = useMemo(() => {
    if (!selectedService) return []

    // A combined Praise & Worship assignment represents two independent set-list slots.
    // This lets the same assigned team create one Praise set list and one Worship set list.
    const hasCombinedAssignment = (selectedService.sections?.['Praise & Worship'] || []).length > 0
    if (hasCombinedAssignment) return ['Praise', 'Worship']

    return ELIGIBLE_SECTIONS.filter(name => (selectedService.sections?.[name] || []).length > 0)
  }, [selectedService])
  const publishedForSection = (name) => setlists.find(item =>
    isPublished(item.status) && item.serviceId === serviceId && item.section === name && item.id !== editing?.id
  )
  const filteredLibrary = librarySongs.filter(song => !songQuery.trim() || song.title?.toLowerCase().includes(songQuery.toLowerCase()))

  const resetBuilder = () => {
    setEditing(null); setStep(1); setServiceId(''); setSection(''); setTitle(''); setSelectedSongs([])
    setSongMode('library'); setSongQuery(''); setSetKey(''); setTempo(''); setLoopName(''); setNotes('')
    setAttachment(null); setVoiceMemo(null); setSaveError('')
  }
  const openCreate = () => { resetBuilder(); setCreating(true); onAddClose?.() }
  const openEdit = (item) => {
    setEditing(item); setServiceId(item.serviceId || ''); setSection(item.section || ''); setTitle(item.title || '')
    setSelectedSongs(item.songs || []); setSetKey(item.setKey || ''); setTempo(item.tempo?.toString?.() || '')
    setLoopName(item.loopName || ''); setNotes(item.notes || ''); setAttachment(null); setVoiceMemo(null); setSaveError(''); setStep(1); setCreating(true)
  }
  useEffect(() => { if (showAdd && !creating) openCreate() }, [showAdd])
  useEffect(() => { if (section && !availableSections.includes(section)) setSection('') }, [serviceId, availableSections, section])
  const closeBuilder = () => { setCreating(false); resetBuilder(); onAddClose?.() }

  const addLibrarySong = (song) => setSelectedSongs(current => current.some(item => item.songId === song.id) ? current : [...current, {
    uid: `library-${song.id}-${Date.now()}`, source: 'library', songId: song.id, title: song.title,
    link: song.youtubeUrl || null, attachment: song.attachment || null, voiceMemo: song.voiceMemo || null,
  }])
  const removeSong = uid => setSelectedSongs(current => current.filter(item => item.uid !== uid))
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setSelectedSongs(current => arrayMove(current, current.findIndex(item => item.uid === active.id), current.findIndex(item => item.uid === over.id)))
  }

  const buildPayload = async (status) => {
    const [uploadedAttachment, uploadedVoiceMemo] = await Promise.all([
      attachment ? uploadMediaFile(attachment, user?.uid, 'setlists') : Promise.resolve(null),
      voiceMemo ? uploadMediaFile(voiceMemo, user?.uid, 'setlists') : Promise.resolve(null),
    ])
    return {
      serviceId, serviceDateStr: selectedService?.dateStr || editing?.serviceDateStr || '', serviceDateTs: selectedService?.dateTs || editing?.serviceDateTs || 0,
      section, title: title.trim() || `${section} Set List`, songs: selectedSongs, setKey: setKey || null,
      tempo: parseInt(tempo) || null, loopName: loopName || null, notes: notes.trim() || null,
      attachment: uploadedAttachment || editing?.attachment || null, voiceMemo: uploadedVoiceMemo || editing?.voiceMemo || null,
      status, createdBy: editing?.createdBy || user?.uid, createdByName: editing?.createdByName || profile?.name || '',
      ...(status === 'published' && !isPublished(editing?.status) ? { submittedAt: new Date() } : {}),
      ...(editing && isPublished(editing.status) ? { lastEditedBy: user?.uid, lastEditedByName: profile?.name || '', lastEditedAt: new Date() } : {}),
    }
  }

  const save = async status => {
    if (!serviceId || !section || selectedSongs.length === 0) return
    setBusy(true); setSaveError('')
    try {
      const data = await buildPayload(status)
      if (editing) await updateSetlist(editing.id, data, editing)
      else await createSetlist(data)
      setCreating(false); resetBuilder(); setTab(status === 'draft' ? 'drafts' : 'upcoming')
    } catch (e) {
      console.error(e); setSaveError(e?.message || 'Could not save this set list.')
    } finally { setBusy(false) }
  }

  const canManageItem = item => (isAdmin || item.createdBy === myId) && (item.serviceDateTs || 0) >= today.getTime()
  const handleDelete = async item => {
    if (!canManageItem(item)) return
    if (!window.confirm('Delete this set list? This will remove it from the service.')) return
    await deleteSetlist(item)
    setViewing(null)
  }
  const canGoNext = step === 1 ? !!serviceId && !!section : step === 2 ? selectedSongs.length > 0 : true

  return (
    <>
      <div className="setlist-page-head">
        <div><span className="page-title">Set Lists</span><p>Create, continue, and review service set lists.</p></div>
      </div>
      <div className="setlist-overview-card">
        <div><span>Upcoming</span><strong>{futurePublished.length}</strong></div>
        <div><span>My Drafts</span><strong>{drafts.filter(item => item.createdBy === myId).length}</strong></div>
        <div><span>Past</span><strong>{past.length}</strong></div>
      </div>
      <div className="setlist-tabs">
        {[['upcoming', 'Upcoming'], ['drafts', 'Drafts'], ['past', 'Past']].map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {loading ? <div className="setlist-loading"><div className="spinner" /></div> : visibleRows.length === 0 ? (
        <div className="setlist-empty-card"><div className="setlist-empty-icon">♫</div><strong>{tab === 'drafts' ? 'No saved drafts' : tab === 'past' ? 'No past set lists' : 'No upcoming set lists'}</strong><span>{tab === 'drafts' ? 'Only drafts you create are visible here.' : tab === 'past' ? 'Published set lists move here after the service date.' : 'Use the + button beside your profile to create one.'}</span></div>
      ) : (
        <div className="setlist-home-list">{visibleRows.map((item, index) => {
          const featured = tab === 'upcoming' && index === 0
          return (
            <button key={item.id} className={`setlist-home-card ${featured ? 'featured' : ''}`} type="button" onClick={() => item.status === 'draft' ? openEdit(item) : setViewing(item)}>
              <div className="setlist-date-badge"><span>{item.serviceDateStr?.split(',')?.[0] || 'SET'}</span><strong>{item.serviceDateStr?.match(/\d+/)?.[0] || '•'}</strong></div>
              <div className="setlist-home-copy">{featured && <small className="setlist-next-label">Next service</small>}<strong>{item.title || `${item.section} Set List`}</strong><span>{item.serviceDateStr || 'Service'} · {item.section}</span><small>{item.songs?.length || 0} songs · {formatUpdated(item.updatedAt || item.createdAt)}</small></div>
              <span className={`setlist-status ${item.status === 'draft' ? 'draft' : 'published'}`}>{item.status === 'draft' ? 'Draft' : 'Published'}</span>
            </button>
          )
        })}</div>
      )}

      <BottomSheet open={creating} onClose={closeBuilder} title={editing ? 'Edit Set List' : 'Create Set List'} subtitle={`Step ${step} of 4 · ${STEPS[step - 1]}`}>
        <Stepper step={step} />
        {step === 1 && <>
          <div className="setlist-builder-heading">Service & Section</div><p className="setlist-builder-subtext">Only music sections that actually have an assignee on the selected service can receive a set list. A Praise & Worship assignment has two separate set-list slots: Praise and Worship.</p>
          <div className="form-row"><label className="form-label">Service</label><select className="form-select" value={serviceId} onChange={e => setServiceId(e.target.value)}><option value="">Select a service…</option>{futureServices.map(service => <option key={service.id} value={service.id}>{service.dateStr}</option>)}</select></div>
          {serviceId && <div className="form-row"><label className="form-label">Assigned section</label>{availableSections.length ? <div className="setlist-section-grid">{availableSections.map(item => {
              const occupied = publishedForSection(item)
              return <button key={item} type="button" disabled={!!occupied} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}{occupied ? <small>Set list already published</small> : null}</button>
            })}</div> : <div className="setlist-info-card">This service has no Praise, Worship, or Praise & Worship assignment yet.</div>}</div>}
          <div className="form-row"><label className="form-label">Set list title <span className="optional">(optional)</span></label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={section ? `${section} Set List` : 'Sunday set list'} /></div>
        </>}

        {step === 2 && <>
          <div className="setlist-builder-heading">Add Songs</div><p className="setlist-builder-subtext">Choose a Library song or add a complete new song. Manually added songs are automatically saved to the Library.</p>
          <div className="setlist-mode-tabs"><button type="button" className={songMode === 'library' ? 'active' : ''} onClick={() => setSongMode('library')}>Library</button><button type="button" className={songMode === 'manual' ? 'active' : ''} onClick={() => setSongMode('manual')}>Add Manually</button></div>
          {songMode === 'library' ? <><div className="search-wrap" style={{ marginBottom: 12 }}><svg className="search-ico" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg><input className="search-input" value={songQuery} onChange={e => setSongQuery(e.target.value)} placeholder="Search your library…" /></div><div className="setlist-library-list">{filteredLibrary.map(song => { const added = selectedSongs.some(item => item.songId === song.id); return <button type="button" key={song.id} className="setlist-library-row" onClick={() => addLibrarySong(song)} disabled={added}><div className="setlist-library-art" style={{ background: song.color || 'var(--accent)' }}>♫</div><div><strong>{song.title}</strong><span>{song.youtubeUrl ? 'Library song · Link available' : 'Library song'}</span></div><span>{added ? '✓' : '+'}</span></button> })}</div></> : <ManualSongForm onAdd={song => setSelectedSongs(current => [...current, song])} userId={user?.uid} />}
          {selectedSongs.length > 0 && <div className="setlist-selected-wrap"><div className="between"><span className="form-label">Current set ({selectedSongs.length})</span><small>Drag to reorder</small></div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={selectedSongs.map(item => item.uid)} strategy={verticalListSortingStrategy}>{selectedSongs.map((item, index) => <SortableSong key={item.uid} item={item} index={index} onRemove={removeSong} />)}</SortableContext></DndContext></div>}
        </>}

        {step === 3 && <>
          <div className="setlist-builder-heading">Set Settings</div><p className="setlist-builder-subtext">Key and tempo apply to the whole set. Loop selection is shown now and can be connected when your loop library is added.</p>
          <div className="form-row"><label className="form-label">Set key <span className="optional">(optional)</span></label><div className="setlist-key-grid">{KEYS.map(key => <button type="button" key={key} className={setKey === key ? 'active' : ''} onClick={() => setSetKey(setKey === key ? '' : key)}>{key}</button>)}</div></div>
          <div className="form-row"><label className="form-label">Set tempo <span className="optional">(optional)</span></label><input className="form-input" type="number" inputMode="numeric" value={tempo} onChange={e => setTempo(e.target.value)} placeholder="e.g. 72 BPM" /></div>
          <div className="setlist-loop-card"><div><strong>Loop Track</strong><span>Loop library coming soon.</span></div><button type="button" disabled>{loopName || 'Choose Loop'}</button></div>
          <div className="form-row" style={{ marginTop: 16 }}><label className="form-label">Team notes <span className="optional">(optional)</span></label><textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add reminders for the team…" /></div>
          <div className="setlist-submission-media-form"><span className="form-label">Set list media <span className="optional">(optional)</span></span><p>Attach a team file or voice memo. These are only shown when viewing this set list and are not added to the Song Library.</p><SongMediaFields attachment={attachment} voiceMemo={voiceMemo} onAttachmentChange={setAttachment} onVoiceMemoChange={setVoiceMemo} /></div>
        </>}

        {step === 4 && <>
          <div className="setlist-review-hero"><div><strong>{selectedService?.dateStr || editing?.serviceDateStr}</strong><span>{section}</span></div><span>{selectedSongs.length} songs</span></div>
          <div className="setlist-review-settings"><div><span>Key</span><strong>{setKey || '—'}</strong></div><div><span>Tempo</span><strong>{tempo ? `${tempo} BPM` : '—'}</strong></div><div><span>Loop</span><strong>{loopName || 'None'}</strong></div></div>
          <div className="setlist-view-list">{selectedSongs.map((song, index) => <div className="setlist-view-song" key={song.uid}><span>{index + 1}</span><div><strong>{song.title}</strong><small>Library song</small></div>{song.link && <a href={song.link} target="_blank" rel="noreferrer">↗</a>}</div>)}</div>
          {saveError && <div className="setlist-error">{saveError}</div>}
        </>}

        <div className="setlist-builder-footer">
          {step > 1 && <button className="btn-secondary" type="button" onClick={() => setStep(value => value - 1)}>Back</button>}
          {step < 4 ? <button className="btn-primary" type="button" disabled={!canGoNext} onClick={() => setStep(value => value + 1)}>Next</button> : isPublished(editing?.status) ? <button className="btn-primary" type="button" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving…' : 'Save Changes'}</button> : <><button className="btn-secondary" type="button" disabled={busy} onClick={() => save('draft')}>Save Draft</button><button className="btn-primary" type="button" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving…' : 'Publish Set List'}</button></>}
        </div>
      </BottomSheet>

      {viewing && <SetlistViewer setlist={viewing} onClose={() => setViewing(null)} canEdit={canManageItem(viewing)} onEdit={() => { const item = viewing; setViewing(null); openEdit(item) }} onDelete={() => handleDelete(viewing)} />}
    </>
  )
}
