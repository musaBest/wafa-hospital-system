import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardList, FileText, History, LockKeyhole, Play, RefreshCw, Search, Stethoscope } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, PageHeader, Panel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { useUi } from '../context/UiContext';
import { hospitalApi, type DoctorFollowUpResource, type DoctorQueueResource, type DoctorVisitResource } from '../services/hospitalApi.service';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const addDays = (value:string, days:number) => { const d = new Date(`${value}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const appointmentComputed = (item: DoctorFollowUpResource) => item.computedStatus || (item.status === 'scheduled' && item.date < today() ? 'auto_closed' : item.status);
const appointmentLabel = (item: DoctorFollowUpResource) => item.statusLabel || (appointmentComputed(item) === 'auto_closed' ? 'تم إنهاء الحالة تلقائياً' : item.status === 'scheduled' ? 'مراجعة مجدولة' : item.status === 'booked' ? 'تم تسجيل زيارة المراجعة' : item.status === 'completed' ? 'مكتملة' : 'ملغية');

function PrivateNoteModal({patientId,doctorId,patientName,onClose}:{patientId:string;doctorId:string;patientName:string;onClose:()=>void}){
  const {doctorNotes,addDoctorNote}=useHospital();
  const {toast}=useUi();
  const notes=doctorNotes.filter(n=>n.doctorId===doctorId&&n.patientId===patientId).slice().reverse();
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const data=new FormData(e.currentTarget);const text=String(data.get('note')||'').trim();if(!text)return;addDoctorNote(doctorId,patientId,text);toast('تم حفظ الملاحظة الخاصة');onClose()};
  return <Modal title={<><LockKeyhole/>ملاحظات الطبيب الخاصة — {patientName}</>} onClose={onClose}>
    <div className="privacy-banner"><LockKeyhole/><span>هذه الملاحظات خاصة بالطبيب ولا تظهر كإجراء مالي أو إداري.</span></div>
    {notes.length>0&&<div className="doctor-notes-list">{notes.map(note=><article className="glass" key={note.id}><p>{note.text}</p><small>{new Date(note.createdAt).toLocaleString('ar-EG')}</small></article>)}</div>}
    <form onSubmit={submit}><Field label="ملاحظة جديدة"><textarea name="note" required/></Field><FormActions><Button className="btn-primary" type="submit">حفظ الملاحظة</Button></FormActions></form>
  </Modal>;
}

function FinishCaseModal({row,onClose,onDone}:{row:DoctorQueueResource;onClose:()=>void;onDone:()=>void}){
  const {toast}=useUi();
  const [mode,setMode]=useState<'week'|'custom'|'none'>('week');
  const [followUpDate,setFollowUpDate]=useState(addDays(today(),7));
  const [busy,setBusy]=useState(false);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const diagnosis=String(data.get('diagnosis')||'').trim();
    const followUpNotes=String(data.get('followUpNotes')||'').trim();
    if(!diagnosis){toast('اكتب التشخيص قبل إنهاء الحالة','warn');return;}
    setBusy(true);
    try{
      const result=await hospitalApi.finishVisit(row.visit.id,{diagnosis,followUpMode:mode,followUpDate:mode==='custom'?followUpDate:undefined,followUpNotes});
      const scheduled=result.appointment?.date || result.followUpDate;
      toast(scheduled?`تم إنهاء الحالة وجدولة مراجعة بتاريخ ${scheduled}`:'تم إنهاء الحالة بدون مراجعة لاحقة');
      onDone();
      onClose();
    }catch(error){toast(error instanceof Error?error.message:'تعذر إنهاء الحالة','warn');}
    finally{setBusy(false);}
  };
  return <Modal title={<><CheckCircle2/>إنهاء الحالة الطبية</>} onClose={onClose} className="doctor-finish-modal">
    <div className="doctor-finish-patient glass">
      <b>{row.patient.fullName}</b>
      <span>{row.patient.medicalSerial} · {row.clinic?.nameAr || 'العيادة'} · الدور {row.clinic?.code || 'CLN'}-{row.queueNumber}</span>
      <Badge color="emerald">مسجل / جاهز للفحص</Badge>
    </div>
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="التشخيص" span={3}><textarea name="diagnosis" required placeholder="اكتب التشخيص أو ملخص الحالة الطبية..."/></Field>
        <Field label="قرار المراجعة" span={2}>
          <select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}>
            <option value="week">مراجعة تلقائية بعد أسبوع</option>
            <option value="custom">مراجعة بتاريخ يحدده الطبيب</option>
            <option value="none">إنهاء بدون مراجعة</option>
          </select>
        </Field>
        {mode==='custom'&&<Field label="تاريخ المراجعة"><input type="date" min={today()} value={followUpDate} onChange={e=>setFollowUpDate(e.target.value)} required/></Field>}
        {mode==='week'&&<div className="doctor-auto-followup"><CalendarClock/><span>سيتم إنشاء مراجعة تلقائية بتاريخ <b>{addDays(today(),7)}</b> وتظهر عند موظف التسجيل والطبيب وملف المريض.</span></div>}
        <Field label="ملاحظات المراجعة / سبب العودة" span={3}><textarea name="followUpNotes" placeholder="اختياري: سبب المراجعة أو تعليمات للطبيب/الاستقبال..."/></Field>
      </div>
      <FormActions><Button className="btn-primary" type="submit" disabled={busy}><CheckCircle2/>{busy?'جارٍ إنهاء الحالة...':'إنهاء الحالة وحفظ التشخيص'}</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
    </form>
  </Modal>;
}

export function DoctorDashboardPage(){
  const {user}=useAuth();
  const {toast}=useUi();
  const isDoctorUser = user?.role === 'doctor' && Boolean(user?.doctorId);
  const doctorId=user?.doctorId||'';
  const [tab,setTab]=useState<'today'|'past'|'followups'>('today');
  const [date,setDate]=useState('');
  const [todayRows,setTodayRows]=useState<DoctorQueueResource[]>([]);
  const [pastRows,setPastRows]=useState<DoctorVisitResource[]>([]);
  const [followups,setFollowups]=useState<DoctorFollowUpResource[]>([]);
  const [loading,setLoading]=useState(false);
  const [finishRow,setFinishRow]=useState<DoctorQueueResource|null>(null);
  const [notePatient,setNotePatient]=useState<{id:string;name:string}|null>(null);

  const loadToday=useCallback(async()=>{if(!isDoctorUser){setTodayRows([]);return;}try{setTodayRows(await hospitalApi.doctorTodayQueue());}catch(error){toast(error instanceof Error?error.message:'تعذر تحميل حالات الطبيب','warn');}},[toast,isDoctorUser]);
  const loadPast=useCallback(async()=>{if(!isDoctorUser){setPastRows([]);return;}try{setPastRows(await hospitalApi.doctorPastVisits(date));}catch(error){toast(error instanceof Error?error.message:'تعذر تحميل الحالات السابقة','warn');}},[date,toast,isDoctorUser]);
  const loadFollowups=useCallback(async()=>{if(!isDoctorUser){setFollowups([]);return;}try{setFollowups(await hospitalApi.doctorFollowUps(date));}catch(error){toast(error instanceof Error?error.message:'تعذر تحميل المراجعات','warn');}},[date,toast,isDoctorUser]);
  const refresh=useCallback(async()=>{setLoading(true);try{if(tab==='today')await loadToday();else if(tab==='past')await loadPast();else await loadFollowups();}finally{setLoading(false);}},[tab,loadToday,loadPast,loadFollowups]);

  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{if(tab!=='today')return;const timer=window.setInterval(()=>void loadToday(),5000);return()=>window.clearInterval(timer);},[tab,loadToday]);

  const start=async(row:DoctorQueueResource)=>{try{await hospitalApi.updateQueueItem(row.id,{status:'exam'});await loadToday();toast('تم بدء فحص الحالة');}catch(error){toast(error instanceof Error?error.message:'تعذر بدء الحالة','warn');}};
  const waitingCount=useMemo(()=>todayRows.filter(v=>v.status==='waiting').length,[todayRows]);
  const examCount=useMemo(()=>todayRows.filter(v=>v.status==='exam').length,[todayRows]);
  const scheduledCount=useMemo(()=>followups.filter(a=>appointmentComputed(a)==='scheduled').length,[followups]);

  if(!isDoctorUser) return <><PageHeader crumb="بوابة الطبيب" title="واجهة الأطباء فقط" sub="هذه الشاشة تعمل فقط عند الدخول بحساب طبيب مربوط بملف طبيب."/><Panel><EmptyState title="الحساب الحالي ليس طبيباً" sub="سجّل الدخول بأحد يوزرات الأطباء مثل schedule.doctor.021 حتى تظهر حالات الطبيب بدون أخطاء صلاحيات."/></Panel></>;

  return <>
    <PageHeader crumb="بوابة الطبيب" title={user?.displayName||'واجهة الطبيب'} sub={`حالات اليوم المسجلة والجاهزة للفحص: ${todayRows.length}`} actions={<><Badge color="emerald">{user?.username}</Badge><Button className="btn-ghost" onClick={()=>void refresh()} disabled={loading}><RefreshCw/>تحديث</Button></>}/>
    <div className="doctor-kpis">
      <article className="glass"><Stethoscope/><span>بانتظار الفحص<b>{waitingCount}</b></span></article>
      <article className="glass"><Play/><span>قيد الفحص<b>{examCount}</b></span></article>
      <article className="glass"><History/><span>حالات مكتملة<b>{pastRows.length}</b></span></article>
      <article className="glass"><CalendarClock/><span>مراجعات مجدولة<b>{scheduledCount}</b></span></article>
    </div>
    <div className="chip-row">
      <button className={`chip ${tab==='today'?'active':''}`} onClick={()=>setTab('today')}><ClipboardList/>حالات اليوم</button>
      <button className={`chip ${tab==='past'?'active':''}`} onClick={()=>setTab('past')}><History/>حالات سابقة</button>
      <button className={`chip ${tab==='followups'?'active':''}`} onClick={()=>setTab('followups')}><CalendarClock/>المراجعات</button>
    </div>
    {(tab==='past'||tab==='followups')&&<label className="doctor-date-filter"><Search/><span>فلترة بتاريخ محدد</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><Button className="btn-ghost btn-sm" onClick={()=>setDate('')}>كل الفترة</Button></label>}
    <Panel>
      {tab==='today' && (todayRows.length ? <div className="doctor-patient-list">{todayRows.map(row=><article className={`doctor-patient-card glass ${row.status}`} key={row.id}>
        <div className="queue-badge">{row.clinic?.code || 'CLN'}-{row.queueNumber}</div>
        <div className="doctor-patient-main"><h3>{row.patient.fullName}</h3><p>{row.clinic?.nameAr || 'العيادة'} · {row.visit.date} · رقم المريض {row.patient.medicalSerial} · جوال {row.patient.phone || '—'}</p><small>إيصال: {row.payment?.receiptNumber || '—'} · مبلغ: {(row.payment?.amount||0).toFixed(2)} ₪ · الحالة: مسجلة ومحوّلة للطبيب</small></div>
        <div className="doctor-case-actions"><Badge color={row.payment?.workflowStatus==='registered'?'amber':'emerald'}>{row.payment?.workflowStatus==='registered'?'بانتظار الدفع':'دفع مكتمل'}</Badge><Button className="btn-ghost btn-sm" onClick={()=>setNotePatient({id:row.patient.id,name:row.patient.fullName})}><LockKeyhole/>ملاحظة خاصة</Button>{row.status==='waiting'&&<Button className="btn-ghost btn-sm" onClick={()=>void start(row)}><Play/>بدء الفحص</Button>}<Button className="btn-primary btn-sm" onClick={()=>setFinishRow(row)}><CheckCircle2/>إنهاء الحالة</Button></div>
      </article>)}</div> : <EmptyState title="لا توجد حالات جاهزة الآن" sub="تظهر أي حالة مسجلة في العيادات للطبيب تلقائياً، وتبقى حالة الدفع واضحة بجانب كل مريض."/>)}

      {tab==='past' && (pastRows.length ? <div className="table-wrap"><table><thead><tr><th>المريض</th><th>العيادة</th><th>تاريخ الزيارة</th><th>التشخيص</th><th>المراجعة</th></tr></thead><tbody>{pastRows.map(visit=><tr key={visit.id}><td><b>{visit.patient?.fullName||'—'}</b><small className="table-sub">{visit.patient?.medicalSerial||''}</small></td><td>{visit.clinic?.nameAr||'—'}</td><td>{visit.date}</td><td><FileText/> {visit.diagnosis||'—'}</td><td>{visit.followUpDate||'لا توجد'}</td></tr>)}</tbody></table></div> : <EmptyState title="لا توجد حالات سابقة" sub="بعد إنهاء الحالة تظهر هنا مع التشخيص والمراجعة."/>)}

      {tab==='followups' && (followups.length ? <div className="appointment-list">{followups.map(item=>{const computed=appointmentComputed(item);return <article className={`glass ${item.date===today()?'appointment-today':''}`} key={item.id}><div><b>{item.date} {item.date===today()&&'· اليوم'}</b><span>{item.patient?.fullName||'—'} · {item.patient?.medicalSerial||''} · {item.clinic?.nameAr||'العيادة'}</span>{item.reason&&<small>{item.reason}</small>}</div><Badge color={computed==='auto_closed'?'coral':computed==='scheduled'?'amber':'emerald'}>{appointmentLabel(item)}</Badge></article>})}</div> : <EmptyState title="لا توجد مراجعات" sub="أي مراجعة يحددها الطبيب تظهر هنا، وإذا مر موعدها بدون تسجيل زيارة تظهر كحالة منتهية تلقائياً."/>)}
    </Panel>
    {finishRow&&<FinishCaseModal row={finishRow} onClose={()=>setFinishRow(null)} onDone={()=>void refresh()}/>} 
    {notePatient&&<PrivateNoteModal patientId={notePatient.id} doctorId={doctorId} patientName={notePatient.name} onClose={()=>setNotePatient(null)}/>} 
  </>;
}
