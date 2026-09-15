import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

export function useTeamMedia() {
  const { user, profile, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'teamMedia'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(row => ({ id: row.id, ...row.data() })))
      setLoading(false)
    }, error => {
      console.error('Media subscription failed:', error)
      setLoading(false)
    })
  }, [])

  const uploadMedia = async file => {
    if (!user || !isAdmin) throw new Error('Only admins can upload files and media.')
    if (!storage) throw new Error('Firebase Storage is not configured.')
    if (!file?.type?.startsWith('image/') && !file?.type?.startsWith('video/')) {
      throw new Error('Please choose a photo or video file.')
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
    const path = `team-media/${user.uid}/${Date.now()}-${safeName}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file, { contentType: file.type })
    const url = await getDownloadURL(storageRef)
    await addDoc(collection(db, 'teamMedia'), {
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      storagePath: path,
      uploadedBy: user.uid,
      uploadedByName: profile?.name || user.displayName || 'Admin',
      createdAt: serverTimestamp(),
    })
  }

  const removeMedia = async item => {
    if (!isAdmin) throw new Error('Only admins can remove files and media.')
    await deleteDoc(doc(db, 'teamMedia', item.id))
    if (item.storagePath && storage) {
      deleteObject(ref(storage, item.storagePath)).catch(() => {})
    }
  }

  return { items, loading, uploadMedia, removeMedia }
}
