import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSongs } from '../../hooks/useSongs'
import { useServices } from '../../hooks/useServices'
import { useRehearsals, useMembers } from '../../hooks/useRehearsals'

function pct(value,total){return total?Math.round((value/total)*100):0}
function ts(value){return value?.toDate?.()?.getTime?.()||value?.seconds*1000||Number(value)||0}

export default function InsightsHub({ Page,onBack,mode='analytics' }) {
  const { isAdmin }=useAuth(); const {songs}=useSongs(); const {services}=useServices(); const {rehearsals}=useRehearsals(); const members=useMembers()
  const data=useMemo(()=>{
    const contributorMap=new Map()
    songs.forEach(song=>{const key=song.addedBy||song.addedByName||'unknown';const name=song.addedByName||members.find(m=>m.id===song.addedBy)?.name||'Unknown member';const row=contributorMap.get(key)||{id:key,name,count:0,recent:0};row.count+=1;if(ts(song.createdAt)>Date.now()-30*86400000)row.recent+=1;contributorMap.set(key,row)})
    const contributors=[...contributorMap.values()].sort((a,b)=>b.count-a.count)
    const accountabilityRehearsals=rehearsals.filter(r=>{const lock=ts(r.rsvpLockAt)||(r.dateTs||0);return lock&&lock<=Date.now()})
    const recentRehearsals=[...accountabilityRehearsals].sort((a,b)=>(b.dateTs||0)-(a.dateTs||0)).slice(0,8)
    const attendance=members.map(member=>{let submitted=0,going=0,maybe=0,cant=0,missed=0;rehearsals.forEach(r=>{const raw=r.rsvp?.[member.id];const status=typeof raw==='string'?raw:raw?.status;if(status){submitted+=1;if(status==='going')going+=1;else if(status==='maybe')maybe+=1;else if(status==='cant'||status==="can't go")cant+=1}else missed+=1});return{id:member.id,name:member.name||'Member',submitted,going,maybe,cant,missed,rate:pct(submitted,submitted+missed)}}).sort((a,b)=>a.rate-b.rate)
    const rehearsalTrend=recentRehearsals.map(r=>{let submitted=0;members.forEach(m=>{const raw=r.rsvp?.[m.id];if(typeof raw==='string'?!!raw:!!raw?.status)submitted+=1});return{name:r.name||r.dateStr||'Rehearsal',date:r.dateStr||'',submitted,missing:Math.max(0,members.length-submitted),rate:pct(submitted,members.length)}}).reverse()
    const assignmentMap=new Map(members.map(m=>[m.id,{id:m.id,name:m.name||'Member',count:0}]))
    services.forEach(service=>Object.values(service.sections||{}).forEach(ids=>(Array.isArray(ids)?ids:[]).forEach(uid=>{const row=assignmentMap.get(uid);if(row)row.count+=1})))
    const assignments=[...assignmentMap.values()].sort((a,b)=>b.count-a.count)
    const allResponses=attendance.reduce((sum,row)=>sum+row.submitted,0), allPossible=attendance.reduce((sum,row)=>sum+row.submitted+row.missed,0)
    const activeContributors=contributors.filter(row=>row.count>0).length
    const noResponseMembers=attendance.filter(row=>row.submitted===0&&accountabilityRehearsals.length>0)
    const goingTotal=attendance.reduce((sum,row)=>sum+row.going,0)
    return{contributors,attendance,rehearsalTrend,assignments,avgResponse:pct(allResponses,allPossible),activeContributors,noResponseMembers,goingTotal,totalResponses:allResponses,reviewedRehearsals:accountabilityRehearsals.length}
  },[songs,services,rehearsals,members])

  if(!isAdmin)return <Page title="Insights" subtitle="Admin access required." onBack={onBack}><div className="more-empty">Insights and reports are available to AGM admins only.</div></Page>

  const exportPdf=async()=>{
    const {jsPDF}=await import('jspdf');const pdf=new jsPDF({unit:'pt',format:'letter'});const width=pdf.internal.pageSize.getWidth(),margin=44,content=width-margin*2
    const header=(title,sub='Leadership review')=>{pdf.setFillColor(8,61,112);pdf.rect(0,0,width,76,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text(title,margin,34);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(`Amazing Voices · ${sub}`,margin,53);pdf.setTextColor(29,29,31)}
    const bars=(title,rows,y,max,label)=>{pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text(title,margin,y);y+=18;rows.slice(0,10).forEach(row=>{pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(String(row.name).slice(0,25),margin,y+9);const x=margin+145,w=content-190;pdf.setFillColor(236,239,243);pdf.roundedRect(x,y,w,10,5,5,'F');pdf.setFillColor(0,113,227);pdf.roundedRect(x,y,Math.max(2,w*((row.value||0)/(max||1))),10,5,5,'F');pdf.setTextColor(80);pdf.text(label(row),width-margin,y+9,{align:'right'});pdf.setTextColor(29);y+=22});return y}
    header('AGM Leadership Participation Report','Attendance, contribution and follow-up')
    pdf.setFontSize(9);pdf.text(`Generated ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`,margin,98)
    const metrics=[['Team RSVP rate',`${data.avgResponse}%`],['Total members',members.length],['Active song contributors',data.activeContributors],['Rehearsals reviewed',data.reviewedRehearsals]]
    metrics.forEach(([label,value],i)=>{const x=margin+(i%2)*(content/2+5),y=120+Math.floor(i/2)*64;pdf.setFillColor(247,248,250);pdf.roundedRect(x,y,content/2-5,50,8,8,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.setTextColor(8,61,112);pdf.text(String(value),x+12,y+22);pdf.setTextColor(70);pdf.setFontSize(8.5);pdf.setFont('helvetica','normal');pdf.text(label,x+12,y+38)})
    let y=270
    y=bars('Members needing RSVP follow-up',data.attendance.map(r=>({name:r.name,value:r.missed,rate:r.rate})).sort((a,b)=>b.value-a.value),y,Math.max(1,...data.attendance.map(r=>r.missed)),r=>`${r.value} missed · ${r.rate}%`)
    if(y>660){pdf.addPage();header('Contribution & Assignment Load');y=104}else y+=14
    y=bars('Song library contributors',data.contributors.map(r=>({name:r.name,value:r.count})),y,Math.max(1,...data.contributors.map(r=>r.count)),r=>`${r.value} songs`)
    if(y>660){pdf.addPage();header('Service Assignment Load');y=104}else y+=14
    y=bars('Service assignment load',data.assignments.map(r=>({name:r.name,value:r.count})),y,Math.max(1,...data.assignments.map(r=>r.count)),r=>`${r.value} assignments`)
    pdf.addPage();header('Rehearsal Response Trend','Recent rehearsal availability')
    y=108
    data.rehearsalTrend.forEach(row=>{pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text((row.date||row.name).slice(0,24),margin,y);pdf.setFont('helvetica','normal');pdf.text(`${row.rate}% responded`,margin+150,y);pdf.text(`${row.missing} missing`,width-margin,y,{align:'right'});y+=20})
    y+=12;pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text('Leadership follow-up list',margin,y);y+=18
    const follow=data.attendance.filter(r=>r.rate<60||r.submitted===0).slice(0,14)
    if(!follow.length){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text('No members currently fall below the 60% response threshold.',margin,y)}else follow.forEach(row=>{pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(row.name,margin,y);pdf.text(`${row.rate}% response`,margin+180,y);pdf.text(`${row.missed} no-response`,width-margin,y,{align:'right'});y+=18})
    pdf.save(`AGM-leadership-report-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  if(mode==='reports')return <Page title="Reports" subtitle="A leadership PDF focused on accountability, workload and follow-up—not a duplicate of the live analytics screen." onBack={onBack}><div className="more-card report-feature"><span>LEADERSHIP PDF</span><strong>Participation & Follow-up Report</strong><p>Member-by-member RSVP follow-through, members who never respond, song contribution ranking, service assignment load, recent rehearsal response trend and a leadership follow-up list.</p><button className="btn-primary more-wide-btn" onClick={exportPdf}>Generate leadership PDF</button></div><div className="report-preview-grid"><div><strong>{data.noResponseMembers.length}</strong><span>Members who never responded</span></div><div><strong>{data.attendance[0]?.name||'—'}</strong><span>Lowest current RSVP rate</span></div><div><strong>{data.contributors[0]?.name||'—'}</strong><span>Top song contributor</span></div><div><strong>{data.assignments[0]?.name||'—'}</strong><span>Most service assignments</span></div></div></Page>

  const nextRehearsal=[...rehearsals].filter(r=>(r.dateTs||0)>=Date.now()-86400000).sort((a,b)=>(a.dateTs||0)-(b.dateTs||0))[0]
  const nextTrend=nextRehearsal?(()=>{let submitted=0;members.forEach(m=>{const raw=nextRehearsal.rsvp?.[m.id];if(typeof raw==='string'?!!raw:!!raw?.status)submitted+=1});return{rate:pct(submitted,members.length),missing:Math.max(0,members.length-submitted)}})():null
  return <Page title="Analytics" subtitle="Live admin dashboard for rehearsal engagement, contribution and workload." onBack={onBack}>
    <div className="insight-grid"><div className="insight-stat"><strong>{data.avgResponse}%</strong><span>Team RSVP rate</span></div><div className="insight-stat"><strong>{members.length}</strong><span>Total members</span></div><div className="insight-stat"><strong>{data.activeContributors}</strong><span>Song contributors</span></div><div className="insight-stat"><strong>{songs.length}</strong><span>Songs in library</span></div></div>
    {nextRehearsal&&<div className="more-card analytics-callout"><div><span>NEXT REHEARSAL</span><strong>{nextRehearsal.name||nextRehearsal.dateStr}</strong><small>{nextTrend.rate}% responded · {nextTrend.missing} still missing</small></div><b>{nextTrend.rate}%</b></div>}
    <div className="more-card"><div className="more-card-title"><strong>Recent RSVP trend</strong><span>Last {data.rehearsalTrend.length} rehearsals</span></div><div className="trend-bars">{data.rehearsalTrend.map(row=><div key={`${row.date}-${row.name}`}><span>{row.date||row.name}</span><i><b style={{width:`${row.rate}%`}}/></i><em>{row.rate}%</em></div>)}</div></div>
    <div className="more-card"><div className="more-card-title"><strong>Members needing follow-up</strong><span>Lowest response first</span></div><div className="attendance-rank">{data.attendance.slice(0,6).map(row=><div key={row.id}><span>{row.name}</span><strong className={row.rate<60?'low':''}>{row.rate}%</strong><small>{row.missed} no response</small></div>)}</div></div>
    <div className="more-card"><div className="more-card-title"><strong>Library contribution</strong><span>All-time songs added</span></div><div className="mini-bars">{data.contributors.slice(0,6).map(row=><div key={row.id}><span>{row.name}</span><i><b style={{width:`${Math.max(5,pct(row.count,Math.max(1,data.contributors[0]?.count||1)))}%`}}/></i><em>{row.count}</em></div>)}</div></div>
    <div className="more-card"><div className="more-card-title"><strong>Service workload</strong><span>Assignment count</span></div><div className="mini-bars">{data.assignments.slice(0,6).map(row=><div key={row.id}><span>{row.name}</span><i><b style={{width:`${Math.max(5,pct(row.count,Math.max(1,data.assignments[0]?.count||1)))}%`}}/></i><em>{row.count}</em></div>)}</div></div>
  </Page>
}
