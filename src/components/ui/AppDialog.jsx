import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const DialogContext=createContext(null)

export function AppDialogProvider({children}){
  const [dialog,setDialog]=useState(null)
  const close=useCallback((value)=>{setDialog(current=>{current?.resolve?.(value);return null})},[])
  const open=useCallback((options)=>new Promise(resolve=>setDialog({...options,resolve})),[])
  const api=useMemo(()=>({
    confirm:(message,options={})=>open({kind:'confirm',message,...options}),
    alert:(message,options={})=>open({kind:'alert',message,...options}),
    prompt:(message,options={})=>open({kind:'prompt',message,value:'',...options}),
  }),[open])
  return <DialogContext.Provider value={api}>{children}{dialog&&createPortal(<div className="agm-dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&dialog.kind!=='alert')close(dialog.kind==='prompt'?null:false)}}><div className="agm-dialog" role="dialog" aria-modal="true" aria-labelledby="agm-dialog-title"><div className={`agm-dialog-icon ${dialog.tone||''}`}>{dialog.tone==='danger'?'!':dialog.kind==='prompt'?'✎':'✓'}</div><h3 id="agm-dialog-title">{dialog.title||({confirm:'Are you sure?',prompt:'Enter details',alert:'AGM Band Manager'}[dialog.kind])}</h3><p>{dialog.message}</p>{dialog.kind==='prompt'&&<input autoFocus value={dialog.value||''} placeholder={dialog.placeholder||''} onChange={e=>setDialog(d=>({...d,value:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')close(dialog.value?.trim()||null)}}/>}<div className="agm-dialog-actions">{dialog.kind!=='alert'&&<button className="agm-dialog-cancel" onClick={()=>close(dialog.kind==='prompt'?null:false)}>{dialog.cancelLabel||'Cancel'}</button>}<button className={dialog.tone==='danger'?'agm-dialog-danger':'agm-dialog-primary'} onClick={()=>close(dialog.kind==='prompt'?(dialog.value?.trim()||null):true)}>{dialog.confirmLabel||(dialog.kind==='alert'?'OK':'Continue')}</button></div></div></div>,document.body)}</DialogContext.Provider>
}

export function useAppDialog(){const value=useContext(DialogContext);if(!value)throw new Error('useAppDialog must be used inside AppDialogProvider');return value}
