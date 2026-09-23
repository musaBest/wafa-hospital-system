import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock, Download, FileText, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, PageHeader, Panel } from '../components/ui';
import { engineerService } from '../services/engineer.service';
import type { EngineerActivityLog, EngineerSessionLog, EngineerUserOption } from '../types';
import { downloadSimplePdf, downloadSimpleWord, type SimpleDocumentTable } from '../utils/simpleDocumentExport';
import { cleanupExportArtifacts } from '../utils/documentDownload';
import { useUi } from '../context/UiContext';

const today = () => new Date().toISOString().slice(0,10);
const addDays = (date:string, days:number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
const latin = (value:number) => String(value).padStart(2,'0');
const formatAmPm = (hours:number, minutes:number, seconds=0) => {
  const suffix = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${latin(minutes)}:${latin(seconds)} ${suffix}`;
};
const arDateTime = (value?:string|null) => {
  if(!value) return '—';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  return `${d.getFullYear()}/${latin(d.getMonth()+1)}/${latin(d.getDate())} ${formatAmPm(d.getHours(), d.getMinutes(), d.getSeconds())}`;
};
const duration = (seconds?:number|null) => {
  if(seconds == null) return 'جلسة مفتوحة';
  const safe=Math.max(0,Math.abs(Number(seconds)||0));
  const h=Math.floor(safe/3600), m=Math.floor((safe%3600)/60), s=Math.floor(safe%60);
  if(h) return `${h}س ${latin(m)}د ${latin(s)}ث`;
  return `${m}د ${latin(s)}ث`;
};
const formatClock=(value?:string|null)=>{
  if(!value) return '—';
  const text=String(value).trim();
  const ampm=text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i);
  if(ampm){
    let h=Number(ampm[1]); const m=Number(ampm[2]); const sec=Number(ampm[3]||0); const isPm=ampm[4].toUpperCase()==='PM';
    if(isPm&&h<12) h+=12; if(!isPm&&h===12) h=0;
    return formatAmPm(h,m,sec);
  }
  const parts=text.split(':').map(Number);
  if(parts.length<2 || Number.isNaN(parts[0])) return text;
  return formatAmPm(parts[0], parts[1]||0, parts[2]||0);
};

const prettyMeta=(value:unknown):string=>{
  if(value===null||value===undefined||value==='') return '—';
  if(Array.isArray(value)) return value.length?value.map(prettyMeta).join('، '):'—';
  if(typeof value==='object') return Object.entries(value as Record<string,unknown>).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>`${k}: ${typeof v==='object'?prettyMeta(v):String(v)}`).join(' | ')||'—';
  return String(value);
};

export function EngineerActivityPage(){
  const { toast } = useUi();
  const [from,setFrom]=useState(addDays(today(),-7));
  const [to,setTo]=useState(today());
  const [userId,setUserId]=useState('');
  const [search,setSearch]=useState('');
  const [users,setUsers]=useState<EngineerUserOption[]>([]);
  const [logs,setLogs]=useState<EngineerActivityLog[]>([]);
  const [sessions,setSessions]=useState<EngineerSessionLog[]>([]);
  const [summary,setSummary]=useState({logs:0,sessions:0,openSessions:0,usersActive:0});
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    try{
      const data=await engineerService.activity({from,to,userId,search});
      setUsers(data.users); setLogs(data.logs); setSessions(data.sessions); setSummary(data.summary);
    }catch(error){toast(error instanceof Error?error.message:'تعذر تحميل شاشة النشاط','warn')}
    finally{setLoading(false)}
  };
  useEffect(()=>{void load()},[]);

  const report = useMemo<SimpleDocumentTable>(()=>({
    title:'شاشة مراقبة المستخدمين',
    subtitle:`الفترة من ${from} إلى ${to} · عدد العمليات ${logs.length} · جلسات الدخول ${sessions.length}`,
    filename:`engineer-activity-${from}-${to}`,
    columns:[
      {key:'seq',label:'م',width:'5%'},{key:'user',label:'المستخدم',width:'16%'},{key:'day',label:'اليوم',width:'8%'},{key:'date',label:'التاريخ',width:'10%'},{key:'time',label:'الوقت',width:'10%'},{key:'action',label:'الإجراء',width:'17%'},{key:'entity',label:'الملف / الكيان',width:'13%'},{key:'ip',label:'IP',width:'10%'},{key:'details',label:'التفاصيل',width:'21%'},
    ],
    rows:logs.map((row,index)=>({seq:index+1,user:row.displayName,day:row.day,date:row.date,time:formatClock(row.time),action:row.actionAr,entity:`${row.entityType}${row.entityId?` / ${row.entityId}`:''}`,ip:row.ipAddress||'—',details:prettyMeta(row.metadata||{})})),
    footer:'خاص بمهندس محمد - سجل رقابي مرجعي'
  }),[logs,from,to,sessions.length]);
  const sessionReport = useMemo<SimpleDocumentTable>(()=>({
    title:'سجل دخول وخروج المستخدمين',
    subtitle:`الفترة من ${from} إلى ${to}`,
    filename:`engineer-sessions-${from}-${to}`,
    columns:[
      {key:'seq',label:'م',width:'5%'},{key:'user',label:'المستخدم',width:'18%'},{key:'username',label:'اسم الدخول',width:'16%'},{key:'day',label:'اليوم',width:'9%'},{key:'login',label:'وقت الدخول',width:'16%'},{key:'logout',label:'وقت الخروج',width:'16%'},{key:'duration',label:'المدة',width:'10%'},{key:'ip',label:'IP',width:'10%'},
    ],
    rows:sessions.map((row,index)=>({seq:index+1,user:row.displayName,username:row.username,day:row.day,login:arDateTime(row.loginAt),logout:arDateTime(row.logoutAt),duration:duration(row.durationSeconds),ip:row.ipAddress||'—'})),
    footer:'خاص بمهندس محمد - أوقات الدخول والخروج'
  }),[sessions,from,to]);

  const exportPdf = async (target: SimpleDocumentTable) => {
    try { await downloadSimplePdf(target); }
    catch (error) { cleanupExportArtifacts(); toast(error instanceof Error ? error.message : 'تعذر تصدير PDF', 'warn'); }
  };
  const exportWord = async (target: SimpleDocumentTable) => {
    try { await downloadSimpleWord(target); }
    catch (error) { cleanupExportArtifacts(); toast(error instanceof Error ? error.message : 'تعذر تصدير Word', 'warn'); }
  };

  const userActivity=useMemo(()=>users.map(user=>{
    const userLogs=logs.filter(log=>log.userId===user.id);
    const userSessions=sessions.filter(session=>session.userId===user.id);
    const lastLog=userLogs[0];
    return {user, logCount:userLogs.length, sessionCount:userSessions.length, lastAction:lastLog?.actionAr||'—', lastSeen:lastLog?`${lastLog.date} ${lastLog.time}`:(user.lastLoginAt?arDateTime(user.lastLoginAt):'—')};
  }).filter(item=>item.logCount||item.sessionCount).slice(0,12),[users,logs,sessions]);

  return <div className="engineer-console-page" dir="rtl">
    <PageHeader crumb="مهندس محمد" title="مراقبة المستخدمين" sub="شاشة خاصة تعرض دخول وخروج المستخدمين وكل العمليات المسجلة بالوقت والتاريخ واليوم." actions={<Button className="btn-ghost" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?'spin':''}/>تحديث</Button>}/>
    <div className="engineer-summary-grid">
      <Panel><span>العمليات المسجلة</span><b>{summary.logs}</b><Activity/></Panel>
      <Panel><span>جلسات الدخول</span><b>{summary.sessions}</b><Clock/></Panel>
      <Panel><span>جلسات مفتوحة</span><b>{summary.openSessions}</b><ShieldCheck/></Panel>
      <Panel><span>مستخدمون نشطوا</span><b>{summary.usersActive}</b><UserRound/></Panel>
    </div>
    {userActivity.length>0&&<Panel className="engineer-user-snapshot"><div className="panel-head"><h3><UserRound/>ملخص المستخدمين داخل الفترة</h3><Badge color="cyan">{userActivity.length}</Badge></div><div>{userActivity.map(item=><article key={item.user.id}><b>{item.user.displayName}</b><small dir="ltr">{item.user.username}</small><span>عمليات: <strong>{item.logCount}</strong></span><span>جلسات دخول: <strong>{item.sessionCount}</strong></span><em>{item.lastAction}</em><time>{item.lastSeen}</time></article>)}</div></Panel>}
    <Panel className="engineer-filter-panel">
      <div className="form-grid">
        <Field label="من تاريخ"><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field>
        <Field label="إلى تاريخ"><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></Field>
        <Field label="المستخدم"><select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">كل المستخدمين</option>{users.map(u=><option key={u.id} value={u.id}>{u.displayName} · {u.username}</option>)}</select></Field>
        <Field label="بحث"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="إجراء، اسم مستخدم، ملف، IP..."/></Field>
      </div>
      <FormActions><Button className="btn-primary" onClick={()=>void load()}><Search/>عرض النتائج</Button><Button className="btn-ghost" onClick={()=>void exportPdf(report)}><FileText/>PDF العمليات</Button><Button className="btn-ghost" onClick={()=>void exportWord(report)}><Download/>Word العمليات</Button><Button className="btn-ghost" onClick={()=>void exportPdf(sessionReport)}><FileText/>PDF الدخول والخروج</Button><Button className="btn-ghost" onClick={()=>void exportWord(sessionReport)}><Download/>Word الدخول والخروج</Button></FormActions>
    </Panel>
    <Panel>
      <div className="panel-head"><h3><Clock/>أوقات دخول وخروج المستخدمين</h3><Badge color="cyan">{sessions.length}</Badge></div>
      {sessions.length?<div className="table-wrap engineer-table"><table><thead><tr><th>المستخدم</th><th>اسم الدخول</th><th>اليوم</th><th>الدخول</th><th>الخروج</th><th>المدة</th><th>IP</th></tr></thead><tbody>{sessions.map(item=><tr key={item.id}><td><b>{item.displayName}</b></td><td dir="ltr">{item.username}</td><td>{item.day}</td><td>{arDateTime(item.loginAt)}</td><td>{arDateTime(item.logoutAt)}</td><td>{duration(item.durationSeconds)}</td><td dir="ltr">{item.ipAddress||'—'}</td></tr>)}</tbody></table></div>:<EmptyState title="لا توجد جلسات ضمن الفترة" sub="غيّر الفترة أو اضغط تحديث."/>}
    </Panel>
    <Panel>
      <div className="panel-head"><h3><Activity/>تفاصيل العمليات</h3><Badge color="emerald">{logs.length}</Badge></div>
      {logs.length?<div className="table-wrap engineer-table"><table><thead><tr><th>المستخدم</th><th>اليوم</th><th>التاريخ</th><th>الوقت</th><th>الإجراء</th><th>الكيان</th><th>التفاصيل</th></tr></thead><tbody>{logs.map(item=><tr key={item.id}><td><b>{item.displayName}</b><small dir="ltr">{item.username}</small></td><td>{item.day}</td><td>{item.date}</td><td>{formatClock(item.time)}</td><td><Badge color="violet">{item.actionAr}</Badge></td><td><b>{item.entityType}</b><small dir="ltr">{item.entityId||'—'}</small></td><td className="engineer-details-cell">{prettyMeta(item.metadata||{})}</td></tr>)}</tbody></table></div>:<EmptyState title="لا توجد عمليات ضمن الفترة" sub="كل تعديل أو حذف أو حفظ جديد سيظهر هنا."/>}
    </Panel>
  </div>;
}
