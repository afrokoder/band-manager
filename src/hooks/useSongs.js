import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export function useSongs() {
  const [songs,   setSongs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  // File upload omitted — Storage requires Blaze plan.
  // Pass onSave(data) — no file argument needed.
  const addSong = (data) =>
    addDoc(collection(db, 'songs'), {
      ...data,
      fileUrl:  null,
      fileName: null,
      createdAt: serverTimestamp(),
    })

  const deleteSong = (song) => deleteDoc(doc(db, 'songs', song.id))

  return { songs, loading, addSong, deleteSong }
}
