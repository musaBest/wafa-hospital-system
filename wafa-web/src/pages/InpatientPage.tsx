import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, BedDouble, Building2, CalendarDays, Check, ChevronDown, ClipboardCheck,
  BrainCircuit, CircleDollarSign, Dumbbell, DoorOpen, FileText, HeartHandshake, Hospital, IdCard, MapPin, Plus, Search,
  ShieldCheck, Sparkles, UserRound, UsersRound, X,
} from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, PageHeader, Panel } from '../components/ui';
import { useHospital } from '../context/HospitalContext';
import { DEFAULT_INPATIENT_DIAGNOSES, INPATIENT_DIAGNOSIS_STORAGE, OTHER_DIAGNOSIS, addDiagnosis, diagnosisList, isCustomDiagnosis, removeDiagnosis, renameDiagnosis } from '../utils/diagnoses';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { fetchCivilRegistry } from '../services/civilRegistry.service';
import { InpatientRehabFile, ReportExportModal } from './InpatientRehabFile';
import { InpatientFinanceFile } from './InpatientFinanceFile';
import { InpatientSocialPsychFile } from './InpatientSocialPsychFile';
import { MinistryPortal } from './MinistryPortal';
import { InpatientPhysicalTherapyFile } from './InpatientPhysicalTherapyFile';
import { InpatientOperationsConsole } from './InpatientOperationsConsole';
import { InpatientFinancialDeclarationFile } from './InpatientFinancialDeclarationFile';
import type { AdmissionRequest, CivilRegistryRecord } from '../types';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const nowTime = () => new Date().toTimeString().slice(0, 5);
const stayDays = (from:string,to?:string) => Math.max(1,Math.ceil((new Date((to||today())+'T12:00:00').getTime()-new Date(from+'T12:00:00').getTime())/86400000)+1);
const REFERRAL_STORAGE = 'wafaa_inpatient_referral_sources_v1';
const DEFAULT_REFERRALS = ['مستشفى الشفاء','مستشفى الأقصى','مستشفى ناصر','مستشفى الأوروبي','مستشفى القدس','مستشفى العودة','مستشفى كمال عدوان','مستشفى الإندونيسي'];

function loadReferralSources() {
  try {
    const saved = JSON.parse(localStorage.getItem(REFERRAL_STORAGE) || '[]');
    return Array.from(new Set([...DEFAULT_REFERRALS, ...(Array.isArray(saved) ? saved : [])])).filter(Boolean) as string[];
  } catch { return DEFAULT_REFERRALS; }
}

function SingleCheckList({
  label, icon, options, value, onChange, onAdd, placeholder,
}:{
  label:string; icon:ReactNode; options:Array<{id:string;label:string}>; value:string;
  onChange:(id:string)=>void; onAdd?:(name:string)=>void; placeholder?:string;
}) {
  const [open,setOpen] = useState(false);
  const [custom,setCustom] = useState('');
  const selected = options.find(item=>item.id===value)?.label || 'اختر من القائمة';
  const add = () => {
    const name=custom.trim();
    if(!name || !onAdd) return;
    onAdd(name); setCustom('');
  };
  return <div className="inpatient-choice-field">
    <span className="inpatient-choice-label">{icon}<b>{label}</b></span>
    <button className={`inpatient-choice-trigger ${open?'open':''}`} type="button" onClick={()=>setOpen(v=>!v)}>
      <span>{selected}</span><ChevronDown/>
    </button>
    {open && <div className="inpatient-choice-menu glass-strong">
      <div className="inpatient-choice-options">
        {options.map(item=><label key={item.id} className={value===item.id?'selected':''}>
          <input type="checkbox" checked={value===item.id} onChange={()=>{onChange(item.id);setOpen(false)}}/>
          <span>{item.label}</span>{value===item.id&&<Check/>}
        </label>)}
      </div>
      {onAdd&&<div className="inpatient-choice-add">
        <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder={placeholder||'إضافة خيار جديد'} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/>
        <button type="button" onClick={add} disabled={!custom.trim()}><Plus/>إضافة</button>
      </div>}
    </div>}
  </div>;
}

function RegistryCard({record}:{record:CivilRegistryRecord}) {
  return <div className="inpatient-registry-card">
    <div className="inpatient-registry-head"><BadgeCheck/><div><b>تم التحقق من السجل المدني</b><span>بيانات الهوية تم جلبها تلقائياً</span></div><Badge color="emerald">موثّق</Badge></div>
    <div className="inpatient-registry-grid">
      <span><small>الاسم الرباعي</small><b>{record.fullName}</b></span>
      <span><small>رقم الهوية</small><b dir="ltr">{record.idNumber}</b></span>
      <span><small>الجنس</small><b>{record.gender==='male'?'ذكر':'أنثى'}</b></span>
      <span><small>تاريخ الميلاد</small><b dir="ltr">{record.dob}</b></span>
    </div>
  </div>;
}

function AdmissionModal({onClose,request}:{onClose:()=>void;request?:AdmissionRequest}) {
  const {patients,sponsors,addPatient,addSponsor,addAdmission}=useHospital();
  const {user,can}=useAuth(); const {toast}=useUi();
  const canUpdate=can('admissions.update');
  const requestPatient = request ? patients.find(p=>p.id===request.patientId) : undefined;
  const [identity,setIdentity] = useState(requestPatient?.idNumber||'');
  const [record,setRecord] = useState<CivilRegistryRecord|null>(requestPatient ? {
    fullName:requestPatient.fullName,idNumber:requestPatient.idNumber,dob:requestPatient.dob,gender:requestPatient.gender,
    city:requestPatient.city,area:requestPatient.area,coverageEntity:requestPatient.coverageEntity,
  } : null);
  const [looking,setLooking] = useState(false);
  const [maritalStatus,setMaritalStatus] = useState('');
  const [address,setAddress] = useState('');
  const [diagnosis,setDiagnosis] = useState(request?.diagnosis||'');
  /* v4.5.0 — التشخيص من قائمة معتمدة، و Others يفتح خانة لكتابة تشخيص جديد. */
  const [diagOptions,setDiagOptions] = useState(()=>diagnosisList(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES));
  const [diagChoice,setDiagChoice] = useState(()=>{
    const initial=request?.diagnosis||'';
    if(!initial) return '';
    return diagnosisList(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES).includes(initial)?initial:OTHER_DIAGNOSIS;
  });
  const [diagOther,setDiagOther] = useState(()=>{
    const initial=request?.diagnosis||'';
    return initial&&!diagnosisList(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES).includes(initial)?initial:'';
  });
  const [diagNew,setDiagNew] = useState('');
  const refreshDiag=()=>setDiagOptions(diagnosisList(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES));
  useEffect(()=>{ setDiagnosis(diagChoice===OTHER_DIAGNOSIS?diagOther.trim():diagChoice); },[diagChoice,diagOther]);
  const [coverage,setCoverage] = useState(requestPatient?.coverageEntity||sponsors[0]?.id||'');
  const [wardType,setWardType] = useState<'male'|'female'>(requestPatient?.gender==='female'?'female':'male');
  const [referrals,setReferrals] = useState<string[]>(loadReferralSources);
  const [referralHospital,setReferralHospital] = useState('');
  const [referringDoctor,setReferringDoctor] = useState('');
  const [admissionDate,setAdmissionDate] = useState(today());
  const [admissionTime,setAdmissionTime] = useState(nowTime());
  const [expected,setExpected] = useState('');
  const [room,setRoom] = useState(''); const [bed,setBed] = useState('');
  const [saving,setSaving] = useState(false);

  const lookup = async () => {
    const id=identity.replace(/\s/g,'');
    if(!/^\d{7,12}$/.test(id)){toast('أدخل رقم هوية صحيح أولاً','warn');return;}
    setLooking(true);
    try {
      const fetched=await fetchCivilRegistry(id);
      setRecord(fetched); setIdentity(fetched.idNumber);
      setWardType(fetched.gender==='female'?'female':'male');
      const existing=patients.find(p=>p.idNumber===fetched.idNumber);
      if(existing?.coverageEntity)setCoverage(existing.coverageEntity);
      toast('تم جلب بيانات المريض من السجل المدني');
    } catch {
      const existing=patients.find(p=>p.idNumber===id);
      if(existing){
        setRecord({fullName:existing.fullName,idNumber:existing.idNumber,dob:existing.dob,gender:existing.gender,city:existing.city,area:existing.area,coverageEntity:existing.coverageEntity});
        setWardType(existing.gender==='female'?'female':'male'); setCoverage(existing.coverageEntity);
        toast('تعذر الاتصال بالسجل المدني؛ تم استخدام الملف المحلي الموثق','warn');
      } else toast('تعذر جلب بيانات الهوية من السجل المدني','warn');
    } finally {setLooking(false)}
  };

  const addCoverage = (name:string) => {
    const created=addSponsor(name,name); setCoverage(created.id); toast(`تمت إضافة جهة التغطية: ${name}`);
  };
  const addReferral = (name:string) => {
    const next=Array.from(new Set([...referrals,name])); setReferrals(next); setReferralHospital(name);
    localStorage.setItem(REFERRAL_STORAGE,JSON.stringify(next.filter(x=>!DEFAULT_REFERRALS.includes(x))));
    toast(`تمت إضافة الجهة المحوِّلة: ${name}`);
  };

  const submit = (e:FormEvent) => {
    e.preventDefault();
    if(!record){toast('يجب التحقق من رقم الهوية أولاً','warn');return;}
    if(!maritalStatus){toast('حدد الحالة الاجتماعية','warn');return;}
    if(!address.trim()){toast('أدخل عنوان المريض','warn');return;}
    if(!diagnosis.trim()){toast('أدخل تشخيص الحالة','warn');return;}
    if(!coverage){toast('حدد جهة التغطية','warn');return;}
    if(!referralHospital){toast('حدد المشفى المحوِّل أو أضف جهة جديدة','warn');return;}
    if(record.gender==='male'&&wardType==='female' || record.gender==='female'&&wardType==='male'){
      toast('نوع القسم لا يتوافق مع جنس المريض','warn');return;
    }
    setSaving(true);
    try {
      let patient=patients.find(p=>p.idNumber===record.idNumber);
      if(!patient) patient=addPatient({...record,coverageEntity:coverage},'');
      const admission=addAdmission({
        patientId:patient.id,ward:wardType==='male'?'قسم مبيت الرجال':'قسم مبيت النساء',wardType,
        room:room.trim(),bed:bed.trim(),diagnosis:diagnosis.trim(),admissionDate,admissionTime,
        expectedDischargeDate:expected,coverageEntity:coverage,contributionPct:0,dailyRate:0,
        responsiblePerson:user?.displayName||'',maritalStatus,address:address.trim(),referralHospital,
        referringDoctor:referringDoctor.trim(),sourceVisitId:request?.sourceVisitId,requestId:request?.id,
        transactions:[],notes:[],reports:[],
      });
      toast(`تم فتح الحالة الإدارية للمبيت رقم ${admission.id.slice(-6).toUpperCase()}`); onClose();
    } finally {setSaving(false)}
  };

  return <Modal title={<><BedDouble/>تسجيل حالة مبيت جديدة</>} onClose={onClose} className="inpatient-admission-modal">
    <form onSubmit={submit} className="inpatient-admission-form">
      <div className="inpatient-modal-intro">
        <div className="inpatient-step-no">01</div><div><b>التحقق من هوية المريض</b><span>ابدأ برقم الهوية، والنظام يجلب البيانات الأساسية من API السجل المدني.</span></div>
      </div>
      <div className="inpatient-identity-search">
        <label><IdCard/><input dir="ltr" value={identity} onChange={e=>{setIdentity(e.target.value);setRecord(null)}} placeholder="أدخل رقم الهوية" disabled={Boolean(requestPatient)}/></label>
        <Button type="button" className="btn-primary" disabled={looking||Boolean(requestPatient)} onClick={lookup}>{looking?<span className="inpatient-spinner"/>:<Search/>}{looking?'جارٍ التحقق...':'جلب البيانات'}</Button>
      </div>
      {record&&<RegistryCard record={record}/>} {!record&&<div className="inpatient-registry-placeholder"><ShieldCheck/><span>بانتظار التحقق من رقم الهوية</span></div>}

      <div className="inpatient-modal-intro section-gap">
        <div className="inpatient-step-no">02</div><div><b>البيانات الإدارية للحالة</b><span>أكمل بيانات المبيت والتغطية والتحويل قبل فتح الحالة.</span></div>
      </div>
      <div className="form-grid inpatient-admin-form-grid">
        <Field label="الحالة الاجتماعية"><select value={maritalStatus} onChange={e=>setMaritalStatus(e.target.value)} required><option value="">— اختر —</option><option>أعزب / عزباء</option><option>متزوج / متزوجة</option><option>مطلق / مطلقة</option><option>أرمل / أرملة</option><option>منفصل / منفصلة</option></select></Field>
        <Field label="نوع قسم المبيت"><div className="inpatient-ward-toggle"><button type="button" className={wardType==='male'?'active':''} onClick={()=>setWardType('male')}><UserRound/>رجال</button><button type="button" className={wardType==='female'?'active':''} onClick={()=>setWardType('female')}><UserRound/>نساء</button></div></Field>
        <Field label="تاريخ الدخول"><input type="date" value={admissionDate} onChange={e=>setAdmissionDate(e.target.value)} required/></Field>
        <Field label="وقت الدخول"><input type="time" value={admissionTime} onChange={e=>setAdmissionTime(e.target.value)} required/></Field>
        <Field label="الخروج المتوقع"><input type="date" value={expected} onChange={e=>setExpected(e.target.value)}/></Field>
        <Field label="الغرفة / الجناح"><input value={room} onChange={e=>setRoom(e.target.value)} placeholder="اختياري"/></Field>
        <Field label="رقم السرير"><input value={bed} onChange={e=>setBed(e.target.value)} placeholder="اختياري"/></Field>
        <Field label="العنوان" span={2}><div className="inpatient-icon-input"><MapPin/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="أدخل العنوان بالتفصيل" required/></div></Field>
        <Field label="تشخيص الحالة" span={3}>
          <select value={diagChoice} onChange={e=>setDiagChoice(e.target.value)} required>
            <option value="">— اختر التشخيص —</option>
            {diagOptions.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        {diagChoice===OTHER_DIAGNOSIS&&<Field label="التشخيص الجديد" span={3}>
          <input value={diagOther} onChange={e=>setDiagOther(e.target.value)} placeholder="اكتب اسم التشخيص الجديد" required/>
        </Field>}
        {canUpdate&&<Field label="إدارة قائمة التشخيصات" span={3}>
          <div className="diag-manage">
            <input value={diagNew} onChange={e=>setDiagNew(e.target.value)} placeholder="أضف تشخيصاً جديداً للقائمة"/>
            <Button className="btn-ghost btn-sm" type="button" onClick={()=>{
              if(addDiagnosis(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES,diagNew)){refreshDiag();setDiagNew('');}
            }}>إضافة</Button>
            {diagChoice&&isCustomDiagnosis(DEFAULT_INPATIENT_DIAGNOSES,diagChoice)&&<>
              <Button className="btn-ghost btn-sm" type="button" onClick={()=>{
                const next=window.prompt('الاسم الجديد للتشخيص',diagChoice);
                if(next&&renameDiagnosis(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES,diagChoice,next)){refreshDiag();setDiagChoice(next.trim());}
              }}>تعديل</Button>
              <Button className="btn-danger btn-sm" type="button" onClick={()=>{
                if(removeDiagnosis(INPATIENT_DIAGNOSIS_STORAGE,DEFAULT_INPATIENT_DIAGNOSES,diagChoice)){refreshDiag();setDiagChoice('');}
              }}>حذف</Button>
            </>}
          </div>
          <small className="diag-hint">التشخيصات المعتمدة لا يمكن تعديلها أو حذفها؛ المضافة فقط.</small>
        </Field>}
      </div>

      <div className="inpatient-choice-grid">
        <SingleCheckList label="جهة التغطية" icon={<HeartHandshake/>} value={coverage} onChange={setCoverage} onAdd={addCoverage} placeholder="اسم جهة التغطية الجديدة" options={sponsors.map(s=>({id:s.id,label:s.nameAr}))}/>
        <SingleCheckList label="محوّل من مشفى" icon={<Hospital/>} value={referralHospital} onChange={setReferralHospital} onAdd={addReferral} placeholder="اسم المشفى / الجهة الجديدة" options={referrals.map(name=>({id:name,label:name}))}/>
      </div>
      <div className="form-grid inpatient-referral-extra">
        <Field label="الطبيب المحوِّل (اختياري)" span={2}><input value={referringDoctor} onChange={e=>setReferringDoctor(e.target.value)} placeholder="اسم الطبيب المحوِّل إن وجد"/></Field>
      </div>

      <div className="inpatient-admin-notice"><Sparkles/><div><b>ملف إداري فقط</b><span>هذه المرحلة لا تنشئ أي رسوم أو حركات مالية. سيتم بناء الملف المالي للمبيت وربطه لاحقاً كمرحلة مستقلة.</span></div></div>
      <FormActions><Button className="btn-primary inpatient-save" type="submit" disabled={saving||!record}><Check/>{saving?'جارٍ الحفظ...':'حفظ وفتح حالة المبيت'}</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
    </form>
  </Modal>;
}

function CaseDetails({id,onClose}:{id:string;onClose:()=>void}) {
  const {admissions,patients,sponsors,discharge}=useHospital(); const {user}=useAuth(); const {toast}=useUi(); const [permit,setPermit]=useState(false);
  const admission=admissions.find(a=>a.id===id); const patient=admission?patients.find(p=>p.id===admission.patientId):undefined;
  if(!admission||!patient)return null;
  const sponsor=sponsors.find(s=>s.id===admission.coverageEntity)?.nameAr||admission.coverageEntity||'—';
  const canUpdate=user?.permissions.includes('admissions.update')??false;
  return <Modal title={<><ClipboardCheck/>الملف الإداري لحالة المبيت</>} onClose={onClose} className="inpatient-case-modal">
    <div className="inpatient-case-hero"><div className="patient-avatar inpatient-case-avatar">{patient.fullName.charAt(0)}</div><div><b>{patient.fullName}</b><span>{patient.idNumber} · {patient.medicalSerial}</span></div><Badge color={admission.status==='admitted'?'emerald':'coral'}>{admission.status==='admitted'?'مقيم حالياً':'تم التخريج'}</Badge></div>
    <div className="inpatient-case-grid">
      <span><small>القسم</small><b>{admission.ward}</b></span><span><small>الحالة الاجتماعية</small><b>{admission.maritalStatus||'—'}</b></span>
      <span><small>العنوان</small><b>{admission.address||'—'}</b></span><span><small>جهة التغطية</small><b>{sponsor}</b></span>
      <span><small>محوّل من</small><b>{admission.referralHospital||'—'}</b></span><span><small>الطبيب المحوِّل</small><b>{admission.referringDoctor||'—'}</b></span>
      <span><small>تاريخ الدخول</small><b>{admission.admissionDate}</b></span><span><small>مدة المبيت</small><b>{stayDays(admission.admissionDate,admission.dischargedAt?.slice(0,10))} يوم</b></span>
      <span><small>الغرفة / السرير</small><b>{admission.room||'—'} / {admission.bed||'—'}</b></span><span><small>مسؤول التسجيل</small><b>{admission.responsiblePerson||'—'}</b></span>
    </div>
    <div className="inpatient-diagnosis-view"><small>تشخيص الحالة</small><p>{admission.diagnosis}</p></div>
    <FormActions><Button className="btn-primary" type="button" onClick={()=>setPermit(true)}><FileText/>إنشاء إذن دخول مريض</Button>{canUpdate&&admission.status==='admitted'&&<Button className="btn-danger" type="button" onClick={()=>{discharge(admission.id);toast('تم تخريج الحالة إدارياً');onClose()}}><DoorOpen/>تخريج الحالة</Button>}</FormActions>
    {permit&&<ReportExportModal title="إذن دخول مريض" date={admission.admissionDate} patient={patient} admission={admission} coverage={sponsor} sections={[{heading:'بيانات الحالة',body:`جهة التحويل: ${sponsor}\nالقسم: ${admission.ward}\nالمشفى المحوِّل: ${admission.referralHospital||'—'}\nالطبيب المحوِّل: ${admission.referringDoctor||'—'}\nتاريخ الدخول: ${admission.admissionDate}${admission.expectedDischargeDate?`\nالخروج المتوقع: ${admission.expectedDischargeDate}`:''}`},{heading:'التشخيص',body:admission.diagnosis}]} signature="الإدارة الطبية" onClose={()=>setPermit(false)}/>} 
  </Modal>;
}

export function AdmissionsPage() {
  const {user,can}=useAuth();
  const {patients,admissions,admissionRequests,patientName,resolveAdmissionRequest}=useHospital();
  const {toast}=useUi();
  type InpatientModule='admin'|'rehab'|'social'|'pt'|'finance'|'declaration'|'moh';
  const [module,setModule]=useState<InpatientModule>(()=>user?.role==='social_worker'?'social':user?.role==='rehab_specialist'?'rehab':user?.role==='inpatient_pt'?'pt':user?.role==='inpatient_finance'?'finance':user?.role==='moh_user'?'moh':'admin');
  const [view,setView]=useState<'current'|'recent'|'all'>('current');
  const [q,setQ]=useState('');
  const [modal,setModal]=useState<false|AdmissionRequest>(false);
  const [details,setDetails]=useState('');

  const moduleAccess:Record<InpatientModule,boolean>={
    admin:can('admissions.view'),
    rehab:can('inpatient_rehab.view'),
    social:can('inpatient_social.view'),
    pt:can('inpatient_pt.view') || can('admissions.view'),
    finance:can('inpatient_finance.view'),
    declaration:can('inpatient_finance.view') || can('admissions.view'),
    moh:can('moh_portal.view'),
  };
  const accessibleModules=(Object.keys(moduleAccess) as InpatientModule[]).filter(key=>moduleAccess[key]);
  const effectiveModule=moduleAccess[module]?module:(accessibleModules[0]||'admin');
  const canCreate=can('admissions.create');
  const canUpdate=can('admissions.update');
  const pending=admissionRequests.filter(r=>r.status==='pending');
  const active=admissions.filter(a=>a.status==='admitted');
  const maleActive=active.filter(a=>a.wardType==='male'||a.ward.includes('رجال')).length;
  const femaleActive=active.filter(a=>a.wardType==='female'||a.ward.includes('نساء')).length;
  const dischargedToday=admissions.filter(a=>a.status==='discharged'&&a.dischargedAt?.slice(0,10)===today()).length;
  const rows=useMemo(()=>admissions.filter(a=>{
    if(view==='current'&&a.status!=='admitted')return false;
    if(view==='recent'&&!(a.status==='discharged'&&a.dischargedAt&&Date.now()-new Date(a.dischargedAt).getTime()<=30*86400000))return false;
    const p=patients.find(x=>x.id===a.patientId);
    const text=`${p?.fullName||''} ${p?.idNumber||''} ${p?.medicalSerial||''} ${a.diagnosis} ${a.ward} ${a.referralHospital||''}`.toLowerCase();
    return !q||text.includes(q.toLowerCase());
  }),[admissions,patients,q,view]);

  useEffect(()=>{if(user?.role==='inpatient_manager')setView('current')},[user?.role]);

  // The dedicated social-service account never sees the other inpatient branches.
  if(user?.role==='social_worker'&&moduleAccess.social){
    return <div className="inpatient-admin-shell social-only-shell">
      <PageHeader crumb="المبيت · الخدمة الاجتماعية" title="الخدمة الاجتماعية والنفسية" sub="حساب مخصص لدراسة الحالات الاجتماعية والنفسية فقط"/>
      <InpatientSocialPsychFile/>
    </div>;
  }

  // The Ministry account remains a dedicated portal as well.
  if(user?.role==='moh_user'&&moduleAccess.moh) return <MinistryPortal/>;

  const pageMeta:Record<InpatientModule,{crumb:string;title:string;sub:string}>={
    admin:{crumb:'المبيت · الإدارة',title:'إدارة المبيت الداخلي',sub:'وحدة إدارية مستقلة لتسجيل ومتابعة حالات المبيت'},
    rehab:{crumb:'المبيت · ملف التأهيل الطبي',title:'ملف التأهيل الطبي',sub:'التقارير الطبية والاحتياجات والمتابعة اليومية لحالات التأهيل'},
    social:{crumb:'المبيت · الخدمة الاجتماعية والنفسية',title:'دراسة الحالة الاجتماعية والنفسية',sub:'تقييم اجتماعي ونفسي شامل مرتبط مباشرة بملف المبيت'},
    pt:{crumb:'المبيت · العلاج الطبيعي الداخلي',title:'العلاج الطبيعي الداخلي',sub:'توزيع جلسات العلاج الطبيعي ومتابعة حالات المبيت حسب الرجال والنساء والأطفال'},
    finance:{crumb:'المبيت · الملف المالي',title:'الملف المالي للمبيت',sub:'حركات التغطية والمطالبات والتقارير المالية المرتبطة بالحالة الإدارية'},
    declaration:{crumb:'المبيت · الإقرار المالي',title:'ملف الإقرار المالي',sub:'إعداد وطباعة سند الإقرار والالتزام بنفس القالب الرسمي'},
    moh:{crumb:'المبيت · وزارة الصحة',title:'بوابة وزارة الصحة',sub:'متابعة حالات وزارة الصحة وقوائم الانتظار والتقارير الخاصة بها'},
  };
  const meta=pageMeta[effectiveModule];

  return <div className="inpatient-admin-shell">
    <PageHeader
      crumb={meta.crumb}
      title={meta.title}
      sub={meta.sub}
    />

    {accessibleModules.length>1&&<div className="inpatient-module-switcher inpatient-module-switcher-seven">
      {moduleAccess.admin&&<button className={effectiveModule==='admin'?'active':''} onClick={()=>setModule('admin')}><ShieldCheck/><span><b>القسم الإداري</b><small>التسجيل والحالات</small></span></button>}
      {moduleAccess.rehab&&<button className={effectiveModule==='rehab'?'active rehab-active':''} onClick={()=>setModule('rehab')}><HeartHandshake/><span><b>ملف التأهيل الطبي</b><small>تقارير واحتياجات ومتابعة</small></span></button>}
      {moduleAccess.social&&<button className={effectiveModule==='social'?'active social-active':''} onClick={()=>setModule('social')}><BrainCircuit/><span><b>الخدمة الاجتماعية</b><small>دراسة الحالة والتدخلات</small></span></button>}
      {moduleAccess.pt&&<button className={effectiveModule==='pt'?'active pt-active':''} onClick={()=>setModule('pt')}><Dumbbell/><span><b>العلاج الطبيعي الداخلي</b><small>جلسات وتكليفات وإحصائيات</small></span></button>}
      {moduleAccess.finance&&<button className={effectiveModule==='finance'?'active finance-active':''} onClick={()=>setModule('finance')}><CircleDollarSign/><span><b>القسم المالي</b><small>التغطية والمطالبات والتقارير</small></span></button>}
      {moduleAccess.declaration&&<button className={effectiveModule==='declaration'?'active finance-active':''} onClick={()=>setModule('declaration')}><FileText/><span><b>ملف الإقرار المالي</b><small>سند إقرار والتزام</small></span></button>}
      {moduleAccess.moh&&<button className={effectiveModule==='moh'?'active moh-active':''} onClick={()=>setModule('moh')}><Hospital/><span><b>وزارة الصحة</b><small>المقيمون والانتظار والتقارير</small></span></button>}
    </div>}

    {effectiveModule==='rehab'?<InpatientRehabFile/>:
     effectiveModule==='social'?<InpatientSocialPsychFile/>:
     effectiveModule==='pt'?<InpatientPhysicalTherapyFile/>:
     effectiveModule==='finance'?<InpatientFinanceFile/>:
     effectiveModule==='declaration'?<InpatientFinancialDeclarationFile/>:
     effectiveModule==='moh'?<MinistryPortal/>:<>
      {pending.length>0&&<Panel className="inpatient-admin-requests"><div className="panel-head"><h3><ClipboardCheck/>طلبات تحويل بانتظار القبول</h3><Badge color="amber">{pending.length}</Badge></div><div className="inpatient-admin-request-list">{pending.map(request=><article key={request.id}><div><b>{patientName(request.patientId)}</b><span>{request.diagnosis}</span><small>{new Date(request.requestedAt).toLocaleString('ar-EG')} · {request.requestedBy}</small></div><div>{canCreate&&<Button className="btn-primary btn-sm" onClick={()=>setModal(request)}><Check/>فتح حالة المبيت</Button>}{canUpdate&&<Button className="btn-ghost btn-sm" onClick={()=>{resolveAdmissionRequest(request.id,'cancelled');toast('تم إلغاء طلب التحويل')}}><X/>إلغاء</Button>}</div></article>)}</div></Panel>}
      <InpatientOperationsConsole onNew={()=>setModal({} as AdmissionRequest)} onOpenCase={setDetails}/>
    </>}

    {modal&&<AdmissionModal request={modal.id?modal:undefined} onClose={()=>setModal(false)}/>} {details&&<CaseDetails id={details} onClose={()=>setDetails('')}/>} 
  </div>;
}
