import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const REF = doc(db, 'settings', 'pinboard')

/** Real-time listener for the pinboard. Returns { pins, loading, savePins } */
export function usePinboard() {
  const [pins,    setPins]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(REF, (snap) => {
      setPins(snap.exists() ? (snap.data().pins ?? []) : [])
      setLoading(false)
    })
    return unsub
  }, [])

  /** Persist the full pins array (admin only — Firestore rules enforce this) */
  const savePins = (newPins) =>
    setDoc(REF, { pins: newPins }, { merge: true })

  return { pins, loading, savePins }
}
