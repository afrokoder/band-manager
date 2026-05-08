import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
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
      if (firebaseUser) {
        setUser(firebaseUser)
        await loadProfile(firebaseUser.uid)
      } else {
        setUser(null)
        setProfile(null)
        setNeedsProfile(false)
      }
      setLoading(false)
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

  const saveProfile = async ({ name, role, group }) => {
    const uid    = auth.currentUser.uid
    const idx    = Math.floor(Math.random() * MEMBER_COLORS.length)
    const color  = MEMBER_COLORS[idx]
    const initial = name.trim()[0].toUpperCase()
    const data   = { name: name.trim(), role, group, color, initial, createdAt: serverTimestamp() }
    await setDoc(doc(db, 'users', uid), data)
    setProfile(data)
    setNeedsProfile(false)
  }

  const loginEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const registerEmail = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password)

  const loginGoogle = () => signInWithPopup(auth, googleProvider)

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, needsProfile, loginEmail, registerEmail, loginGoogle, logout, saveProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
