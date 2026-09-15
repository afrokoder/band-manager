import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import SwipeActions from '../ui/SwipeActions'
import { useAppDialog } from '../ui/AppDialog'

function youtubeId(value='') {
  try {
    const url = new URL(value)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0]
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop()
  } catch {}
  return ''
}

function validUrl(value='') {
  try { const url=new URL(value); return ['http:','https:'].includes(url.protocol) } catch { return false }
}

export default function LearnHub({ Page, onBack }) {
  const { user, profile, isAdmin } = useAuth()
  const dialog = useAppDialog()
  const [resources, setResources] = useState([])
  const [bookmarks, setBookmarks] = useState(new Set())
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title:'', audience:'All', type:'article', url:'', summary:'' })
  const [editingId,setEditingId]=useState(null)

  useEffect(() => {
    const q = query(collection(db, 'learningResources'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setResources(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    if (!user) return undefined
    return onSnapshot(collection(db, 'users', user.uid, 'learningBookmarks'), snap => setBookmarks(new Set(snap.docs.map(d => d.id))))
  }, [user])

  const visible = useMemo(() => filter === 'bookmarked' ? resources.filter(item => bookmarks.has(item.id)) : resources, [filter, resources, bookmarks])

  const save = async () => {
    if (!form.title.trim()) return setError('Title is required.')
    if (!validUrl(form.url)) return setError('Add a valid article or YouTube link.')
    if (form.type === 'video' && !youtubeId(form.url)) return setError('Video resources must use a valid YouTube link.')
    setSaving(true); setError('')
    try {
      const data={title:form.title.trim(),audience:form.audience,type:form.type,url:form.url.trim(),summary:form.summary.trim(),updatedAt:serverTimestamp()}
      if(editingId) await updateDoc(doc(db,'learningResources',editingId),data)
      else await addDoc(collection(db, 'learningResources'), {...data,createdBy:user.uid,createdByName:profile?.name||'Admin',createdAt:serverTimestamp()})
      setForm({ title:'', audience:'All', type:'article', url:'', summary:'' })
      setShowForm(false); setEditingId(null)
    } catch (err) { setError(err.message || 'Could not add learning resource.') }
    finally { setSaving(false) }
  }

  const editResource=item=>{setEditingId(item.id);setForm({title:item.title||'',audience:item.audience||'All',type:item.type||'article',url:item.url||'',summary:item.summary||''});setShowForm(true);window.scrollTo?.({top:0,behavior:'smooth'})}
  const removeResource=async item=>{if(await dialog.confirm('This learning resource will be removed for everyone.',{title:'Delete resource?',confirmLabel:'Delete',tone:'danger'}))await deleteDoc(doc(db,'learningResources',item.id))}

  const toggleBookmark = async item => {
    const ref = doc(db, 'users', user.uid, 'learningBookmarks', item.id)
    if (bookmarks.has(item.id)) await deleteDoc(ref)
    else await setDoc(ref, { resourceId:item.id, createdAt:serverTimestamp() })
  }

  return <Page title="Learn" subtitle="Links selected by AGM leadership to help singers, musicians and worship leaders grow." onBack={onBack}>
    <div className="more-segmented"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button><button className={filter==='bookmarked'?'active':''} onClick={()=>setFilter('bookmarked')}>★ Bookmarked</button></div>
    {isAdmin && <button className="more-add-row" onClick={()=>{setEditingId(null);setForm({title:'',audience:'All',type:'article',url:'',summary:''});setShowForm(v=>!v)}}>＋ Add learning resource</button>}

    {isAdmin && showForm && <div className="more-card learn-editor">
      <label>Title<input className="form-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <div className="learn-editor-grid"><label>For<select className="form-input" value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option>All</option><option>Musicians</option><option>Singers</option><option>Worship Leaders</option><option>Bible & Ministry</option></select></label><label>Type<select className="form-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="article">Article link</option><option value="video">YouTube video</option></select></label></div>
      <label>Short description<textarea className="form-input" rows="2" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></label>
      <label>{form.type==='video'?'YouTube link':'Article link'}<input className="form-input" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder={form.type==='video'?'https://youtube.com/...':'https://...'}/></label>
      {error && <div className="more-error">{error}</div>}
      <button className="btn-primary more-wide-btn" disabled={saving} onClick={save}>{saving?'Saving…':editingId?'Save changes':'Publish resource'}</button>
    </div>}

    {visible.length === 0 ? <div className="more-empty">{filter==='bookmarked'?'You have not bookmarked any learning resources yet.':'No learning resources have been published yet.'}</div> : <div className="learn-resource-list">
      {visible.map(item => {
        const vid = item.type === 'video' ? youtubeId(item.url) : ''
        return <SwipeActions key={item.id} actions={isAdmin?[{label:'Edit',icon:'✎',onClick:()=>editResource(item)},{label:'Delete',icon:'⌫',tone:'danger',onClick:()=>removeResource(item)}]:[]}><article className="learn-resource">
          {vid && <a className="learn-thumb" href={item.url} target="_blank" rel="noreferrer"><img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt=""/><span>▶</span></a>}
          <div className="learn-resource-body"><div className="learn-resource-top"><span>{item.audience || 'All'} · {item.type === 'video' ? 'Video' : 'Article'}</span><button onClick={()=>toggleBookmark(item)} aria-label={bookmarks.has(item.id)?'Remove bookmark':'Bookmark'}>{bookmarks.has(item.id)?'★':'☆'}</button></div><strong>{item.title}</strong>{item.summary && <p>{item.summary}</p>}
            {item.url && <a className="more-text-link" href={item.url} target="_blank" rel="noreferrer">{item.type==='video'?'Watch on YouTube':'Read article'} ↗</a>}
            {!item.url && item.body && <details><summary>Read saved article</summary><div className="learn-article-copy">{item.body}</div></details>}
          </div>
        </article></SwipeActions>
      })}
    </div>}
  </Page>
}
