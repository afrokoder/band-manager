import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'

const safeName = (name = 'file') => name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100)

export async function uploadMediaFile(file, userId, scope = 'songs') {
  if (!file) return null
  if (!storage) throw new Error('Firebase Storage is not enabled for this project.')

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const path = `${scope}/${userId || 'unknown'}/${id}-${safeName(file.name)}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
  const url = await getDownloadURL(storageRef)

  return {
    name: file.name || 'Attachment',
    url,
    path,
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
  }
}
