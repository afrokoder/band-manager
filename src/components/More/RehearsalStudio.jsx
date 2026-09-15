import { useEffect, useMemo, useRef, useState } from 'react'
import { useLoops } from '../../hooks/useLoops'
import { useAppDialog } from '../ui/AppDialog'

const PROJECT_SECONDS=180
const px=(seconds,zoom)=>seconds*zoom
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s%1)*10)}`
function fakePeaks(seed=1,count=80){return Array.from({length:count},(_,i)=>18+Math.abs(Math.sin((i+seed)*1.71))*62)}
async function durationOf(url){return new Promise(resolve=>{const a=new Audio(url);a.onloadedmetadata=()=>resolve(Number.isFinite(a.duration)?a.duration:0);a.onerror=()=>resolve(0)})}

const STUDIO_DB='agm-studio-projects-v1'
function studioDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(STUDIO_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('projects'))req.result.createObjectStore('projects',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function listProjects(){const db=await studioDb();return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').getAll();r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)));r.onerror=()=>reject(r.error)})}
async function putProject(project){const db=await studioDb();return new Promise((resolve,reject)=>{const r=db.transaction('projects','readwrite').objectStore('projects').put(project);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
async function removeProject(id){const db=await studioDb();return new Promise((resolve,reject)=>{const r=db.transaction('projects','readwrite').objectStore('projects').delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}

function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,length=buffer.length*channels*2+44,out=new ArrayBuffer(length),view=new DataView(out);let o=0;const str=x=>{for(let i=0;i<x.length;i++)view.setUint8(o++,x.charCodeAt(i))},u16=x=>{view.setUint16(o,x,true);o+=2},u32=x=>{view.setUint32(o,x,true);o+=4};str('RIFF');u32(length-8);str('WAVE');str('fmt ');u32(16);u16(1);u16(channels);u32(buffer.sampleRate);u32(buffer.sampleRate*channels*2);u16(channels*2);u16(16);str('data');u32(length-44);for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){const v=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));view.setInt16(o,v<0?v*0x8000:v*0x7fff,true);o+=2}return new Blob([out],{type:'audio/wav'})}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
async function renderSavedProject(project,loops){const sampleRate=44100,end=Math.max(1,...(project.tracks||[]).flatMap(t=>(t.regions||[]).map(r=>r.start+r.duration)),...(project.loopRegions||[]).map(r=>r.start+r.duration)),ctx=new OfflineAudioContext(2,Math.ceil(end*sampleRate),sampleRate);for(const t of project.tracks||[]){if(t.muted)continue;for(const r of t.regions||[]){if(!r.blob)continue;try{const b=await ctx.decodeAudioData(await r.blob.arrayBuffer()),src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=b;g.gain.value=t.volume??1;src.connect(g).connect(ctx.destination);src.start(r.start,r.sourceOffset||0,Math.min(r.duration,b.duration-(r.sourceOffset||0)))}catch{}}}const loop=loops.find(l=>l.src===project.selectedLoop);if(loop&&!project.loopMuted){try{const b=await ctx.decodeAudioData(await (await fetch(loop.src)).arrayBuffer());for(const r of project.loopRegions||[]){let at=r.start,left=r.duration,off=(r.sourceOffset||0)%b.duration;while(left>.001){const src=ctx.createBufferSource(),take=Math.min(left,b.duration-off);src.buffer=b;src.connect(ctx.destination);src.start(at,off,take);at+=take;left-=take;off=0}}}catch{}}return ctx.startRendering()}
export default function RehearsalStudio({onBack}){
  const {loops}=useLoops(); const dialog=useAppDialog()
  const [tracks,setTracks]=useState([]),[selectedLoop,setSelectedLoop]=useState(''),[loopMuted,setLoopMuted]=useState(false),[loopRegions,setLoopRegions]=useState([]),[playing,setPlaying]=useState(false),[recordingId,setRecordingId]=useState(null)
  const [projects,setProjects]=useState([]),[projectId,setProjectId]=useState(null),[projectName,setProjectName]=useState('Untitled Practice'),[projectOpen,setProjectOpen]=useState(false),[saved,setSaved]=useState(true)
  const [exporting,setExporting]=useState(''),[activeTrackId,setActiveTrackId]=useState(null),[playhead,setPlayhead]=useState(0),[selected,setSelected]=useState(null),[clipboard,setClipboard]=useState(null),[zoom,setZoom]=useState(6),[error,setError]=useState('')
  const [projectSearch,setProjectSearch]=useState(''),[projectFilter,setProjectFilter]=useState('all')
  const recorder=useRef(null),stream=useRef(null),chunks=useRef([]),recordStart=useRef(0),recordStartHead=useRef(0),raf=useRef(0),playStarted=useRef(0),sources=useRef([]),liveTimer=useRef(0),drag=useRef(null)
  const chosenLoop=useMemo(()=>loops.find(l=>l.src===selectedLoop)||null,[loops,selectedLoop]); const width=Math.max(900,px(PROJECT_SECONDS,zoom))
  const visibleProjects=useMemo(()=>projects.filter(p=>{const q=projectSearch.trim().toLowerCase();if(q&&!String(p.name||'').toLowerCase().includes(q))return false;if(projectFilter==='recent')return Date.now()-(p.updatedAt||0)<1000*60*60*24*30;if(projectFilter==='favorites')return !!p.favorite;return true}),[projects,projectSearch,projectFilter])

  useEffect(()=>{listProjects().then(setProjects).catch(()=>{});},[])
  useEffect(()=>{if(!projectOpen)return;document.body.classList.add('studio-open');document.documentElement.requestFullscreen?.().catch(()=>{});return()=>{document.body.classList.remove('studio-open');if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}},[projectOpen])
  const stopAudio=()=>{sources.current.forEach(a=>{try{clearTimeout(a._timer);a.pause()}catch{}});sources.current=[];cancelAnimationFrame(raf.current);setPlaying(false)}
  useEffect(()=>()=>{stopAudio();stream.current?.getTracks?.().forEach(t=>t.stop());clearInterval(liveTimer.current)},[])

  const startSources=(start,excludeTrackId=null)=>{
    if(chosenLoop&&!loopMuted){(loopRegions.length?loopRegions:[{start:0,duration:PROJECT_SECONDS,sourceOffset:0}]).forEach(r=>{const delay=Math.max(0,r.start-start),skip=Math.max(0,start-r.start);if(skip>=r.duration)return;const a=new Audio(chosenLoop.src);a.loop=true;a.onloadedmetadata=()=>{a.currentTime=((r.sourceOffset||0)+skip)%(a.duration||999999);const timer=setTimeout(()=>{a.play().catch(()=>{});a._stop=setTimeout(()=>a.pause(),Math.max(0,(r.duration-skip)*1000))},delay*1000);a._timer=timer;sources.current.push(a)}})}
    tracks.forEach(t=>t.id!==excludeTrackId&&!t.muted&&t.regions.forEach(r=>{const delay=Math.max(0,r.start-start),skip=Math.max(0,start-r.start);if(skip>=r.duration)return;const a=new Audio(r.url);a.volume=t.volume??1;a.currentTime=(r.sourceOffset||0)+skip;const timer=setTimeout(()=>{a.play().catch(()=>{});a._stop=setTimeout(()=>a.pause(),Math.max(0,(r.duration-skip)*1000))},delay*1000);a._timer=timer;sources.current.push(a)}))
  }
  const beginClock=start=>{playStarted.current=performance.now()-start*1000;const tick=()=>{const now=(performance.now()-playStarted.current)/1000;if(now>=PROJECT_SECONDS){setPlayhead(0);stopAudio();return}setPlayhead(now);raf.current=requestAnimationFrame(tick)};raf.current=requestAnimationFrame(tick)}
  const play=()=>{if(recordingId)return;if(playing){stopAudio();return}stopAudio();startSources(playhead);setPlaying(true);beginClock(playhead)}

  const addTrack=()=>{const id=crypto.randomUUID();setTracks(cur=>[...cur,{id,name:`Voice/Audio ${cur.length+1}`,muted:false,volume:1,regions:[],live:false,liveWidth:0}]);setActiveTrackId(id);setSelected(null)}
  const startRecord=async()=>{
    if(recordingId){recorder.current?.state==='recording'&&recorder.current.stop();return}
    let trackId=activeTrackId
    if(!trackId){setError('Add or select a track before recording.');return}
    setError('');stopAudio()
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});stream.current=s;chunks.current=[];recordStart.current=performance.now();recordStartHead.current=playhead
      const mr=new MediaRecorder(s);recorder.current=mr;setRecordingId(trackId);setTracks(cur=>cur.map(t=>t.id===trackId?{...t,live:true,liveWidth:0}:t))
      startSources(playhead,trackId);setPlaying(true);beginClock(playhead)
      liveTimer.current=setInterval(()=>setTracks(cur=>cur.map(t=>t.id===trackId?{...t,liveWidth:(performance.now()-recordStart.current)/1000}:t)),80)
      mr.ondataavailable=e=>e.data?.size&&chunks.current.push(e.data)
      mr.onstop=async()=>{clearInterval(liveTimer.current);stopAudio();const blob=new Blob(chunks.current,{type:mr.mimeType||'audio/webm'}),url=URL.createObjectURL(blob),duration=await durationOf(url),actual=duration||((performance.now()-recordStart.current)/1000);setTracks(cur=>cur.map(t=>t.id===trackId?{...t,live:false,liveWidth:0,regions:[...t.regions,{id:crypto.randomUUID(),url,blob,start:recordStartHead.current,duration:actual,sourceOffset:0,peaks:fakePeaks(cur.length+3)}]}:t));s.getTracks().forEach(x=>x.stop());stream.current=null;setRecordingId(null);setPlayhead(recordStartHead.current+actual)}
      mr.start(100)
    }catch{setError('Microphone access is required to record a track.')}
  }
  const patchTrack=(id,p)=>setTracks(cur=>cur.map(t=>t.id===id?{...t,...p}:t))
  const deleteTrack=async id=>{if(!await dialog.confirm('Delete this track and all of its recordings?',{title:'Delete track?',confirmLabel:'Delete',tone:'danger'}))return;setTracks(cur=>cur.filter(t=>t.id!==id));if(activeTrackId===id)setActiveTrackId(null);if(selected?.trackId===id)setSelected(null)}
  const isLoopSelected=selected?.trackId==='__loop__'
  const region=selected&&(isLoopSelected?loopRegions.find(r=>r.id===selected.regionId):tracks.find(t=>t.id===selected.trackId)?.regions.find(r=>r.id===selected.regionId))
  const mutateSelected=fn=>{if(isLoopSelected){setLoopRegions(fn);return}setTracks(cur=>cur.map(t=>t.id===selected?.trackId?{...t,regions:fn(t.regions)}:t))}
  const split=()=>{if(!region||playhead<=region.start+.03||playhead>=region.start+region.duration-.03)return;const left=playhead-region.start,right=region.duration-left;mutateSelected(rs=>rs.flatMap(r=>r.id!==region.id?[r]:[{...r,id:crypto.randomUUID(),duration:left},{...r,id:crypto.randomUUID(),start:playhead,duration:right,sourceOffset:(r.sourceOffset||0)+left}]));setSelected(null)}
  const copy=()=>region&&setClipboard({...region,id:null,kind:isLoopSelected?'loop':'audio'}); const cut=()=>{if(!region)return;setClipboard({...region,id:null,kind:isLoopSelected?'loop':'audio'});mutateSelected(rs=>rs.filter(r=>r.id!==region.id));setSelected(null)}
  const paste=()=>{if(!clipboard)return;if(clipboard.kind==='loop'&&chosenLoop){setLoopRegions(cur=>[...cur,{...clipboard,id:crypto.randomUUID(),start:playhead}]);setSelected({trackId:'__loop__',regionId:null});return}if(!activeTrackId)return;setTracks(cur=>cur.map(t=>t.id===activeTrackId?{...t,regions:[...t.regions,{...clipboard,id:crypto.randomUUID(),start:playhead}]}:t))}
  const removeRegion=()=>{if(!region)return;mutateSelected(rs=>rs.filter(r=>r.id!==region.id));setSelected(null)}
  const pointerDown=(e,t,r)=>{e.stopPropagation();setActiveTrackId(t.id);setSelected({trackId:t.id,regionId:r.id});drag.current={trackId:t.id,regionId:r.id,startX:e.clientX,original:r.start};e.currentTarget.setPointerCapture?.(e.pointerId)}
  const pointerMove=e=>{if(!drag.current)return;const d=drag.current,next=Math.max(0,Math.min(PROJECT_SECONDS-.05,d.original+(e.clientX-d.startX)/zoom));setTracks(cur=>cur.map(t=>t.id===d.trackId?{...t,regions:t.regions.map(r=>r.id===d.regionId?{...r,start:next}:r)}:t))}
  const pointerUp=e=>{if(!drag.current)return;const d=drag.current;const lane=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-studio-track]');const targetId=lane?.dataset?.studioTrack;if(targetId&&targetId!==d.trackId){setTracks(cur=>{const source=cur.find(t=>t.id===d.trackId),moved=source?.regions.find(r=>r.id===d.regionId);if(!moved)return cur;return cur.map(t=>t.id===d.trackId?{...t,regions:t.regions.filter(r=>r.id!==d.regionId)}:t.id===targetId?{...t,regions:[...t.regions,moved]}:t)});setActiveTrackId(targetId);setSelected({trackId:targetId,regionId:d.regionId})}drag.current=null}
  const loopPointerDown=(e,r)=>{e.stopPropagation();setSelected({trackId:'__loop__',regionId:r.id});setActiveTrackId(null);drag.current={trackId:'__loop__',regionId:r.id,startX:e.clientX,original:r.start};e.currentTarget.setPointerCapture?.(e.pointerId)}
  const loopPointerMove=e=>{if(drag.current?.trackId!=='__loop__')return;const d=drag.current,next=Math.max(0,Math.min(PROJECT_SECONDS-.05,d.original+(e.clientX-d.startX)/zoom));setLoopRegions(cur=>cur.map(r=>r.id===d.regionId?{...r,start:next}:r))}
  const loopPointerUp=()=>{if(drag.current?.trackId==='__loop__')drag.current=null}
  const deleteLoopTrack=async()=>{if(!await dialog.confirm('Remove the backing loop and its arrangement from this project?',{title:'Delete loop track?',confirmLabel:'Delete',tone:'danger'}))return;setSelectedLoop('');setLoopRegions([]);if(isLoopSelected)setSelected(null)}
  const newProject=()=>{setTracks([]);setSelectedLoop('');setLoopMuted(false);setLoopRegions([]);setProjectId(crypto.randomUUID());setProjectName(`Practice ${new Date().toLocaleDateString()}`);setProjectOpen(true);setSaved(true);setPlayhead(0)}
  const openProject=p=>{setProjectId(p.id);setProjectName(p.name||'Untitled Practice');setSelectedLoop(p.selectedLoop||'');setLoopMuted(!!p.loopMuted);setLoopRegions(p.loopRegions?.length?p.loopRegions:(p.selectedLoop?[{id:crypto.randomUUID(),start:0,duration:PROJECT_SECONDS,sourceOffset:0,peaks:fakePeaks(2,150)}]:[]));setTracks((p.tracks||[]).map(t=>({...t,live:false,liveWidth:0,regions:(t.regions||[]).map(r=>({...r,url:r.blob?URL.createObjectURL(r.blob):r.url}))})));setProjectOpen(true);setSaved(true);setPlayhead(0)}
  const saveProject=async()=>{if(!projectId)return;const cleanTracks=tracks.map(t=>({...t,live:false,liveWidth:0,regions:t.regions.map(({url,...r})=>r)}));await putProject({id:projectId,name:projectName,selectedLoop,loopMuted,loopRegions,tracks:cleanTracks,updatedAt:Date.now()});setProjects(await listProjects());setSaved(true)}
  const deleteProject=async p=>{if(!await dialog.confirm(`Delete “${p.name}”?`,{title:'Delete Studio project?',confirmLabel:'Delete',tone:'danger'}))return;await removeProject(p.id);setProjects(await listProjects())}
  const toggleFavorite=async p=>{await putProject({...p,favorite:!p.favorite,updatedAt:p.updatedAt||Date.now()});setProjects(await listProjects())}
  const exportProject=async(p,format='wav')=>{try{setExporting(`${p.id}:${format}`);const rendered=await renderSavedProject(p,loops),wav=audioBufferToWav(rendered),safe=(p.name||'AGM Studio Project').replace(/[^a-z0-9 _-]/gi,'').trim();if(format==='wav'){downloadBlob(wav,`${safe}.wav`);return}if(!window.MediaRecorder?.isTypeSupported?.('audio/mpeg')){await dialog.alert('This browser cannot encode MP3 directly. Export WAV for full-quality audio, or open AGM Band Manager in a browser with MP3 MediaRecorder support.',{title:'MP3 export unavailable'});return}const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx(),dest=ctx.createMediaStreamDestination(),src=ctx.createBufferSource(),chunks=[];src.buffer=rendered;src.connect(dest);const mr=new MediaRecorder(dest.stream,{mimeType:'audio/mpeg'});mr.ondataavailable=e=>e.data?.size&&chunks.push(e.data);const done=new Promise(resolve=>{mr.onstop=resolve});mr.start();src.start();src.onended=()=>mr.stop();await done;downloadBlob(new Blob(chunks,{type:'audio/mpeg'}),`${safe}.mp3`);await ctx.close();}catch{await dialog.alert('This project could not be mixed for export. Make sure its saved recordings and loop files are still available.',{title:'Export failed'})}finally{setExporting('')}}
  const exit=async()=>{if((recordingId||!saved)&&!await dialog.confirm('Any changes since your last save will be lost.',{title:'Leave Studio Mode?',confirmLabel:'Leave Studio'}))return;if(recordingId)recorder.current?.stop();stopAudio();setProjectOpen(false);setProjects(await listProjects());}

  useEffect(()=>{if(projectOpen)setSaved(false)},[tracks,selectedLoop,loopMuted,loopRegions,projectName])

  if(!projectOpen) return <div className="more-page studio-project-home studio-library-screen">
    <div className="more-page-nav"><button onClick={onBack}>‹ More</button></div>
    <div className="more-page-title studio-page-title"><h2>Studio Mode</h2>{projects.length>0&&<p>Open a saved project or start a new rehearsal session.</p>}</div>

    {projects.length===0 ? <>
      <section className="studio-empty-hero">
        <div className="studio-empty-wave" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>
        <h2>No Projects Yet</h2>
        <p>Start a new project and bring your ideas to life.</p>
        <button onClick={newProject}>＋ <span>Create Studio Project</span></button>
      </section>
      <div className="studio-feature-list">
        <article><b className="studio-feature-icon">🎙</b><div><strong>Multi-track Recording</strong><span>Record vocals, instruments and loops</span></div></article>
        <article><b className="studio-feature-icon sliders">≋</b><div><strong>Edit &amp; Arrange</strong><span>Cut, copy, paste, drag and more</span></div></article>
        <article><b className="studio-feature-icon">♫</b><div><strong>Use Our Loops</strong><span>Add AGM loops to practice</span></div></article>
        <article><b className="studio-feature-icon">⇧</b><div><strong>Export Your Sound</strong><span>Export your projects as MP3 or WAV</span></div></article>
      </div>
    </> : <>
      <div className="studio-project-section-head"><div><strong>My Projects</strong><span>{projects.length} saved {projects.length===1?'project':'projects'}</span></div><button className="studio-new-project" onClick={newProject}>＋ New Project</button></div>
      <div className="studio-project-search"><span>⌕</span><input value={projectSearch} onChange={e=>setProjectSearch(e.target.value)} placeholder="Search projects…"/></div>
      <div className="studio-project-filters">{[['all','All'],['recent','Recent'],['favorites','Favorites']].map(([id,label])=><button key={id} className={projectFilter===id?'active':''} onClick={()=>setProjectFilter(id)}>{label}</button>)}</div>
      <div className="studio-project-list studio-project-list-pro studio-project-list-clean">{visibleProjects.map(p=><article key={p.id}>
        <button className="studio-project-open" onClick={()=>openProject(p)}>
          <span className="studio-project-art studio-project-art-photo"><i>▶</i></span>
          <div><strong>{p.name}</strong><small>{p.tracks?.length||0} tracks · {new Date(p.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small></div>
        </button>
        <button className={`studio-project-star ${p.favorite?'active':''}`} aria-label="Favorite project" onClick={()=>toggleFavorite(p)}>★</button>
        <div className="studio-project-menu">
          <button disabled={!!exporting} onClick={()=>exportProject(p,'wav')}>WAV</button>
          <button disabled={!!exporting} onClick={()=>exportProject(p,'mp3')}>MP3</button>
          <button className="danger" onClick={()=>deleteProject(p)}>Delete</button>
        </div>
      </article>)}</div>
      {!visibleProjects.length&&<div className="studio-no-results">No projects match this view.</div>}
    </>}
  </div>
  return <div className="studio-fullscreen">
    <header className="studio-top"><button className="studio-exit" onClick={exit}>‹</button><input className="studio-project-title" value={projectName} onChange={e=>setProjectName(e.target.value)}/><div className="studio-transport horizontal"><button onClick={()=>setPlayhead(0)}>↤</button><button onClick={play} disabled={!!recordingId}>{playing&&!recordingId?'■':'▶'}</button><button className={recordingId?'rec active':'rec'} onClick={startRecord}>●</button><span>{fmt(playhead)}</span></div><button className="studio-save" onClick={saveProject}>{saved?'Saved':'Save'}</button><button className="studio-add" onClick={addTrack} disabled={!!recordingId}>＋ Add Track</button></header>
    <div className="daw-tools studio-tools"><select value={selectedLoop} onChange={e=>{setSelectedLoop(e.target.value);setLoopRegions(e.target.value?[{id:crypto.randomUUID(),start:0,duration:PROJECT_SECONDS,sourceOffset:0,peaks:fakePeaks(2,150)}]:[]);setSelected(null)}}><option value="">No backing loop</option>{loops.map(l=><option key={l.src} value={l.src}>{l.name}</option>)}</select><span className="daw-edit-tools"><button disabled={!region} onClick={split}>✂ Slice</button><button disabled={!region} onClick={cut}>Cut</button><button disabled={!region} onClick={copy}>Copy</button><button disabled={!clipboard||(clipboard.kind!=='loop'&&!activeTrackId)} onClick={paste}>Paste</button><button disabled={!region} onClick={removeRegion}>Delete</button></span><div className="studio-zoom"><button onClick={()=>setZoom(z=>Math.max(3,z-1))}>−</button><span>Zoom</span><button onClick={()=>setZoom(z=>Math.min(14,z+1))}>＋</button></div></div>
    <div className="daw-scroll studio-scroll"><div className="daw-ruler-row"><aside>TRACKS</aside><main style={{width}} onClick={e=>setPlayhead(Math.max(0,e.nativeEvent.offsetX/zoom))}>{Array.from({length:Math.ceil(PROJECT_SECONDS/4)},(_,i)=><span key={i} style={{left:px(i*4,zoom)}}>{i+1}</span>)}<i className="daw-playhead" style={{left:px(playhead,zoom)}}/></main></div>
      {chosenLoop&&<div className="daw-track loop"><aside><b>↻</b><span><strong>{chosenLoop.name}</strong><small>{loopMuted?'Muted':`${loopRegions.length} loop region${loopRegions.length===1?'':'s'}`}</small></span><button className={loopMuted?'active':''} onClick={()=>setLoopMuted(v=>!v)}>M</button><button className="trash" onClick={deleteLoopTrack}>×</button></aside><main style={{width}} onClick={e=>{if(e.target===e.currentTarget)setPlayhead(e.nativeEvent.offsetX/zoom)}}>{loopRegions.map(r=><div key={r.id} className={`daw-region loop-region ${selected?.trackId==='__loop__'&&selected?.regionId===r.id?'selected':''}`} style={{left:px(r.start,zoom),width:Math.max(12,px(r.duration,zoom))}} onPointerDown={e=>loopPointerDown(e,r)} onPointerMove={loopPointerMove} onPointerUp={loopPointerUp} onPointerCancel={loopPointerUp}>{(r.peaks||fakePeaks(2,150)).map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div>)}<i className="daw-playhead" style={{left:px(playhead,zoom)}}/></main></div>}
      {tracks.map((t,ti)=><div className={`daw-track ${activeTrackId===t.id?'active-track':''}`} key={t.id} data-studio-track={t.id} onClick={()=>setActiveTrackId(t.id)}><aside><b>{String(ti+1).padStart(2,'0')}</b><span><input value={t.name} onChange={e=>patchTrack(t.id,{name:e.target.value})}/><small>{t.live?'Recording…':activeTrackId===t.id?'Selected track':`${t.regions.length} region${t.regions.length===1?'':'s'}`}</small></span><button className={t.muted?'active':''} onClick={e=>{e.stopPropagation();patchTrack(t.id,{muted:!t.muted})}}>M</button><input aria-label="Track volume" type="range" min="0" max="1" step=".05" value={t.volume} onChange={e=>patchTrack(t.id,{volume:Number(e.target.value)})}/><button className="trash" onClick={e=>{e.stopPropagation();deleteTrack(t.id)}}>×</button></aside><main style={{width}} onClick={e=>{setActiveTrackId(t.id);if(e.target===e.currentTarget)setPlayhead(e.nativeEvent.offsetX/zoom)}}>{t.regions.map(r=><div key={r.id} className={`daw-region ${selected?.regionId===r.id?'selected':''}`} style={{left:px(r.start,zoom),width:Math.max(12,px(r.duration,zoom))}} onPointerDown={e=>pointerDown(e,t,r)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>{r.peaks.map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div>)}{t.live&&<div className="daw-region live" style={{left:px(recordStartHead.current,zoom),width:Math.max(8,px(t.liveWidth,zoom))}}>{fakePeaks(Date.now()%11,60).map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div>}<i className="daw-playhead" style={{left:px(playhead,zoom)}}/></main></div>)}
      {!tracks.length&&!chosenLoop&&<div className="daw-empty"><strong>＋ Add Track</strong><span>Add Track creates an empty Voice/Audio lane. Select it, then press the red Record button when you are ready.</span></div>}
    </div>
    <footer className="studio-footer">{error?<span className="studio-error">{error}</span>:region?<><strong>Selected region</strong><span>Drag it to move · Playhead {fmt(playhead)} · Slice at playhead</span></>:<><strong>{activeTrackId?'Track selected':'Ready'}</strong><span>{activeTrackId?'Record and pasted regions go to this track.':'Add or select a track to begin.'}</span></>}</footer>
  </div>
}
