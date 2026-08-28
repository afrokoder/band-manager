import { useEffect, useMemo, useState } from 'react'
import { useRehearsals, useMembers } from '../../hooks/useRehearsals'
import { useServices } from '../../hooks/useServices'
import { useSetlists, useSetlistLookup } from '../../hooks/useSetlists'
import { SetlistViewer } from '../Setlist/SetlistBuilder'
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
  const [time,     setTime]     = useState(rehearsal ? (parseTimeToInput(rehearsal.time) || '10:00') : '10:00')
  const [location, setLocation] = useState(rehearsal?.location !== 'TBD' ? (rehearsal?.location || '') : '')
  const [group,    setGroup]    = useState(rehearsal?.group    || 'all')
  const [confirm,  setConfirm]  = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')

  const save = async () => {
    if (!name || !date) return
    setBusy(true); setError('')
    try {
      await onSave({ name, dateStr: formatDate(date), time: formatTime(time), location: location || 'TBD', group, dateTs: new Date(date).getTime() }, rehearsal)
      onClose()
    } catch (e) {
      setError(e?.message || 'Could not save rehearsal.')
    } finally { setBusy(false) }
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
      {error && <div className="schedule-form-error">{error}</div>}
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

function memberGroups(member) {
  return member?.groups || (member?.group ? [member.group] : [])
}

function normalizedRsvp(value) {
  // Older records stored a string; newer submissions store status + timestamp.
  const status = typeof value === 'object' && value ? value.status : value
  if (status === 'pending') return 'maybe'
  return status || 'none'
}

function rsvpSubmittedAt(value) {
  if (!value || typeof value !== 'object') return null
  return value.submittedAt?.toDate?.() || null
}

function formatSubmittedAt(value) {
  const date = rsvpSubmittedAt(value)
  if (!date) return null
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function rehearsalResponseLockAt(rehearsal) {
  if (rehearsal.rsvpLockAt?.toDate) return rehearsal.rsvpLockAt.toDate()
  const d = new Date(rehearsal.dateTs)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
}

const RSVP_META = {
  confirmed: { label: 'Going', icon: '✓' },
  declined: { label: "Can't Go", icon: '×' },
  maybe: { label: 'Maybe', icon: '?' },
  none: { label: 'No response', icon: '•' },
}

function RsvpGroup({ title, members, rehearsal }) {
  if (!members.length) return null
  const counts = members.reduce((acc, member) => {
    const status = normalizedRsvp(rehearsal.rsvp?.[member.id])
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="rsvp-group-block">
      <div className="rsvp-group-heading">
        <span>{title}</span>
        <span>{members.length} member{members.length === 1 ? '' : 's'}</span>
      </div>
      <div className="rsvp-summary-row">
        <span className="rsvp-summary confirmed">{counts.confirmed || 0} Going</span>
        <span className="rsvp-summary maybe">{counts.maybe || 0} Maybe</span>
        <span className="rsvp-summary declined">{counts.declined || 0} Can't Go</span>
        {!!counts.none && <span className="rsvp-summary none">{counts.none} No response</span>}
      </div>
      <div className="rsvp-member-grid">
        {members.map(member => {
          const rawRsvp = rehearsal.rsvp?.[member.id]
          const status = normalizedRsvp(rawRsvp)
          const submittedAt = formatSubmittedAt(rawRsvp)
          return (
            <div key={member.id} className={`rsvp-member-card ${status}`}>
              <Avatar photoURL={member.photoURL} initial={member.initial} color={member.color} />
              <div className="rsvp-member-copy">
                <strong>{member.name}</strong>
                <span>{RSVP_META[status].icon} {RSVP_META[status].label}</span>
                {status !== 'none' && (
                  <small>{submittedAt ? `Submitted ${submittedAt}` : 'Submitted'}</small>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RehearsalCard({ r, members, onRsvp, onEdit, canManage }) {
  const { user, profile } = useAuth()
  const profileGroups = profile?.groups || (profile?.group ? [profile.group] : [])
  const canRespond = r.group === 'all' || profileGroups.includes(r.group)
  const myRsvp = normalizedRsvp(r.rsvp?.[user?.uid])
  const responseLocked = new Date() >= rehearsalResponseLockAt(r)
  const [selectedRsvp, setSelectedRsvp] = useState(myRsvp === 'none' ? '' : myRsvp)
  const [submittingRsvp, setSubmittingRsvp] = useState(false)
  const [rsvpMessage, setRsvpMessage] = useState('')

  useEffect(() => {
    setSelectedRsvp(myRsvp === 'none' ? '' : myRsvp)
  }, [myRsvp, r.id])

  const handleSubmitRsvp = async () => {
    if (!selectedRsvp || !user?.uid) return
    setSubmittingRsvp(true)
    setRsvpMessage('')
    try {
      await onRsvp(r.id, user.uid, selectedRsvp)
      setRsvpMessage('Response submitted')
    } catch (error) {
      setRsvpMessage(error?.message || 'Could not submit response')
    } finally {
      setSubmittingRsvp(false)
    }
  }

  const bandMembers = members.filter(m => memberGroups(m).includes('band'))
  const vocalMembers = members.filter(m => memberGroups(m).includes('vocals'))
  const showBand = r.group === 'all' || r.group === 'band'
  const showVocals = r.group === 'all' || r.group === 'vocals'

  return (
    <div className="schedule-rehearsal-card">
      <div className="schedule-card-head">
        <div className="schedule-card-datebox">
          <span>{r.dateStr?.split(',')[0] || 'Sat'}</span>
          <strong>{new Date(r.dateTs).getUTCDate()}</strong>
        </div>
        <div className="schedule-card-title-wrap">
          <div className="schedule-card-eyebrow">REHEARSAL</div>
          <div className="schedule-card-title">{r.name}</div>
          <div className="schedule-card-meta">{r.dateStr} · {r.time} · {r.location}</div>
        </div>
        <div className="schedule-card-actions">
          <span className={`group-pill ${r.group}`}>{GL[r.group]}</span>
          {canManage && (
            <button className="schedule-edit-btn" onClick={() => onEdit(r)} aria-label="Edit rehearsal">✎</button>
          )}
        </div>
      </div>

      {canRespond && (
        <div className={`rsvp-submit-panel ${responseLocked ? 'locked' : ''}`}>
          {responseLocked && (
            <div className="rsvp-locked-note">Responses are locked because rehearsal day has started.</div>
          )}
          <div>
            <div className="rsvp-submit-title">Your response</div>
            <div className="rsvp-submit-help">Choose one option to submit your availability.</div>
          </div>
          <div className="rsvp-submit-buttons">
            {[
              ['confirmed', '✓', 'Going'],
              ['declined', '×', "Can't Go"],
              ['maybe', '?', 'Maybe'],
            ].map(([status, icon, label]) => (
              <button
                type="button"
                key={status}
                className={`rsvp-submit-btn ${status} ${selectedRsvp === status ? 'selected' : ''}`}
                disabled={responseLocked}
                onClick={() => { setSelectedRsvp(status); setRsvpMessage('') }}
              >
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rsvp-confirm-btn"
            disabled={responseLocked || !selectedRsvp || submittingRsvp || selectedRsvp === myRsvp}
            onClick={handleSubmitRsvp}
          >
            {responseLocked ? 'Responses Closed' : submittingRsvp ? 'Submitting…' : selectedRsvp === myRsvp && myRsvp !== 'none' ? 'Submitted' : 'Submit Response'}
          </button>
          {rsvpMessage && <div className="rsvp-submit-message">{rsvpMessage}</div>}
        </div>
      )}

      <div className="rsvp-roster">
        {showBand && <RsvpGroup title="Band" members={bandMembers} rehearsal={r} />}
        {showVocals && <RsvpGroup title="Vocals" members={vocalMembers} rehearsal={r} />}
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
  const [error,   setError]   = useState('')

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
    setBusy(true); setError('')
    try {
      await onSave({ dateStr: formatDate(date), dateTs: new Date(date).getTime(), sections }, service)
      onClose()
    } catch (e) {
      setError(e?.message || 'Could not save service.')
    } finally { setBusy(false) }
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

      {error && <div className="schedule-form-error">{error}</div>}
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

function ServiceCard({ service, members, canManage, onEdit, currentUserId, setlistLookup, onViewSetlist, isNext = false }) {
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

  const serviceDate = new Date(service.dateTs)
  const dayName = DAYS[serviceDate.getUTCDay()]
  const monthName = MONTHS[serviceDate.getUTCMonth()]
  const dayNumber = serviceDate.getUTCDate()

  return (
    <div className={`schedule-service-card ${isNext ? 'up-next' : ''}`}>
      {/* Header */}
      {isNext ? (
        <div className="up-next-hero">
          <div className="up-next-date-tile">
            <span>{monthName}</span>
            <strong>{dayNumber}</strong>
            <small>{dayName}</small>
          </div>
          <div className="up-next-copy">
            <div className="up-next-label"><span>●</span> NEXT SERVICE</div>
            <div className="up-next-title">Sunday Service</div>
            <div className="up-next-date-line">{service.dateStr}</div>
            {iAmIn && <div className="up-next-assigned">★ You're assigned to this service</div>}
          </div>
          {canManage && (
            <button className="schedule-edit-btn up-next-edit" onClick={() => onEdit(service)} aria-label="Edit service assignments">✎</button>
          )}
        </div>
      ) : (
        <div className="schedule-service-head">
          <div style={{ flex: 1 }}>
            <div className="schedule-service-date">{service.dateStr}</div>
            {iAmIn && (
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>
                ★ You're assigned this Sunday
              </div>
            )}
          </div>
          {canManage && (
            <button className="schedule-edit-btn" onClick={() => onEdit(service)} aria-label="Edit service assignments">✎</button>
          )}
        </div>
      )}

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
                width: 116,
                flexShrink: 0,
                paddingTop: 2,
              }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: iAmHere ? 'var(--accent)' : 'var(--text3)',
                  marginBottom: 5,
                }}>
                  {sec}
                </div>
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
                  {sec === 'Praise & Worship' ? (
                    <>
                      {setlistLookup.get(`${service.id}::Praise`) && (
                        <button
                          type="button"
                          className="schedule-setlist-btn"
                          onClick={() => onViewSetlist(setlistLookup.get(`${service.id}::Praise`))}
                        >
                          ♫ Praise Set List
                        </button>
                      )}
                      {setlistLookup.get(`${service.id}::Worship`) && (
                        <button
                          type="button"
                          className="schedule-setlist-btn"
                          onClick={() => onViewSetlist(setlistLookup.get(`${service.id}::Worship`))}
                        >
                          ♫ Worship Set List
                        </button>
                      )}
                    </>
                  ) : setlistLookup.get(`${service.id}::${sec}`) ? (
                    <button
                      type="button"
                      className="schedule-setlist-btn"
                      onClick={() => onViewSetlist(setlistLookup.get(`${service.id}::${sec}`))}
                    >
                      ♫ Set List
                    </button>
                  ) : null}
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
  const { rehearsals, loading: rLoading, addRehearsal, updateRehearsal, deleteRehearsal, submitRsvp, ensureMonthlyRehearsals } = useRehearsals()
  const { services,   loading: sLoading, addService,   updateService,   deleteService }               = useServices()
  const { user, isAdmin, profile } = useAuth()
  const members = useMembers()
  const { setlists, deleteSetlist } = useSetlists()
  const setlistLookup = useSetlistLookup(setlists)
  const [viewingSetlist, setViewingSetlist] = useState(null)

  const [activeTab,      setActiveTab]      = useState('rehearsals')  // 'rehearsals' | 'services'
  const [editingR,       setEditingR]       = useState(null)
  const [editingS,       setEditingS]       = useState(null)

  const canManage = isAdmin

  const todayTs = useMemo(() => {
    const d = new Date()
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])

  // Only current/future schedule items are shown. Past services and rehearsals
  // automatically disappear from the Schedule once their calendar date has passed.
  const visibleServices = useMemo(
    () => services.filter(service => (service.dateTs || 0) >= todayTs),
    [services, todayTs]
  )
  const visibleRehearsals = useMemo(
    () => rehearsals.filter(rehearsal => (rehearsal.dateTs || 0) >= todayTs),
    [rehearsals, todayTs]
  )

  // Automatic Saturday rehearsals are created idempotently after the previous
  // month's last Sunday has passed. Admin permissions keep schedule writes controlled.
  useEffect(() => {
    if (!isAdmin || rLoading) return
    ensureMonthlyRehearsals().catch(error => {
      console.error('Could not auto-create monthly rehearsals:', error)
    })
  }, [isAdmin, rLoading])

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

      {/* Keep the original Schedule section switcher. */}
      <div className="chips" style={{ marginBottom: 16 }}>
        {[['rehearsals','🎵 Rehearsals'], ['services','🎙️ Services']].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={`chip ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            style={{ flex: 1, textAlign: 'center', cursor: 'pointer', border: 0 }}
          >
            {label}
          </button>
        ))}
      </div>



      {/* ── Rehearsals tab ── */}
      {activeTab === 'rehearsals' && (
        <>
          {rLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : visibleRehearsals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No upcoming rehearsals</div>
              <div className="empty-state-text">Saturday rehearsals will appear automatically for the active month</div>
            </div>
          ) : (
            visibleRehearsals.map(r => (
              <RehearsalCard key={r.id} r={r} members={members} onRsvp={submitRsvp}
                canManage={canManage} onEdit={setEditingR} />
            ))
          )}

          {canManage && (
            <RehearsalSheet open={showAdd && activeTab === 'rehearsals'} onClose={onAddClose}
              onSave={handleSaveR} onDelete={deleteRehearsal} />
          )}
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
          ) : visibleServices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎙️</div>
              <div className="empty-state-title">No services scheduled</div>
              <div className="empty-state-text">
                {canManage ? 'Tap + to create the next service and assign the team' : 'No upcoming service roster has been set up yet'}
              </div>
            </div>
          ) : (
            visibleServices.map((s, index) => (
              <ServiceCard key={s.id} service={s} members={members}
                canManage={canManage} onEdit={setEditingS} currentUserId={user?.uid}
                setlistLookup={setlistLookup} onViewSetlist={setViewingSetlist} isNext={index === 0} />
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

      <SetlistViewer
        setlist={viewingSetlist}
        onClose={() => setViewingSetlist(null)}
        canDelete={!!viewingSetlist && (isAdmin || viewingSetlist.createdBy === user?.uid) && (viewingSetlist.serviceDateTs || 0) >= new Date().setHours(0, 0, 0, 0)}
        onDelete={async () => {
          if (!viewingSetlist || !window.confirm('Delete this set list? This will unassign it from the service.')) return
          await deleteSetlist(viewingSetlist)
          setViewingSetlist(null)
        }}
      />
    </>
  )
}
