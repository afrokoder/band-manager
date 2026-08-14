import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

const isPublished = status => status === 'submitted' || status === 'published'
const slotId = (serviceId, section) => `${serviceId}__${section.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`

const sortRows = (rows) => rows.sort((a, b) =>
  (b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) -
  (a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0)
)

export function useSetlists() {
  const { user } = useAuth()
  const [published, setPublished] = useState([])
  const [drafts, setDrafts] = useState([])
  const [publishedLoading, setPublishedLoading] = useState(true)
  const [draftLoading, setDraftLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPublished([]); setDrafts([])
      setPublishedLoading(false); setDraftLoading(false)
      return undefined
    }

    const submittedQuery = query(collection(db, 'setlists'), where('status', 'in', ['submitted', 'published']))
    const ownRowsQuery = query(collection(db, 'setlists'), where('createdBy', '==', user.uid))

    const unsubPublished = onSnapshot(submittedQuery, snap => {
      setPublished(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPublishedLoading(false)
    }, err => {
      console.error('Published setlists subscription failed:', err)
      setPublishedLoading(false)
    })

    const unsubDrafts = onSnapshot(ownRowsQuery, snap => {
      setDrafts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(row => row.status === 'draft'))
      setDraftLoading(false)
    }, err => {
      console.error('Draft setlists subscription failed:', err)
      setDraftLoading(false)
    })

    return () => { unsubPublished(); unsubDrafts() }
  }, [user])

  const setlists = useMemo(() => {
    const map = new Map()
    ;[...published, ...drafts].forEach(row => map.set(row.id, row))
    return sortRows([...map.values()])
  }, [drafts, published])

  const createSetlist = async (data) => {
    const setlistRef = doc(collection(db, 'setlists'))
    if (!isPublished(data.status)) {
      await setDoc(setlistRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      return setlistRef
    }

    const slotRef = doc(db, 'setlistSlots', slotId(data.serviceId, data.section))
    await runTransaction(db, async tx => {
      const slot = await tx.get(slotRef)
      if (slot.exists()) throw new Error('A published set list already exists for this service section.')
      tx.set(setlistRef, { ...data, status: 'published', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      tx.set(slotRef, { setlistId: setlistRef.id, serviceId: data.serviceId, section: data.section, createdBy: data.createdBy })
    })
    return setlistRef
  }

  const updateSetlist = async (id, data, previous = null) => {
    const setlistRef = doc(db, 'setlists', id)
    const oldPublished = isPublished(previous?.status)
    const newPublished = isPublished(data.status)
    const oldSlotRef = previous?.serviceId && previous?.section ? doc(db, 'setlistSlots', slotId(previous.serviceId, previous.section)) : null
    const newSlotRef = data.serviceId && data.section ? doc(db, 'setlistSlots', slotId(data.serviceId, data.section)) : null

    if (!oldPublished && !newPublished) {
      return updateDoc(setlistRef, { ...data, updatedAt: serverTimestamp() })
    }

    return runTransaction(db, async tx => {
      let newSlot = null
      if (newPublished && newSlotRef) {
        newSlot = await tx.get(newSlotRef)
        if (newSlot.exists() && newSlot.data().setlistId !== id) {
          throw new Error('A published set list already exists for this service section.')
        }
      }

      if (oldPublished && oldSlotRef && (!newPublished || oldSlotRef.path !== newSlotRef?.path)) {
        const oldSlot = await tx.get(oldSlotRef)
        if (oldSlot.exists() && oldSlot.data().setlistId === id) tx.delete(oldSlotRef)
      }

      if (newPublished && newSlotRef && !newSlot?.exists()) {
        tx.set(newSlotRef, { setlistId: id, serviceId: data.serviceId, section: data.section, createdBy: previous?.createdBy || data.createdBy })
      }
      tx.update(setlistRef, { ...data, status: newPublished ? 'published' : data.status, updatedAt: serverTimestamp() })
    })
  }

  const deleteSetlist = async (item) => {
    const setlist = typeof item === 'string' ? setlists.find(row => row.id === item) : item
    if (!setlist) return deleteDoc(doc(db, 'setlists', typeof item === 'string' ? item : item.id))
    const setlistRef = doc(db, 'setlists', setlist.id)
    if (!isPublished(setlist.status)) return deleteDoc(setlistRef)

    const slotRef = doc(db, 'setlistSlots', slotId(setlist.serviceId, setlist.section))
    return runTransaction(db, async tx => {
      const slot = await tx.get(slotRef)
      if (slot.exists() && slot.data().setlistId === setlist.id) tx.delete(slotRef)
      tx.delete(setlistRef)
    })
  }

  return { setlists, loading: publishedLoading || draftLoading, createSetlist, updateSetlist, deleteSetlist }
}


export function useSetlistViews(setlistId, enabled = false) {
  const { user, profile, isAdmin } = useAuth()
  const [views, setViews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!setlistId || !enabled || !user) {
      setViews([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const viewsQuery = query(collection(db, 'setlists', setlistId, 'views'))
    const unsub = onSnapshot(viewsQuery, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      rows.sort((a, b) => (b.viewedAt?.toMillis?.() || 0) - (a.viewedAt?.toMillis?.() || 0))
      setViews(rows)
      setLoading(false)
    }, err => {
      console.error('Set list views subscription failed:', err)
      setLoading(false)
    })
    return unsub
  }, [setlistId, enabled, user])

  const recordView = async (setlist) => {
    if (!user || !setlist?.id || !isPublished(setlist.status)) return
    // Opening your own set list is not useful audience activity, so do not log it.
    if (setlist.createdBy === user.uid) return
    await addDoc(collection(db, 'setlists', setlist.id, 'views'), {
      viewerId: user.uid,
      viewerName: profile?.name || user.displayName || user.email || 'Team member',
      viewedAt: serverTimestamp(),
    })
  }

  return { views, loading, recordView, canAudit: enabled && (isAdmin || !!user) }
}

export function useSetlistLookup(setlists) {
  return useMemo(() => {
    const lookup = new Map()
    setlists.filter(item => isPublished(item.status)).forEach(item => lookup.set(`${item.serviceId}::${item.section}`, item))
    return lookup
  }, [setlists])
}
