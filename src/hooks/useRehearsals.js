import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, runTransaction } from 'firebase/firestore'
import { db } from '../firebase'

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
      tx.set(rehearsalRef, { ...data, createdAt: serverTimestamp() })
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
      return updateDoc(rehearsalRef, { ...data, updatedAt: serverTimestamp() })
    }
    const oldSlotRef = doc(db, 'rehearsalDateSlots', dateKey(current.dateTs))
    const newSlotRef = doc(db, 'rehearsalDateSlots', dateKey(data.dateTs))
    return runTransaction(db, async tx => {
      const nextSlot = await tx.get(newSlotRef)
      if (nextSlot.exists() && nextSlot.data().rehearsalId !== id) throw new Error('A rehearsal is already scheduled for this date.')
      const oldSlot = await tx.get(oldSlotRef)
      if (oldSlot.exists() && oldSlot.data().rehearsalId === id) tx.delete(oldSlotRef)
      tx.set(newSlotRef, { rehearsalId: id, dateTs: data.dateTs })
      tx.update(rehearsalRef, { ...data, updatedAt: serverTimestamp() })
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

  // Toggle RSVP: confirmed → declined → pending → confirmed
  const toggleRsvp = async (rehearsalId, userId, current) => {
    const next = { confirmed: 'declined', declined: 'pending', pending: 'confirmed' }[current || 'pending']
    await updateDoc(doc(db, 'rehearsals', rehearsalId), { [`rsvp.${userId}`]: next })
  }

  return { rehearsals, loading, addRehearsal, updateRehearsal, deleteRehearsal, toggleRsvp }
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
