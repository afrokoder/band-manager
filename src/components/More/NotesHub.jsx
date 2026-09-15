import { useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useAppDialog } from '../ui/AppDialog'
import SwipeActions from '../ui/SwipeActions'

function htmlToText(html='') {
  if (typeof document === 'undefined') return String(html).replace(/<[^>]+>/g,' ')
  const node=document.createElement('div'); node.innerHTML=html; return node.innerText || node.textContent || ''
}

function sanitizeHtml(html='') {
  if (typeof document === 'undefined') return html
  const allowed=new Set(['DIV','P','BR','B','STRONG','I','EM','U','S','H1','H2','H3','UL','OL','LI','A','BLOCKQUOTE'])
  const parser=new DOMParser(); const doc=parser.parseFromString(`<div>${html}</div>`,'text/html'); const root=doc.body.firstElementChild
  const walk=node=>{
    ;[...node.children].forEach(child=>{
      if(!allowed.has(child.tagName)){child.replaceWith(...child.childNodes);return}
      ;[...child.attributes].forEach(attr=>{if(!(child.tagName==='A'&&['href','target','rel'].includes(attr.name)))child.removeAttribute(attr.name)})
      if(child.tagName==='A'){const href=child.getAttribute('href')||'';if(!/^https?:\/\//i.test(href))child.removeAttribute('href');else{child.setAttribute('target','_blank');child.setAttribute('rel','noreferrer')}}
      walk(child)
    })
  }
  walk(root); return root.innerHTML
}

async function shareNotePdf(note) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit:'pt', format:'letter' })
  const width = pdf.internal.pageSize.getWidth(), margin=46
  pdf.setFillColor(8,61,112);pdf.rect(0,0,width,112,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text('AGM BAND MANAGER · PERSONAL NOTE',margin,36);pdf.setFontSize(22);pdf.text(note.title||'Untitled Note',margin,68,{maxWidth:width-margin*2});pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(note.folder||'Notes',margin,91)
  pdf.setTextColor(29,29,31);pdf.setFontSize(12)
  const text=htmlToText(note.html||note.body||''); const lines=pdf.splitTextToSize(text,width-margin*2);let y=146
  for(const line of lines){if(y>730){pdf.addPage();y=54}pdf.text(line,margin,y);y+=17}
  const blob=pdf.output('blob');const file=new File([blob],`${(note.title||'AGM-note').replace(/[^a-z0-9]+/gi,'-')}.pdf`,{type:'application/pdf'})
  if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:note.title||'AGM Note',files:[file]})
  else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}

function RichEditor({ value, onChange }) {
  const ref=useRef(null); const dialog=useAppDialog()
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value||''},[value])
  const cmd=(name,arg=null)=>{ref.current?.focus();document.execCommand(name,false,arg);onChange(sanitizeHtml(ref.current?.innerHTML||''))}
  const addLink=async()=>{const url=await dialog.prompt('Paste the full web address you want to link.',{title:'Add link',placeholder:'https://'});if(url&&/^https?:\/\//i.test(url))cmd('createLink',url)}
  return <div className="rich-note-editor"><div className="note-formatbar"><button type="button" onClick={()=>cmd('formatBlock','H1')}>Title</button><button type="button" onClick={()=>cmd('formatBlock','H2')}>Heading</button><button type="button" onClick={()=>cmd('formatBlock','P')}>Body</button><button type="button" onClick={()=>cmd('bold')}><b>B</b></button><button type="button" onClick={()=>cmd('italic')}><i>I</i></button><button type="button" onClick={()=>cmd('underline')}><u>U</u></button><button type="button" onClick={()=>cmd('insertUnorderedList')}>• List</button><button type="button" onClick={()=>cmd('insertOrderedList')}>1. List</button><button type="button" onClick={addLink}>Link</button></div><div ref={ref} className="note-contenteditable" contentEditable suppressContentEditableWarning data-placeholder="Start typing…" onInput={()=>onChange(sanitizeHtml(ref.current?.innerHTML||''))}/></div>
}

export default function NotesHub({ Page, onBack }) {
  const { user }=useAuth(); const dialog=useAppDialog()
  const [notes,setNotes]=useState([]),[savedFolders,setSavedFolders]=useState([]),[folder,setFolder]=useState(null),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[movingNote,setMovingNote]=useState(null)
  const [form,setForm]=useState({title:'',html:''})

  useEffect(()=>{if(!user)return undefined;const q=query(collection(db,'users',user.uid,'notes'),orderBy('updatedAt','desc'));return onSnapshot(q,snap=>setNotes(snap.docs.map(d=>({id:d.id,...d.data()}))))},[user])
  useEffect(()=>{if(!user)return undefined;return onSnapshot(collection(db,'users',user.uid,'noteFolders'),snap=>setSavedFolders(snap.docs.map(d=>({id:d.id,...d.data()}))))},[user])

  const folderNames=useMemo(()=>[...new Set(savedFolders.map(f=>f.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[savedFolders])
  const visible=folder?notes.filter(n=>n.folder===folder):[]
  const startNew=()=>{setEditing('new');setForm({title:'',html:''})}
  const startEdit=note=>{setEditing(note.id);setForm({title:note.title||'',html:note.html||(`<p>${String(note.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br/>')}</p>`)})}
  const save=async()=>{const clean=sanitizeHtml(form.html);if(!form.title.trim()&&!htmlToText(clean).trim())return;setBusy(true);const data={title:form.title.trim()||'Untitled Note',folder,html:clean,body:htmlToText(clean),updatedAt:serverTimestamp()};if(editing==='new')await addDoc(collection(db,'users',user.uid,'notes'),{...data,createdAt:serverTimestamp()});else await updateDoc(doc(db,'users',user.uid,'notes',editing),data);setBusy(false);setEditing(null)}
  const createFolder=async()=>{const name=await dialog.prompt('Give this folder a name.',{title:'New folder',placeholder:'Folder name'});if(!name?.trim())return;const clean=name.trim();const id=clean.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||crypto.randomUUID();await setDoc(doc(db,'users',user.uid,'noteFolders',id),{name:clean,createdAt:serverTimestamp()},{merge:true});const legacy=notes.filter(n=>!n.folder||n.folder==='General');for(const note of legacy)await updateDoc(doc(db,'users',user.uid,'notes',note.id),{folder:clean,updatedAt:serverTimestamp()});setFolder(clean)}
  const back=async()=>{if(editing){if(await dialog.confirm('Your latest unsaved changes will be discarded.',{title:'Close this note?',confirmLabel:'Discard changes',tone:'danger'}))setEditing(null);return}if(folder){setFolder(null);return}onBack()}
  const moveNote=async(note,destination)=>{if(!destination||destination===note.folder)return;await updateDoc(doc(db,'users',user.uid,'notes',note.id),{folder:destination,updatedAt:serverTimestamp()})}
  const removeNote=async note=>{if(await dialog.confirm('This note will be permanently deleted.',{title:'Delete this note?',confirmLabel:'Delete',tone:'danger'}))await deleteDoc(doc(db,'users',user.uid,'notes',note.id))}
  const moveNoteAction=note=>setMovingNote(note)
  const renameFolder=async name=>{const next=await dialog.prompt('Enter the new folder name.',{title:'Rename folder',placeholder:name,defaultValue:name});if(!next?.trim()||next.trim()===name)return;const clean=next.trim();for(const note of notes.filter(n=>n.folder===name))await updateDoc(doc(db,'users',user.uid,'notes',note.id),{folder:clean,updatedAt:serverTimestamp()});const old=savedFolders.find(f=>f.name===name);if(old)await deleteDoc(doc(db,'users',user.uid,'noteFolders',old.id));const id=clean.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||crypto.randomUUID();await setDoc(doc(db,'users',user.uid,'noteFolders',id),{name:clean,createdAt:serverTimestamp()},{merge:true})}
  const deleteFolder=async name=>{const count=notes.filter(n=>n.folder===name).length;if(count){await dialog.alert('Move or delete the notes in this folder before deleting the folder.',{title:'Folder is not empty'});return}if(!await dialog.confirm('This empty folder will be deleted.',{title:`Delete ${name}?`,confirmLabel:'Delete folder',tone:'danger'}))return;const old=savedFolders.find(f=>f.name===name);if(old)await deleteDoc(doc(db,'users',user.uid,'noteFolders',old.id))}

  if(!folder) return <Page title="Notes" subtitle="Private notes only you can see. Choose a folder first, similar to the iPhone Notes app." onBack={onBack}><div className="notes-folder-head"><strong>Folders</strong><button onClick={createFolder}>＋ New Folder</button></div><div className="notes-folder-list">{folderNames.length===0&&<div className="more-empty">No folders yet. Create a folder to start taking notes.</div>}{folderNames.map(name=>{const count=notes.filter(n=>n.folder===name).length;return <SwipeActions key={name} actions={[{label:'Rename',icon:'✎',onClick:()=>renameFolder(name)},{label:'Delete',icon:'⌫',tone:'danger',onClick:()=>deleteFolder(name)}]}><button onClick={()=>setFolder(name)}><span className="notes-folder-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l2 2h9v10.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"/></svg></span><strong>{name}</strong><small>{count}</small><b>›</b></button></SwipeActions>})}</div></Page>

  return <Page title={folder} subtitle={`${visible.length} note${visible.length===1?'':'s'} · private to your account`} onBack={back} backLabel="Folders">
    <div className="notes-folder-toolbar"><button onClick={()=>setFolder(null)}>‹ Folders</button><button onClick={startNew}>＋ New Note</button></div>
    {editing&&<div className="note-editor-screen"><input className="note-title-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><RichEditor value={form.html} onChange={html=>setForm(current=>({...current,html}))}/><div className="note-actions"><button className="btn-secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>{busy?'Saving…':'Done'}</button></div></div>}
    {movingNote&&<div className="note-move-overlay" onClick={()=>setMovingNote(null)}><div className="note-move-sheet" onClick={e=>e.stopPropagation()}><div className="note-move-head"><strong>Move “{movingNote.title||'Untitled Note'}”</strong><button onClick={()=>setMovingNote(null)}>Done</button></div><small>Choose a folder</small>{folderNames.filter(name=>name!==movingNote.folder).map(name=><button className="note-move-folder" key={name} onClick={async()=>{await moveNote(movingNote,name);setMovingNote(null)}}><span className="notes-folder-icon"><svg viewBox="0 0 24 24"><path d="M3.5 6.5h6l2 2h9v10.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"/></svg></span><strong>{name}</strong><b>›</b></button>)}</div></div>}
    {!editing&&(visible.length===0?<div className="more-empty">No notes in this folder yet.</div>:<div className="iphone-notes-list">{visible.map(note=><SwipeActions key={note.id} actions={[{label:'Share',icon:'↗',onClick:()=>shareNotePdf(note)},{label:'Move',icon:'↪',onClick:()=>moveNoteAction(note)},{label:'Delete',icon:'⌫',tone:'danger',onClick:()=>removeNote(note)}]}><article onClick={()=>startEdit(note)}><strong>{note.title||'Untitled Note'}</strong><span>{htmlToText(note.html||note.body||'').slice(0,100)||'No additional text'}</span></article></SwipeActions>)}</div>)}
  </Page>
}
