import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'

export function useSongs() {
  const [songs, setSongs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const addSong = async (data, file, onProgress) => {
    let fileUrl = null
    let fileName = null

    if (file) {
      const storageRef = ref(storage, `songs/${Date.now()}_${file.name}`)
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file)
        task.on('state_changed',
          (snap) => onProgress?.(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          async () => { fileUrl = await getDownloadURL(task.snapshot.ref); resolve() }
        )
      })
      fileName = file.name
    }

    return addDoc(collection(db, 'songs'), {
      ...data,
      fileUrl,
      fileName,
      createdAt: serverTimestamp(),
    })
  }

  const deleteSong = async (song) => {
    if (song.fileUrl) {
      try { await deleteObject(ref(storage, song.fileUrl)) } catch {}
    }
    await deleteDoc(doc(db, 'songs', song.id))
  }

  return { songs, loading, addSong, deleteSong }
}
