import { useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'

function youtubeId(value='') {
  try {
    const url = new URL(value)
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || ''
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || ''
      return url.searchParams.get('v') || ''
    }
  } catch {}
  return ''
}

export default function AudioKeyFinder({ Page, onBack }) {
  const [youtube,setYoutube]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [result,setResult]=useState(null)
  const videoId=useMemo(()=>youtubeId(youtube),[youtube])

  const analyze=async()=>{
    if(!videoId){setError('Paste a valid YouTube link first.');return}
    setBusy(true);setError('');setResult(null)
    try{
      const call=httpsCallable(functions,'analyzeYoutubeSong')
      const response=await call({url:youtube.trim()})
      setResult(response.data)
    }catch(err){
      const message=err?.message?.replace(/^Firebase:\s*/,'').replace(/\s*\([^)]*\)\.?$/,'')
      setError(message||'Could not identify this song. Try the official YouTube upload or another version.')
    }finally{setBusy(false)}
  }

  return <Page title="Song Key Finder" subtitle="Paste a YouTube link to identify the artist, BPM and musical key." onBack={onBack}>
    <div className="more-card">
      <div className="more-card-head"><span className="more-card-icon">▶</span><div><strong>YouTube song lookup</strong><small>AGM reads the video's title and description, identifies the song, then matches it against the music database.</small></div></div>
      <input className="form-input" value={youtube} onChange={e=>setYoutube(e.target.value)} placeholder="https://youtube.com/watch?v=…" inputMode="url"/>
      <button className="btn-primary more-wide-btn" disabled={busy||!videoId} onClick={analyze}>{busy?'Finding song details…':'Find key, BPM & artist'}</button>
      <p className="more-help">For the best match, use an official artist/channel upload. Live versions, medleys, key changes and heavily renamed uploads can differ from the database recording.</p><a className="key-data-credit" href="https://getsongbpm.com" target="_blank" rel="noreferrer">Music data by GetSongBPM ↗</a>
    </div>

    {videoId&&<div className="key-youtube"><iframe title="YouTube song" src={`https://www.youtube.com/embed/${videoId}`} allow="encrypted-media" allowFullScreen/></div>}
    {error&&<div className="more-error">{error}</div>}
    {result&&<div className="song-lookup-result"><div className="song-lookup-heading"><span>MATCHED SONG</span><strong>{result.title||result.videoTitle}</strong><small>{result.artist||'Artist unavailable'}</small></div><div className="song-lookup-stats"><div><span>KEY</span><strong>{result.key||'—'}</strong></div><div><span>BPM</span><strong>{result.bpm||'—'}</strong></div><div><span>ARTIST</span><strong>{result.artist||'—'}</strong></div></div>{result.sourceUrl&&<a href={result.sourceUrl} target="_blank" rel="noreferrer">View match on GetSongBPM ↗</a>}</div>}
  </Page>
}
