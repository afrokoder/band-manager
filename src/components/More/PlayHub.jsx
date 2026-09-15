import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMembers } from '../../hooks/useRehearsals'
import { useAppDialog } from '../ui/AppDialog'
import { GAME_LEVELS, getGameLevel } from '../../utils/gameLevels'
import { getQuestion, pickQuestionIds, QUESTION_COUNT_PER_LEVEL } from '../../utils/questionBank'

const WEIGHTS={easy:10,medium:20,hard:30}
const MAJOR_STEPS=[0,2,4,5,7,9,11]
const SOLFA=['Do','Re','Mi','Fa','Sol','La','Ti']
const NOTE_TO_MIDI={C:60,D:62,E:64,F:65,G:67,A:69,B:71}

function useLeaveGuard(active) {
  useEffect(() => {
    window.__agmGameInProgress = !!active
    const beforeUnload = event => {
      if (!active) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      if (window.__agmGameInProgress === !!active) window.__agmGameInProgress = false
    }
  }, [active])
}

function pianoTone(midi, duration=.75) {
  const Ctx=window.AudioContext||window.webkitAudioContext
  const ctx=new Ctx(); const t=ctx.currentTime; const base=440*Math.pow(2,(midi-69)/12)
  const gain=ctx.createGain(); gain.connect(ctx.destination); gain.gain.setValueAtTime(.0001,t); gain.gain.exponentialRampToValueAtTime(.18,t+.015); gain.gain.exponentialRampToValueAtTime(.0001,t+duration)
  ;[[1,'sine',1],[2,'sine',.22],[3,'triangle',.09]].forEach(([mult,type,amp])=>{const o=ctx.createOscillator();const g=ctx.createGain();o.type=type;o.frequency.value=base*mult;g.gain.value=amp;o.connect(g);g.connect(gain);o.start(t);o.stop(t+duration+.04)})
  setTimeout(()=>ctx.close().catch(()=>{}),(duration+1)*1000)
}

function QuizGame({ type, difficulty, seenIds, onFinish, onExit }) {
  const dialog=useAppDialog()
  const [questionIds, setQuestionIds] = useState(()=>pickQuestionIds(type,difficulty,seenIds,10))
  const [index,setIndex]=useState(0),[score,setScore]=useState(0),[picked,setPicked]=useState(null),[done,setDone]=useState(false)
  const awarded=useRef(false)
  const q=getQuestion(type,difficulty,questionIds[index])
  useLeaveGuard(!done)

  const choose=i=>{ if(picked!==null)return; setPicked(i); if(i===q.correctIndex)setScore(s=>s+WEIGHTS[difficulty]) }
  const next=()=>{
    if(index===questionIds.length-1){ setDone(true); if(!awarded.current){awarded.current=true;onFinish(score,questionIds)} }
    else { setIndex(i=>i+1); setPicked(null) }
  }
  const replay=()=>{
    setQuestionIds(pickQuestionIds(type,difficulty,[...seenIds,...questionIds],10)); setIndex(0); setScore(0); setPicked(null); setDone(false); awarded.current=false
  }
  const guardedExit=async()=>{ if(!done && !await dialog.confirm('Your current round will be lost.',{title:'Leave this game?',confirmLabel:'Leave game'})) return; onExit() }

  if(done) return <div className="game-finish"><span>{type==='bible'?'BIBLE':'MUSIC'} · {difficulty.toUpperCase()}</span><strong>{score} points</strong><p>Your score has been added to the {type==='bible'?'Bible':'Music'} leaderboard. You can stay here and start another round without returning to the Play home.</p><button className="btn-primary more-wide-btn" onClick={replay}>Play another {difficulty} round</button><button className="btn-secondary more-wide-btn" onClick={onExit}>Back to games</button></div>
  return <div className="quiz-shell"><button className="game-exit-link" onClick={guardedExit}>‹ Games</button><div className="quiz-progress"><span>{index+1} / {questionIds.length}</span><i><b style={{width:`${((index+1)/questionIds.length)*100}%`}}/></i><strong>{score} pts</strong></div><div className="quiz-question"><span>{type==='bible'?'Bible':'Music'} · {difficulty}</span><strong>{q.question}</strong><div>{q.answers.map((answer,i)=><button key={`${answer}-${i}`} className={picked===null?'':i===q.correctIndex?'correct':i===picked?'wrong':''} onClick={()=>choose(i)}>{answer}</button>)}</div>{picked!==null&&<button className="quiz-next" onClick={next}>{index===questionIds.length-1?'Finish round':'Next question'} →</button>}</div><small className="game-pool-note">This level has {QUESTION_COUNT_PER_LEVEL.toLocaleString()} question variations. Completed questions are remembered so rounds stay fresh.</small></div>
}

function EarTrainer({ onExit, onFinish }) {
  const dialog=useAppDialog()
  const [notation,setNotation]=useState('numbers'),[difficulty,setDifficulty]=useState('easy'),[root,setRoot]=useState('C'),[octaves,setOctaves]=useState(false),[started,setStarted]=useState(false)
  const [round,setRound]=useState(0),[target,setTarget]=useState(null),[picked,setPicked]=useState(null),[score,setScore]=useState(0),[done,setDone]=useState(false); const awarded=useRef(false)
  const allowed=difficulty==='easy'?[0,2,4]:[0,1,2,3,4,5,6]
  const options=useMemo(()=>allowed.flatMap(deg=>octaves?[{deg,oct:-1},{deg,oct:0},{deg,oct:1}]:[{deg,oct:0}]),[allowed,octaves])
  const label=o=>`${notation==='numbers'?o.deg+1:SOLFA[o.deg]}${octaves?(o.oct<0?' ↓':o.oct>0?' ↑':' ·'):''}`
  useLeaveGuard(started&&!done)
  const playPair=choice=>{const rootMidi=NOTE_TO_MIDI[root];pianoTone(rootMidi,.6);setTimeout(()=>pianoTone(rootMidi+MAJOR_STEPS[choice.deg]+choice.oct*12,.8),850)}
  const makeTarget=()=>{const choice=options[Math.floor(Math.random()*options.length)];setTarget(choice);setPicked(null);setTimeout(()=>playPair(choice),120)}
  const start=()=>{setStarted(true);setRound(1);setScore(0);setDone(false);awarded.current=false;setTimeout(makeTarget,100)}
  const choose=o=>{if(picked||!target)return;setPicked(o);if(o.deg===target.deg&&o.oct===target.oct)setScore(s=>s+WEIGHTS[difficulty])}
  const next=()=>{if(round>=10){if(!awarded.current){awarded.current=true;onFinish(score,difficulty)}setDone(true)}else{setRound(r=>r+1);makeTarget()}}
  const guardedExit=async()=>{if(started&&!done&&!await dialog.confirm('Your ear-training progress will be lost.',{title:'Leave this round?',confirmLabel:'Leave round'}))return;onExit()}

  if(done) return <div className="game-finish"><span>EAR TRAINING COMPLETE</span><strong>{score} points</strong><p>Your points were added to the Ear Training leaderboard. Stay on this page and repeat the same setup, or change the options below.</p><button className="btn-primary more-wide-btn" onClick={start}>Play another round</button><button className="btn-secondary more-wide-btn" onClick={()=>{setStarted(false);setDone(false)}}>Change ear-training setup</button><button className="game-exit-link" onClick={onExit}>Back to games</button></div>
  if(!started) return <div className="ear-setup"><div className="more-card"><div className="more-card-title"><strong>Hear the Scale Degree</strong><span>Root note → target note</span></div><p className="more-help">AGM plays a root first, then a piano-style target note. Identify the target by number or solfa. Turn on octaves when you also want to recognize register.</p><label>Root note<select className="form-input" value={root} onChange={e=>setRoot(e.target.value)}>{Object.keys(NOTE_TO_MIDI).map(n=><option key={n}>{n}</option>)}</select></label><label>Answer system<select className="form-input" value={notation} onChange={e=>setNotation(e.target.value)}><option value="numbers">Number system (1–7)</option><option value="solfa">Solfa (Do–Ti)</option></select></label><label>Difficulty<select className="form-input" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Easy · 1, 3, 5</option><option value="medium">Medium · 1–7</option><option value="hard">Hard · 1–7</option></select></label><label className="ear-toggle"><span><strong>Include octaves</strong><small>Identify whether the target is below, near, or above the root.</small></span><input type="checkbox" checked={octaves} onChange={e=>setOctaves(e.target.checked)}/></label><button className="btn-primary more-wide-btn" onClick={start}>Start 10-note round</button></div></div>
  return <div className="ear-game"><button className="game-exit-link" onClick={guardedExit}>‹ Games</button><div className="quiz-progress"><span>{round} / 10</span><i><b style={{width:`${round*10}%`}}/></i><strong>{score} pts</strong></div><div className="ear-stage"><span>ROOT {root}</span><strong>{target?'Which note did you hear?':'Get ready…'}</strong><button className="ear-replay" disabled={!target} onClick={()=>playPair(target)}>▶ Replay root + note</button><div className="ear-options">{options.map(o=><button key={`${o.deg}-${o.oct}`} className={picked?((o.deg===target.deg&&o.oct===target.oct)?'correct':(o.deg===picked.deg&&o.oct===picked.oct)?'wrong':''):''} onClick={()=>choose(o)}>{label(o)}</button>)}</div>{picked&&<div className="ear-feedback">{picked.deg===target.deg&&picked.oct===target.oct?'Correct!':'Correct answer: '+label(target)}<button onClick={next}>{round===10?'Finish':'Next'} →</button></div>}</div></div>
}

function LevelChart({ points }) {
  const current=getGameLevel(points)
  return <div className="more-card"><div className="more-card-title"><strong>Experience levels</strong><span>Your path</span></div><div className="level-roadmap">{GAME_LEVELS.map(level=><div key={level.level} className={current.level===level.level?'current':points>=level.min?'reached':''}><b>{level.level}</b><span><strong>{level.name}</strong><small>{level.min.toLocaleString()} points</small></span>{current.level===level.level&&<em>You are here</em>}</div>)}</div></div>
}

export default function PlayHub({ Page, onBack }) {
  const dialog=useAppDialog();   const { profile, recordGameResult } = useAuth(); const members=useMembers(); const [choice,setChoice]=useState(null); const [difficulty,setDifficulty]=useState(null); const [leaderboardGame,setLeaderboardGame]=useState('music')
  const level=getGameLevel(profile?.gamePoints||0)
  const leaderboard=[...members].sort((a,b)=>(b.gameScores?.[leaderboardGame]||0)-(a.gameScores?.[leaderboardGame]||0)).slice(0,8)
  const reset=async()=>{ if(window.__agmGameInProgress&&!await dialog.confirm('Your current round will be lost.',{title:'Leave this game?',confirmLabel:'Leave game'}))return; setChoice(null);setDifficulty(null) }
  const finishQuiz=async(points,ids)=>recordGameResult({points,gameType:choice,difficulty,questionIds:ids})
  const finishEar=async(points,levelName)=>recordGameResult({points,gameType:'ear',difficulty:levelName})
  const seenKey=choice&&difficulty?`${choice}_${difficulty}`:''

  if(choice==='ear') return <Page title="Ear Trainer" subtitle="Relative-pitch practice with numbers, solfa and optional octaves." onBack={reset} backLabel="Play"><EarTrainer onExit={reset} onFinish={finishEar}/></Page>
  if(choice && difficulty) return <Page title={choice==='bible'?'Bible Game':'Music Game'} subtitle={`${difficulty[0].toUpperCase()+difficulty.slice(1)} round · ${WEIGHTS[difficulty]} points per correct answer`} onBack={reset} backLabel="Play"><QuizGame type={choice} difficulty={difficulty} seenIds={profile?.gameSeen?.[seenKey]||[]} onExit={reset} onFinish={finishQuiz}/></Page>
  if(choice) return <Page title={choice==='bible'?'Bible Game':'Music Game'} subtitle="Choose a level. Harder rounds earn more points." onBack={reset} backLabel="Play"><div className="difficulty-grid">{[['easy','Easy',10],['medium','Medium',20],['hard','Hard',30]].map(([id,label,pts])=><button key={id} onClick={()=>setDifficulty(id)}><span>{label}</span><strong>{pts} pts</strong><small>per correct answer · {QUESTION_COUNT_PER_LEVEL.toLocaleString()} variations</small></button>)}</div></Page>
  return <Page title="Play" subtitle="Build Bible knowledge, music knowledge and your musical ear." onBack={onBack}>
    <div className="game-profile"><div><span>YOUR EXPERIENCE</span><strong>Level {level.level} · {level.name}</strong><small>{level.points} points</small></div><div className="game-level-ring">{level.level}</div></div>
    <div className="play-choice-grid"><button onClick={()=>setChoice('bible')}><span>✦</span><strong>Bible Game</strong><small>Scripture, worship and ministry knowledge</small></button><button onClick={()=>setChoice('music')}><span>♫</span><strong>Music Game</strong><small>Theory, harmony, rhythm and worship music</small></button><button className="wide" onClick={()=>setChoice('ear')}><span>◉</span><strong>Ear Trainer</strong><small>Hear a root note, identify scale degrees by number or solfa, and practice across octaves.</small></button></div>
    <LevelChart points={profile?.gamePoints||0}/>
    <div className="more-card"><div className="more-card-title"><strong>Team leaderboards</strong><span>Separated by game</span></div><div className="game-leader-tabs">{[['music','Music'],['bible','Bible'],['ear','Ear Training']].map(([id,label])=><button className={leaderboardGame===id?'active':''} key={id} onClick={()=>setLeaderboardGame(id)}>{label}</button>)}</div><div className="leaderboard">{leaderboard.map((m,i)=>{const l=getGameLevel(m.gamePoints||0);return <div key={m.id}><b>{i+1}</b><span>{m.name||'Member'}<small>Level {l.level} · {l.name}</small></span><strong>{m.gameScores?.[leaderboardGame]||0}</strong></div>})}</div></div>
  </Page>
}
