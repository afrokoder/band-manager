import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'

const AuthContext = createContext(null)

const MEMBER_COLORS = [
  '#0071e3','#5856d6','#ff2d55','#ff9500',
  '#34c759','#af52de','#ff6b35','#30b0c7',
]

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)   // Firebase user
  const [profile, setProfile]   = useState(null)   // Firestore profile doc
  const [loading, setLoading]   = useState(true)
  const [needsProfile, setNeedsProfile] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser)
          await loadProfile(firebaseUser.uid)
        } else {
          setUser(null)
          setProfile(null)
          setNeedsProfile(false)
        }
      } catch (err) {
        console.error('Auth state error:', err)
        // Still clear loading so the user isn't stuck on a spinner
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const loadProfile = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      setProfile(snap.data())
      setNeedsProfile(false)
    } else {
      setNeedsProfile(true)
    }
  }

  const saveProfile = async ({ name, roles, groups, photoURL }) => {
    const uid     = auth.currentUser.uid
    const idx     = Math.floor(Math.random() * MEMBER_COLORS.length)
    const color   = MEMBER_COLORS[idx]
    const initial = name.trim()[0].toUpperCase()
    // Keep legacy singular fields for backward-compat display
    const now  = new Date()
    const data = {
      name: name.trim(),
      roles,                    // string[]
      groups,                   // string[]
      role:  roles[0] || '',    // primary role (legacy compat)
      group: groups[0] || '',   // primary group (legacy compat)
      photoURL: photoURL || null,
      color, initial,
      createdAt: serverTimestamp(),   // written to Firestore
    }
    await setDoc(doc(db, 'users', uid), data)
    // Store a real Date in local state so createdAt.toDate() works immediately
    // without needing a round-trip read
    setProfile({ ...data, createdAt: { toDate: () => now } })
    setNeedsProfile(false)
  }

  const updateProfile = async ({ groups, roles }) => {
    const uid = auth.currentUser?.uid
    if (!uid || !profile) throw new Error('No signed-in profile to update')

    // Admin membership is permission-controlled and cannot be self-selected in the UI.
    // Preserve it when an existing admin edits their musical groups and roles.
    const currentGroups = Array.isArray(profile.groups)
      ? profile.groups
      : (profile.group ? [profile.group] : [])
    const keepsAdmin = currentGroups.includes('admin')
    const nextGroups = [...new Set([...(keepsAdmin ? ['admin'] : []), ...groups])]
    const nextRoles = [...new Set(roles)]

    const data = {
      groups: nextGroups,
      roles: nextRoles,
      group: nextGroups.find(group => group !== 'admin') || nextGroups[0] || '',
      role: nextRoles[0] || '',
      updatedAt: serverTimestamp(),
    }

    await updateDoc(doc(db, 'users', uid), data)
    setProfile(current => ({ ...current, ...data, updatedAt: new Date() }))
  }

  const loginEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const registerEmail = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password)

  const loginGoogle = () => signInWithPopup(auth, googleProvider)

  const logout = () => signOut(auth)

  const profileGroups = profile?.groups || (profile?.group ? [profile.group] : [])
  const isAdmin = profileGroups.includes('admin') || profile?.group === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, needsProfile, isAdmin, loginEmail, registerEmail, loginGoogle, logout, saveProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
