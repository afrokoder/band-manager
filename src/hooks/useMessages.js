import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc, updateDoc,
  serverTimestamp, query, orderBy, limit, where, doc,
} from 'firebase/firestore'
import { db } from '../firebase'

/** Top-level messages feed (no parentId or parentId == null) */
export function useMessages() {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    // Fetch all recent messages and filter client-side so no composite index needed.
    // Replies have a parentId string; root messages have null or undefined.
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(120),
    )
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMessages(all.filter(m => !m.parentId))
      setLoading(false)
    })
    return unsub
  }, [])

  const sendMessage = (data) =>
    addDoc(collection(db, 'messages'), {
      parentId: null,   // explicit null so Firestore where() works
      replyCount: 0,
      ...data,
      createdAt: serverTimestamp(),
    })

  return { messages, loading, sendMessage }
}

/** Replies for a specific thread (parentId === threadId) */
export function useThread(threadId) {
  const [replies,  setReplies]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!threadId) return
    // Query by parentId only (single field where — no index needed), sort client-side
    const q = query(
      collection(db, 'messages'),
      where('parentId', '==', threadId),
    )
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
      setReplies(docs)
      setLoading(false)
    })
    return unsub
  }, [threadId])

  return { replies, loading }
}

/** Send a reply and bump parent's replyCount */
export async function sendReply(parentId, data) {
  const { increment } = await import('firebase/firestore')
  const replyRef = await addDoc(collection(db, 'messages'), {
    ...data,
    parentId,
    createdAt: serverTimestamp(),
  })
  // Increment parent reply count (best-effort)
  try {
    await updateDoc(doc(db, 'messages', parentId), { replyCount: increment(1) })
  } catch (_) {}
  return replyRef
}

/** Edit a message's text */
export function editMessage(msgId, newText) {
  return updateDoc(doc(db, 'messages', msgId), {
    text: newText,
    editedAt: serverTimestamp(),
  })
}

/** Delete a message (and optionally decrement parent's replyCount) */
export async function deleteMessage(msgId, parentId) {
  await deleteDoc(doc(db, 'messages', msgId))
  if (parentId) {
    const { increment } = await import('firebase/firestore')
    try {
      await updateDoc(doc(db, 'messages', parentId), { replyCount: increment(-1) })
    } catch (_) {}
  }
}
