import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity, BadgeCheck, CalendarDays, ClipboardList, DatabaseZap, Download, FilePlus2, FileSpreadsheet, FileText,
  HeartPulse, Plus, Printer, RefreshCw, Save, Search, Trash2, UserPlus, UserRound, UsersRound, X,
} from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, PageHeader, Panel } from '../components/ui';
import { DEFAULT_PT_DIAGNOSES, OTHER_DIAGNOSIS, PT_DIAGNOSIS_STORAGE, addDiagnosis, diagnosisList, isCustomDiagnosis, removeDiagnosis, renameDiagnosis } from '../utils/diagnoses';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { fetchCivilRegistry } from '../services/civilRegistry.service';
import { hospitalApi } from '../services/hospitalApi.service';
import { outpatientPhysicalTherapyService, type SaveOutpatientPTCaseDTO, type SaveOutpatientPTWaitlistDTO } from '../services/outpatientPhysicalTherapy.service';
import type { CivilRegistryRecord, OutpatientPTCase, OutpatientPTPatient, OutpatientPTSession, OutpatientPTWaitlistItem, Sponsor } from '../types';
import { downloadOutpatientPtExcel, downloadOutpatientPtPdf, downloadOutpatientPtWord, type OutpatientPtReportExportData } from '../utils/outpatientPhysicalTherapyReportExport';
import { hasPermission } from '../utils/permissions';
import { printCurrentView } from '../utils/printDocument';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const localDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const toLocalDateTimeInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const modalities = [
  'Exercise + Massage','Paraffin','Ice','Postural Drainage','Evaluation','Hot Packs','S.W.D','Knee Traction',
  'Vasotrain','Whirlpool','Ultra Sound','Pelvic Traction','Laser','Electrical','Infra-red','Cervical Traction','Gait training','A.D.L',
];

const maritalOptions = ['أعزب/عزباء','متزوج/متزوجة','مطلق/مطلقة','أرمل/أرملة','غير محدد'];
const referralOptions = ['حكومي','شركة تأمين','خاص','تأمين خاص','جمعية خيرية','وزارة الصحة','الأونروا','أخرى'];

const ageOf = (dob?: string) => {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return Math.max(0, age);
};

const patientFromRegistered = (patient: any): OutpatientPTPatient => ({
  id: patient.id,
  medicalSerial: patient.medicalSerial,
  fullName: patient.fullName,
  idNumber: patient.idNumber,
  dob: patient.dob,
  gender: patient.gender,
  phone: patient.phone,
  city: patient.city,
  area: patient.area,
  coverageEntity: patient.coverageEntity,
  registeredAt: patient.regDate,
});

function CoverageModal({ onClose, onSaved }: { onClose: () => void; onSaved: (item: Sponsor) => void }) {
  const { toast } = useUi();
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!nameAr.trim()) return;
    setSaving(true);
    try {
      const item = await outpatientPhysicalTherapyService.addCoverage(nameAr.trim(), nameEn.trim());
      onSaved(item);
      toast('تمت إضافة جهة التغطية');
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر إضافة جهة التغطية', 'warn');
    } finally { setSaving(false); }
  };
  return <Modal title={<><Plus/>إضافة جهة تغطية جديدة</>} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="اسم جهة التغطية" span={2}><input value={nameAr} onChange={e=>setNameAr(e.target.value)} required autoFocus/></Field>
        <Field label="الاسم الإنجليزي (اختياري)" span={2}><input value={nameEn} onChange={e=>setNameEn(e.target.value)}/></Field>
      </div>
      <FormActions><Button className="btn-primary" type="submit" disabled={saving}><Save/>{saving?'جارٍ الحفظ...':'حفظ'}</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
    </form>
  </Modal>;
}

export function OutpatientPhysicalTherapyPage() {
  const { user } = useAuth();
  const { toast } = useUi();
  const canUpdate = hasPermission(user, 'outpatient_pt.update');
  const canPrint = hasPermission(user, 'outpatient_pt.print');
  const canExport = hasPermission(user, 'outpatient_pt.export');
  const [tab, setTab] = useState<'registration'|'sessions'|'reports'|'waitlist'>('registration');
  const [cases, setCases] = useState<OutpatientPTCase[]>([]);
  const [waitlist, setWaitlist] = useState<OutpatientPTWaitlistItem[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverageModal, setCoverageModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [caseRows, waitlistRows, sponsorRows] = await Promise.all([
        outpatientPhysicalTherapyService.cases(), outpatientPhysicalTherapyService.waitlist({from:'2000-01-01',to:'2100-12-31'}), outpatientPhysicalTherapyService.sponsors(),
      ]);
      setCases(caseRows);
      setWaitlist(waitlistRows);
      setSponsors(sponsorRows);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر تحميل قسم العلاج الطبيعي الخارجي', 'warn');
    } finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[]);

  const [identity, setIdentity] = useState('');
  const [phone, setPhone] = useState('');
  const [registry, setRegistry] = useState<CivilRegistryRecord|null>(null);
  const [patient, setPatient] = useState<OutpatientPTPatient|null>(null);
  const [registryBusy, setRegistryBusy] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [editingCaseId, setEditingCaseId] = useState<string|null>(null);
  const [caseDate, setCaseDate] = useState(today());
  const [patientGroup, setPatientGroup] = useState<'men'|'women_children'>('men');
  const [diagnosis, setDiagnosis] = useState('');
  /* v4.5.0 — التشخيص صار اختياراً من قائمة معتمدة بدل نص حر.
     عند اختيار Others تظهر خانة لكتابة التشخيص الجديد، وهو ما يُحفظ مع الحالة. */
  const [diagnosisList_, setDiagnosisList] = useState(() => diagnosisList(PT_DIAGNOSIS_STORAGE, DEFAULT_PT_DIAGNOSES));
  const [diagnosisChoice, setDiagnosisChoice] = useState('');
  const [otherDiagnosis, setOtherDiagnosis] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const refreshDiagnoses = () => setDiagnosisList(diagnosisList(PT_DIAGNOSIS_STORAGE, DEFAULT_PT_DIAGNOSES));
  const effectiveDiagnosis = diagnosisChoice === OTHER_DIAGNOSIS ? otherDiagnosis.trim() : diagnosisChoice;
  const [coverageId, setCoverageId] = useState('');
  const [treatmentDepartment, setTreatmentDepartment] = useState('الرجال');
  const [referralSource, setReferralSource] = useState('');
  const [treatingDoctor, setTreatingDoctor] = useState('');
  const [sessionFee, setSessionFee] = useState('');
  const [coverageCoversCost, setCoverageCoversCost] = useState(false);
  const [caseSaving, setCaseSaving] = useState(false);

  const lookupRegistry = async () => {
    if (!identity.trim() || !phone.trim()) { toast('أدخل رقم الهوية ورقم الجوال أولاً', 'warn'); return; }
    setRegistryBusy(true); setRegistry(null); setPatient(null);
    try {
      const record = await fetchCivilRegistry(identity.trim());
      setRegistry(record);
      const registrySponsor=sponsors.find(item=>item.code===record.coverageEntity);
      if(registrySponsor)setCoverageId(registrySponsor.id);
      const existing = await outpatientPhysicalTherapyService.findPatient(record.idNumber);
      if (existing.patient) {
        setPatient(existing.patient);
        setPhone(existing.patient.phone || phone);
        const guessed = existing.patient.gender === 'male' && ageOf(existing.patient.dob) >= 18 ? 'men' : 'women_children';
        setPatientGroup(guessed); setTreatmentDepartment(guessed === 'men' ? 'الرجال' : 'النساء والأطفال');
        toast('تم جلب بيانات المريض المسجلة وربطها بالسجل المدني');
      } else {
        const guessed = record.gender === 'male' && ageOf(record.dob) >= 18 ? 'men' : 'women_children';
        setPatientGroup(guessed); setTreatmentDepartment(guessed === 'men' ? 'الرجال' : 'النساء والأطفال');
        toast('تم جلب البيانات من السجل المدني');
      }
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر جلب بيانات السجل المدني', 'warn'); }
    finally { setRegistryBusy(false); }
  };

  const saveRegistration = async () => {
    if (!registry) { toast('اجلب بيانات السجل المدني أولاً', 'warn'); return; }
    if (patient) { toast('المريض مسجل مسبقاً وجاهز لتسجيل الحالة'); return; }
    try {
      const response = await hospitalApi.registerPatient({ identity_or_name: registry.idNumber, phone: phone.trim(), registry_data: registry });
      const registered = patientFromRegistered(response as any);
      setPatient(registered);
      toast(`تم تسجيل المريض برقم ${registered.medicalSerial}`);
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر تسجيل المريض', 'warn'); }
  };

  const clearCaseForm = (keepPatient = true) => {
    setEditingCaseId(null); setCaseDate(today()); setDiagnosis(''); setCoverageId(''); setMaritalStatus('');
    setReferralSource(''); setTreatingDoctor(''); setSessionFee(''); setCoverageCoversCost(false);
    if (!keepPatient) { setPatient(null); setRegistry(null); setIdentity(''); setPhone(''); }
  };

  const selectCase = (item:OutpatientPTCase) => {
    setEditingCaseId(item.id); setPatient(item.patient); setIdentity(item.patient.idNumber); setPhone(item.patient.phone); setRegistry({
      fullName:item.patient.fullName,idNumber:item.patient.idNumber,dob:item.patient.dob,gender:item.patient.gender,
      city:item.patient.city||'',area:item.patient.area||'',coverageEntity:item.patient.coverageEntity||'self',
    });
    setCaseDate(item.caseDate); setPatientGroup(item.patientGroup); setDiagnosis(item.diagnosis);
    { const known = diagnosisList(PT_DIAGNOSIS_STORAGE, DEFAULT_PT_DIAGNOSES).includes(item.diagnosis);
      setDiagnosisChoice(known ? item.diagnosis : OTHER_DIAGNOSIS);
      setOtherDiagnosis(known ? '' : item.diagnosis); } setCoverageId(item.coverage?.id||'');
    setMaritalStatus(item.maritalStatus||''); setTreatmentDepartment(item.treatmentDepartment||''); setReferralSource(item.referralSource||'');
    setTreatingDoctor(item.treatingDoctor||''); setCoverageCoversCost(Boolean(item.coverageCoversCost));
    setSessionFee(item.coverageCoversCost ? '' : (Number(item.sessionFee) > 0 ? String(item.sessionFee) : ''));
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const orderedCases = useMemo(()=>[...cases].sort((a,b)=>a.ptNumber.localeCompare(b.ptNumber)),[cases]);

  const saveCase = async () => {
    if (!patient) { toast('يجب تسجيل أو اختيار المريض أولاً', 'warn'); return; }
    if (!effectiveDiagnosis) { toast('التشخيص مطلوب', 'warn'); return; }
    const dto:SaveOutpatientPTCaseDTO = {
      patient_id:patient.id, patient_group:patientGroup, case_date:caseDate, diagnosis:effectiveDiagnosis, coverage_entity_id:coverageId||undefined,
      marital_status:maritalStatus||undefined,treatment_department:treatmentDepartment||undefined,referral_source:referralSource||undefined,
      treating_doctor:treatingDoctor||undefined,
      coverage_covers_cost:Boolean(coverageId)&&coverageCoversCost,
      ...(coverageCoversCost ? {session_fee:0} : (sessionFee.trim() ? {session_fee:Number(sessionFee)} : {})),
    };
    setCaseSaving(true);
    try {
      const saved = editingCaseId
        ? await outpatientPhysicalTherapyService.updateCase(editingCaseId,dto)
        : await outpatientPhysicalTherapyService.createCase(dto);
      await load(); selectCase(saved); toast(editingCaseId?'تم تحديث الحالة':'تم تسجيل الحالة وإنشاء رقم العلاج الطبيعي');
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر حفظ الحالة', 'warn'); }
    finally { setCaseSaving(false); }
  };

  const deleteCase = async (caseId:string) => {
    const target=cases.find(item=>item.id===caseId);
    if (!target || !confirm(`حذف ${target.patient.fullName} من قسم العلاج الطبيعي الخارجي مع جميع جلساته؟`)) return;
    try {
      await outpatientPhysicalTherapyService.removeCase(caseId);
      if(editingCaseId===caseId) clearCaseForm(false);
      await load();
      toast('تم حذف المريض من قائمة العلاج الطبيعي الخارجي');
    } catch(error){ toast(error instanceof Error?error.message:'تعذر حذف المريض من القسم','warn'); }
  };

  // Sessions
  const [sessionSearch,setSessionSearch]=useState('');
  const [sessionCaseId,setSessionCaseId]=useState('');
  const [sessionDate,setSessionDate]=useState(today());
  const [appointmentAt,setAppointmentAt]=useState(localDateTime());
  const [therapist,setTherapist]=useState('');
  const [specialist,setSpecialist]=useState('');
  const [treatments,setTreatments]=useState<string[]>([]);
  const [sessionNotes,setSessionNotes]=useState('');
  const [sessionSaving,setSessionSaving]=useState(false);
  const [editingSessionId,setEditingSessionId]=useState<string|null>(null);
  const [periodMode,setPeriodMode]=useState<'daily'|'monthly'|'yearly'|'custom'>('daily');
  const [periodAnchor,setPeriodAnchor]=useState(today());
  const [periodFrom,setPeriodFrom]=useState(today());
  const [periodTo,setPeriodTo]=useState(today());

  const visibleSessionCases=useMemo(()=>{
    const q=sessionSearch.trim().toLowerCase();
    return orderedCases.filter(item=>!q||`${item.patient.fullName} ${item.patient.idNumber} ${item.ptNumber}`.toLowerCase().includes(q));
  },[orderedCases,sessionSearch]);
  const sessionCase=cases.find(item=>item.id===sessionCaseId)||null;
  const toggleTreatment=(name:string)=>setTreatments(current=>current.includes(name)?current.filter(item=>item!==name):[...current,name]);
  const sessionRange=useMemo(()=>{
    if(periodMode==='custom')return [periodFrom,periodTo] as const;
    const d=new Date(`${periodAnchor}T12:00:00`);
    if(periodMode==='daily')return [periodAnchor,periodAnchor] as const;
    if(periodMode==='monthly'){
      const first=new Date(d.getFullYear(),d.getMonth(),1), last=new Date(d.getFullYear(),d.getMonth()+1,0);
      return [first.toISOString().slice(0,10),last.toISOString().slice(0,10)] as const;
    }
    return [`${d.getFullYear()}-01-01`,`${d.getFullYear()}-12-31`] as const;
  },[periodMode,periodAnchor,periodFrom,periodTo]);
  const filteredSessions=useMemo(()=>cases.flatMap(item=>item.sessions.map(session=>({caseFile:item,session})))
    .filter(row=>row.session.sessionDate>=sessionRange[0]&&row.session.sessionDate<=sessionRange[1])
    .filter(row=>!sessionSearch.trim()||`${row.caseFile.patient.fullName} ${row.caseFile.patient.idNumber} ${row.caseFile.ptNumber}`.toLowerCase().includes(sessionSearch.trim().toLowerCase()))
    .sort((a,b)=>b.session.sessionDate.localeCompare(a.session.sessionDate)||b.session.sessionNumber-a.session.sessionNumber),[cases,sessionRange,sessionSearch]);
  const resetSessionForm=()=>{
    setEditingSessionId(null);setSessionDate(today());setAppointmentAt(localDateTime());setTherapist('');setSpecialist('');setTreatments([]);setSessionNotes('');
  };
  const selectSession=(caseFile:OutpatientPTCase,session:OutpatientPTSession)=>{
    setSessionCaseId(caseFile.id);setEditingSessionId(session.id);setSessionDate(session.sessionDate);
    setAppointmentAt(toLocalDateTimeInput(session.appointmentAt));setTherapist(session.therapist||'');setSpecialist(session.specialist||'');
    setTreatments(session.treatments||[]);setSessionNotes(session.notes||'');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const saveSession=async()=>{
    if(!sessionCase){toast('اختر المريض أولاً','warn');return;}
    setSessionSaving(true);
    try{
      const dto={session_date:sessionDate,appointment_at:appointmentAt||undefined,therapist:therapist||undefined,specialist:specialist||undefined,treatments,notes:sessionNotes||undefined};
      if(editingSessionId) await outpatientPhysicalTherapyService.updateSession(editingSessionId,dto);
      else await outpatientPhysicalTherapyService.createSession(sessionCase.id,dto);
      resetSessionForm();await load();toast(editingSessionId?'تم تحديث الجلسة في ملف المريض':'تم حفظ الجلسة في ملف المريض');
    }catch(error){toast(error instanceof Error?error.message:'تعذر حفظ الجلسة','warn');}finally{setSessionSaving(false);}
  };
  const deleteSession=async()=>{
    if(!editingSessionId||!confirm('حذف الجلسة المحددة من ملف المريض؟'))return;
    try{await outpatientPhysicalTherapyService.removeSession(editingSessionId);resetSessionForm();await load();toast('تم حذف الجلسة المحددة');}
    catch(error){toast(error instanceof Error?error.message:'تعذر حذف الجلسة','warn');}
  };


  // Waiting list / appointments queue
  const [waitSearch,setWaitSearch]=useState('');
  const [waitDate,setWaitDate]=useState(today());
  const [waitGroup,setWaitGroup]=useState<'men'|'women_children'|'all'>('all');
  const [waitCaseId,setWaitCaseId]=useState('');
  const [waitName,setWaitName]=useState('');
  const [waitIdentity,setWaitIdentity]=useState('');
  const [waitPhone,setWaitPhone]=useState('');
  const [waitPatientGroup,setWaitPatientGroup]=useState<'men'|'women_children'>('men');
  const [waitAppointment,setWaitAppointment]=useState(localDateTime());
  const [waitQueue,setWaitQueue]=useState('');
  const [waitDailyLimit,setWaitDailyLimit]=useState('');
  const [waitUrgent,setWaitUrgent]=useState(false);
  const [waitNotes,setWaitNotes]=useState('');
  const [waitSaving,setWaitSaving]=useState(false);
  const selectedWaitCase=cases.find(item=>item.id===waitCaseId)||null;
  useEffect(()=>{
    if(!selectedWaitCase)return;
    setWaitName(selectedWaitCase.patient.fullName);
    setWaitIdentity(selectedWaitCase.patient.idNumber);
    setWaitPhone(selectedWaitCase.patient.phone||'');
    setWaitPatientGroup(selectedWaitCase.patientGroup);
  },[waitCaseId]);
  const waitRows=useMemo(()=>waitlist
    .filter(item=>item.requestedDate===waitDate)
    .filter(item=>waitGroup==='all'||item.patientGroup===waitGroup)
    .filter(item=>!waitSearch.trim()||`${item.fullName} ${item.idNumber||''} ${item.ptNumber||''}`.toLowerCase().includes(waitSearch.trim().toLowerCase()))
    .sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.queueNumber-b.queueNumber),[waitlist,waitDate,waitGroup,waitSearch]);
  const waitStats=useMemo(()=>{
    const rows=waitlist.filter(item=>item.requestedDate===waitDate).filter(item=>waitGroup==='all'||item.patientGroup===waitGroup);
    return {
      received:rows.filter(item=>item.status==='received'||item.status==='completed').length,
      waiting:rows.filter(item=>item.status==='waiting').length,
      completed:rows.filter(item=>item.status==='completed').length,
      urgent:rows.filter(item=>item.urgent&&item.status!=='completed'&&item.status!=='cancelled').length,
      men:rows.filter(item=>item.patientGroup==='men').length,
      womenChildren:rows.filter(item=>item.patientGroup==='women_children').length,
    };
  },[waitlist,waitDate,waitGroup]);
  const resetWaitForm=()=>{setWaitCaseId('');setWaitName('');setWaitIdentity('');setWaitPhone('');setWaitPatientGroup('men');setWaitAppointment(localDateTime());setWaitQueue('');setWaitDailyLimit('');setWaitUrgent(false);setWaitNotes('')};
  const saveWaitlist=async()=>{
    if(!waitName.trim()){toast('أدخل اسم المريض أو اختره من ملفات العلاج الطبيعي','warn');return;}
    const dto:SaveOutpatientPTWaitlistDTO={
      case_id:selectedWaitCase?.id,
      patient_id:selectedWaitCase?.patient.id,
      full_name:waitName.trim(),
      id_number:waitIdentity.trim()||undefined,
      phone:waitPhone.trim()||undefined,
      patient_group:waitPatientGroup,
      requested_date:waitDate,
      appointment_at:waitAppointment||undefined,
      queue_number:waitQueue?Number(waitQueue):undefined,
      daily_limit:waitDailyLimit?Number(waitDailyLimit):undefined,
      urgent:waitUrgent,
      notes:waitNotes.trim()||undefined,
      status:'waiting',
    };
    setWaitSaving(true);
    try{await outpatientPhysicalTherapyService.createWaitlist(dto);resetWaitForm();await load();toast('تمت إضافة الحالة إلى قائمة الانتظار')}
    catch(error){toast(error instanceof Error?error.message:'تعذر إضافة الحالة لقائمة الانتظار','warn')}
    finally{setWaitSaving(false)}
  };
  const updateWaitStatus=async(item:OutpatientPTWaitlistItem,status:OutpatientPTWaitlistItem['status'])=>{
    const label=status==='received'?'استقبال الحالة':status==='completed'?'إنهاء العلاج':status==='cancelled'?'إلغاء الدور':'تحديث الحالة';
    if(status==='cancelled'&&!confirm(`انت على وشك حذف/إلغاء هذا الدور، هل أنت متأكد من الحذف؟`))return;
    try{await outpatientPhysicalTherapyService.updateWaitlist(item.id,{status});await load();toast(`تم ${label}`)}
    catch(error){toast(error instanceof Error?error.message:'تعذر تحديث قائمة الانتظار','warn')}
  };
  const deleteWaitItem=async(item:OutpatientPTWaitlistItem)=>{
    if(!confirm(`انت على وشك حذف دور ${item.fullName} من قائمة الانتظار، هل أنت متأكد من الحذف؟`))return;
    try{await outpatientPhysicalTherapyService.removeWaitlist(item.id);await load();toast('تم حذف الدور من القائمة')}
    catch(error){toast(error instanceof Error?error.message:'تعذر حذف الدور','warn')}
  };
  const statusLabel=(status:OutpatientPTWaitlistItem['status'])=>status==='waiting'?'ينتظر':status==='received'?'تم الاستقبال':status==='completed'?'أنجز العلاج':'ملغى';

  // Reports
  const [reportTitle,setReportTitle]=useState('تقرير العلاج الطبيعي الخارجي');
  const [reportFrom,setReportFrom]=useState(today());
  const [reportTo,setReportTo]=useState(today());
  const [regFrom,setRegFrom]=useState('');
  const [regTo,setRegTo]=useState('');
  const [reportGender,setReportGender]=useState('');
  const [reportAddress,setReportAddress]=useState('');
  const [reportCoverage,setReportCoverage]=useState('');
  const [reportGroup,setReportGroup]=useState('');
  const [reportMarital,setReportMarital]=useState('');
  const [reportDiagnosis,setReportDiagnosis]=useState('');
  const [reportTherapist,setReportTherapist]=useState('');
  const [reportSpecialist,setReportSpecialist]=useState('');
  const [reportReferralSource,setReportReferralSource]=useState('');
  const [reportPatientNumber,setReportPatientNumber]=useState('');
  const [reportPatientIdentity,setReportPatientIdentity]=useState('');
  const [reportPatientName,setReportPatientName]=useState('');
  const [reportDiagnosis2,setReportDiagnosis2]=useState('');
  const [reportSort,setReportSort]=useState<'name'|'number'|'sessions'|'date'>('number');
  const [ageMin,setAgeMin]=useState('');
  const [ageMax,setAgeMax]=useState('');
  const [reportStatsModal,setReportStatsModal]=useState<'total'|'daily'|'monthly'|'range'|null>(null);
  const [dailyStatsDate,setDailyStatsDate]=useState(today());

  const reportRows=useMemo(()=>cases.map(item=>{
    const matchingSessions=item.sessions
      .filter(s=>(!reportFrom||s.sessionDate>=reportFrom)&&(!reportTo||s.sessionDate<=reportTo)&&(!reportTherapist||s.therapist===reportTherapist)&&(!reportSpecialist||s.specialist===reportSpecialist))
      .sort((a,b)=>a.sessionDate.localeCompare(b.sessionDate)||a.sessionNumber-b.sessionNumber);
    return {item,matchingSessions};
  }).filter(({item,matchingSessions})=>{
    const age=ageOf(item.patient.dob);
    const address=`${item.patient.city||''} ${item.patient.area||''}`.toLowerCase();
    const diagnosisMatch=(!reportDiagnosis&&!reportDiagnosis2)||Boolean((reportDiagnosis&&item.diagnosis.toLowerCase().includes(reportDiagnosis.toLowerCase()))||(reportDiagnosis2&&item.diagnosis.toLowerCase().includes(reportDiagnosis2.toLowerCase())));
    return (!reportFrom&&!reportTo&&!reportTherapist&&!reportSpecialist||matchingSessions.length>0)
      &&(!regFrom||item.caseDate>=regFrom)&&(!regTo||item.caseDate<=regTo)
      &&(!reportGender||item.patient.gender===reportGender)
      &&(!reportAddress||address.includes(reportAddress.toLowerCase()))
      &&(!reportCoverage||item.coverage?.id===reportCoverage)
      &&(!reportReferralSource||item.referralSource===reportReferralSource)
      &&(!reportGroup||item.patientGroup===reportGroup)
      &&(!reportMarital||item.maritalStatus===reportMarital)
      &&diagnosisMatch
      &&(!reportPatientNumber||item.ptNumber.includes(reportPatientNumber.trim()))
      &&(!reportPatientIdentity||item.patient.idNumber.includes(reportPatientIdentity.trim()))
      &&(!reportPatientName||item.patient.fullName.toLowerCase().includes(reportPatientName.trim().toLowerCase()))
      &&(!ageMin||age>=Number(ageMin))&&(!ageMax||age<=Number(ageMax));
  }).sort((a,b)=>reportSort==='name'?a.item.patient.fullName.localeCompare(b.item.patient.fullName,'ar'):reportSort==='sessions'?b.matchingSessions.length-a.matchingSessions.length:reportSort==='date'?b.item.caseDate.localeCompare(a.item.caseDate):a.item.ptNumber.localeCompare(b.item.ptNumber)),[cases,reportFrom,reportTo,regFrom,regTo,reportGender,reportAddress,reportCoverage,reportReferralSource,reportGroup,reportMarital,reportDiagnosis,reportDiagnosis2,reportTherapist,reportSpecialist,reportPatientNumber,reportPatientIdentity,reportPatientName,reportSort,ageMin,ageMax]);
  const reportSessionCount=reportRows.reduce((sum,row)=>sum+row.matchingSessions.length,0);
  const therapists=useMemo(()=>Array.from(new Set(cases.flatMap(item=>item.sessions.map(s=>s.therapist).filter(Boolean) as string[]))).sort(),[cases]);
  const specialists=useMemo(()=>Array.from(new Set(cases.flatMap(item=>item.sessions.map(s=>s.specialist).filter(Boolean) as string[]))).sort(),[cases]);
  const formatReportDate=(value:string)=>{const [year,month,day]=value.slice(0,10).split('-');return year&&month&&day?`${day}/${month}/${year}`:value||'—'};
  const reportExportData=useMemo<OutpatientPtReportExportData>(()=>({
    title:reportTitle||'تقرير العلاج الطبيعي الخارجي',
    dateFrom:formatReportDate(reportFrom),
    dateTo:formatReportDate(reportTo),
    department:reportGroup==='men'?'الرجال':reportGroup==='women_children'?'النساء والأطفال':'الكل',
    totalSessions:reportSessionCount,
    filename:`outpatient-physical-therapy-${reportFrom||today()}-${reportTo||today()}`,
    rows:reportRows.map(({item,matchingSessions},index)=>({
      seq:index+1,
      patientNumber:item.ptNumber,
      patientName:item.patient.fullName,
      sessions:matchingSessions.length,
      city:item.patient.city||'—',
      birthDate:formatReportDate(item.patient.dob),
      sessionsPeriod:matchingSessions.length?`${formatReportDate(matchingSessions[0].sessionDate)} إلى ${formatReportDate(matchingSessions[matchingSessions.length-1].sessionDate)}`:`${formatReportDate(reportFrom)} إلى ${formatReportDate(reportTo)}`,
      admissionDate:formatReportDate(item.caseDate),
      sessionFee:item.coverageCoversCost?`مغطى - ${item.coverage?.nameAr||'جهة التغطية'}`:(Number(item.sessionFee)>0?item.sessionFee:'—'),
    })),
  }),[reportTitle,reportFrom,reportTo,reportGroup,reportSessionCount,reportRows]);
  const exportPdf=async()=>{try{await downloadOutpatientPtPdf(reportExportData);toast('تم تصدير التقرير PDF بنفس تنسيق الطباعة')}catch(error){toast(error instanceof Error?error.message:'تعذر تصدير PDF','warn')}};
  const exportWord=async()=>{try{await downloadOutpatientPtWord(reportExportData);toast('تم تصدير التقرير Word بنفس تنسيق الطباعة')}catch(error){toast(error instanceof Error?error.message:'تعذر تصدير Word','warn')}};
  const exportExcel=async()=>{try{await downloadOutpatientPtExcel(reportExportData);toast('تم تصدير التقرير Excel بتنسيق مطابق للتقرير')}catch(error){toast(error instanceof Error?error.message:'تعذر تصدير Excel','warn')}};

  if(loading && !cases.length) return <><PageHeader crumb="العلاج الطبيعي" title="العلاج الطبيعي الخارجي" sub="جارٍ تحميل البيانات..."/><Panel><div className="pt-loading"><RefreshCw className="spin"/>جارٍ تحميل الملفات والجلسات...</div></Panel></>;

  return <div className="outpatient-pt-page" dir="rtl">
    <PageHeader crumb="العلاج الطبيعي" title="العلاج الطبيعي الخارجي" sub="تسجيل المرضى والحالات، إدارة الجلسات، والاستعلامات والتقارير من ملف موحد." actions={<Button className="btn-ghost" onClick={()=>void load()}><RefreshCw/>تحديث</Button>}/>
    <div className="pt-tabs glass">
      <button className={tab==='registration'?'active':''} onClick={()=>setTab('registration')}><UserRound/>التسجيل والحالات</button>
      <button className={tab==='sessions'?'active':''} onClick={()=>setTab('sessions')}><Activity/>الجلسات والمواعيد</button>
      <button className={tab==='waitlist'?'active':''} onClick={()=>setTab('waitlist')}><UsersRound/>قائمة الانتظار</button>
      <button className={tab==='reports'?'active':''} onClick={()=>setTab('reports')}><ClipboardList/>الاستعلامات والتقارير</button>
    </div>

    {tab==='registration'&&<>
      <div className="pt-registration-grid">
        <Panel className="pt-registration-card">
          <div className="panel-head"><h3><DatabaseZap/>شاشة تسجيل المريض</h3><Badge color={patient?'emerald':'violet'}>{patient?'مريض جاهز':'Civil API'}</Badge></div>
          <div className="pt-inline-note"><BadgeCheck/><span>أدخل رقم الهوية ورقم الجوال فقط، ثم يتم جلب الاسم والجنس وتاريخ الميلاد ومكان السكن من الـ API.</span></div>
          <div className="form-grid">
            <Field label="رقم الهوية"><input value={identity} onChange={e=>{setIdentity(e.target.value);setRegistry(null);setPatient(null)}} inputMode="numeric" dir="ltr"/></Field>
            <Field label="رقم الجوال"><input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" dir="ltr"/></Field>
            <Field label="الحالة الاجتماعية"><select value={maritalStatus} onChange={e=>setMaritalStatus(e.target.value)}><option value="">اختر الحالة</option>{maritalOptions.map(v=><option key={v}>{v}</option>)}</select></Field>
          </div>
          <FormActions><Button className="btn-primary" onClick={lookupRegistry} disabled={registryBusy}><Search/>{registryBusy?'جارٍ البحث...':'بحث وجلب البيانات'}</Button>{canUpdate&&<Button className="btn-ghost" onClick={saveRegistration} disabled={!registry||Boolean(patient)}><Save/>حفظ التسجيل</Button>}{canUpdate&&<Button className="btn-ghost" onClick={()=>clearCaseForm(false)}><UserPlus/>مريض جديد</Button>}</FormActions>
          {registry&&<div className="pt-demographics">
            <div><span>الاسم الشخصي</span><b>{registry.fullName}</b></div><div><span>رقم الهوية</span><b dir="ltr">{registry.idNumber}</b></div>
            <div><span>الجنس</span><b>{registry.gender==='male'?'ذكر':'أنثى'}</b></div><div><span>تاريخ الميلاد</span><b>{registry.dob}</b></div>
            <div><span>المدينة</span><b>{registry.city||'—'}</b></div><div><span>مكان السكن / المنطقة</span><b>{registry.area||'—'}</b></div>
            <div><span>رقم الجوال</span><b dir="ltr">{phone}</b></div><div><span>رقم المريض العام</span><b>{patient?.medicalSerial||'يُنشأ عند الحفظ'}</b></div>
          </div>}
        </Panel>

        <Panel className="pt-case-card">
          <div className="panel-head"><h3><HeartPulse/>تسجيل الحالة</h3>{editingCaseId&&<Badge color="amber">تعديل حالة</Badge>}</div>
          <div className="pt-case-identifiers"><span>رقم المريض <b>{patient?.medicalSerial||'—'}</b></span><span>رقم العلاج الطبيعي <b>{editingCaseId?cases.find(c=>c.id===editingCaseId)?.ptNumber:'يُنشأ تلقائياً'}</b></span></div>
          <div className="form-grid pt-case-fields">
            <Field label="تاريخ التسجيل"><input type="date" value={caseDate} onChange={e=>setCaseDate(e.target.value)}/></Field>
            <Field label="قسم العلاج"><select value={patientGroup} disabled={Boolean(editingCaseId)} onChange={e=>{const v=e.target.value as 'men'|'women_children';setPatientGroup(v);setTreatmentDepartment(v==='men'?'الرجال':'النساء والأطفال')}}><option value="men">الرجال</option><option value="women_children">النساء والأطفال</option></select></Field>
            <Field label="جهة التغطية"><div className="pt-select-add"><select value={coverageId} onChange={e=>{setCoverageId(e.target.value);if(!e.target.value)setCoverageCoversCost(false)}}><option value="">بدون / غير محدد</option>{sponsors.filter(s=>s.active).map(s=><option value={s.id} key={s.id}>{s.nameAr}</option>)}</select>{canUpdate&&<button type="button" onClick={()=>setCoverageModal(true)} title="إضافة جهة جديدة"><Plus/></button>}</div></Field>
            <Field label="جهة التحويل"><select value={referralSource} onChange={e=>setReferralSource(e.target.value)}><option value="">اختر</option>{referralOptions.map(v=><option key={v}>{v}</option>)}</select></Field>
            <Field label="طبيب محول"><input value={treatingDoctor} onChange={e=>setTreatingDoctor(e.target.value)}/></Field>
            <Field label="ثمن الجلسة (اختياري)"><input type="number" min="0" step="0.01" value={sessionFee} onChange={e=>setSessionFee(e.target.value)} disabled={coverageCoversCost} placeholder={coverageCoversCost?'مغطى بالكامل من جهة التغطية':'اتركه فارغاً إن لم يحدد'}/></Field>
            <div className={`pt-coverage-cost-option ${coverageId?'available':'disabled'}`}>
              <label><input type="checkbox" checked={coverageCoversCost} disabled={!coverageId} onChange={e=>{setCoverageCoversCost(e.target.checked);if(e.target.checked)setSessionFee('')}}/><span><b>جهة التغطية تغطي كامل التكاليف</b><small>{coverageId?`سيظهر التقرير أن ${sponsors.find(s=>s.id===coverageId)?.nameAr||'جهة التغطية'} غطّت الجلسات بالكامل.`:'اختر جهة تغطية أولاً لتفعيل هذا الخيار.'}</small></span></label>
            </div>
            <Field label="التشخيص" span={3}>
              <select value={diagnosisChoice} onChange={e=>setDiagnosisChoice(e.target.value)}>
                <option value="">— اختر التشخيص —</option>
                {diagnosisList_.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            {diagnosisChoice===OTHER_DIAGNOSIS&&<Field label="التشخيص الجديد" span={3}>
              <input value={otherDiagnosis} onChange={e=>setOtherDiagnosis(e.target.value)} placeholder="اكتب اسم التشخيص الجديد"/>
            </Field>}
            {canUpdate&&<Field label="إدارة قائمة التشخيصات" span={3}>
              <div className="diag-manage">
                <input value={newDiagnosis} onChange={e=>setNewDiagnosis(e.target.value)} placeholder="أضف تشخيصاً جديداً للقائمة"/>
                <Button className="btn-ghost btn-sm" onClick={()=>{
                  if(addDiagnosis(PT_DIAGNOSIS_STORAGE,DEFAULT_PT_DIAGNOSES,newDiagnosis)){refreshDiagnoses();setNewDiagnosis('');toast('تمت إضافة التشخيص للقائمة');}
                  else toast('التشخيص فارغ أو موجود مسبقاً','warn');
                }}><Plus/>إضافة</Button>
                {diagnosisChoice&&isCustomDiagnosis(DEFAULT_PT_DIAGNOSES,diagnosisChoice)&&<>
                  <Button className="btn-ghost btn-sm" onClick={()=>{
                    const next=window.prompt('الاسم الجديد للتشخيص',diagnosisChoice);
                    if(next&&renameDiagnosis(PT_DIAGNOSIS_STORAGE,DEFAULT_PT_DIAGNOSES,diagnosisChoice,next)){refreshDiagnoses();setDiagnosisChoice(next.trim());toast('تم تعديل التشخيص');}
                  }}>تعديل</Button>
                  <Button className="btn-danger btn-sm" onClick={()=>{
                    if(removeDiagnosis(PT_DIAGNOSIS_STORAGE,DEFAULT_PT_DIAGNOSES,diagnosisChoice)){refreshDiagnoses();setDiagnosisChoice('');toast('تم حذف التشخيص من القائمة');}
                  }}><Trash2/>حذف</Button>
                </>}
              </div>
              <small className="diag-hint">التشخيصات المعتمدة لا يمكن تعديلها أو حذفها؛ المضافة فقط.</small>
            </Field>}
          </div>
          <div className="pt-case-save-only">
            <Button className="btn-primary pt-save-case-btn" onClick={saveCase} disabled={!canUpdate||caseSaving||!patient||!effectiveDiagnosis}><Save/>{caseSaving?'جارٍ حفظ الحالة...':editingCaseId?'حفظ تعديل الحالة':'حفظ الحالة'}</Button>
          </div>
        </Panel>
      </div>

      <Panel className="pt-cases-table-panel">
        <div className="panel-head"><h3><UsersRound/>جميع المرضى المسجلين ضمن العلاج الطبيعي الخارجي</h3><Badge color="cyan">{cases.length}</Badge></div>
        {cases.length?<div className="table-wrap pt-wide-table"><table><thead><tr><th>م</th><th>رقم العلاج الطبيعي</th><th>رقم المريض</th><th>رقم الهوية</th><th>اسم المريض</th><th>القسم</th><th>تاريخ التسجيل</th><th>جهة التغطية</th><th className="pt-diagnosis-col">التشخيص</th><th>الجلسات</th><th>الإجراء</th></tr></thead><tbody>
          {orderedCases.map((item,index)=><tr key={item.id} className={editingCaseId===item.id?'selected-row':''}><td>{index+1}</td><td><b className="pt-number">{item.ptNumber}</b></td><td>{item.patient.medicalSerial}</td><td dir="ltr">{item.patient.idNumber}</td><td><b>{item.patient.fullName}</b></td><td>{item.patientGroup==='men'?'رجال':'نساء وأطفال'}</td><td>{item.caseDate}</td><td>{item.coverage?.nameAr||'—'}</td><td className="pt-diagnosis-cell">{item.diagnosis}</td><td><Badge color="emerald">{item.sessionCount}</Badge></td><td><div className="pt-row-actions"><Button className="btn-ghost btn-sm" onClick={()=>selectCase(item)}>فتح / تعديل</Button>{canUpdate&&<Button className="btn-danger btn-sm" onClick={()=>void deleteCase(item.id)}><Trash2/>حذف من القسم</Button>}</div></td></tr>)}
        </tbody></table></div>:<EmptyState title="لا توجد حالات مسجلة" sub="ابدأ بتسجيل المريض ثم احفظ أول حالة علاج طبيعي خارجي."/>}
      </Panel>
    </>}

    {tab==='sessions'&&<>
      <Panel className="pt-session-patients">
        <div className="panel-head"><h3><Search/>اختيار المريض للجلسة الجديدة</h3><Badge color="cyan">{visibleSessionCases.length}</Badge></div>
        <div className="pt-searchbar"><Search/><input value={sessionSearch} onChange={e=>setSessionSearch(e.target.value)} placeholder="ابحث باسم المريض أو رقم الهوية أو رقم العلاج الطبيعي"/></div>
        <div className="table-wrap"><table><thead><tr><th>رقم العلاج الطبيعي</th><th>رقم الهوية</th><th>اسم المريض</th><th>التشخيص</th><th>عدد الجلسات</th><th>اختيار</th></tr></thead><tbody>{visibleSessionCases.map(item=><tr key={item.id} className={sessionCaseId===item.id?'selected-row':''}><td><b className="pt-number">{item.ptNumber}</b></td><td dir="ltr">{item.patient.idNumber}</td><td>{item.patient.fullName}</td><td className="pt-diagnosis-cell">{item.diagnosis}</td><td>{item.sessionCount}</td><td><Button className="btn-primary btn-sm" onClick={()=>setSessionCaseId(item.id)}>فتح الملف</Button></td></tr>)}</tbody></table></div>
      </Panel>

      {sessionCase&&<Panel className="pt-session-editor">
        <div className="panel-head"><h3><Activity/>{editingSessionId?'تعديل جلسة':'جلسة جديدة'} — {sessionCase.patient.fullName}</h3><Badge color={editingSessionId?'amber':'emerald'}>الجلسة رقم {editingSessionId?(sessionCase.sessions.find(s=>s.id===editingSessionId)?.sessionNumber||'—'):sessionCase.sessionCount+1}</Badge></div>
        <div className="pt-session-summary"><span>رقم العلاج الطبيعي <b>{sessionCase.ptNumber}</b></span><span>رقم الهوية <b dir="ltr">{sessionCase.patient.idNumber}</b></span><span>التشخيص <b>{sessionCase.diagnosis}</b></span></div>
        <div className="pt-session-layout">
          <div className="pt-modalities"><h4>الخدمات / الإجراءات العلاجية</h4><div className="pt-modality-grid">{modalities.map(item=><label key={item}><input type="checkbox" checked={treatments.includes(item)} onChange={()=>toggleTreatment(item)}/><span>{item}</span></label>)}</div></div>
          <div className="pt-session-fields form-grid">
            <Field label="تاريخ الجلسة"><input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></Field>
            <Field label="موعد الجلسة"><input type="datetime-local" value={appointmentAt} onChange={e=>setAppointmentAt(e.target.value)}/></Field>
            <Field label="المعالج"><input value={therapist} onChange={e=>setTherapist(e.target.value)} placeholder="اسم المعالج"/></Field>
            <Field label="أخصائي علاج طبيعي"><input value={specialist} onChange={e=>setSpecialist(e.target.value)} placeholder="اسم الأخصائي"/></Field>
            <Field label="ملاحظات الجلسة" span={2}><textarea rows={6} value={sessionNotes} onChange={e=>setSessionNotes(e.target.value)}/></Field>
          </div>
        </div>
        <div className="pt-record-toolbar pt-session-toolbar" aria-label="أدوات الجلسة">
          <button type="button" onClick={resetSessionForm} disabled={!canUpdate}><FilePlus2/><span>جديد</span></button>
          <button type="button" onClick={saveSession} disabled={!canUpdate||sessionSaving}><Save/><span>{sessionSaving?'حفظ...':editingSessionId?'حفظ التعديل':'حفظ الجلسة'}</span></button>
          <button type="button" className="danger" onClick={deleteSession} disabled={!canUpdate||!editingSessionId}><Trash2/><span>حذف المحددة</span></button>
          <button type="button" onClick={()=>void load()}><RefreshCw/><span>تحديث</span></button>
          <button type="button" onClick={()=>{setTreatments([]);setSessionNotes('')}}><X/><span>مسح الحقول</span></button>
        </div>
      </Panel>}

      <Panel>
        <div className="panel-head"><h3><CalendarDays/>سجل الجلسات حسب الفترة</h3><Badge color="violet">{filteredSessions.length} جلسة</Badge></div>
        <div className="pt-period-filter">
          <Field label="طريقة العرض"><select value={periodMode} onChange={e=>setPeriodMode(e.target.value as any)}><option value="daily">يومي</option><option value="monthly">شهري</option><option value="yearly">سنوي</option><option value="custom">من تاريخ إلى تاريخ</option></select></Field>
          {periodMode!=='custom'?<Field label="التاريخ المرجعي"><input type="date" value={periodAnchor} onChange={e=>setPeriodAnchor(e.target.value)}/></Field>:<><Field label="من"><input type="date" value={periodFrom} onChange={e=>setPeriodFrom(e.target.value)}/></Field><Field label="إلى"><input type="date" value={periodTo} onChange={e=>setPeriodTo(e.target.value)}/></Field></>}
          <div className="pt-period-total"><span>الفترة</span><b>{sessionRange[0]} ← {sessionRange[1]}</b></div>
        </div>
        {filteredSessions.length?<div className="table-wrap pt-wide-table"><table><thead><tr><th>التاريخ</th><th>رقم الجلسة</th><th>رقم العلاج الطبيعي</th><th>اسم المريض</th><th>رقم الهوية</th><th>المعالج</th><th>الأخصائي</th><th>الموعد</th><th>الخدمات</th><th>ملاحظات</th><th>الإجراء</th></tr></thead><tbody>{filteredSessions.map(({caseFile,session})=><tr key={session.id} className={editingSessionId===session.id?'selected-row':''}><td>{session.sessionDate}</td><td><b>{session.sessionNumber}</b></td><td>{caseFile.ptNumber}</td><td>{caseFile.patient.fullName}</td><td dir="ltr">{caseFile.patient.idNumber}</td><td>{session.therapist||'—'}</td><td>{session.specialist||'—'}</td><td>{session.appointmentAt?new Date(session.appointmentAt).toLocaleString('ar-EG'):'—'}</td><td className="pt-services-cell">{session.treatments.join('، ')||'—'}</td><td>{session.notes||'—'}</td><td><Button className="btn-ghost btn-sm" onClick={()=>selectSession(caseFile,session)}>فتح / تعديل</Button></td></tr>)}</tbody></table></div>:<EmptyState title="لا توجد جلسات ضمن الفترة" sub="غيّر التاريخ أو طريقة العرض، أو سجّل جلسة جديدة."/>}
      </Panel>
    </>}


    {tab==='waitlist'&&<>
      <div className="pt-waitlist-grid">
        <Panel className="pt-waitlist-form">
          <div className="panel-head"><h3><UsersRound/>إضافة حالة إلى قائمة الانتظار</h3><Badge color="amber">دور تفاعلي</Badge></div>
          <Field label="اختيار مريض مسجل في العلاج الطبيعي"><select value={waitCaseId} onChange={e=>setWaitCaseId(e.target.value)}><option value="">إضافة يدوية أو اختيار مريض...</option>{orderedCases.map(item=><option key={item.id} value={item.id}>{item.ptNumber} · {item.patient.fullName} · {item.patient.idNumber}</option>)}</select></Field>
          <div className="form-grid">
            <Field label="تاريخ القائمة"><input type="date" value={waitDate} onChange={e=>setWaitDate(e.target.value)}/></Field>
            <Field label="موعد الحضور"><input type="datetime-local" value={waitAppointment} onChange={e=>setWaitAppointment(e.target.value)}/></Field>
            <Field label="اسم المريض"><input value={waitName} onChange={e=>setWaitName(e.target.value)} placeholder="اسم المريض"/></Field>
            <Field label="رقم الهوية"><input value={waitIdentity} onChange={e=>setWaitIdentity(e.target.value)} placeholder="رقم الهوية" dir="ltr"/></Field>
            <Field label="رقم الجوال"><input value={waitPhone} onChange={e=>setWaitPhone(e.target.value)} placeholder="رقم الجوال" dir="ltr"/></Field>
            <Field label="القسم"><select value={waitPatientGroup} onChange={e=>setWaitPatientGroup(e.target.value as 'men'|'women_children')}><option value="men">رجال</option><option value="women_children">نساء وأطفال</option></select></Field>
            <Field label="رقم الدور"><input type="number" min="1" value={waitQueue} onChange={e=>setWaitQueue(e.target.value)} placeholder="تلقائي عند تركه فارغاً"/></Field>
            <Field label="العدد المسموح لهذا اليوم"><input type="number" min="1" value={waitDailyLimit} onChange={e=>setWaitDailyLimit(e.target.value)} placeholder="حسب قرار رئيس القسم"/></Field>
            <Field label="ملاحظات" span={2}><textarea rows={3} value={waitNotes} onChange={e=>setWaitNotes(e.target.value)} placeholder="سبب الانتظار، تعليمات الموعد، أو ملاحظات رئيس القسم"/></Field>
          </div>
          <label className="pt-coverage-toggle pt-urgent-toggle"><input type="checkbox" checked={waitUrgent} onChange={e=>setWaitUrgent(e.target.checked)}/><span><b>استثناء / حالة مستعجلة</b><small>تظهر أعلى القائمة ولا تنتظر ترتيب الدور العادي.</small></span></label>
          <FormActions><Button className="btn-primary" onClick={()=>void saveWaitlist()} disabled={!canUpdate||waitSaving}><Save/>{waitSaving?'جارٍ الحفظ...':'حفظ في قائمة الانتظار'}</Button><Button className="btn-ghost" onClick={resetWaitForm}>تفريغ الحقول</Button></FormActions>
        </Panel>
        <Panel className="pt-waitlist-stats">
          <div className="panel-head"><h3><ClipboardList/>ملخص اليوم</h3><Badge color="cyan">{waitDate}</Badge></div>
          <div className="pt-stat-cards compact">
            <span><small>تم استقبالهم</small><b>{waitStats.received}</b></span>
            <span><small>ما زالوا ينتظرون</small><b>{waitStats.waiting}</b></span>
            <span><small>أنجزوا العلاج</small><b>{waitStats.completed}</b></span>
            <span><small>استثناءات مستعجلة</small><b>{waitStats.urgent}</b></span>
          </div>
          <div className="pt-stats-breakdown"><span><small>رجال</small><b>{waitStats.men}</b></span><span><small>نساء وأطفال</small><b>{waitStats.womenChildren}</b></span></div>
        </Panel>
      </div>
      <Panel>
        <div className="panel-head"><h3><CalendarDays/>قائمة الانتظار حسب اليوم</h3><Badge color="emerald">{waitRows.length}</Badge></div>
        <div className="pt-waitlist-toolbar"><Field label="اليوم"><input type="date" value={waitDate} onChange={e=>setWaitDate(e.target.value)}/></Field><Field label="القسم"><select value={waitGroup} onChange={e=>setWaitGroup(e.target.value as 'men'|'women_children'|'all')}><option value="all">الكل</option><option value="men">رجال</option><option value="women_children">نساء وأطفال</option></select></Field><Field label="بحث"><input value={waitSearch} onChange={e=>setWaitSearch(e.target.value)} placeholder="اسم، هوية، رقم علاج طبيعي"/></Field></div>
        {waitRows.length?<div className="table-wrap pt-wide-table"><table><thead><tr><th>الدور</th><th>الأولوية</th><th>المريض</th><th>رقم الهوية</th><th>القسم</th><th>الموعد</th><th>الحالة</th><th>ملاحظات</th><th>إجراءات</th></tr></thead><tbody>{waitRows.map(item=><tr key={item.id} className={item.urgent?'pt-urgent-row':''}><td><b>{item.queueNumber}</b></td><td>{item.urgent?<Badge color="rose">مستعجل</Badge>:<Badge>عادي</Badge>}</td><td><b>{item.fullName}</b><small>{item.ptNumber||'—'}</small></td><td dir="ltr">{item.idNumber||'—'}</td><td>{item.patientGroup==='men'?'رجال':'نساء وأطفال'}</td><td>{item.appointmentAt?new Date(item.appointmentAt).toLocaleString('ar-EG'):'—'}</td><td><Badge color={item.status==='completed'?'emerald':item.status==='received'?'cyan':item.status==='cancelled'?'rose':'amber'}>{statusLabel(item.status)}</Badge></td><td className="pt-diagnosis-cell">{item.notes||'—'}</td><td><div className="row-actions">{item.status==='waiting'&&<Button className="btn-primary btn-sm" onClick={()=>void updateWaitStatus(item,'received')}>استقبال</Button>}{item.status!=='completed'&&item.status!=='cancelled'&&<Button className="btn-ghost btn-sm" onClick={()=>void updateWaitStatus(item,'completed')}>أنجز العلاج</Button>}<Button className="btn-danger btn-sm" onClick={()=>void deleteWaitItem(item)}><Trash2/>حذف</Button></div></td></tr>)}</tbody></table></div>:<EmptyState title="لا توجد حالات انتظار لهذا اليوم" sub="أضف حالة جديدة أو غير التاريخ والقسم."/>}
      </Panel>
    </>}

    {tab==='reports'&&<>
      <div className="pt-report-grid">
        <Panel className="pt-report-builder">
          <div className="panel-head"><h3><ClipboardList/>استعلامات وتقارير العلاج الطبيعي</h3></div>
          <Field label="عنوان التقرير"><input value={reportTitle} onChange={e=>setReportTitle(e.target.value)}/></Field>
          <div className="pt-date-box"><b>تاريخ الجلسات</b><div><Field label="من"><input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)}/></Field><Field label="إلى"><input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)}/></Field></div><b>تاريخ التسجيل</b><div><Field label="من"><input type="date" value={regFrom} onChange={e=>setRegFrom(e.target.value)}/></Field><Field label="إلى"><input type="date" value={regTo} onChange={e=>setRegTo(e.target.value)}/></Field></div></div>
          <div className="form-grid pt-report-filters">
            <Field label="الجنس"><select value={reportGender} onChange={e=>setReportGender(e.target.value)}><option value="">الكل</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field>
            <Field label="العنوان"><input value={reportAddress} onChange={e=>setReportAddress(e.target.value)} placeholder="مدينة أو منطقة"/></Field>
            <Field label="جهة التغطية"><select value={reportCoverage} onChange={e=>setReportCoverage(e.target.value)}><option value="">الكل</option>{sponsors.map(s=><option value={s.id} key={s.id}>{s.nameAr}</option>)}</select></Field>
            <Field label="جهة التحويل"><select value={reportReferralSource} onChange={e=>setReportReferralSource(e.target.value)}><option value="">الكل</option>{referralOptions.map(v=><option key={v}>{v}</option>)}</select></Field>
            <Field label="القسم"><select value={reportGroup} onChange={e=>setReportGroup(e.target.value)}><option value="">الكل</option><option value="men">رجال</option><option value="women_children">نساء وأطفال</option></select></Field>
            <Field label="الحالة الاجتماعية"><select value={reportMarital} onChange={e=>setReportMarital(e.target.value)}><option value="">الكل</option>{maritalOptions.map(v=><option key={v}>{v}</option>)}</select></Field>
            <Field label="التشخيص"><input value={reportDiagnosis} onChange={e=>setReportDiagnosis(e.target.value)} placeholder="يحتوي على..."/></Field>
            <Field label="المعالج"><select value={reportTherapist} onChange={e=>setReportTherapist(e.target.value)}><option value="">الكل</option>{therapists.map(v=><option key={v}>{v}</option>)}</select></Field>
            <Field label="الأخصائي"><select value={reportSpecialist} onChange={e=>setReportSpecialist(e.target.value)}><option value="">الكل</option>{specialists.map(v=><option key={v}>{v}</option>)}</select></Field>
            <Field label="العمر من"><input type="number" min="0" max="120" value={ageMin} onChange={e=>setAgeMin(e.target.value)}/></Field>
            <Field label="العمر إلى"><input type="number" min="0" max="120" value={ageMax} onChange={e=>setAgeMax(e.target.value)}/></Field>
            <Field label="التشخيص يحتوي أيضاً على (أو)"><input value={reportDiagnosis2} onChange={e=>setReportDiagnosis2(e.target.value)} placeholder="عبارة تشخيص ثانية"/></Field>
            <Field label="السجلات مرتبة حسب"><select value={reportSort} onChange={e=>setReportSort(e.target.value as typeof reportSort)}><option value="number">رقم المريض</option><option value="name">اسم المريض</option><option value="sessions">عدد الجلسات</option><option value="date">تاريخ التسجيل</option></select></Field>
          </div>
          <div className="pt-specific-patient"><b>جلسات شخص بعينه</b><div><input value={reportPatientNumber} onChange={e=>setReportPatientNumber(e.target.value)} placeholder="رقم العلاج الطبيعي"/><input value={reportPatientIdentity} onChange={e=>setReportPatientIdentity(e.target.value)} placeholder="رقم الهوية"/><input value={reportPatientName} onChange={e=>setReportPatientName(e.target.value)} placeholder="اسم المريض"/></div></div>
          <div className="pt-report-actions-grid pt-report-actions-simple">
            <Button className="btn-primary" onClick={()=>setReportStatsModal('total')}><ClipboardList/>إجمالي الجلسات حسب المحددات</Button>
            <Button className="btn-ghost" onClick={()=>{setDailyStatsDate(reportFrom||today());setReportStatsModal('daily')}}><CalendarDays/>إحصائية يومية</Button>
            <Button className="btn-ghost" onClick={()=>setReportStatsModal('monthly')}><CalendarDays/>إحصائية شهرية</Button>
            <Button className="btn-ghost" onClick={()=>setReportStatsModal('range')}><ClipboardList/>حسب التاريخ المحدد</Button>
          </div>
          <FormActions>{canPrint&&<Button className="btn-primary" onClick={()=>void printCurrentView()}><Printer/>طباعة التقرير</Button>}{canExport&&<><Button className="btn-ghost" onClick={()=>void exportPdf()}><FileText/>تصدير PDF</Button><Button className="btn-ghost" onClick={()=>void exportWord()}><Download/>تصدير Word</Button><Button className="btn-ghost" onClick={()=>void exportExcel()}><FileSpreadsheet/>تصدير Excel</Button></>}</FormActions>
        </Panel>
        <Panel className="pt-report-preview">
          <div className="panel-head"><h3>{reportTitle}</h3><Badge color="emerald">{reportRows.length}</Badge></div>
          <div className="table-wrap"><table><thead><tr><th>م</th><th>رقم المريض</th><th>اسم المريض</th><th>عدد الجلسات</th><th>المدينة</th><th>ت. ميلاد</th><th>فترة الجلسات</th><th>تاريخ الدخول</th><th>ثمن الجلسة</th><th>التشخيص</th></tr></thead><tbody>{reportRows.map(({item,matchingSessions},index)=><tr key={item.id}><td>{index+1}</td><td>{item.ptNumber}</td><td>{item.patient.fullName}</td><td>{matchingSessions.length}</td><td>{item.patient.city||'—'}</td><td>{item.patient.dob}</td><td>{matchingSessions.length?`${matchingSessions[0].sessionDate} إلى ${matchingSessions[matchingSessions.length-1].sessionDate}`:`${reportFrom} إلى ${reportTo}`}</td><td>{item.caseDate}</td><td>{item.coverageCoversCost?`مغطى - ${item.coverage?.nameAr||'جهة التغطية'}`:(Number(item.sessionFee)>0?item.sessionFee:'—')}</td><td className="pt-diagnosis-cell">{item.diagnosis}</td></tr>)}</tbody></table></div>
        </Panel>
      </div>
      <section className="outpatient-pt-print-only">
        <div className="pt-print-graybar"/>
        <table><thead><tr><th>م.</th><th>رقم المريض</th><th>اسم المريض</th><th>عدد الجلسات</th><th>المدينة</th><th>ت. ميلاد</th><th>فترة الجلسات</th><th>تاريخ الدخول</th><th>ثمن الجلسة</th></tr></thead><tbody>{reportRows.map(({item,matchingSessions},index)=><tr key={item.id}><td>{index+1}</td><td>{item.ptNumber}</td><td>{item.patient.fullName}</td><td>{matchingSessions.length}</td><td>{item.patient.city||'—'}</td><td>{formatReportDate(item.patient.dob)}</td><td>{matchingSessions.length?`${formatReportDate(matchingSessions[0].sessionDate)} إلى ${formatReportDate(matchingSessions[matchingSessions.length-1].sessionDate)}`:`${formatReportDate(reportFrom)} إلى ${formatReportDate(reportTo)}`}</td><td>{formatReportDate(item.caseDate)}</td><td>{item.coverageCoversCost?`مغطى - ${item.coverage?.nameAr||'جهة التغطية'}`:(Number(item.sessionFee)>0?item.sessionFee:'—')}</td></tr>)}</tbody></table>
      </section>
    </>}
    {reportStatsModal&&<Modal title={<><ClipboardList/>{reportStatsModal==='total'?'إجمالي الجلسات حسب المحددات':reportStatsModal==='daily'?'إحصائية يومية':reportStatsModal==='monthly'?'إحصائية شهرية':'إحصائية حسب التاريخ المحدد'}</>} onClose={()=>setReportStatsModal(null)} className="pt-stats-modal">
      <div className="pt-stats-content">
        {reportStatsModal==='daily'&&<Field label="اختر اليوم"><input type="date" value={dailyStatsDate} onChange={e=>setDailyStatsDate(e.target.value)}/></Field>}
        {(()=>{
          const monthStart=reportFrom ? reportFrom.slice(0,7)+'-01' : today().slice(0,7)+'-01';
          const monthLastDate=new Date(Number(monthStart.slice(0,4)), Number(monthStart.slice(5,7)), 0).toISOString().slice(0,10);
          const fromDate=reportStatsModal==='daily'?dailyStatsDate:reportStatsModal==='monthly'?monthStart:reportFrom;
          const toDate=reportStatsModal==='daily'?dailyStatsDate:reportStatsModal==='monthly'?monthLastDate:reportTo;
          const rows=reportRows.map(({item})=>({item,sessions:item.sessions.filter(session=>(!fromDate||session.sessionDate>=fromDate)&&(!toDate||session.sessionDate<=toDate)&&(!reportTherapist||session.therapist===reportTherapist)&&(!reportSpecialist||session.specialist===reportSpecialist))})).filter(row=>row.sessions.length>0);
          const total=rows.reduce((sum,row)=>sum+row.sessions.length,0);
          const men=rows.filter(row=>row.item.patientGroup==='men').reduce((sum,row)=>sum+row.sessions.length,0);
          const womenChildren=rows.filter(row=>row.item.patientGroup==='women_children').reduce((sum,row)=>sum+row.sessions.length,0);
          const male=rows.filter(row=>row.item.patient.gender==='male').reduce((sum,row)=>sum+row.sessions.length,0);
          const female=rows.filter(row=>row.item.patient.gender==='female').reduce((sum,row)=>sum+row.sessions.length,0);
          return <>
            <div className="pt-stats-hero"><span>عدد الجلسات ضمن المحددات الحالية</span><b>{total}</b><small>{formatReportDate(fromDate)} إلى {formatReportDate(toDate)} · {reportGroup==='men'?'قسم الرجال':reportGroup==='women_children'?'قسم النساء والأطفال':'كل الأقسام'} · العمر {ageMin||'0'} - {ageMax||'120+'}</small></div>
            <div className="pt-stats-breakdown"><span><small>عدد المرضى</small><b>{rows.length}</b></span><span><small>جلسات الرجال</small><b>{men}</b></span><span><small>جلسات النساء والأطفال</small><b>{womenChildren}</b></span><span><small>ذكور</small><b>{male}</b></span><span><small>إناث</small><b>{female}</b></span></div>
            <div className="pt-stats-daily-list">{rows.length?rows.map(({item,sessions})=><div key={item.id}><span><b>{item.patient.fullName}</b><small>{item.ptNumber} · {item.patientGroup==='men'?'رجال':'نساء وأطفال'} · العمر {ageOf(item.patient.dob)}</small></span><strong>{sessions.length}</strong></div>):<p>لا توجد جلسات مطابقة للمحددات الحالية.</p>}</div>
          </>})()}
      </div>
      <FormActions><Button className="btn-primary" onClick={()=>setReportStatsModal(null)}>إغلاق</Button></FormActions>
    </Modal>}
    {coverageModal&&<CoverageModal onClose={()=>setCoverageModal(false)} onSaved={item=>{setSponsors(current=>[...current,item]);setCoverageId(item.id)}}/>}
  </div>;
}
