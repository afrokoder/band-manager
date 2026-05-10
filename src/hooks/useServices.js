import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

export function useServices() {
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('dateTs', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  /**
   * data shape: { dateStr, dateTs, sections: { [sectionName]: [uid, ...] } }
   */
  const addService = (data) =>
    addDoc(collection(db, 'services'), { ...data, createdAt: serverTimestamp() })

  const updateService = (id, data) =>
    updateDoc(doc(db, 'services', id), { ...data, updatedAt: serverTimestamp() })

  const deleteService = (id) =>
    deleteDoc(doc(db, 'services', id))

  return { services, loading, addService, updateService, deleteService }
}
