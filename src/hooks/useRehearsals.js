import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
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

  const addRehearsal = (data) =>
    addDoc(collection(db, 'rehearsals'), { ...data, createdAt: serverTimestamp() })

  // Toggle RSVP: confirmed → declined → pending → confirmed
  const toggleRsvp = async (rehearsalId, userId, current) => {
    const next = { confirmed: 'declined', declined: 'pending', pending: 'confirmed' }[current || 'pending']
    await updateDoc(doc(db, 'rehearsals', rehearsalId), { [`rsvp.${userId}`]: next })
  }

  return { rehearsals, loading, addRehearsal, toggleRsvp }
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
