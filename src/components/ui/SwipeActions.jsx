import { useRef, useState } from 'react'

export default function SwipeActions({ children, actions=[], className='' }) {
  const start=useRef(null); const [open,setOpen]=useState(false); const [drag,setDrag]=useState(0)
  const width=Math.max(74,actions.length*72)
  const down=e=>{start.current={x:e.clientX,base:open?-width:0};e.currentTarget.setPointerCapture?.(e.pointerId)}
  const move=e=>{if(!start.current)return;const dx=e.clientX-start.current.x;setDrag(Math.max(-width,Math.min(0,start.current.base+dx)))}
  const up=()=>{if(!start.current)return;const shouldOpen=drag < -width*.28;setOpen(shouldOpen);setDrag(shouldOpen?-width:0);start.current=null}
  return <div className={`swipe-row ${className}`}>
    <div className="swipe-actions">{actions.map((a,i)=><button key={a.label} className={a.tone==='danger'?'danger':''} onClick={e=>{e.stopPropagation();setOpen(false);setDrag(0);a.onClick?.()}}>{a.icon&&<span>{a.icon}</span>}{a.label}</button>)}</div>
    <div className="swipe-content" style={{transform:`translateX(${start.current?drag:(open?-width:0)}px)`}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={()=>{if(open){setOpen(false);setDrag(0)}}}>{children}</div>
  </div>
}
