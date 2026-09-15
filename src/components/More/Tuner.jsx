import { useEffect, useRef, useState } from 'react'
import { autoCorrelate, frequencyToNote } from '../../utils/pitch'

const STRINGS=[{note:'E',octave:4,hz:329.63,label:'1'},{note:'B',octave:3,hz:246.94,label:'2'},{note:'G',octave:3,hz:196,label:'3'},{note:'D',octave:3,hz:146.83,label:'4'},{note:'A',octave:2,hz:110,label:'5'},{note:'E',octave:2,hz:82.41,label:'6'}]
const centsFrom=(freq,target)=>1200*Math.log2(freq/target)

export default function Tuner({ Page, onBack }) {
  const [listening,setListening]=useState(false),[selected,setSelected]=useState(STRINGS[0]),[note,setNote]=useState(null),[error,setError]=useState('')
  const ctxRef=useRef(null),streamRef=useRef(null),rafRef=useRef(null),toneRef=useRef(null),selectedRef=useRef(STRINGS[0])
  const stop=()=>{cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks?.().forEach(t=>t.stop());ctxRef.current?.close?.().catch(()=>{});streamRef.current=null;ctxRef.current=null;setListening(false)}
  useEffect(()=>stop,[])
  const playReference=async string=>{setSelected(string);selectedRef.current=string;const Ctx=window.AudioContext||window.webkitAudioContext;const ctx=toneRef.current||(toneRef.current=new Ctx());await ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=string.hz;g.gain.setValueAtTime(.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+1.2);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+1.2)}
  const start=async()=>{setError('');try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});const Ctx=window.AudioContext||window.webkitAudioContext;const ctx=new Ctx();await ctx.resume();const source=ctx.createMediaStreamSource(stream),analyser=ctx.createAnalyser();analyser.fftSize=4096;source.connect(analyser);const buffer=new Float32Array(analyser.fftSize);streamRef.current=stream;ctxRef.current=ctx;setListening(true);const tick=()=>{analyser.getFloatTimeDomainData(buffer);const freq=autoCorrelate(buffer,ctx.sampleRate);if(freq>60&&freq<500){const found=frequencyToNote(freq);if(found)setNote({...found,targetCents:centsFrom(freq,selectedRef.current.hz)})}rafRef.current=requestAnimationFrame(tick)};tick()}catch{setError('Microphone access is required for the tuner.')}}
  const cents=Math.max(-50,Math.min(50,note?.targetCents||0)), inTune=Math.abs(cents)<5
  return <Page title="Guitar Tuner" subtitle="Choose a guitar string, hear its reference pitch, then tune toward the center." onBack={()=>{stop();onBack()}}>
    <div className="guitar-tuner">
      <div className="guitar-tuner-top"><button className="tuner-back-ref" onClick={()=>playReference(selected)}>♪ Reference</button><span className={inTune&&note?'in-tune':''}>● {note?(inTune?'In tune':cents<0?'Tune up':'Tune down'):'Auto'}</span></div>
      <div className="guitar-meter"><b style={{left:`calc(${50+cents}% - 16px)`}}/><i/><div>{[-50,-25,-10,0,10,25,50].map(v=><span key={v}/>)}</div></div>
      <div className="guitar-readout"><strong>{selected.note}{selected.octave}</strong><span>{note?`${note.frequency.toFixed(1)} Hz · ${cents>0?'+':''}${Math.round(cents)} cents`:`Target ${selected.hz.toFixed(2)} Hz`}</span></div>
      <div className="guitar-headstock"><div className="headstock-shape"><div className="nut"/>{STRINGS.map((s,i)=><button key={`${s.note}${s.octave}`} className={selected===s?'active':''} style={{gridArea:i<3?`${i+1} / 1`:`${i-2} / 3`}} onClick={()=>playReference(s)}><small>{s.label}</small><strong>{s.note}</strong></button>)}<div className="strings">{STRINGS.map((_,i)=><i key={i}/>)}</div></div></div>
      <button className={listening?'btn-secondary more-wide-btn':'btn-primary more-wide-btn'} onClick={listening?stop:start}>{listening?'Stop listening':'Start microphone tuner'}</button>
    </div>{error&&<div className="more-error">{error}</div>}
  </Page>
}
