import { useState } from 'react'
import { useRehearsals, useMembers } from '../../hooks/useRehearsals'
import { useServices } from '../../hooks/useServices'
import { useAuth } from '../../contexts/AuthContext'
import BottomSheet from '../ui/BottomSheet'
import Avatar from '../ui/Avatar'
import config from '../../config'

const GL = { all: 'Everyone', band: 'Band', vocals: 'Vocals' }

// ── Date / time helpers ────────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function formatTime(timeStr) {
  if (!timeStr) return 'TBD'
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function parseTimeToInput(str) {
  if (!str || str === 'TBD') return ''
  const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return ''
  let h = parseInt(m[1])
  const ampm = m[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2,'0')}:${m[2]}`
}

function tsToDateInput(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// REHEARSALS
// ═══════════════════════════════════════════════════════════════════════════════

function RehearsalSheet({ open, onClose, onSave, onDelete, rehearsal }) {
  const isEdit = !!rehearsal
  const [name,     setName]     = useState(rehearsal?.name     || '')
  const [date,     setDate]     = useState(rehearsal ? tsToDateInput(rehearsal.dateTs) : '')
  const [time,     setTime]     = useState(rehearsal ? parseTimeToInput(rehearsal.time) : '')
  const [location, setLocation] = useState(rehearsal?.location !== 'TBD' ? (rehearsal?.location || '') : '')
  const [group,    setGroup]    = useState(rehearsal?.group    || 'all')
  const [confirm,  setConfirm]  = useState(false)
  const [busy,     setBusy]     = useState(false)

  const save = async () => {
    if (!name || !date) return
    setBusy(true)
    await onSave({ name, dateStr: formatDate(date), time: formatTime(time), location: location || 'TBD', group, dateTs: new Date(date).getTime() }, rehearsal)
    setBusy(false)
    onClose()
  }

  const handleDelete = async () => {
    setBusy(true)
    await onDelete(rehearsal.id)
    setBusy(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit Rehearsal' : 'Add Rehearsal'} key={rehearsal?.id || 'new-r'}>
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
        {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Rehearsal'}
      </button>
      {isEdit && (
        <div style={{ marginTop: 12 }}>
          {confirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={busy}>Delete</button>
            </div>
          ) : (
            <button className="btn-danger" onClick={() => setConfirm(true)}>Delete Rehearsal</button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

function RehearsalCard({ r, members, onRsvp, onEdit, canManage }) {
  const { user, profile } = useAuth()
  const relevant = members.filter(m => {
    if (r.group === 'all') return true
    return (m.groups || (m.group ? [m.group] : [])).includes(r.group)
  })
  const myRsvp = r.rsvp?.[user?.uid] || 'pending'

  return (
    <div className="rehearsal-card" style={{ marginBottom: 12 }}>
      <div className="rehearsal-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rehearsal-name">{r.name}</div>
          <div className="rehearsal-meta">{r.dateStr} · {r.time} · {r.location}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className={`group-pill ${r.group}`}>{GL[r.group]}</span>
          {canManage && (
            <button onClick={() => onEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text3)', borderRadius: 6 }}>
              ✏️
            </button>
          )}
        </div>
      </div>

      {(r.group === 'all' || (profile?.groups || [profile?.group]).includes(r.group)) && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6 }}>
          {['confirmed','declined','pending'].map(s => (
            <button key={s} onClick={() => onRsvp(r.id, user.uid, myRsvp)}
              style={{
                padding: '4px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600,
                border: myRsvp === s ? 'none' : '1px solid rgba(0,0,0,0.12)',
                background: myRsvp === s ? (s === 'confirmed' ? 'var(--success)' : s === 'declined' ? 'var(--danger)' : 'var(--warn)') : 'transparent',
                color: myRsvp === s ? '#fff' : 'var(--text2)', cursor: 'pointer',
              }}>
              {s === 'confirmed' ? '✓ Going' : s === 'declined' ? '✗ Can\'t Go' : '? Maybe'}
            </button>
          ))}
        </div>
      )}

      <div className="member-row">
        {relevant.map(m => (
          <div key={m.id} className="member-chip">
            <Avatar photoURL={m.photoURL} initial={m.initial} color={m.color} />
            <span>{m.name}</span>
            <div className={`rsvp-dot ${r.rsvp?.[m.id] || 'pending'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

/** Mini member picker — shows all members as tappable avatar chips */
function MemberPicker({ members, selected, onChange, disabled = false }) {
  const toggle = (uid) => {
    if (disabled) return

    if (selected.includes(uid)) {
      onChange([])
      return
    }

    onChange([uid])
  }
  return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, opacity: disabled ? 0.45 : 1 }}>
        {members.map(m => {
          const on = selected.includes(m.id)
          return (
              <button key={m.id} onClick={() => toggle(m.id)} disabled={disabled}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px 5px 6px',
                        borderRadius: 'var(--r-pill)',
                        border: on ? '2px solid var(--accent)' : '2px solid var(--border)',
                        background: on ? 'rgba(0,113,227,0.08)' : 'var(--bg)',
                        cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: on ? 600 : 400,
                        color: on ? 'var(--accent)' : 'var(--text2)',
                      }}>
                <Avatar photoURL={m.photoURL} initial={m.initial} color={m.color}
                        style={{ width: 24, height: 24, fontSize: 10 }} />
                {m.name}
              </button>
          )
        })}
      </div>
  )
}

function ServiceSheet({ open, onClose, onSave, onDelete, service, members }) {
  const isEdit = !!service

  const [date,     setDate]     = useState(service ? tsToDateInput(service.dateTs) : '')
  const [sections, setSections] = useState(() => {
    const init = {}
    config.serviceSections.forEach(s => { init[s] = service?.sections?.[s] || [] })
    return init
  })
  const [confirm, setConfirm] = useState(false)
  const [busy,    setBusy]    = useState(false)

  const hasPraiseOrWorshipAssignee =
      (sections.Praise?.length || 0) > 0 || (sections.Worship?.length || 0) > 0

  const hasPraiseAndWorshipAssignee =
      (sections['Praise & Worship']?.length || 0) > 0

  const isSectionDisabled = (sectionName) => {
    if (sectionName === 'Praise & Worship') return hasPraiseOrWorshipAssignee
    if (sectionName === 'Praise' || sectionName === 'Worship') return hasPraiseAndWorshipAssignee
    return false
  }

  const disabledReason = (sectionName) => {
    if (sectionName === 'Praise & Worship' && hasPraiseOrWorshipAssignee) {
      return 'Clear Praise and Worship assignments to use Praise & Worship.'
    }
    if ((sectionName === 'Praise' || sectionName === 'Worship') && hasPraiseAndWorshipAssignee) {
      return 'Clear Praise & Worship to assign Praise or Worship separately.'
    }
    return null
  }

  const setSection = (name, uids) =>
      setSections(prev => ({ ...prev, [name]: uids }))

  const save = async () => {
    if (!date) return
    setBusy(true)
    await onSave({ dateStr: formatDate(date), dateTs: new Date(date).getTime(), sections }, service)
    setBusy(false)
    onClose()
  }

  const handleDelete = async () => {
    setBusy(true)
    await onDelete(service.id)
    setBusy(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit Service' : 'Add Service'} key={service?.id || 'new-s'}>
      <div className="form-row">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {config.serviceSections.map(sec => {
        const reason = disabledReason(sec)

        return (
          <div key={sec} className="form-row">
            <label className="form-label">{sec}</label>
            <MemberPicker
              members={members}
              selected={sections[sec] || []}
              disabled={isSectionDisabled(sec)}
              onChange={uids => setSection(sec, uids)}
            />
            {reason && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                {reason}
              </div>
            )}
          </div>
        )
      })}

      <button className="btn-primary" style={{ marginTop: 8 }} disabled={busy || !date} onClick={save}>
        {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Service'}
      </button>

      {isEdit && (
        <div style={{ marginTop: 12 }}>
          {confirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={busy}>Delete</button>
            </div>
          ) : (
            <button className="btn-danger" onClick={() => setConfirm(true)}>Delete Service</button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

function ServiceCard({ service, members, canManage, onEdit, currentUserId }) {
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const hasPraiseOrWorshipAssignee =
    (service.sections?.Praise?.length || 0) > 0 || (service.sections?.Worship?.length || 0) > 0

  const hasPraiseAndWorshipAssignee =
    (service.sections?.['Praise & Worship']?.length || 0) > 0

  const visibleServiceSections = config.serviceSections.filter(sec => {
    if (sec === 'Praise & Worship') return !hasPraiseOrWorshipAssignee
    if (sec === 'Praise' || sec === 'Worship') return !hasPraiseAndWorshipAssignee
    return true
  })

  const iAmIn = visibleServiceSections.some(sec =>
    (service.sections?.[sec] || []).includes(currentUserId)
  )

  return (
    <div className="rehearsal-card" style={{ marginBottom: 12 }}>
      {/* Header */}
      <div className="rehearsal-head">
        <div style={{ flex: 1 }}>
          <div className="rehearsal-name">{service.dateStr}</div>
          {iAmIn && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>
              ★ You're assigned this Sunday
            </div>
          )}
        </div>
        {canManage && (
          <button onClick={() => onEdit(service)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text3)', borderRadius: 6 }}>
            ✏️
          </button>
        )}
      </div>

      {/* Section rows */}
      <div style={{ padding: '4px 16px 14px' }}>
        {visibleServiceSections.map(sec => {
          const assignees = (service.sections?.[sec] || [])
            .map(uid => memberMap[uid])
            .filter(Boolean)
          const iAmHere = (service.sections?.[sec] || []).includes(currentUserId)

          return (
            <div key={sec} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 0',
              borderBottom: sec !== visibleServiceSections[visibleServiceSections.length - 1]
                ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: iAmHere ? 'var(--accent)' : 'var(--text3)',
                width: 110,
                flexShrink: 0,
                paddingTop: 4,
              }}>
                {sec}
              </div>

              {assignees.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', paddingTop: 3 }}>
                  TBD
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {assignees.map(m => (
                    <div key={m.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: m.id === currentUserId ? 'rgba(0,113,227,0.08)' : 'var(--bg)',
                      border: m.id === currentUserId ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      borderRadius: 'var(--r-pill)',
                      padding: '3px 8px 3px 4px',
                    }}>
                      <Avatar
                        photoURL={m.photoURL}
                        initial={m.initial}
                        color={m.color}
                        style={{ width: 22, height: 22, fontSize: 9 }}
                      />
                      <span style={{
                        fontSize: 12,
                        fontWeight: m.id === currentUserId ? 600 : 400,
                        color: m.id === currentUserId ? 'var(--accent)' : 'var(--text1)',
                      }}>
                        {m.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCHEDULE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export default function Schedule({ showAdd, onAddClose }) {
  const { rehearsals, loading: rLoading, addRehearsal, updateRehearsal, deleteRehearsal, toggleRsvp } = useRehearsals()
  const { services,   loading: sLoading, addService,   updateService,   deleteService }               = useServices()
  const { user, isAdmin, profile } = useAuth()
  const members = useMembers()

  const [activeTab,      setActiveTab]      = useState('rehearsals')  // 'rehearsals' | 'services'
  const [editingR,       setEditingR]       = useState(null)
  const [editingS,       setEditingS]       = useState(null)

  const isBand    = (profile?.groups || [profile?.group]).includes('band')
  const canManage = isAdmin || isBand

  // ── save handlers ─────────────────────────────────────────────────────────
  const handleSaveR = async (data, rehearsal) => {
    if (rehearsal) await updateRehearsal(rehearsal.id, data)
    else           await addRehearsal({ ...data, rsvp: {} })
  }

  const handleSaveS = async (data, service) => {
    if (service) await updateService(service.id, data)
    else         await addService(data)
  }

  const loading = activeTab === 'rehearsals' ? rLoading : sLoading

  return (
    <>
      <span className="page-title">Schedule</span>

      {/* Tab toggle */}
      <div className="chips" style={{ marginBottom: 16 }}>
        {[['rehearsals','🎵 Rehearsals'], ['services','🎙️ Services']].map(([id, label]) => (
          <div key={id} className={`chip ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            {label}
          </div>
        ))}
      </div>

      {/* ── Rehearsals tab ── */}
      {activeTab === 'rehearsals' && (
        <>
          {rLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : rehearsals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No rehearsals yet</div>
              <div className="empty-state-text">Tap + to schedule your first rehearsal</div>
            </div>
          ) : (
            rehearsals.map(r => (
              <RehearsalCard key={r.id} r={r} members={members} onRsvp={toggleRsvp}
                canManage={canManage} onEdit={setEditingR} />
            ))
          )}

          <RehearsalSheet open={showAdd && activeTab === 'rehearsals'} onClose={onAddClose}
            onSave={handleSaveR} onDelete={deleteRehearsal} />
          {editingR && (
            <RehearsalSheet open onClose={() => setEditingR(null)}
              onSave={handleSaveR} onDelete={deleteRehearsal} rehearsal={editingR} />
          )}
        </>
      )}

      {/* ── Services tab ── */}
      {activeTab === 'services' && (
        <>
          {sLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : services.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎙️</div>
              <div className="empty-state-title">No services scheduled</div>
              <div className="empty-state-text">
                {canManage ? 'Tap + to assign members to upcoming Sundays' : 'No service roster has been set up yet'}
              </div>
            </div>
          ) : (
            services.map(s => (
              <ServiceCard key={s.id} service={s} members={members}
                canManage={canManage} onEdit={setEditingS} currentUserId={user?.uid} />
            ))
          )}

          {canManage && (
            <ServiceSheet open={showAdd && activeTab === 'services'} onClose={onAddClose}
              onSave={handleSaveS} onDelete={deleteService} members={members} />
          )}
          {editingS && (
            <ServiceSheet open onClose={() => setEditingS(null)}
              onSave={handleSaveS} onDelete={deleteService} members={members} service={editingS} />
          )}
        </>
      )}
    </>
  )
}
