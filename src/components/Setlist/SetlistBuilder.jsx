import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSetlist } from '../../hooks/useSetlists'
import { useSongs } from '../../hooks/useSongs'
import { exportSetlistPDF } from '../../utils/pdfExport'
import BottomSheet from '../ui/BottomSheet'

const EVENTS = [
  { id: 'sunday-service',  name: 'Sunday Service'      },
  { id: 'midweek',         name: 'Midweek Service'     },
  { id: 'good-friday',     name: 'Good Friday'         },
  { id: 'easter-sunday',   name: 'Easter Sunday'       },
  { id: 'special-event',   name: 'Special Event'       },
]

function SortablePill({ pill, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pill.uid })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`s-pill ${pill.type}`}>
      <span>{pill.label}</span>
      <button className="pill-x" onPointerDown={e => e.stopPropagation()} onClick={() => onRemove(pill.uid)}>✕</button>
    </div>
  )
}

export default function SetlistBuilder({ showAdd, onAddClose }) {
  const [eventId,    setEventId]    = useState('')
  const [eventName,  setEventName]  = useState('')
  const [showSongs,  setShowSongs]  = useState(false)
  const [activeId,   setActiveId]   = useState(null)
  const [exporting,  setExporting]  = useState(false)

  const { pills, loading, savePills } = useSetlist(eventId)
  const { songs } = useSongs()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const addSong = (song) => {
    savePills([...pills, { uid: `${Date.now()}`, type: 'song', id: song.id, label: song.title }])
  }

  const addSpecial = (type) => {
    const labels = { interlude: 'Interlude', prayer: 'Prayer', transition: 'Transition' }
    savePills([...pills, { uid: `${Date.now()}`, type, label: labels[type] }])
  }

  const removePill = (uid) => savePills(pills.filter(p => p.uid !== uid))

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (over && active.id !== over.id) {
      const oldIdx = pills.findIndex(p => p.uid === active.id)
      const newIdx = pills.findIndex(p => p.uid === over.id)
      savePills(arrayMove(pills, oldIdx, newIdx))
    }
  }

  const handleExport = async () => {
    if (!pills.length) return
    setExporting(true)
    await exportSetlistPDF(eventName || 'Setlist', pills, songs)
    setExporting(false)
  }

  const activeItem = pills.find(p => p.uid === activeId)

  return (
    <>
      <div className="between">
        <span className="page-title">Setlist</span>
        {pills.length > 0 && (
          <button onClick={handleExport} disabled={exporting}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {exporting ? 'Exporting…' : '↓ PDF'}
          </button>
        )}
      </div>

      {/* Event selector */}
      <select className="event-select" value={eventId}
        onChange={e => {
          setEventId(e.target.value)
          setEventName(EVENTS.find(ev => ev.id === e.target.value)?.name || '')
        }}>
        <option value="">Select an event…</option>
        {EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
      </select>

      {/* Stage */}
      <div className="stage-box">
        <div className="label-caps" style={{ marginBottom: 10 }}>Flow Order</div>
        {!eventId ? (
          <div className="stage-empty">Select an event to start building your setlist</div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
        ) : pills.length === 0 ? (
          <div className="stage-empty">Tap songs below to add them to the setlist</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragEnd={handleDragEnd}>
            <SortableContext items={pills.map(p => p.uid)} strategy={horizontalListSortingStrategy}>
              <div className="pills-wrap">
                {pills.map(p => <SortablePill key={p.uid} pill={p} onRemove={removePill} />)}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeItem && (
                <div className={`s-pill ${activeItem.type}`} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)', opacity: 0.9 }}>
                  {activeItem.label}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Adder */}
      {eventId && (
        <div className="adder-box">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>Add to setlist</div>

          {/* Song rows */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {songs.map(s => (
              <div key={s.id} className="song-row" onClick={() => addSong(s)}>
                <div>
                  <div className="song-row-name">{s.title}</div>
                  <div className="song-row-key">{s.key} · {s.bpm} BPM</div>
                </div>
                <span className="add-plus">+</span>
              </div>
            ))}
            {songs.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', padding: '16px 0' }}>
                Add songs to the Library first
              </div>
            )}
          </div>

          <div className="special-row">
            <button className="spec-btn interlude"  onClick={() => addSpecial('interlude')}>＋ Interlude</button>
            <button className="spec-btn prayer"     onClick={() => addSpecial('prayer')}>＋ Prayer</button>
            <button className="spec-btn transition" onClick={() => addSpecial('transition')}>＋ Transition</button>
          </div>
        </div>
      )}
    </>
  )
}
