import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

export function useSongs() {
  const { user, profile } = useAuth()
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

  const addSong = (data) => {
    if (!user?.uid) throw new Error('You must be signed in to add a song.')

    return addDoc(collection(db, 'songs'), {
      ...data,
      // Always stamp ownership here instead of relying on each UI caller.
      // This keeps Firestore song-create rules consistent for every signed-in user.
      addedBy: user.uid,
      addedByName: profile?.name || user.displayName || user.email || 'Team member',
      fileUrl:  data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      createdAt: serverTimestamp(),
    })
  }

  const updateSong = (song, data) =>
    updateDoc(doc(db, 'songs', song.id), { ...data, updatedAt: serverTimestamp() })

  const deleteSong = (song) => deleteDoc(doc(db, 'songs', song.id))

  return { songs, loading, addSong, updateSong, deleteSong }
}
