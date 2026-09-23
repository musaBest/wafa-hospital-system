import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import {
  Activity, Baby, CalendarDays, Check, ClipboardCheck, Download, FileSpreadsheet, FileText,
  FileType2, IdCard, ListChecks, Loader2, Pencil, Plus, Save, Search, Stethoscope, Trash2, UserCheck, UserRound, UsersRound,
} from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, Panel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { useUi } from '../context/UiContext';
import { fetchCivilRegistry } from '../services/civilRegistry.service';
import type { Admission, Patient } from '../types';
import {
  downloadFinancialExcel, downloadFinancialPdf, downloadFinancialWord,
  type FinancialReportColumn, type FinancialReportRow, type InpatientFinancialReport,
} from '../utils/inpatientFinancialExport';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const STORAGE_KEY = 'wafaa_inpatient_internal_pt_v2';
const LEGACY_STORAGE_KEY = 'wafaa_inpatient_internal_pt_v1';
const makeId = (prefix:string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const WEEK_DAYS = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
const SCHEDULE_PRESETS = {
  satMonWed: ['السبت','الاثنين','الأربعاء'],
  sunTueThu: ['الأحد','الثلاثاء','الخميس'],
};
const DEFAULT_PT_DIAGNOSES = [
  'شلل نصفي', 'شلل رباعي', 'إصابة الحبل الشوكي', 'ما بعد جلطة دماغية', 'ضعف عضلي عام',
  'تيبس مفاصل', 'صعوبة المشي والاتزان', 'ألم أسفل الظهر', 'ألم الرقبة والكتف', 'خشونة الركبة',
  'إصابات رياضية', 'إصابة أعصاب طرفية', 'ما بعد بتر الأطراف', 'شلل دماغي للأطفال',
  'تأخر حركي للأطفال', 'قرح فراش ومضاعفات حركية', 'إعادة تأهيل بعد العمليات', 'أخرى'
];
const uniqueList = (items:string[]) => Array.from(new Set(items.map(item=>item.trim()).filter(Boolean)));

interface TherapistExtraField { id:string; label:string; value:string }
interface Therapist { id:string; name:string; gender:'male'|'female'; title:string; active:boolean; idNumber?:string; dob?:string; city?:string; area?:string; phone?:string; notes?:string; customFields?:TherapistExtraField[] }
interface PtSessionLog { id:string; date:string; note:string; by:string }
interface PtAssignment {
  id:string;
  therapistId:string;
  admissionId:string;
  sessions:number;
  completedSessions:number;
  startDate:string;
  endDate?:string;
  notes?:string;
  status:'active'|'completed';
  evaluation?:string;
  evaluatedAt?:string;
  ptDiagnosis?:string;
  schedulePreset:'satMonWed'|'sunTueThu'|'custom';
  scheduleDays:string[];
  appointmentTime?:string;
  sessionLog:PtSessionLog[];
}
interface PtStore {
  therapists:Therapist[];
  assignments:PtAssignment[];
  diagnosisCatalog:string[];
  extraReportFields:Array<{id:string;label:string;value:string}>;
}

type ColumnKey = 'seq'|'patient'|'nationalId'|'medicalSerial'|'gender'|'age'|'ward'|'coverage'|'diagnosis'|'ptDiagnosis'|'admissionDate'|'therapist'|'sessions'|'completedSessions'|'remainingSessions'|'schedule'|'status'|'evaluation';
const DEFAULT_COLUMNS:ColumnKey[] = ['seq','patient','nationalId','gender','age','ward','coverage','diagnosis','ptDiagnosis','therapist','sessions','completedSessions','remainingSessions','schedule','status'];
const COLUMN_OPTIONS:Array<{key:ColumnKey;label:string}> = [
  {key:'seq',label:'م'}, {key:'patient',label:'اسم المريض'}, {key:'nationalId',label:'رقم الهوية'}, {key:'medicalSerial',label:'رقم الملف'},
  {key:'gender',label:'الجنس'}, {key:'age',label:'العمر'}, {key:'ward',label:'القسم'}, {key:'coverage',label:'جهة التغطية'}, {key:'diagnosis',label:'تشخيص المبيت'}, {key:'ptDiagnosis',label:'تشخيص العلاج الطبيعي'},
  {key:'admissionDate',label:'تاريخ الدخول'}, {key:'therapist',label:'الممرض / المعالج'}, {key:'sessions',label:'الجلسات المطلوبة'},
  {key:'completedSessions',label:'الجلسات المنجزة'}, {key:'remainingSessions',label:'الجلسات المتبقية'}, {key:'schedule',label:'جدولة المواعيد'},
  {key:'status',label:'الحالة'}, {key:'evaluation',label:'آخر تقييم'},
];

const defaultStore:PtStore = {
  therapists:[
    {id:'THER-M-1',name:'معالج رجال',gender:'male',title:'علاج طبيعي داخلي',active:true},
    {id:'THER-F-1',name:'معالجة نساء وأطفال',gender:'female',title:'علاج طبيعي داخلي',active:true},
  ],
  assignments:[],
  diagnosisCatalog:DEFAULT_PT_DIAGNOSES,
  extraReportFields:[],
};

function normalizeTherapist(item:Partial<Therapist>):Therapist{
  return {
    id:item.id || makeId('THR'),
    name:item.name || 'غير محدد',
    gender:item.gender === 'female' ? 'female' : 'male',
    title:item.title || 'علاج طبيعي داخلي',
    active:item.active !== false,
    idNumber:item.idNumber || '',
    dob:item.dob || '',
    city:item.city || '',
    area:item.area || '',
    phone:item.phone || '',
    notes:item.notes || '',
    customFields:Array.isArray(item.customFields) ? item.customFields : [],
  };
}

function normalizeAssignment(item:Partial<PtAssignment>):PtAssignment{
  const preset = item.schedulePreset || 'satMonWed';
  const days = item.scheduleDays?.length ? item.scheduleDays : SCHEDULE_PRESETS[preset === 'sunTueThu' ? 'sunTueThu' : 'satMonWed'];
  const sessions = Math.max(1, Number(item.sessions) || 6);
  const completedSessions = Math.max(0, Math.min(sessions, Number(item.completedSessions) || 0));
  return {
    id:item.id || makeId('PTA'),
    therapistId:item.therapistId || '',
    admissionId:item.admissionId || '',
    sessions,
    completedSessions,
    startDate:item.startDate || today(),
    endDate:item.endDate,
    notes:item.notes || '',
    status:item.status === 'completed' ? 'completed' : 'active',
    evaluation:item.evaluation || '',
    evaluatedAt:item.evaluatedAt,
    ptDiagnosis:item.ptDiagnosis || '',
    schedulePreset:preset,
    scheduleDays:days,
    appointmentTime:item.appointmentTime || '',
    sessionLog:item.sessionLog || [],
  };
}

function loadStore():PtStore{
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if(!raw) return defaultStore;
  try{
    const parsed = JSON.parse(raw);
    return {
      ...defaultStore,
      ...parsed,
      therapists:parsed.therapists?.length ? parsed.therapists.map(normalizeTherapist) : defaultStore.therapists.map(normalizeTherapist),
      assignments:(parsed.assignments || []).map(normalizeAssignment),
      diagnosisCatalog:uniqueList([...(Array.isArray(parsed.diagnosisCatalog)&&parsed.diagnosisCatalog.length ? parsed.diagnosisCatalog : []), ...DEFAULT_PT_DIAGNOSES]),
      extraReportFields:parsed.extraReportFields || [],
    };
  }catch{return defaultStore}
}
function saveStore(store:PtStore){ localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
function ageFromDob(dob:string){
  const birth = new Date(`${dob}T12:00:00`);
  if(Number.isNaN(birth.getTime())) return 0;
  const now = new Date(); let age = now.getFullYear() - birth.getFullYear();
  if(now.getMonth()<birth.getMonth() || (now.getMonth()===birth.getMonth() && now.getDate()<birth.getDate())) age--;
  return Math.max(0, age || 0);
}
function slashDate(date?:string){ return date ? date.replace(/-/g,'/') : '—'; }
function patientText(patient?:Patient, admission?:Admission){ return `${patient?.fullName||''} ${patient?.idNumber||''} ${patient?.medicalSerial||''} ${admission?.diagnosis||''}`.toLowerCase(); }
function wardLabel(admission:Admission){ return admission.wardType === 'female' ? 'نساء' : admission.wardType === 'male' ? 'رجال' : admission.ward; }
function genderLabel(patient:Patient){ return patient.gender === 'male' ? 'ذكر' : 'أنثى'; }
function isChild(patient?:Patient){ return patient ? ageFromDob(patient.dob) < 18 : false; }
function patientFullAddress(patient?:Patient, admission?:Admission){ return admission?.address || [patient?.city, patient?.area].filter(Boolean).join(' - ') || '—'; }
function therapistScope(therapist:Therapist, admission:Admission, patient?:Patient){
  if (therapist.gender === 'male') return admission.wardType === 'male' || admission.ward.includes('رجال');
  return admission.wardType === 'female' || admission.ward.includes('نساء') || isChild(patient);
}
function assignmentSchedule(assignment?:PtAssignment){
  if(!assignment) return 'غير مجدول';
  const days = assignment.scheduleDays?.length ? assignment.scheduleDays.join('، ') : 'غير محدد';
  return `${days}${assignment.appointmentTime ? ` · ${assignment.appointmentTime}` : ''}`;
}
function remainingSessions(assignment?:PtAssignment){ return Math.max(0, (Number(assignment?.sessions)||0) - (Number(assignment?.completedSessions)||0)); }

function ExportChoice({report,onClose}:{report:InpatientFinancialReport;onClose:()=>void}){
  const {toast}=useUi(); const [busy,setBusy]=useState('');
  const run=async(format:'pdf'|'excel'|'word')=>{setBusy(format);try{if(format==='pdf')await downloadFinancialPdf(report);else if(format==='excel')await downloadFinancialExcel(report);else await downloadFinancialWord(report);toast('تم تصدير التقرير بنجاح')}catch{toast('تعذر تصدير التقرير','warn')}finally{setBusy('')}};
  return <Modal title={<><Download/>تصدير التقرير</>} onClose={onClose} className="finance-export-modal">
    <div className="finance-export-intro"><FileText/><div><b>اختر صيغة التقرير</b><span>سيتم تصدير نفس البيانات المحددة في التقرير الحالي.</span></div></div>
    <div className="finance-export-options"><button onClick={()=>run('pdf')} disabled={!!busy}><FileText/><b>PDF</b><span>للطباعة</span>{busy==='pdf'&&<i/>}</button><button onClick={()=>run('excel')} disabled={!!busy}><FileSpreadsheet/><b>Excel</b><span>للجداول</span>{busy==='excel'&&<i/>}</button><button onClick={()=>run('word')} disabled={!!busy}><FileType2/><b>Word</b><span>للتعديل</span>{busy==='word'&&<i/>}</button></div>
  </Modal>;
}

function DiagnosisCatalog({items,value,onChange,onAdd,onRemove}:{items:string[];value:string;onChange:(value:string)=>void;onAdd:(value:string)=>void;onRemove:(value:string)=>void}){
  const submit=()=>{const clean=value.trim(); if(clean) onAdd(clean);};
  const onKey=(event:KeyboardEvent<HTMLInputElement>)=>{if(event.key==='Enter'){event.preventDefault();submit();}};
  return <Panel className="pt-diagnosis-panel"><div className="panel-head"><h3><Stethoscope/>قائمة تشخيصات العلاج الطبيعي</h3><Badge color="cyan">اختيار واحد لكل مريض</Badge></div>
    <div className="pt-diagnosis-add"><input value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKey} placeholder="اكتب تشخيصًا جديدًا ثم Enter ليضاف للقائمة"/><button type="button" onClick={submit}><Plus/>إضافة</button></div>
    <div className="pt-diagnosis-list">{items.length?items.map(item=><article key={item} className={item==='أخرى'?'other':''}><span>{item}</span>{item!=='أخرى'&&<button type="button" onClick={()=>onRemove(item)}>حذف</button>}</article>):<span>القائمة فارغة، أضف التشخيصات التي تستخدمها في القسم.</span>}</div>
  </Panel>;
}

function TherapistEditorModal({therapist,onSave,onClose}:{therapist:Therapist;onSave:(item:Therapist)=>void;onClose:()=>void}){
  const { toast } = useUi();
  const [form,setForm]=useState<Therapist>(normalizeTherapist(therapist));
  const [busy,setBusy]=useState(false);
  const [extraLabel,setExtraLabel]=useState(''); const [extraValue,setExtraValue]=useState('');
  const update=<K extends keyof Therapist,>(key:K,value:Therapist[K])=>setForm(prev=>({...prev,[key]:value}));
  const lookup=async()=>{
    const id=(form.idNumber||'').trim();
    if(!id){toast('اكتب رقم هوية الممرض / المعالج أولاً','warn');return}
    setBusy(true);
    try{
      const record=await fetchCivilRegistry(id);
      setForm(prev=>({...prev,name:record.fullName||prev.name,idNumber:record.idNumber||id,dob:record.dob||prev.dob,gender:record.gender||prev.gender,city:record.city||prev.city,area:record.area||prev.area}));
      toast('تم جلب بيانات الممرض / المعالج من السجل المدني');
    }catch{toast('تعذر جلب البيانات، يمكنك تعبئتها يدويًا','warn')}
    finally{setBusy(false)}
  };
  const addExtra=()=>{const label=extraLabel.trim();const value=extraValue.trim();if(!label||!value){toast('اكتب اسم البيان وقيمته','warn');return}setForm(prev=>({...prev,customFields:[...(prev.customFields||[]),{id:makeId('THX'),label,value}]}));setExtraLabel('');setExtraValue('')};
  const save=()=>{if(!form.name.trim()){toast('اسم الممرض / المعالج مطلوب','warn');return}onSave(normalizeTherapist(form));onClose()};
  return <Modal title={<><Pencil/>ملف الممرض / المعالج</>} onClose={onClose} className="pt-therapist-editor-modal">
    <div className="pt-therapist-editor-grid">
      <Field label="رقم الهوية"><div className="pt-id-lookup"><input value={form.idNumber||''} onChange={e=>update('idNumber',e.target.value)} placeholder="رقم الهوية"/><button type="button" onClick={lookup} disabled={busy}>{busy?<Loader2 className="spin"/>:<IdCard/>}جلب</button></div></Field>
      <Field label="الاسم الكامل"><input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="اسم الممرض / المعالج"/></Field>
      <Field label="الجنس / النطاق"><select value={form.gender} onChange={e=>update('gender',e.target.value as 'male'|'female')}><option value="male">ذكر - قسم الرجال</option><option value="female">أنثى - نساء وأطفال</option></select></Field>
      <Field label="المسمى"><input value={form.title} onChange={e=>update('title',e.target.value)} placeholder="المسمى الوظيفي"/></Field>
      <Field label="تاريخ الميلاد"><input type="date" value={form.dob||''} onChange={e=>update('dob',e.target.value)}/></Field>
      <Field label="الهاتف"><input value={form.phone||''} onChange={e=>update('phone',e.target.value)} placeholder="رقم الهاتف"/></Field>
      <Field label="المدينة"><input value={form.city||''} onChange={e=>update('city',e.target.value)} placeholder="المدينة"/></Field>
      <Field label="العنوان / المنطقة"><input value={form.area||''} onChange={e=>update('area',e.target.value)} placeholder="العنوان"/></Field>
      <Field label="ملاحظات / بيانات إضافية" span={2}><textarea value={form.notes||''} onChange={e=>update('notes',e.target.value)} placeholder="أي بيانات إضافية مطلوبة في ملفه"/></Field>
    </div>
    <div className="pt-extra-fields-box"><b>إضافة بيان جديد للملف</b><div><input value={extraLabel} onChange={e=>setExtraLabel(e.target.value)} placeholder="اسم البيان"/><input value={extraValue} onChange={e=>setExtraValue(e.target.value)} placeholder="القيمة"/><button type="button" onClick={addExtra}><Plus/>إضافة</button></div>{form.customFields?.length? <section>{form.customFields.map(item=><button type="button" key={item.id} onClick={()=>setForm(prev=>({...prev,customFields:(prev.customFields||[]).filter(x=>x.id!==item.id)}))}>{item.label}: {item.value} ×</button>)}</section>:null}</div>
    <FormActions><Button className="btn-primary" type="button" onClick={save}><Save/>حفظ البيانات</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
  </Modal>;
}

function AssignmentModal({therapist,admissions,patients,currentAssignments,diagnoses,onAddDiagnosis,onSave,onClose}:{
  therapist:Therapist;
  admissions:Admission[];
  patients:Patient[];
  currentAssignments:PtAssignment[];
  diagnoses:string[];
  onAddDiagnosis:(value:string)=>void;
  onSave:(assignments:PtAssignment[])=>void;
  onClose:()=>void;
}){
  const currentByAdmission = new Map(currentAssignments.filter(item=>item.status==='active').map(item=>[item.admissionId,item]));
  const [selected,setSelected] = useState<string[]>(Array.from(currentByAdmission.keys()));
  const [sessionsByAdmission,setSessionsByAdmission] = useState<Record<string,number>>(()=>Object.fromEntries(currentAssignments.map(item=>[item.admissionId,item.sessions])));
  const [diagnosisByAdmission,setDiagnosisByAdmission] = useState<Record<string,string>>(()=>Object.fromEntries(currentAssignments.map(item=>[item.admissionId,item.ptDiagnosis || ''])));
  const [schedulePreset,setSchedulePreset] = useState<'satMonWed'|'sunTueThu'|'custom'>(currentAssignments[0]?.schedulePreset || 'satMonWed');
  const [customDays,setCustomDays] = useState<string[]>(currentAssignments[0]?.scheduleDays || SCHEDULE_PRESETS.satMonWed);
  const [appointmentTime,setAppointmentTime] = useState(currentAssignments[0]?.appointmentTime || '09:00');
  const [notes,setNotes] = useState(currentAssignments[0]?.notes || '');
  const toggle=(admissionId:string)=>setSelected(list=>list.includes(admissionId)?list.filter(id=>id!==admissionId):[...list,admissionId]);
  const scheduleDays = schedulePreset === 'satMonWed' ? SCHEDULE_PRESETS.satMonWed : schedulePreset === 'sunTueThu' ? SCHEDULE_PRESETS.sunTueThu : customDays;
  const save=()=>{
    const next = selected.map(admissionId=>{
      const existing = currentByAdmission.get(admissionId);
      const sessions = Math.max(1, Number(sessionsByAdmission[admissionId]) || existing?.sessions || 6);
      const completedSessions = Math.min(existing?.completedSessions || 0, sessions);
      return normalizeAssignment({
        ...(existing || {}),
        id:existing?.id || makeId('PTA'),
        therapistId:therapist.id,
        admissionId,
        sessions,
        completedSessions,
        startDate:existing?.startDate || today(),
        status:'active',
        notes,
        ptDiagnosis:diagnosisByAdmission[admissionId] || existing?.ptDiagnosis || '',
        schedulePreset,
        scheduleDays,
        appointmentTime,
        sessionLog:existing?.sessionLog || [],
      });
    });
    onSave(next);
  };
  return <Modal title={<><ListChecks/>اختيار حالات {therapist.name}</>} onClose={onClose} className="pt-assignment-modal">
    <div className="pt-assignment-modal-tools">
      <Field label="جدولة المواعيد"><select value={schedulePreset} onChange={e=>setSchedulePreset(e.target.value as typeof schedulePreset)}><option value="satMonWed">السبت والاثنين والأربعاء</option><option value="sunTueThu">الأحد والثلاثاء والخميس</option><option value="custom">أيام ومواعيد حسب الحاجة</option></select></Field>
      <Field label="وقت الجلسة"><input type="time" value={appointmentTime} onChange={e=>setAppointmentTime(e.target.value)}/></Field>
      <Field label="ملاحظات التكليف"><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ملاحظات عامة للتكليف"/></Field>
    </div>
    {schedulePreset==='custom'&&<div className="pt-days-picker">{WEEK_DAYS.map(day=><label key={day} className={customDays.includes(day)?'selected':''}><input type="checkbox" checked={customDays.includes(day)} onChange={()=>setCustomDays(days=>days.includes(day)?days.filter(item=>item!==day):[...days,day])}/><span>{day}</span><Check/></label>)}</div>}
    <div className="pt-assign-list-table">
      <div className="head"><span>اختيار</span><span>اسم المريض</span><span>رقم الهوية</span><span>العمر</span><span>القسم</span><span>تشخيص العلاج الطبيعي</span><span>الجلسات</span></div>
      {admissions.map(admission=>{const patient=patients.find(p=>p.id===admission.patientId);const checked=selected.includes(admission.id);return <div className={checked?'row selected':'row'} key={admission.id}><label><input type="checkbox" checked={checked} onChange={()=>toggle(admission.id)}/><span className="pt-check">{checked&&<Check/>}</span></label><b>{patient?.fullName||'—'}</b><span>{patient?.idNumber||'—'}</span><span>{patient?ageFromDob(patient.dob):0}</span><span>{wardLabel(admission)}</span><select value={diagnosisByAdmission[admission.id] || ''} onChange={e=>{const value=e.target.value;if(value==='أخرى'){const custom=window.prompt('اكتب تشخيص العلاج الطبيعي لهذه الحالة');if(custom?.trim()){onAddDiagnosis(custom.trim());setDiagnosisByAdmission(prev=>({...prev,[admission.id]:custom.trim()}));}else{setDiagnosisByAdmission(prev=>({...prev,[admission.id]:''}));}}else{setDiagnosisByAdmission(prev=>({...prev,[admission.id]:value}));}}}><option value="">اختر تشخيصًا واحدًا</option>{diagnoses.map(item=><option key={item} value={item}>{item}</option>)}</select><input type="number" min="1" value={sessionsByAdmission[admission.id] || 6} onChange={e=>setSessionsByAdmission(prev=>({...prev,[admission.id]:Number(e.target.value)||1}))}/></div>})}
    </div>
    <FormActions><Button className="btn-primary" type="button" onClick={save}><Check/>حفظ توزيع الحالات</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
  </Modal>;
}

function EvaluationModal({assignment,patient,admission,therapist,onSave,onSessionDone,onClose}:{assignment:PtAssignment;patient:Patient;admission:Admission;therapist:Therapist;onSave:(text:string,completed:boolean)=>void;onSessionDone:(note:string)=>void;onClose:()=>void}){
  const [text,setText]=useState(assignment.evaluation||''); const [completed,setCompleted]=useState(assignment.status==='completed'); const [sessionNote,setSessionNote]=useState('جلسة علاج طبيعي داخلي منجزة اليوم.');
  return <Modal title={<><ClipboardCheck/>متابعة وتقييم حالة العلاج الطبيعي</>} onClose={onClose} className="pt-evaluation-modal">
    <div className="pt-evaluation-head"><UserRound/><div><b>{patient.fullName}</b><span>{patient.idNumber} · {wardLabel(admission)} · {therapist.name}</span><small>{assignment.ptDiagnosis || admission.diagnosis}</small></div></div>
    <div className="pt-session-summary"><article><b>{assignment.sessions}</b><span>الجلسات المطلوبة</span></article><article><b>{assignment.completedSessions}</b><span>المنجزة</span></article><article><b>{remainingSessions(assignment)}</b><span>المتبقية</span></article><article><b>{assignmentSchedule(assignment)}</b><span>المواعيد</span></article></div>
    <Field label="ملاحظة جلسة اليوم"><input value={sessionNote} onChange={e=>setSessionNote(e.target.value)} placeholder="ملاحظة مختصرة عن جلسة اليوم"/></Field>
    <FormActions><Button className="btn-primary" type="button" onClick={()=>onSessionDone(sessionNote.trim() || 'تم إنهاء جلسة اليوم') }><CalendarDays/>تم إنهاء جلسة اليوم</Button></FormActions>
    <Field label="تقييم الحالة والخطة العلاجية"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="اكتب تقييم حالة المريض، الاستجابة للجلسات، التوصيات، وخطة المتابعة..."/></Field>
    <label className="pt-complete-toggle"><input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)}/><span>تم الانتهاء من متابعة هذه الحالة / اعتماد التقييم</span><Check/></label>
    <FormActions><Button className="btn-primary" type="button" onClick={()=>onSave(text.trim(),completed)}><Check/>حفظ وإرسال لملف المريض</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
  </Modal>;
}

export function InpatientPhysicalTherapyFile(){
  const { admissions, patients, addInpatientReport } = useHospital();
  const { user } = useAuth();
  const { toast } = useUi();
  const [store,setStore] = useState<PtStore>(loadStore);
  const [q,setQ] = useState(''); const [ward,setWard] = useState<'all'|'male'|'female'>('all'); const [gender,setGender] = useState<'all'|'male'|'female'>('all');
  const [from,setFrom] = useState(''); const [to,setTo] = useState(''); const [ageMin,setAgeMin] = useState(''); const [ageMax,setAgeMax] = useState(''); const [childrenOnly,setChildrenOnly] = useState(false);
  const [therapistName,setTherapistName] = useState(''); const [therapistGender,setTherapistGender] = useState<'male'|'female'>('male'); const [therapistTitle,setTherapistTitle] = useState('علاج طبيعي داخلي'); const [therapistIdNumber,setTherapistIdNumber] = useState(''); const [therapistPhone,setTherapistPhone] = useState(''); const [therapistBusy,setTherapistBusy] = useState(false);
  const [selectedTherapist,setSelectedTherapist] = useState(store.therapists.find(t=>t.active)?.id || ''); const [assignmentModal,setAssignmentModal] = useState<Therapist|null>(null); const [editingTherapist,setEditingTherapist] = useState<Therapist|null>(null);
  const [columns,setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS); const [coverageFilter,setCoverageFilter] = useState('all'); const [extraLabel,setExtraLabel] = useState(''); const [extraValue,setExtraValue] = useState(''); const [reportToExport,setReportToExport] = useState<InpatientFinancialReport|null>(null); const [evaluation,setEvaluation] = useState<PtAssignment|null>(null);
  const [diagnosisInput,setDiagnosisInput] = useState('');

  const persist=(next:PtStore)=>{setStore(next);saveStore(next)};
  const activeAdmissions = admissions.filter(admission=>admission.status==='admitted');
  const filteredAdmissions = useMemo(()=>activeAdmissions.filter(admission=>{
    const patient=patients.find(p=>p.id===admission.patientId); if(!patient)return false;
    const age=ageFromDob(patient.dob); const text=patientText(patient,admission); const query=q.trim().toLowerCase();
    if(query && !text.includes(query)) return false;
    if(ward!=='all' && admission.wardType!==ward) return false;
    if(coverageFilter!=='all' && (admission.coverageEntity || patient.coverageEntity || '') !== coverageFilter) return false;
    if(gender!=='all' && patient.gender!==gender) return false;
    if(from && admission.admissionDate<from) return false; if(to && admission.admissionDate>to) return false;
    if(ageMin && age < Number(ageMin)) return false; if(ageMax && age > Number(ageMax)) return false;
    if(childrenOnly && age>=18) return false;
    return true;
  }),[activeAdmissions,patients,q,ward,coverageFilter,gender,from,to,ageMin,ageMax,childrenOnly]);
  const coverageOptions = useMemo(()=>uniqueList(activeAdmissions.map(admission=>{const patient=patients.find(p=>p.id===admission.patientId);return admission.coverageEntity || patient?.coverageEntity || '';})),[activeAdmissions,patients]);
  const maleCount = filteredAdmissions.filter(a=>a.wardType==='male').length; const femaleCount = filteredAdmissions.filter(a=>a.wardType==='female').length; const childrenCount = filteredAdmissions.filter(a=>isChild(patients.find(p=>p.id===a.patientId))).length;
  const selectedTherapistItem = store.therapists.find(t=>t.id===selectedTherapist) || store.therapists.find(t=>t.active);
  const eligibleForTherapist = selectedTherapistItem ? activeAdmissions.filter(a=>therapistScope(selectedTherapistItem,a,patients.find(p=>p.id===a.patientId))) : [];

  const lookupTherapistById=async()=>{const id=therapistIdNumber.trim();if(!id){toast('اكتب رقم هوية الممرض / المعالج','warn');return}setTherapistBusy(true);try{const record=await fetchCivilRegistry(id);setTherapistName(record.fullName||'');setTherapistGender(record.gender);toast('تم جلب بيانات الممرض / المعالج من السجل المدني')}catch{toast('تعذر جلب البيانات، يمكنك تعبئتها يدويًا','warn')}finally{setTherapistBusy(false)}};
  const addTherapist=(e:FormEvent)=>{e.preventDefault();const name=therapistName.trim();if(!name){toast('اكتب اسم الممرض / المعالج','warn');return}const created:Therapist=normalizeTherapist({id:makeId('THR'),name,gender:therapistGender,title:therapistTitle.trim()||'علاج طبيعي داخلي',active:true,idNumber:therapistIdNumber.trim(),phone:therapistPhone.trim()});persist({...store,therapists:[...store.therapists,created]});setSelectedTherapist(created.id);setTherapistName('');setTherapistIdNumber('');setTherapistPhone('');toast('تمت إضافة الاسم إلى قائمة العلاج الطبيعي الداخلي')};
  const updateTherapist=(therapist:Therapist)=>{persist({...store,therapists:store.therapists.map(item=>item.id===therapist.id?therapist:item)});toast('تم تعديل ملف الممرض / المعالج')};
  const deleteTherapist=(therapist:Therapist)=>{if(!window.confirm(`هل تريد حذف ${therapist.name} من قائمة العلاج الطبيعي الداخلي؟`))return;persist({...store,therapists:store.therapists.map(item=>item.id===therapist.id?{...item,active:false}:item),assignments:store.assignments.map(item=>item.therapistId===therapist.id&&item.status==='active'?{...item,status:'completed',endDate:today()}:item)});if(selectedTherapist===therapist.id)setSelectedTherapist(store.therapists.find(t=>t.active&&t.id!==therapist.id)?.id||'');toast('تم حذف الممرض / المعالج وإنهاء تكليفاته النشطة')};
  const addDiagnosis=(value:string)=>{const clean=value.trim(); if(!clean)return; if(store.diagnosisCatalog.includes(clean)){toast('هذا التشخيص موجود مسبقًا','warn');return} persist({...store,diagnosisCatalog:[...store.diagnosisCatalog,clean]}); setDiagnosisInput(''); toast('تمت إضافة التشخيص إلى القائمة')};
  const removeDiagnosis=(value:string)=>persist({...store,diagnosisCatalog:store.diagnosisCatalog.filter(item=>item!==value),assignments:store.assignments.map(item=>item.ptDiagnosis===value?{...item,ptDiagnosis:''}:item)});
  const saveTherapistAssignments=(therapist:Therapist,nextAssignments:PtAssignment[])=>{
    const nextIds = new Set(nextAssignments.map(item=>item.admissionId));
    const updatedExisting = store.assignments.map(item=>item.therapistId===therapist.id && item.status==='active' && !nextIds.has(item.admissionId) ? {...item,status:'completed' as const,endDate:today()} : item).filter(item=>!(item.therapistId===therapist.id && nextIds.has(item.admissionId)));
    persist({...store,assignments:[...updatedExisting,...nextAssignments]});
    setAssignmentModal(null); toast('تم حفظ توزيع الحالات على الممرض / المعالج');
  };
  const saveEvaluation=(assignment:PtAssignment,text:string,completed:boolean)=>{
    const admission=admissions.find(a=>a.id===assignment.admissionId); const patient=admission?patients.find(p=>p.id===admission.patientId):undefined; const th=store.therapists.find(t=>t.id===assignment.therapistId);
    if(!admission||!patient||!th){toast('تعذر العثور على الحالة','warn');return}
    const evaluatedAt=new Date().toISOString();
    const updated={...assignment,evaluation:text||'تمت مراجعة الحالة من العلاج الطبيعي الداخلي.',evaluatedAt,status:completed?'completed' as const:assignment.status,endDate:completed?today():assignment.endDate};
    persist({...store,assignments:store.assignments.map(item=>item.id===assignment.id?updated:item)});
    addInpatientReport(admission.id,{date:today(),type:'pt_internal',title:'تقييم العلاج الطبيعي الداخلي',summary:updated.evaluation||'تقييم داخلي',content:updated.evaluation,author:user?.displayName||th.name,metadata:{therapist:th.name,sessions:String(updated.sessions),completedSessions:String(updated.completedSessions),remainingSessions:String(remainingSessions(updated)),ward:wardLabel(admission),ptDiagnosis:updated.ptDiagnosis||''}});
    toast('تم حفظ التقييم وإرساله إلى ملف المريض');setEvaluation(null);
  };
  const finishTodaySession=(assignment:PtAssignment,note:string)=>{
    const admission=admissions.find(a=>a.id===assignment.admissionId); const patient=admission?patients.find(p=>p.id===admission.patientId):undefined; const th=store.therapists.find(t=>t.id===assignment.therapistId);
    if(!admission||!patient||!th){toast('تعذر العثور على الحالة','warn');return}
    const nextCompleted=Math.min(assignment.sessions, assignment.completedSessions + 1);
    const log:PtSessionLog={id:makeId('PTS'),date:today(),note,by:user?.displayName||th.name};
    const updated={...assignment,completedSessions:nextCompleted,sessionLog:[...(assignment.sessionLog||[]),log],status:nextCompleted>=assignment.sessions?'completed' as const:assignment.status,endDate:nextCompleted>=assignment.sessions?today():assignment.endDate};
    persist({...store,assignments:store.assignments.map(item=>item.id===assignment.id?updated:item)});
    addInpatientReport(admission.id,{date:today(),type:'pt_internal',title:'جلسة علاج طبيعي داخلي',summary:`تم إنهاء جلسة اليوم. المتبقي ${remainingSessions(updated)} جلسة`,content:note,author:user?.displayName||th.name,metadata:{therapist:th.name,completedSessions:String(updated.completedSessions),remainingSessions:String(remainingSessions(updated)),schedule:assignmentSchedule(updated),ptDiagnosis:updated.ptDiagnosis||''}});
    toast(`تم إنهاء جلسة اليوم، المتبقي ${remainingSessions(updated)} جلسة`);setEvaluation(updated);
  };
  const addExtraField=()=>{const label=extraLabel.trim();const value=extraValue.trim();if(!label||!value){toast('اكتب اسم المحدد وقيمته','warn');return}const next={id:makeId('PTF'),label,value};persist({...store,extraReportFields:[...store.extraReportFields,next]});setExtraLabel('');setExtraValue('')};
  const toggleColumn=(key:ColumnKey)=>setColumns(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);

  const assignmentForAdmission=(admissionId:string)=>store.assignments.find(a=>a.admissionId===admissionId && a.status==='active') || store.assignments.find(a=>a.admissionId===admissionId);
  const reportRows:FinancialReportRow[] = filteredAdmissions.map((admission,index)=>{
    const patient=patients.find(p=>p.id===admission.patientId)!; const assignment=assignmentForAdmission(admission.id); const th=store.therapists.find(t=>t.id===assignment?.therapistId);
    return {seq:index+1,patient:patient.fullName,nationalId:patient.idNumber,medicalSerial:patient.medicalSerial,gender:genderLabel(patient),age:ageFromDob(patient.dob),ward:wardLabel(admission),coverage:admission.coverageEntity || patient.coverageEntity || '—',diagnosis:admission.diagnosis,ptDiagnosis:assignment?.ptDiagnosis||'—',admissionDate:slashDate(admission.admissionDate),therapist:th?.name||'غير مكلف',sessions:assignment?.sessions||0,completedSessions:assignment?.completedSessions||0,remainingSessions:remainingSessions(assignment),schedule:assignmentSchedule(assignment),status:assignment?.status==='completed'?'منتهي':'متابعة',evaluation:assignment?.evaluation||'—'};
  });
  const reportColumns:FinancialReportColumn[] = COLUMN_OPTIONS.filter(item=>columns.includes(item.key)).map(item=>({key:item.key,label:item.label}));
  const filteredAdmissionIds = new Set(filteredAdmissions.map(item=>item.id));
  const reportAssignments = store.assignments.filter(item=>filteredAdmissionIds.has(item.admissionId));
  const totalSessions = reportAssignments.reduce((sum,item)=>sum + (Number(item.sessions)||0),0);
  const completedSessionsTotal = reportAssignments.reduce((sum,item)=>sum + (Number(item.completedSessions)||0),0);
  const statisticsReport:InpatientFinancialReport = {title:'تقرير العلاج الطبيعي الداخلي للمبيت',subtitle:`الفترة: ${from?slashDate(from):'كل الفترات'} - ${to?slashDate(to):'اليوم'} · رجال ${maleCount} · نساء ${femaleCount} · أطفال ${childrenCount}`,dateFrom:from?slashDate(from):'—',dateTo:to?slashDate(to):slashDate(today()),reportDate:slashDate(today()),columns:reportColumns,rows:reportRows,summary:[{label:'عدد الحالات',value:reportRows.length},{label:'رجال',value:maleCount},{label:'نساء',value:femaleCount},{label:'أطفال',value:childrenCount},{label:'الجلسات المطلوبة',value:totalSessions},{label:'الجلسات المنجزة',value:completedSessionsTotal},{label:'المتبقي',value:Math.max(0,totalSessions-completedSessionsTotal)}],patientInfo:store.extraReportFields.map(field=>({label:`custom:${field.label}`,value:field.value})),note:store.extraReportFields.length?`محددات إضافية: ${store.extraReportFields.map(f=>`${f.label}: ${f.value}`).join('، ')}`:undefined,filename:`inpatient-internal-pt-${today()}`,template:'ptInternalReport'};
  const assignmentReportRows:FinancialReportRow[] = store.therapists.filter(t=>t.active).map((th,index)=>{const items=store.assignments.filter(a=>a.therapistId===th.id&&a.status==='active');return {seq:index+1,therapist:th.name,scope:th.gender==='male'?'رجال':'نساء وأطفال',cases:items.length?items.map(item=>patients.find(p=>p.id===admissions.find(a=>a.id===item.admissionId)?.patientId)?.fullName||'—').join('، '):'لا توجد حالات',count:items.length,sessions:items.reduce((sum,item)=>sum+(Number(item.sessions)||0),0),completedSessions:items.reduce((sum,item)=>sum+(Number(item.completedSessions)||0),0),remainingSessions:items.reduce((sum,item)=>sum+remainingSessions(item),0)}});
  const assignmentReport:InpatientFinancialReport = {title:'تقرير توزيع حالات العلاج الطبيعي الداخلي',subtitle:`تاريخ التقرير: ${slashDate(today())}`,dateFrom:'—',dateTo:slashDate(today()),reportDate:slashDate(today()),columns:[{key:'seq',label:'م'},{key:'therapist',label:'اسم الممرض / المعالج'},{key:'scope',label:'النطاق'},{key:'cases',label:'الحالات المكلف بها'},{key:'count',label:'عدد الحالات'},{key:'sessions',label:'الجلسات المطلوبة'},{key:'completedSessions',label:'المنجزة'},{key:'remainingSessions',label:'المتبقي'}],rows:assignmentReportRows,summary:[{label:'عدد الممرضين / المعالجين',value:assignmentReportRows.length},{label:'إجمالي الحالات المكلفة',value:assignmentReportRows.reduce((sum,row)=>sum+Number(row.count||0),0)},{label:'إجمالي الجلسات',value:assignmentReportRows.reduce((sum,row)=>sum+Number(row.sessions||0),0)}],filename:`inpatient-pt-assignments-${today()}`,template:'ptInternalReport'};

  return <div className="pt-internal-shell">
    <section className="pt-hero glass-strong"><div><span><Activity/>العلاج الطبيعي الداخلي</span><h2>توزيع ومتابعة جلسات مرضى المبيت<br/><em>بدون إعادة إدخال بيانات المريض.</em></h2><p>كل حالة مبيت جديدة تظهر تلقائياً هنا، وتستطيع توزيعها على الممرضين/المعالجين حسب قسم الرجال أو النساء والأطفال.</p></div><div className="pt-hero-stats"><article><UserRound/><b>{maleCount}</b><span>رجال</span></article><article><UsersRound/><b>{femaleCount}</b><span>نساء</span></article><article><Baby/><b>{childrenCount}</b><span>أطفال</span></article></div></section>
    <div className="pt-layout">
      <Panel className="pt-filter-panel"><div className="panel-head"><h3><Search/>البحث والمحددات</h3><Badge color="cyan">{filteredAdmissions.length}</Badge></div><div className="form-grid rehab-form-grid"><Field label="بحث بالاسم أو الهوية" span={2}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="اسم، هوية، رقم ملف، تشخيص..."/></Field><Field label="القسم"><select value={ward} onChange={e=>setWard(e.target.value as typeof ward)}><option value="all">كل الأقسام</option><option value="male">رجال</option><option value="female">نساء</option></select></Field><Field label="جهة التغطية"><select value={coverageFilter} onChange={e=>setCoverageFilter(e.target.value)}><option value="all">كل الجهات</option>{coverageOptions.map(item=><option key={item} value={item}>{item}</option>)}</select></Field><Field label="الجنس"><select value={gender} onChange={e=>setGender(e.target.value as typeof gender)}><option value="all">الجميع</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field><Field label="من تاريخ دخول"><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field><Field label="إلى تاريخ دخول"><input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></Field><Field label="العمر من"><input type="number" value={ageMin} onChange={e=>setAgeMin(e.target.value)} min="0"/></Field><Field label="العمر إلى"><input type="number" value={ageMax} onChange={e=>setAgeMax(e.target.value)} min="0"/></Field></div><label className="pt-complete-toggle compact"><input type="checkbox" checked={childrenOnly} onChange={e=>setChildrenOnly(e.target.checked)}/><span>إظهار الأطفال فقط ضمن التقرير</span><Check/></label></Panel>
      <DiagnosisCatalog items={store.diagnosisCatalog} value={diagnosisInput} onChange={setDiagnosisInput} onAdd={addDiagnosis} onRemove={removeDiagnosis}/>
    </div>
    <Panel className="pt-patients-table-panel"><div className="panel-head"><h3><UsersRound/>قائمة مرضى المبيت للعلاج الطبيعي الداخلي</h3><Badge color="emerald">{filteredAdmissions.length}</Badge></div>{filteredAdmissions.length?<div className="pt-patients-table-wrap"><table className="pt-patients-table"><thead><tr><th>م</th><th>اسم المريض</th><th>رقم الهوية</th><th>العمر</th><th>الجنس</th><th>القسم</th><th>العنوان</th><th>تشخيص المبيت</th><th>تشخيص العلاج الطبيعي</th><th>المكلف بالمتابعة</th><th>الجلسات</th></tr></thead><tbody>{filteredAdmissions.map((admission,index)=>{const patient=patients.find(p=>p.id===admission.patientId);const assignment=assignmentForAdmission(admission.id);const th=store.therapists.find(t=>t.id===assignment?.therapistId);return <tr key={admission.id}><td>{index+1}</td><td><b>{patient?.fullName||'—'}</b><small>{patient?.medicalSerial||''}</small></td><td>{patient?.idNumber||'—'}</td><td>{patient?ageFromDob(patient.dob):0}</td><td>{patient?genderLabel(patient):'—'}</td><td>{wardLabel(admission)}</td><td>{patientFullAddress(patient,admission)}</td><td>{admission.diagnosis}</td><td>{assignment?.ptDiagnosis||'—'}</td><td>{th?.name||'غير مكلف'}</td><td>{assignment?`${assignment.completedSessions}/${assignment.sessions}`:'—'}</td></tr>})}</tbody></table></div>:<EmptyState title="لا توجد حالات مبيت مطابقة" sub="ستظهر الحالات هنا تلقائيًا بعد تسجيلها في ملف المبيت الإداري."/>}</Panel>
    <Panel className="pt-therapist-panel wide"><div className="panel-head"><h3><Stethoscope/>قائمة الممرضين / المعالجين</h3><Badge color="violet">{store.therapists.filter(t=>t.active).length}</Badge></div><form onSubmit={addTherapist} className="pt-add-therapist enhanced"><input value={therapistIdNumber} onChange={e=>setTherapistIdNumber(e.target.value)} placeholder="رقم الهوية"/><button type="button" className="lookup" onClick={lookupTherapistById} disabled={therapistBusy}>{therapistBusy?<Loader2 className="spin"/>:<IdCard/>}جلب</button><input value={therapistName} onChange={e=>setTherapistName(e.target.value)} placeholder="اسم الممرض / المعالج"/><select value={therapistGender} onChange={e=>setTherapistGender(e.target.value as 'male'|'female')}><option value="male">ذكر - قسم الرجال</option><option value="female">أنثى - نساء وأطفال</option></select><input value={therapistTitle} onChange={e=>setTherapistTitle(e.target.value)} placeholder="المسمى"/><input value={therapistPhone} onChange={e=>setTherapistPhone(e.target.value)} placeholder="الهاتف اختياري"/><button type="submit"><Plus/>إضافة</button></form><div className="pt-therapist-grid">{store.therapists.filter(t=>t.active).map(item=>{const count=store.assignments.filter(a=>a.therapistId===item.id&&a.status==='active').length;return <article key={item.id} className={selectedTherapist===item.id?'active':''}><button className="pt-therapist-main" type="button" onClick={()=>{setSelectedTherapist(item.id);setAssignmentModal(item)}}><span className="pt-check"><Check/></span><b>{item.name}</b><small>{item.gender==='male'?'رجال فقط':'نساء وأطفال'} · {item.title}</small><em>{count} حالات</em></button><div className="pt-therapist-meta"><span>{item.idNumber||'لا يوجد رقم هوية'}</span>{item.dob&&<span>{slashDate(item.dob)}</span>}<span>{[item.city,item.area].filter(Boolean).join(' - ')||'—'}</span>{item.phone&&<span>{item.phone}</span>}{item.customFields?.map(field=><span key={field.id}>{field.label}: {field.value}</span>)}</div><div className="pt-therapist-actions"><button type="button" onClick={()=>setEditingTherapist(item)}><Pencil/>تعديل</button><button type="button" className="danger" onClick={()=>deleteTherapist(item)}><Trash2/>حذف</button></div></article>})}</div></Panel>
    <Panel className="pt-assignment-panel"><div className="panel-head"><h3><ListChecks/>توزيع الحالات على {selectedTherapistItem?.name||'الممرض / المعالج'}</h3><div className="head-actions"><Badge color="emerald">{eligibleForTherapist.length}</Badge>{selectedTherapistItem&&<Button className="btn-primary btn-sm" type="button" onClick={()=>setAssignmentModal(selectedTherapistItem)}><Check/>فتح نافذة الاختيار والحفظ</Button>}</div></div>{selectedTherapistItem?<p className="pt-assignment-help">اضغط على اسم الممرض/المعالج أو على زر فتح النافذة، ثم اختر الحالات المناسبة واحفظ التوزيع. الذكر تظهر له حالات الرجال، والأنثى تظهر لها النساء والأطفال.</p>:<EmptyState title="اختر ممرضاً أو معالجاً" sub="بعد الاختيار ستظهر نافذة الحالات المناسبة له كقائمة Checkbox."/>}</Panel>
    <div className="pt-layout reports">
      <Panel className="pt-report-panel"><div className="panel-head"><h3><FileSpreadsheet/>التقارير والإحصائيات</h3><Badge color="amber">PDF / Word / Excel</Badge></div><div className="finance-report-section"><div className="finance-report-section-head"><div><b>البيانات التي تظهر في التقرير</b><span>حدد الأعمدة والفئة العمرية والفترة المطلوبة، ويمكن إضافة محددات جديدة.</span></div><button type="button" onClick={()=>setColumns(columns.length===COLUMN_OPTIONS.length?DEFAULT_COLUMNS:COLUMN_OPTIONS.map(item=>item.key))}>{columns.length===COLUMN_OPTIONS.length?'القالب الافتراضي':'تحديد الكل'}</button></div><div className="finance-check-grid">{COLUMN_OPTIONS.map(item=><label key={item.key} className={columns.includes(item.key)?'selected':''}><input type="checkbox" checked={columns.includes(item.key)} onChange={()=>toggleColumn(item.key)}/><span>{item.label}</span><Check/></label>)}</div></div><div className="rehab-renewal-custom-filter"><input value={extraLabel} onChange={e=>setExtraLabel(e.target.value)} placeholder="اسم محدد جديد"/><input value={extraValue} onChange={e=>setExtraValue(e.target.value)} placeholder="القيمة"/><button type="button" onClick={addExtraField}><Plus/>إضافة محدد</button></div>{store.extraReportFields.length>0&&<div className="rehab-renewal-filter-tags">{store.extraReportFields.map(item=><button key={item.id} type="button" onClick={()=>persist({...store,extraReportFields:store.extraReportFields.filter(x=>x.id!==item.id)})}>{item.label}: {item.value} ×</button>)}</div>}<FormActions><Button className="btn-primary" type="button" onClick={()=>setReportToExport(statisticsReport)}><Download/>تصدير تقرير الإحصائيات</Button></FormActions></Panel>
      <Panel className="pt-nurse-report-panel"><div className="panel-head"><h3><UserCheck/>جدول تكليف الممرضين والحالات</h3><div className="head-actions"><Badge color="cyan">{store.assignments.filter(a=>a.status==='active').length}</Badge><Button className="btn-ghost btn-sm" type="button" onClick={()=>setReportToExport(assignmentReport)}><Download/>طباعة تقرير التوزيع</Button></div></div><div className="pt-nurse-assignment-table"><div className="head"><span>الممرض / المعالج</span><span>النطاق</span><span>عدد الحالات</span><span>الحالات المكلف بها</span></div>{store.therapists.filter(t=>t.active).map(th=>{const items=store.assignments.filter(a=>a.therapistId===th.id&&a.status==='active');return <div className="row" key={th.id}><div><b>{th.name}</b><small>{th.title}</small></div><span>{th.gender==='male'?'رجال':'نساء وأطفال'}</span><em>{items.length}</em><div className="pt-assigned-patients">{items.length?items.map(item=>{const admission=admissions.find(a=>a.id===item.admissionId);const patient=admission?patients.find(p=>p.id===admission.patientId):undefined;return <article key={item.id}><b>{patient?.fullName||'—'}</b><small>{patient?.idNumber||'—'} · {item.ptDiagnosis||admission?.diagnosis||'—'}</small><span>{item.completedSessions}/{item.sessions} جلسة · المتبقي {remainingSessions(item)}</span><p>{assignmentSchedule(item)}</p><button type="button" onClick={()=>setEvaluation(item)}><ClipboardCheck/>متابعة</button></article>}):<small>لا توجد حالات مكلف بها</small>}</div></div>})}</div></Panel>
    </div>
    {assignmentModal&&<AssignmentModal therapist={assignmentModal} admissions={activeAdmissions.filter(a=>therapistScope(assignmentModal,a,patients.find(p=>p.id===a.patientId)))} patients={patients} diagnoses={store.diagnosisCatalog} onAddDiagnosis={addDiagnosis} currentAssignments={store.assignments.filter(item=>item.therapistId===assignmentModal.id)} onSave={(items)=>saveTherapistAssignments(assignmentModal,items)} onClose={()=>setAssignmentModal(null)}/>} 
    {reportToExport&&<ExportChoice report={reportToExport} onClose={()=>setReportToExport(null)}/>} {editingTherapist&&<TherapistEditorModal therapist={editingTherapist} onSave={updateTherapist} onClose={()=>setEditingTherapist(null)}/>} {evaluation&&(()=>{const admission=admissions.find(a=>a.id===evaluation.admissionId);const patient=admission?patients.find(p=>p.id===admission.patientId):undefined;const th=store.therapists.find(t=>t.id===evaluation.therapistId);return admission&&patient&&th?<EvaluationModal assignment={evaluation} admission={admission} patient={patient} therapist={th} onClose={()=>setEvaluation(null)} onSessionDone={(note)=>finishTodaySession(evaluation,note)} onSave={(text,completed)=>saveEvaluation(evaluation,text,completed)}/>:null})()}
  </div>;
}
