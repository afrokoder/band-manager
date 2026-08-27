import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../firebase'

const safeName = (name = 'file') => name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100)

// Hard cap so an oversized file fails fast with a clear message instead of
// stalling the UI. Generous enough for full-length audio recordings.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // 100 MB

// If no progress event fires for this long, treat the upload as stalled and
// abort so the promise rejects (and the UI unsticks) instead of hanging.
const STALL_TIMEOUT_MS = 60000

// Content-types the browser executes as active content. Rejected client-side to
// give a clear message; storage.rules enforce the same block server-side.
const BLOCKED_TYPE = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|application\/xml|text\/xml)/i

/**
 * Upload a file to Firebase Storage using a resumable upload. Resumable uploads
 * chunk the file, retry transient failures, and emit progress — far more
 * reliable for large media than the single-shot uploadBytes, which can stall
 * indefinitely on big files with no way to recover.
 *
 * @param {File} file
 * @param {string} userId
 * @param {'songs'|'setlists'} scope
 * @param {(fraction:number)=>void} [onProgress] receives 0..1
 */
export async function uploadMediaFile(file, userId, scope = 'songs', onProgress) {
  if (!file) return null
  if (!storage) throw new Error('Firebase Storage is not enabled for this project.')
  if (file.size >= MAX_UPLOAD_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024)
    throw new Error(`"${file.name}" is ${mb}MB, larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`)
  }
  if (BLOCKED_TYPE.test(file.type || '')) {
    throw new Error(`"${file.name}" is a web/markup file type that can't be uploaded for security reasons.`)
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const path = `${scope}/${userId || 'unknown'}/${id}-${safeName(file.name)}`
  const storageRef = ref(storage, path)

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      // Force downloads instead of inline rendering when the file URL is opened
      // directly, so a file can't run as a page in the viewer's browser. This
      // does not affect <audio>/<img> subresource playback/preview.
      contentDisposition: `attachment; filename="${safeName(file.name)}"`,
    })

    let stallTimer
    const armStall = () => {
      clearTimeout(stallTimer)
      stallTimer = setTimeout(() => {
        task.cancel()
        reject(new Error('Upload stalled — check your connection and try again.'))
      }, STALL_TIMEOUT_MS)
    }
    armStall()

    task.on(
      'state_changed',
      snap => {
        armStall()
        if (onProgress) onProgress(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0)
      },
      err => { clearTimeout(stallTimer); reject(err) },
      () => { clearTimeout(stallTimer); resolve() },
    )
  })

  const url = await getDownloadURL(storageRef)

  return {
    name: file.name || 'Attachment',
    url,
    path,
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
  }
}
