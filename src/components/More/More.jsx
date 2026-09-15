import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTeamMedia } from '../../hooks/useTeamMedia'
import { useLoops } from '../../hooks/useLoops'
import LearnHub from './LearnHub'
import NotesHub from './NotesHub'
import InsightsHub from './InsightsHub'
import PlayHub from './PlayHub'
import Tuner from './Tuner'
import RehearsalStudio from './RehearsalStudio'

function Page({ title, subtitle, onBack, backLabel='More', children }) {
  return <div className="more-page">
    <div className="more-page-nav"><button onClick={onBack}>‹ {backLabel}</button></div>
    <div className="more-page-title"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    {children}
  </div>
}

function MoreHome({ open, onNavigate }) {
  const { isAdmin } = useAuth()
  const groups = [
    { title:'Library', items:[
      ['music-library','♫','Music Library','Songs, lyrics and references'],
      ['files-media','▣','Files & Media','Team photos and videos'],
    ]},
    { title:'Tools', items:[
      ['tuner','⌁','Tuner','Tune vocals and instruments'],
      ['metronome','◉','Metronome','Practice with a steady pulse'],
      ['loops','↻','Loop Player','Search and play AGM loop tracks'],
    ]},
    { title:'Rehearsal Mode', items:[
      ['rehearsal-studio','▥','Studio Mode','Record and layer multiple practice tracks over AGM loops'],
    ]},
    { title:'Grow', items:[
      ['learn','▤','Learn','Article and YouTube links for singers and musicians'],
      ['notes','✎','Notes','Private folders, rich notes and PDF sharing'],
    ]},
    { title:'Play', items:[
      ['play','★','Games & Ear Training','Bible, music and relative-pitch games'],
    ]},
    ...(isAdmin ? [{ title:'Insights', items:[
      ['analytics','⌁','Analytics','Live participation and team health'],
      ['reports','▤','Reports','Leadership PDF reports and follow-up data'],
    ]}] : []),
    { title:'Rules & Policies', items:[['rules','✓','Rules & Policies','Team standards and expectations']]},
    { title:'About', items:[['about','A','About Amazing Voices','Our choir, ministry and leadership']]},
  ]

  return <div className="more-home">
    <div className="more-home-header"><h2>More</h2><p>Tools, rehearsal practice, learning, games and team resources.</p></div>
    {groups.map(group => <section className="more-section" key={group.title}>
      <h3>{group.title}</h3>
      <div className="more-list">{group.items.map(([id,icon,title,sub]) => <button key={id} className="more-row" onClick={()=>id==='music-library'?onNavigate('songs'):open(id)}>
        <span className="more-row-icon">{icon}</span><span className="more-row-copy"><strong>{title}</strong><small>{sub}</small></span><span className="more-chevron">›</span>
      </button>)}</div>
    </section>)}
  </div>
}

function FilesMedia({ onBack }) {
  const { isAdmin } = useAuth(); const { items, loading, uploadMedia, removeMedia } = useTeamMedia()
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const inputRef=useRef(null)
  const upload=async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);setError('');try{await uploadMedia(file)}catch(err){setError(err.message)}finally{setBusy(false);e.target.value=''}}
  return <Page title="Files & Media" subtitle="Photos and videos shared with the AGM music team." onBack={onBack}>
    {isAdmin&&<><input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={upload}/><button className="more-add-row" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?'Uploading…':'＋ Upload photo or video'}</button></>}
    {error&&<div className="more-error">{error}</div>}
    {loading?<div className="more-empty">Loading media…</div>:items.length===0?<div className="more-empty">No team media yet.</div>:<div className="media-grid">{items.map(item=><article className="media-card" key={item.id}>{item.type?.startsWith('video/')?<video src={item.url} controls playsInline preload="metadata"/>:<img src={item.url} alt={item.name}/>}<div><strong>{item.name}</strong><small>Added by {item.uploadedByName||'Admin'}</small>{isAdmin&&<button onClick={()=>removeMedia(item)}>Remove</button>}</div></article>)}</div>}
  </Page>
}

function Metronome({ onBack }) {
  const [bpm,setBpm]=useState(100),[playing,setPlaying]=useState(false); const timer=useRef(null), ctx=useRef(null)
  const stop=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;setPlaying(false)}
  useEffect(()=>()=>stop(),[])
  useEffect(()=>{if(playing){stop();start()}},[bpm])
  const click=()=>{const Ctx=window.AudioContext||window.webkitAudioContext;if(!ctx.current)ctx.current=new Ctx();const c=ctx.current,o=c.createOscillator(),g=c.createGain();o.frequency.value=1000;g.gain.setValueAtTime(.12,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.05);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.055)}
  const start=()=>{click();timer.current=setInterval(click,60000/bpm);setPlaying(true)}
  const toggle=()=>playing?stop():start()
  return <Page title="Metronome" subtitle="Lock in the pulse before rehearsal." onBack={onBack}><div className="agm-metronome"><div className="metro-pulse"><i className={playing?'active':''}/><span>{playing?'CLICKING':'READY'}</span></div><div className="metro-number"><strong>{bpm}</strong><small>BPM</small></div><input className="metro-range" type="range" min="40" max="220" value={bpm} onChange={e=>setBpm(Number(e.target.value))}/><div className="metro-scale"><span>40</span><span>130</span><span>220</span></div><div className="metro-actions"><button onClick={()=>setBpm(v=>Math.max(40,v-5))}>− 5</button><button className="metro-start" onClick={toggle}>{playing?'Ⅱ  Pause':'▶  Start'}</button><button onClick={()=>setBpm(v=>Math.min(220,v+5))}>+ 5</button></div><div className="metro-presets">{[60,80,100,120,140].map(v=><button className={bpm===v?'active':''} key={v} onClick={()=>setBpm(v)}>{v}</button>)}</div></div></Page>
}

function LoopPlayer({ onBack, initialSrc='' }) {
  const audio=useRef(null); const { loops }=useLoops(); const [selected,setSelected]=useState(null),[targetBpm,setTargetBpm]=useState(100),[playing,setPlaying]=useState(false),[looping,setLooping]=useState(true),[search,setSearch]=useState('')
  const filtered=useMemo(()=>loops.filter(item=>`${item.name} ${item.key||''} ${item.bpm||''}`.toLowerCase().includes(search.trim().toLowerCase())),[loops,search])
  useEffect(()=>{const target=initialSrc&&loops.find(l=>l.src===initialSrc);if(target){setSelected(target);setTargetBpm(target.bpm||100);return}if(!selected&&loops[0]){setSelected(loops[0]);setTargetBpm(loops[0].bpm||100)}},[loops,selected,initialSrc])
  useEffect(()=>{if(!audio.current||!selected)return;audio.current.src=selected.src;audio.current.loop=looping;audio.current.playbackRate=(targetBpm||selected.bpm||100)/(selected.bpm||100);setPlaying(false)},[selected])
  useEffect(()=>{if(audio.current&&selected)audio.current.playbackRate=(targetBpm||selected.bpm||100)/(selected.bpm||100)},[targetBpm,selected])
  const toggle=async()=>{if(!audio.current||!selected)return;if(audio.current.paused){await audio.current.play();setPlaying(true)}else{audio.current.pause();setPlaying(false)}}
  const restart=()=>{if(!audio.current)return;audio.current.currentTime=0;if(playing)audio.current.play()}
  const toggleLoop=()=>setLooping(current=>{const next=!current;if(audio.current)audio.current.loop=next;return next})
  return <Page title="Loop Player" subtitle="Search AGM loop tracks and practice at a different BPM." onBack={onBack}>
    <audio ref={audio} onEnded={()=>setPlaying(false)}/>
    {loops.length===0?<div className="more-empty"><strong>No loops added yet.</strong><br/>Add files to <code>public/loops</code> and list them in <code>manifest.json</code>.</div>:<>
      {selected&&<div className="agm-loop-deck loop-player-sticky"><div className="loop-deck-head"><div className="loop-disc">↻</div><div><span>NOW PLAYING</span><h3>{selected.name}</h3><p>{selected.bpm||'—'} BPM{selected.key?` · Key ${selected.key}`:''}</p></div></div><div className="loop-deck-controls"><button onClick={restart}>↺</button><button className="loop-deck-play" onClick={toggle}>{playing?'Ⅱ':'▶'}</button><button className={looping?'active':''} onClick={toggleLoop}>↻</button></div><div className="loop-bpm-row"><span>Practice tempo</span><strong>{targetBpm} BPM</strong></div><input className="loop-bpm-range" type="range" min={Math.max(40,(selected.bpm||100)-40)} max={Math.min(220,(selected.bpm||100)+60)} value={targetBpm} onChange={e=>setTargetBpm(Number(e.target.value))}/><div className="loop-rate">{Math.round((targetBpm/(selected.bpm||100))*100)}% playback speed</div></div>}
      <div className="search-wrap loop-search"><svg className="search-ico" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg><input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search loops by name, key or BPM…"/></div>
      <div className="loop-list loop-list-scroll agm-loop-list">{filtered.map(item=><button className={selected?.src===item.src?'active':''} key={item.src} onClick={()=>{setSelected(item);setTargetBpm(item.bpm||100)}}><span className="loop-list-icon">♫</span><div className="loop-list-copy"><strong>{item.name}</strong><div className="loop-list-meta"><small>{item.bpm||'—'} BPM{item.key?` · ${item.key}`:''}</small>{selected?.src===item.src&&<span className="loop-loaded-badge">Loaded</span>}</div></div>{selected?.src!==item.src&&<b>›</b>}</button>)}{filtered.length===0&&<div className="more-empty">No loops match “{search}”.</div>}</div>
    </>}
  </Page>
}

function Rules({ onBack }) {
  const rules=[['Saturday Rehearsals','1st and 3rd Saturday rehearsals are mandatory. Other Saturdays are optional and are intended for self-development, sectional work and extra practice.'],['AGM Content Only','Do not post anything unrelated to the AGM music group. Unrelated posts or repeated misuse may result in removal from the app.'],['Attendance','Submit rehearsal availability before the deadline and update it when plans change.'],['Preparation','Review assigned songs, set lists, keys, media and service notes before rehearsal and service.'],['Respect & Ministry','Communicate respectfully. Feedback should build the team, protect unity and support our ministry purpose.'],['Media & Privacy','Only share team photos, videos or recordings that are appropriate for ministry use and respect other members.']]
  return <Page title="Rules & Policies" subtitle="Working expectations for Amazing Voices and the AGM Band." onBack={onBack}><div className="policy-list">{rules.map(([t,b],i)=><article key={t}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{t}</strong><p>{b}</p></div></article>)}</div></Page>
}

function About({ onBack }) {
  return <Page title="About Amazing Voices" subtitle="The choir of Amazing Grace Ministries · St. Paul, Minnesota." onBack={onBack}><div className="more-card about-clean"><span>AMAZING GRACE MINISTRIES</span><h3>Amazing Voices</h3><p>Amazing Voices is the choir and vocal ministry serving alongside the AGM Band to lead worship, support ministry moments and help the church sing together.</p></div><div className="leadership-list"><h3>Music Leadership</h3>{[['Music Director','Kelechi Uchegbu'],['Assistant Music Director','Sharon Uchegbu'],['Band Leader','Ife Oyedele']].map(([r,n])=><div key={r}><span>{r}</span><strong>{n}</strong></div>)}</div><div className="about-note"><strong>Our purpose</strong><p>Serve God and the church through prepared, unified and excellent music while helping singers and musicians grow in skill, character and worship.</p></div></Page>
}

export default function More({ onNavigate }) {
  const [view,setView]=useState('home')
  const [loopTarget,setLoopTarget]=useState('')
  const savedScroll=useRef(0)
  useEffect(()=>{const open=e=>{setLoopTarget(e.detail?.src||'');setView('loops')};window.addEventListener('agm-open-loop',open);return()=>window.removeEventListener('agm-open-loop',open)},[])
  const openView=id=>{savedScroll.current=document.querySelector('.content')?.scrollTop||0;setView(id);requestAnimationFrame(()=>{const scroller=document.querySelector('.content');if(scroller)scroller.scrollTop=0})}
  const back=()=>{setView('home');requestAnimationFrame(()=>requestAnimationFrame(()=>{const scroller=document.querySelector('.content');if(scroller)scroller.scrollTop=savedScroll.current}))}
  if(view==='files-media') return <FilesMedia onBack={back}/>
  if(view==='analytics') return <InsightsHub Page={Page} onBack={back} mode="analytics"/>
  if(view==='reports') return <InsightsHub Page={Page} onBack={back} mode="reports"/>
  if(view==='tuner') return <Tuner Page={Page} onBack={back}/>
  if(view==='metronome') return <Metronome onBack={back}/>
  if(view==='loops') return <LoopPlayer onBack={back} initialSrc={loopTarget}/>
  if(view==='rehearsal-studio') return <RehearsalStudio Page={Page} onBack={back}/>
  if(view==='learn') return <LearnHub Page={Page} onBack={back}/>
  if(view==='notes') return <NotesHub Page={Page} onBack={back}/>
  if(view==='play') return <PlayHub Page={Page} onBack={back}/>
  if(view==='rules') return <Rules onBack={back}/>
  if(view==='about') return <About onBack={back}/>
  return <MoreHome open={openView} onNavigate={onNavigate}/>
}
