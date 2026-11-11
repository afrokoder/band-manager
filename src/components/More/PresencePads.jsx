import { useEffect, useRef, useState } from 'react'
import './PresencePads.css'

// Original Web Audio synthesis; no third-party recordings or sample packs are used.
const KEYS = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B']
// Each preset has its own voicing, oscillator mix, filtering and modulation profile.
// These are original synthesized textures, not sampled commercial recordings.
const GROUPS = [
  {name:'Worship', sounds:[
    ['Warm Worship','Soft, embracing foundation','warm',[0,7,12,16,19],980,2.7,3],
    ['Heavenly','Open, floating harmonics','air',[0,12,19,24,28],2200,3.6,7],
    ['Deep Worship','Low, enveloping warmth','deep',[-12,0,7,12,19],650,3.2,3],
    ['Intimate','Gentle and close','soft',[0,7,12,14,19],760,4.1,2],
    ['Gentle Presence','Quiet and reassuring','glass',[0,12,16,19,24],1400,4.6,4],
  ]},
  {name:'Prayer', sounds:[
    ['Stillness','Minimal and peaceful','soft',[0,7,12,19,24],780,4.5,2],
    ['Intercession','Steady, grounded tension','deep',[-12,0,5,7,12],850,3.8,4],
    ['Soaking','Long, flowing layers','air',[0,7,12,19,26],1500,5.4,8],
    ['Midnight Prayer','Dark and contemplative','dark',[-12,0,3,7,15],520,4.8,3],
    ['Meditation','Calm and centered','glass',[0,7,12,19,24],1050,5.8,2],
  ]},
  {name:'Prophetic', sounds:[
    ['Glory Atmosphere','Expansive and luminous','shimmer',[0,7,12,19,28],2450,3.5,9],
    ['Open Heavens','Wide, ascending color','air',[0,12,19,24,31],2600,4.3,10],
    ['Revival','Bold, swelling harmonics','organ',[-12,0,7,12,16,19],1600,2.3,5],
    ['Encounter','Mysterious and spacious','dark',[0,5,12,17,24],1200,4.1,8],
    ['Fire','Bright, intense movement','shimmer',[0,7,12,16,24,31],3200,2.0,11],
  ]},
  {name:'Cinematic', sounds:[
    ['Ethereal','Weightless and airy','air',[0,12,19,24,36],3000,5.0,12],
    ['Celestial','Sparkling upper harmonics','glass',[0,12,19,24,28],2800,3.0,6],
    ['Strings','Soft bowed-string character','strings',[0,7,12,16,19,24],1550,2.8,4],
    ['Ambient Piano','Bell-like piano overtones','piano',[0,7,12,19,24],2100,2.2,3],
    ['Shimmer','Glowing high-frequency air','shimmer',[0,12,19,24,31,36],3400,4.0,12],
  ]},
  {name:'African Worship', sounds:[
    ['African Worship','Warm layered harmonies','organ',[0,7,12,16,19],1350,2.7,4],
    ['Highlife Atmosphere','Bright, major-key lift','pluck',[0,4,7,12,16,19],2450,2.1,5],
    ['Afro Ambient','Rhythmic, gently moving air','pulse',[0,7,12,19,24],1800,3.3,7],
    ['Gospel Organ','Rich organ-like harmonics','organ',[-12,0,7,12,16,19],2100,1.8,3],
    ['African Strings','Warm, expressive ensemble','strings',[0,7,12,16,19],1700,3.5,6],
  ]},
  {name:'Transitions', sounds:[
    ['Soft Transition','Subtle and unobtrusive','soft',[0,7,12,19],850,3.8,2],
    ['Altar Call','Tender, reflective harmony','warm',[0,7,12,14,19],1050,4.0,4],
    ['Ministry Flow','Even and spacious','air',[0,7,12,19,24],1550,3.5,6],
    ['Closing Prayer','Soft and resolved','glass',[0,7,12,16,19],1150,4.4,3],
    ['Instrumental Bed','Full, balanced foundation','strings',[-12,0,7,12,16,19],1300,2.8,4],
  ]},
]
const PRESETS = GROUPS.flatMap(group => group.sounds.map(([name,caption,timbre,voices,lowpass,attack,detune]) => ({name,caption,timbre,voices,lowpass,attack,detune,category:group.name})))
const TIMBRES = {
  warm:[['sine',.8],['triangle',.2]], air:[['sine',.45],['triangle',.35],['sawtooth',.06]],
  deep:[['sine',.8],['triangle',.16]], soft:[['sine',.9],['triangle',.1]],
  glass:[['sine',.75],['triangle',.1]], dark:[['triangle',.65],['sine',.35]],
  shimmer:[['sine',.6],['triangle',.25],['sawtooth',.07]],
  organ:[['sine',.6],['triangle',.25],['square',.07]],
  strings:[['sawtooth',.25],['triangle',.6],['sine',.15]],
  piano:[['sine',.65],['triangle',.25]],
  pluck:[['triangle',.55],['sine',.4]], pulse:[['triangle',.5],['sine',.4],['square',.04]],
}
const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12)
const clamp = (v,min,max)=>Math.min(max,Math.max(min,v))

export default function PresencePads({ Page, onBack }) {
  const [keyIndex,setKeyIndex] = useState(0)
  const [presetIndex,setPresetIndex] = useState(0)
  const [category,setCategory] = useState('Worship')
  const [playing,setPlaying] = useState(false)
  const [volume,setVolume] = useState(.58)
  const [brightness,setBrightness] = useState(.58)
  const [space,setSpace] = useState(.45)
  const [fade,setFade] = useState(3)
  const [error,setError] = useState('')
  const engine = useRef(null)
  const active = useRef(null)
  const values = useRef({volume,brightness,space,fade})
  values.current = {volume,brightness,space,fade}

  const init = async () => {
    if (!engine.current) {
      const Audio = window.AudioContext || window.webkitAudioContext
      if (!Audio) throw new Error('This browser does not support Web Audio.')
      const ctx = new Audio()
      const master = ctx.createGain(); master.gain.value = 0
      const dry = ctx.createGain(); dry.gain.value = .75
      const delay = ctx.createDelay(1.5); delay.delayTime.value = .36
      const feedback = ctx.createGain(); feedback.gain.value = .28
      const wet = ctx.createGain(); wet.gain.value = .25
      master.connect(dry); dry.connect(ctx.destination)
      master.connect(delay); delay.connect(wet); wet.connect(ctx.destination)
      delay.connect(feedback); feedback.connect(delay)
      engine.current = {ctx,master,delay,feedback,wet,dry}
    }
    await engine.current.ctx.resume()
    return engine.current
  }
  const makeLayer = (eng, k, p) => {
    const {ctx,master} = eng
    const preset = PRESETS[p]
    const bus = ctx.createGain(); bus.gain.value = 0
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'
    filter.frequency.value = preset.lowpass * (.4 + values.current.brightness * 1.45)
    bus.connect(filter); filter.connect(master)
    const oscillators = []
    const root = 48 + k // C3 through B3
    const mix = TIMBRES[preset.timbre] || TIMBRES.warm
    preset.voices.forEach((offset, i) => {
      mix.forEach(([wave,level],j) => {
        const o = ctx.createOscillator(); o.type = wave
        o.frequency.value = frequency(root + offset)
        o.detune.value = (i % 2 ? 1 : -1) * preset.detune + (j - 1) * 3
        const gain = ctx.createGain()
        gain.gain.value = level / (preset.voices.length * 1.55)
        o.connect(gain); gain.connect(bus); o.start(); oscillators.push(o)
      })
      // Upper partials and slow movement distinguish airy, glass and shimmer sounds.
      if (['glass','shimmer','air','piano'].includes(preset.timbre) && i < 3) {
        const overtone = ctx.createOscillator(); overtone.type = 'sine'
        overtone.frequency.value = frequency(root + offset + (preset.timbre === 'shimmer' ? 24 : 12))
        const g = ctx.createGain(); g.gain.value = preset.timbre === 'shimmer' ? .025 : .013
        overtone.connect(g); g.connect(bus); overtone.start(); oscillators.push(overtone)
      }
    })
    if (['pulse','strings','air','shimmer'].includes(preset.timbre)) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = preset.timbre === 'pulse' ? 1.4 : .13
      const depth = ctx.createGain(); depth.gain.value = preset.timbre === 'pulse' ? .12 : .035
      lfo.connect(depth); depth.connect(bus.gain); lfo.start(); oscillators.push(lfo)
    }
    return {bus,filter,oscillators,stopped:false}
  }
  const retire = (layer, seconds) => {
    if (!layer || layer.stopped || !engine.current) return
    layer.stopped = true
    const {ctx} = engine.current; const t = ctx.currentTime
    layer.bus.gain.cancelScheduledValues(t)
    layer.bus.gain.setValueAtTime(Math.max(.0001,layer.bus.gain.value),t)
    layer.bus.gain.linearRampToValueAtTime(0,t+seconds)
    const cleanup = () => {
      layer.oscillators.forEach(o=>{try{o.stop()}catch{}})
      try{layer.bus.disconnect();layer.filter.disconnect()}catch{}
    }
    // Schedule source stops on audio timeline, even if page is backgrounded.
    layer.oscillators.forEach(o=>{try{o.stop(t+seconds+.1)}catch{}})
    // Connections become collectible when audio sources stop and component closes.
    void cleanup
  }
  const transition = async (k,p) => {
    try {
      setError('')
      const eng = await init(); const t=eng.ctx.currentTime
      const seconds=values.current.fade
      const next=makeLayer(eng,k,p)
      next.bus.gain.setValueAtTime(0,t)
      next.bus.gain.linearRampToValueAtTime(.7,t+Math.max(.1,seconds))
      retire(active.current,Math.max(.1,seconds))
      active.current=next
      eng.master.gain.setTargetAtTime(values.current.volume,t,.12)
      setPlaying(true)
    } catch (err) {setError(err.message||'Audio could not start.')}
  }
  const stop = () => {
    retire(active.current,values.current.fade)
    active.current=null
    setPlaying(false)
  }
  const chooseKey = k => {setKeyIndex(k);if(playing)transition(k,presetIndex)}
  const choosePreset = p => {setPresetIndex(p);if(playing)transition(keyIndex,p)}
  useEffect(()=>{
    const eng=engine.current;if(!eng)return
    const t=eng.ctx.currentTime
    eng.master.gain.setTargetAtTime(volume,t,.09)
    eng.wet.gain.setTargetAtTime(space*.65,t,.15)
    eng.feedback.gain.setTargetAtTime(.12+space*.42,t,.15)
    if(active.current)active.current.filter.frequency.setTargetAtTime(PRESETS[presetIndex].lowpass*(.4+brightness*1.45),t,.15)
  },[volume,brightness,space,presetIndex])
  useEffect(()=>()=>{
    const eng=engine.current
    if(eng){eng.ctx.close().catch(()=>{});engine.current=null}
  },[])
  return <Page title="Presence Pads" subtitle="Ambient worship soundscapes for prayer, worship and transitions." onBack={onBack}>
    <div className="presence">
      <div className="presence-hero">
        <div className="presence-overline"><span className={playing?'presence-dot on':'presence-dot'}/> {playing?'SOUND ACTIVE':'READY TO WORSHIP'}</div>
        <div className="presence-halo" aria-hidden="true"><div>♫</div></div>
        <h3>{KEYS[keyIndex]} <small>· {PRESETS[presetIndex].name}</small></h3>
        <p>{PRESETS[presetIndex].caption}</p>
        <button className={playing?'presence-play playing':'presence-play'} onClick={()=>playing?stop():transition(keyIndex,presetIndex)}>{playing?'■  Fade Out':'▶  Play Pad'}</button>
        <small className="presence-tip">{playing?'Change a key or sound for a smooth crossfade.':'Tap Play to enable audio on your device.'}</small>
      </div>
      <section className="presence-section"><div className="presence-section-title"><h3>Choose a sound</h3><span>30 presets · 6 categories</span></div>
        <div className="presence-categories" role="group" aria-label="Sound categories">{GROUPS.map(g=><button key={g.name} className={category===g.name?'selected':''} onClick={()=>setCategory(g.name)} aria-pressed={category===g.name}>{g.name}</button>)}</div>
        <div className="presence-presets">{PRESETS.map((p,i)=>p.category===category?<button key={p.name} className={i===presetIndex?'selected':''} onClick={()=>choosePreset(i)} aria-pressed={i===presetIndex}><strong>{p.name}</strong><small>{p.caption}</small></button>:null)}</div>
      </section>
      <section className="presence-section"><div className="presence-section-title"><h3>Musical key</h3><span>12 keys</span></div>
        <div className="presence-keys">{KEYS.map((k,i)=><button key={k} className={i===keyIndex?'selected':''} onClick={()=>chooseKey(i)} aria-pressed={i===keyIndex}>{k}</button>)}</div>
      </section>
      <section className="presence-section"><div className="presence-section-title"><h3>Sound controls</h3><span>Live adjustments</span></div>
        <div className="presence-sliders">
          <label><span>Volume <b>{Math.round(volume*100)}%</b></span><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>
          <label><span>Brightness <b>{Math.round(brightness*100)}%</b></span><input type="range" min="0" max="1" step=".01" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>
          <label><span>Space / Echo <b>{Math.round(space*100)}%</b></span><input type="range" min="0" max="1" step=".01" value={space} onChange={e=>setSpace(Number(e.target.value))}/></label>
          <label><span>Transition <b>{fade.toFixed(1)}s</b></span><input type="range" min=".5" max="8" step=".5" value={fade} onChange={e=>setFade(clamp(Number(e.target.value),.5,8))}/></label>
        </div>
      </section>
      {error&&<p className="presence-error" role="alert">{error}</p>}
      <p className="presence-footnote">AGM original synthesized pads · No audio downloads required. For best results, use headphones or external speakers. Keep this page open during playback.</p>
    </div>
  </Page>
}
