import { useState, useEffect } from 'react'
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'

export function useMessages() {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(60))
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const sendMessage = (data) =>
    addDoc(collection(db, 'messages'), { ...data, createdAt: serverTimestamp() })

  return { messages, loading, sendMessage }
}
