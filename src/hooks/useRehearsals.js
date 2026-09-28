import { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, query, orderBy, runTransaction } from 'firebase/firestore'
import { db } from '../firebase'

const ordinal = (n) => {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}

const dateOnlyTimestamp = (year, month, day) => Date.UTC(year, month, day)

const rehearsalLockAt = (dateTs) => {
  const d = new Date(dateTs)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
}

function saturdaysInMonth(year, month) {
  const dates = []
  const cursor = new Date(year, month, 1)
  while (cursor.getDay() !== 6) cursor.setDate(cursor.getDate() + 1)
  while (cursor.getMonth() === month) {
    dates.push(dateOnlyTimestamp(year, month, cursor.getDate()))
    cursor.setDate(cursor.getDate() + 7)
  }
  return dates
}

// The next month becomes eligible as soon as the current month has no
// Saturdays left. In other words, once the final Saturday has fully passed,
// the following month's rehearsal schedule is created immediately.
function lastSaturdayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0)
  const lastSaturday = new Date(lastDay)
  lastSaturday.setDate(lastDay.getDate() - ((lastDay.getDay() + 1) % 7))
  lastSaturday.setHours(23, 59, 59, 999)
  return lastSaturday
}

function rehearsalMonthToEnsure(now) {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  if (now.getTime() > lastSaturdayOfMonth(currentYear, currentMonth).getTime()) {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1)
    return { year: nextMonth.getFullYear(), month: nextMonth.getMonth() }
  }

  return { year: currentYear, month: currentMonth }
}

export function useRehearsals() {
  const [rehearsals, setRehearsals] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'rehearsals'), orderBy('dateTs', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setRehearsals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const dateKey = (dateTs) => String(dateTs)

  const addRehearsal = async (data) => {
    if (rehearsals.some(item => item.dateTs === data.dateTs)) {
      throw new Error('A rehearsal is already scheduled for this date.')
    }
    const rehearsalRef = doc(collection(db, 'rehearsals'))
    const slotRef = doc(db, 'rehearsalDateSlots', dateKey(data.dateTs))
    await runTransaction(db, async tx => {
      const slot = await tx.get(slotRef)
      if (slot.exists()) throw new Error('A rehearsal is already scheduled for this date.')
      tx.set(rehearsalRef, { ...data, rsvpLockAt: rehearsalLockAt(data.dateTs), createdAt: serverTimestamp() })
      tx.set(slotRef, { rehearsalId: rehearsalRef.id, dateTs: data.dateTs })
    })
    return rehearsalRef
  }

  const updateRehearsal = async (id, data) => {
    const current = rehearsals.find(item => item.id === id)
    if (rehearsals.some(item => item.id !== id && item.dateTs === data.dateTs)) {
      throw new Error('A rehearsal is already scheduled for this date.')
    }
    const rehearsalRef = doc(db, 'rehearsals', id)
    if (!current || current.dateTs === data.dateTs) {
      return updateDoc(rehearsalRef, { ...data, rsvpLockAt: rehearsalLockAt(data.dateTs), updatedAt: serverTimestamp() })
    }
    const oldSlotRef = doc(db, 'rehearsalDateSlots', dateKey(current.dateTs))
    const newSlotRef = doc(db, 'rehearsalDateSlots', dateKey(data.dateTs))
    return runTransaction(db, async tx => {
      const nextSlot = await tx.get(newSlotRef)
      if (nextSlot.exists() && nextSlot.data().rehearsalId !== id) throw new Error('A rehearsal is already scheduled for this date.')
      const oldSlot = await tx.get(oldSlotRef)
      if (oldSlot.exists() && oldSlot.data().rehearsalId === id) tx.delete(oldSlotRef)
      tx.set(newSlotRef, { rehearsalId: id, dateTs: data.dateTs })
      tx.update(rehearsalRef, { ...data, rsvpLockAt: rehearsalLockAt(data.dateTs), updatedAt: serverTimestamp() })
    })
  }

  const deleteRehearsal = async (id) => {
    const current = rehearsals.find(item => item.id === id)
    if (!current) return deleteDoc(doc(db, 'rehearsals', id))
    const rehearsalRef = doc(db, 'rehearsals', id)
    const slotRef = doc(db, 'rehearsalDateSlots', dateKey(current.dateTs))
    return runTransaction(db, async tx => {
      const slot = await tx.get(slotRef)
      if (slot.exists() && slot.data().rehearsalId === id) tx.delete(slotRef)
      tx.delete(rehearsalRef)
    })
  }

  // Explicit RSVP submission. Missing value means "No response"; "maybe" is a real submission.
  const submitRsvp = async (rehearsalId, userId, status) => {
    const rehearsal = rehearsals.find(item => item.id === rehearsalId)
    if (!rehearsal) throw new Error('Rehearsal not found.')

    const lockAt = rehearsal.rsvpLockAt?.toDate?.() || rehearsalLockAt(rehearsal.dateTs)
    if (new Date() >= lockAt) {
      throw new Error('Responses are locked on the day of the rehearsal.')
    }

    const normalized = ['confirmed', 'declined', 'maybe'].includes(status) ? status : 'maybe'
    await updateDoc(doc(db, 'rehearsals', rehearsalId), {
      [`rsvp.${userId}`]: { status: normalized, submittedAt: serverTimestamp() },
    })
  }

  // Idempotently keeps the active rehearsal month ready. During a month we ensure
  // that month's Saturdays exist; immediately after its final Saturday passes, we
  // switch ahead and create the following month's Saturdays. Existing items are preserved.
  const ensureMonthlyRehearsals = async (now = new Date()) => {
    const { year, month } = rehearsalMonthToEnsure(now)

    // Backfill the RSVP lock timestamp on older rehearsal documents so the
    // same day-of-rehearsal lock is enforced by Firestore, not only the UI.
    for (const rehearsal of rehearsals) {
      if (!rehearsal.rsvpLockAt && rehearsal.dateTs) {
        await updateDoc(doc(db, 'rehearsals', rehearsal.id), {
          rsvpLockAt: rehearsalLockAt(rehearsal.dateTs),
        })
      }
    }

    const saturdays = saturdaysInMonth(year, month)
    let createdCount = 0
    for (let index = 0; index < saturdays.length; index += 1) {
      const dateTs = saturdays[index]
      const slotRef = doc(db, 'rehearsalDateSlots', dateKey(dateTs))
      const rehearsalRef = doc(db, 'rehearsals', `auto-${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)

      const created = await runTransaction(db, async tx => {
        const slot = await tx.get(slotRef)
        if (slot.exists()) return false

        const date = new Date(dateTs)
        const dateStr = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]}, ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()]} ${date.getUTCDate()}`
        tx.set(rehearsalRef, {
          name: `${ordinal(index + 1)} Saturday Rehearsal`,
          dateStr,
          dateTs,
          time: '10:00 AM',
          location: 'TBD',
          group: 'all',
          rsvp: {},
          rsvpLockAt: rehearsalLockAt(dateTs),
          autoGenerated: true,
          createdAt: serverTimestamp(),
        })
        tx.set(slotRef, { rehearsalId: rehearsalRef.id, dateTs, autoGenerated: true })
        return true
      })
      if (created) createdCount += 1
    }

    // One deterministic event per monthly automatic batch. The Cloud Function
    // sends a single phone push for the whole batch instead of one per Saturday.
    if (createdCount > 0) {
      const batchKey = `${year}-${String(month + 1).padStart(2, '0')}`
      const eventRef = doc(db, 'notificationEvents', `rehearsals-${batchKey}`)
      const existingEvent = await getDoc(eventRef)
      if (!existingEvent.exists()) {
        await setDoc(eventRef, {
          type: 'rehearsal-batch-created',
          year,
          month: month + 1,
          count: saturdays.length,
          createdAt: serverTimestamp(),
        })
      }
    }
  }

  return { rehearsals, loading, addRehearsal, updateRehearsal, deleteRehearsal, submitRsvp, ensureMonthlyRehearsals }
}

export function useMembers() {
  const [members, setMembers] = useState([])
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])
  return members
}
