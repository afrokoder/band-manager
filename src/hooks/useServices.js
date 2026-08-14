import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, runTransaction,
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
  const dateKey = (dateTs) => String(dateTs)

  const addService = async (data) => {
    if (services.some(item => item.dateTs === data.dateTs)) {
      throw new Error('A service is already scheduled for this date.')
    }
    const serviceRef = doc(collection(db, 'services'))
    const slotRef = doc(db, 'serviceDateSlots', dateKey(data.dateTs))
    await runTransaction(db, async tx => {
      const slot = await tx.get(slotRef)
      if (slot.exists()) throw new Error('A service is already scheduled for this date.')
      tx.set(serviceRef, { ...data, createdAt: serverTimestamp() })
      tx.set(slotRef, { serviceId: serviceRef.id, dateTs: data.dateTs })
    })
    return serviceRef
  }

  const updateService = async (id, data) => {
    const current = services.find(item => item.id === id)
    if (services.some(item => item.id !== id && item.dateTs === data.dateTs)) {
      throw new Error('A service is already scheduled for this date.')
    }
    const serviceRef = doc(db, 'services', id)
    if (!current || current.dateTs === data.dateTs) {
      return updateDoc(serviceRef, { ...data, updatedAt: serverTimestamp() })
    }
    const oldSlotRef = doc(db, 'serviceDateSlots', dateKey(current.dateTs))
    const newSlotRef = doc(db, 'serviceDateSlots', dateKey(data.dateTs))
    return runTransaction(db, async tx => {
      const nextSlot = await tx.get(newSlotRef)
      if (nextSlot.exists() && nextSlot.data().serviceId !== id) throw new Error('A service is already scheduled for this date.')
      const oldSlot = await tx.get(oldSlotRef)
      if (oldSlot.exists() && oldSlot.data().serviceId === id) tx.delete(oldSlotRef)
      tx.set(newSlotRef, { serviceId: id, dateTs: data.dateTs })
      tx.update(serviceRef, { ...data, updatedAt: serverTimestamp() })
    })
  }

  const deleteService = async (id) => {
    const current = services.find(item => item.id === id)
    if (!current) return deleteDoc(doc(db, 'services', id))
    const serviceRef = doc(db, 'services', id)
    const slotRef = doc(db, 'serviceDateSlots', dateKey(current.dateTs))
    return runTransaction(db, async tx => {
      const slot = await tx.get(slotRef)
      if (slot.exists() && slot.data().serviceId === id) tx.delete(slotRef)
      tx.delete(serviceRef)
    })
  }

  return { services, loading, addService, updateService, deleteService }
}
