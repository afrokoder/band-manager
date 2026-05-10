import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Each event has one setlist document: setlists/{eventId}
export function useSetlist(eventId) {
  const [pills,   setPills]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) { setPills([]); return }
    setLoading(true)
    const unsub = onSnapshot(doc(db, 'setlists', eventId), (snap) => {
      setPills(snap.exists() ? (snap.data().pills || []) : [])
      setLoading(false)
    })
    return unsub
  }, [eventId])

  const savePills = async (next) => {
    if (!eventId) return
    const prev = pills          // snapshot for rollback
    setPills(next)              // optimistic update
    try {
      await setDoc(doc(db, 'setlists', eventId), { pills: next }, { merge: true })
    } catch (err) {
      console.error('Setlist save failed:', err)
      setPills(prev)            // roll back on failure
    }
  }

  return { pills, loading, savePills }
}
