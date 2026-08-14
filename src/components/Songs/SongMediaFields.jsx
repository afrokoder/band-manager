import { useEffect, useRef, useState } from 'react'

const prettySize = (bytes = 0) => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SongMediaFields({ attachment, voiceMemo, onAttachmentChange, onVoiceMemoChange }) {
  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (!voiceMemo || !(voiceMemo instanceof Blob)) {
      setPreviewUrl('')
      return undefined
    }

    const url = URL.createObjectURL(voiceMemo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [voiceMemo])

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    streamRef.current?.getTracks?.().forEach(track => track.stop())
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const startRecording = async () => {
    setRecordError('')
    setRecordSeconds(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `voice-memo-${Date.now()}.${extension}`, { type })
        onVoiceMemoChange(file)
        streamRef.current?.getTracks?.().forEach(track => track.stop())
        streamRef.current = null
      }
      recorder.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        setRecordSeconds(seconds => seconds + 1)
      }, 1000)
    } catch (error) {
      console.error(error)
      setRecordError('Microphone access is required to record a voice memo.')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
  }

  return (
    <div className="song-media-fields">
      <div className="form-row">
        <label className="form-label">Attachment <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
        <label className="song-file-picker">
          <input type="file" onChange={event => onAttachmentChange(event.target.files?.[0] || null)} />
          <span>⌁</span>
          <div>
            <strong>{attachment?.name || 'Attach a file'}</strong>
            <small>{attachment ? prettySize(attachment.size) : 'PDF, chart, audio, image, or other team file'}</small>
          </div>
          {attachment && <button type="button" onClick={event => { event.preventDefault(); onAttachmentChange(null) }}>✕</button>}
        </label>
      </div>

      <div className="form-row">
        <label className="form-label">Voice memo <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
        <div className="song-voice-row">
          <div className="song-record-controls">
            <button type="button" className={`song-record-btn ${recording ? 'recording' : ''}`} onClick={recording ? stopRecording : startRecording}>
              <span>{recording ? '■' : '●'}</span>{recording ? ' Stop recording' : ' Record voice memo'}
            </button>
            {recording && <span className="song-record-timer" aria-live="polite"><i />{formatTime(recordSeconds)}</span>}
          </div>
          {voiceMemo && !recording && (
            <div className="song-voice-ready">
              <div className="song-voice-preview-copy">
                <span>✓ Recording ready</span>
                <small>{voiceMemo.name}</small>
              </div>
              <button type="button" onClick={() => onVoiceMemoChange(null)}>Remove</button>
              {previewUrl && <audio className="song-voice-preview" controls preload="metadata" src={previewUrl}>Your browser does not support audio playback.</audio>}
            </div>
          )}
        </div>
        {recordError && <small style={{ color: 'var(--danger)' }}>{recordError}</small>}
      </div>
    </div>
  )
}
