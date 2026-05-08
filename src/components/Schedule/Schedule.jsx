import { useState } from 'react'
import { useRehearsals, useMembers } from '../../hooks/useRehearsals'
import { useAuth } from '../../contexts/AuthContext'
import BottomSheet from '../ui/BottomSheet'

const GL = { all: 'Everyone', band: 'Band', vocals: 'Vocals' }

function RehearsalCard({ r, members, onRsvp }) {
  const { user, profile } = useAuth()
  const relevant = members.filter(m => r.group === 'all' || m.group === r.group)
  const myRsvp   = r.rsvp?.[user?.uid] || 'pending'

  return (
    <div className="rehearsal-card" style={{ marginBottom: 12 }}>
      <div className="rehearsal-head">
        <div>
          <div className="rehearsal-name">{r.name}</div>
          <div className="rehearsal-meta">{r.dateStr} · {r.time} · {r.location}</div>
        </div>
        <span className={`group-pill ${r.group}`}>{GL[r.group]}</span>
      </div>

      {/* My RSVP */}
      {(r.group === 'all' || r.group === profile?.group) && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6 }}>
          {['confirmed','declined','pending'].map(s => (
            <button key={s} onClick={() => onRsvp(r.id, user.uid, myRsvp)}
              style={{
                padding: '4px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600,
                border: myRsvp === s ? 'none' : '1px solid rgba(0,0,0,0.12)',
                background: myRsvp === s
                  ? s === 'confirmed' ? 'var(--success)' : s === 'declined' ? 'var(--danger)' : 'var(--warn)'
                  : 'transparent',
                color: myRsvp === s ? '#fff' : 'var(--text2)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {s === 'confirmed' ? '✓ Going' : s === 'declined' ? '✗ Can\'t go' : '? Maybe'}
            </button>
          ))}
        </div>
      )}

      {/* Member chips */}
      <div className="member-row">
        {relevant.map(m => {
          const status = r.rsvp?.[m.id] || 'pending'
          return (
            <div key={m.id} className="member-chip">
              <div className="avatar" style={{ background: m.color }}>{m.initial}</div>
              <span>{m.name}</span>
              <div className={`rsvp-dot ${status}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Schedule({ showAdd, onAddClose }) {
  const { rehearsals, loading, addRehearsal, toggleRsvp } = useRehearsals()
  const members = useMembers()

  const [name,     setName]     = useState('')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('')
  const [location, setLocation] = useState('')
  const [group,    setGroup]    = useState('all')
  const [busy,     setBusy]     = useState(false)

  const save = async () => {
    if (!name || !date) return
    setBusy(true)
    const d      = new Date(date + 'T00:00:00')
    const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const dateStr = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
    let timeStr = 'TBD'
    if (time) {
      const [h, m] = time.split(':').map(Number)
      timeStr = `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
    }
    await addRehearsal({ name, dateStr, time: timeStr, location: location || 'TBD', group, dateTs: new Date(date).getTime(), rsvp: {} })
    setName(''); setDate(''); setTime(''); setLocation(''); setGroup('all')
    setBusy(false)
    onAddClose()
  }

  return (
    <>
      <span className="page-title">Rehearsals</span>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : rehearsals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No rehearsals yet</div>
          <div className="empty-state-text">Tap + to schedule your first rehearsal</div>
        </div>
      ) : (
        rehearsals.map(r => (
          <RehearsalCard key={r.id} r={r} members={members} onRsvp={toggleRsvp} />
        ))
      )}

      {/* Add rehearsal sheet */}
      <BottomSheet open={showAdd} onClose={onAddClose} title="Add Rehearsal">
        <div className="form-row">
          <label className="form-label">Name</label>
          <input className="form-input" placeholder="e.g. Sunday Service Prep" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-row">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Time</label>
            <input className="form-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <label className="form-label">Location</label>
          <input className="form-input" placeholder="Main Auditorium" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="form-label">Group</label>
          <select className="form-select" value={group} onChange={e => setGroup(e.target.value)}>
            <option value="all">Everyone</option>
            <option value="band">Band Only</option>
            <option value="vocals">Vocals Only</option>
          </select>
        </div>
        <button className="btn-primary" disabled={busy || !name || !date} onClick={save}>
          {busy ? 'Adding…' : 'Add Rehearsal'}
        </button>
      </BottomSheet>
    </>
  )
}
