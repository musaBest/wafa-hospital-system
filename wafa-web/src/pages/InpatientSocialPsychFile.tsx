import { useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  HeartHandshake,
  IdCard,
  ImagePlus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Panel } from '../components/ui';
import { useHospital } from '../context/HospitalContext';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { ReportExportModal } from './InpatientRehabFile';
import type { Admission, Patient } from '../types';
import type { InpatientPrintableReport } from '../utils/inpatientReportExport';

const today = () => new Date().toISOString().slice(0, 10);

type SocialForm = {
  housingNature: string; socialSituation: string; familyMembers: string; siblingOrder: string; familyProblems: string; supportPerson: string;
  incomeSource: string; incomeLevel: string; incomeAdequacy: string; debts: string; relativesRelation: string; friendsRelation: string;
  socialParticipation: string; isolationDifficulties: string; chronicDiseases: string; medications: string; disabilities: string;
  mainProblems: string; needs: string; psychCounseling: string; familyCounseling: string; socialSupport: string; referral: string;
  periodicFollowup: string; specialistName: string; signature: string; reportDate: string; imageDataUrl: string; imageCaption: string;
};
const emptyForm: SocialForm = {
  housingNature: '', socialSituation: '', familyMembers: '', siblingOrder: '', familyProblems: '', supportPerson: '', incomeSource: '', incomeLevel: '', incomeAdequacy: '', debts: '',
  relativesRelation: '', friendsRelation: '', socialParticipation: '', isolationDifficulties: '', chronicDiseases: '', medications: '', disabilities: '', mainProblems: '', needs: '',
  psychCounseling: '', familyCounseling: '', socialSupport: '', referral: '', periodicFollowup: '', specialistName: '', signature: '', reportDate: today(), imageDataUrl: '', imageCaption: '',
};

function PersonalStrip({ patient, admission }: { patient: Patient; admission: Admission }) {
  return <div className="social-personal-strip glass">
    <div><UserRound /><span><small>الاسم</small><b>{patient.fullName}</b></span></div>
    <div><IdCard /><span><small>رقم الهوية</small><b dir="ltr">{patient.idNumber}</b></span></div>
    <div><span><small>تاريخ الميلاد</small><b>{patient.dob}</b></span></div>
    <div><span><small>الجنس</small><b>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</b></span></div>
    <div><span><small>الحالة الاجتماعية</small><b>{admission.maritalStatus || '—'}</b></span></div>
    <div><span><small>عنوان السكن</small><b>{admission.address || [patient.city, patient.area].filter(Boolean).join(' - ') || '—'}</b></span></div>
  </div>;
}

export function InpatientSocialPsychFile() {
  const { patients, admissions, sponsors, addInpatientReport } = useHospital();
  const { user, can } = useAuth();
  const { toast } = useUi();
  const canUpdate = can('inpatient_social.update');
  const canExport = can('inpatient_social.print') || can('inpatient_social.export');
  const [identity, setIdentity] = useState('');
  const [admissionId, setAdmissionId] = useState('');
  const [form, setForm] = useState<SocialForm>(emptyForm);
  const [exporting, setExporting] = useState(false);
  const admission = admissions.find(a => a.id === admissionId);
  const patient = admission ? patients.find(p => p.id === admission.patientId) : undefined;
  const coverage = admission ? (sponsors.find(s => s.id === admission.coverageEntity)?.nameAr || admission.coverageEntity || '—') : '—';
  const savedReports = useMemo(() => admission ? (admission.reports || []).filter(r => r.type === 'social_psych').slice().sort((a, b) => b.date.localeCompare(a.date)) : [], [admission]);

  const lookup = () => {
    const id = identity.replace(/\s/g, '');
    const p = patients.find(x => x.idNumber === id);
    if (!p) { toast('رقم الهوية غير موجود في سجل المرضى', 'warn'); setAdmissionId(''); return; }
    const a = admissions.filter(x => x.patientId === p.id).slice().sort((x, y) => y.admissionDate.localeCompare(x.admissionDate))[0];
    if (!a) { toast('المريض موجود ولكن لا يوجد له ملف مبيت', 'warn'); setAdmissionId(''); return; }
    setAdmissionId(a.id); setIdentity(p.idNumber);
    const last = (a.reports || []).filter(r => r.type === 'social_psych').slice().sort((x, y) => y.date.localeCompare(x.date))[0];
    if (last?.metadata) setForm({ ...emptyForm, ...last.metadata, reportDate: last.date || today() } as SocialForm);
    else setForm({ ...emptyForm, specialistName: user?.displayName || '', reportDate: today() });
    toast('تم فتح ملف الحالة الاجتماعية والنفسية');
  };
  const set = (key: keyof SocialForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  const readAttachment = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('اختر ملف صورة فقط', 'warn'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('حجم الصورة كبير. اختر صورة أقل من 5MB لتظهر داخل التقرير بسرعة', 'warn'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(current => ({ ...current, imageDataUrl: String(reader.result || ''), imageCaption: current.imageCaption || 'صورة مرفقة مع تقرير الخدمة الاجتماعية' }));
    reader.onerror = () => toast('تعذر قراءة الصورة المرفقة', 'warn');
    reader.readAsDataURL(file);
  };

  const sections: InpatientPrintableReport['sections'] = patient && admission ? [
    { heading: 'الوضع الاجتماعي', body: form.socialSituation || '—' },
    { heading: 'الأسرة والسكن', body: `طبيعة السكن: ${form.housingNature || '—'}\nعدد أفراد الأسرة: ${form.familyMembers || '—'}\nترتيب المريض بين إخوته: ${form.siblingOrder || '—'}\nمشكلات أسرية: ${form.familyProblems || '—'}\nالشخص الأكثر دعماً: ${form.supportPerson || '—'}` },
    { heading: 'الوضع الاقتصادي', body: `مصدر دخل الأسرة: ${form.incomeSource || '—'}\nمستوى الدخل: ${form.incomeLevel || '—'}\nمدى كفاية الدخل لتلبية الاحتياجات: ${form.incomeAdequacy || '—'}\nديون والتزامات: ${form.debts || '—'}` },
    { heading: 'العلاقات الاجتماعية', body: `العلاقات مع الأقارب: ${form.relativesRelation || '—'}\nالعلاقات مع الأصدقاء: ${form.friendsRelation || '—'}\nالمشاركة في الأنشطة الاجتماعية: ${form.socialParticipation || '—'}\nعزلة اجتماعية أو صعوبات في التواصل: ${form.isolationDifficulties || '—'}` },
    { heading: 'الحالة الصحية', body: `الأمراض المزمنة: ${form.chronicDiseases || '—'}\nالأدوية المستخدمة: ${form.medications || '—'}\nالإعاقات أو المشكلات الصحية: ${form.disabilities || '—'}\nتاريخ الدخول للمستشفى: ${admission.admissionDate}` },
    { heading: 'المشكلات والاحتياجات', body: `المشكلات الرئيسية: ${form.mainProblems || '—'}\nالاحتياجات: ${form.needs || '—'}` },
    { heading: 'التدخلات المقترحة', body: `الإرشاد النفسي: ${form.psychCounseling || '—'}\nالإرشاد الأسري: ${form.familyCounseling || '—'}\nالدعم الاجتماعي: ${form.socialSupport || '—'}\nالإحالة إلى الجهات المختصة عند الحاجة: ${form.referral || '—'}\nالمتابعة الدورية: ${form.periodicFollowup || '—'}` },
  ] : [];
  const attachments = useMemo<InpatientPrintableReport['attachments']>(() => form.imageDataUrl ? [{ label: form.imageCaption || 'صورة مرفقة مع تقرير الخدمة الاجتماعية', dataUrl: form.imageDataUrl }] : [], [form.imageDataUrl, form.imageCaption]);

  const save = () => {
    if (!canUpdate) { toast('هذا الحساب للعرض فقط ولا يملك صلاحية تعديل دراسة الحالة', 'warn'); return; }
    if (!admission || !patient) { toast('ابحث عن مريض مبيت أولاً', 'warn'); return; }
    addInpatientReport(admission.id, {
      date: form.reportDate || today(), type: 'social_psych', title: 'دراسة الحالة الاجتماعية والنفسية', summary: `تقييم اجتماعي ونفسي للمريض ${patient.fullName}`,
      author: user?.displayName || 'الأخصائي الاجتماعي والنفسي', content: form.mainProblems, note: form.periodicFollowup, metadata: { ...form },
    });
    toast('تم حفظ دراسة الحالة في ملف المبيت');
  };

  return <div className="social-file-shell">
    <section className="social-hero glass-strong"><div><span><Sparkles />الأخصائي الاجتماعي والنفسي</span><h2>دراسة الحالة الاجتماعية والنفسية<br /><em>من الهوية إلى خطة التدخل.</em></h2><p>البيانات الشخصية تُستدعى من ملف المبيت، ويمكن إرفاق صورة لتظهر داخل التقرير المطبوع.</p></div><div className="social-hero-mark"><HeartHandshake /><b>{savedReports.length}</b><span>تقارير للحالة</span></div></section>
    <Panel className="social-lookup-panel"><div className="panel-head"><h3><Search />فتح ملف بالهوية</h3><Badge color="cyan">مرتبط بالإداري</Badge></div><div className="social-lookup"><label><IdCard /><input dir="ltr" value={identity} onChange={e => setIdentity(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }} placeholder="رقم هوية المريض" /></label><Button className="btn-primary" type="button" onClick={lookup}><Search />فتح الملف</Button></div>{patient && admission && <PersonalStrip patient={patient} admission={admission} />}</Panel>
    {!patient || !admission ? <Panel><EmptyState title="أدخل رقم هوية حالة مبيت" sub="ستظهر البيانات الشخصية تلقائياً بعد فتح ملف المريض." /></Panel> : <>
      <Panel className="social-assessment-panel"><div className="panel-head"><h3><UsersRound />دراسة الحالة الاجتماعية والنفسية</h3><Badge color="violet">{patient.medicalSerial}</Badge></div>
        <div className="social-form-section"><h4>الوضع الاجتماعي والأسرة</h4><div className="form-grid"><Field label="طبيعة السكن"><input value={form.housingNature} onChange={e => set('housingNature', e.target.value)} /></Field><Field label="عدد أفراد الأسرة"><input value={form.familyMembers} onChange={e => set('familyMembers', e.target.value)} /></Field><Field label="ترتيب المريض بين إخوته"><input value={form.siblingOrder} onChange={e => set('siblingOrder', e.target.value)} /></Field><Field label="الوضع الاجتماعي" span={3}><textarea value={form.socialSituation} onChange={e => set('socialSituation', e.target.value)} /></Field><Field label="مشكلات أسرية إن وجدت" span={2}><textarea value={form.familyProblems} onChange={e => set('familyProblems', e.target.value)} /></Field><Field label="الشخص الأكثر دعماً للمريض"><input value={form.supportPerson} onChange={e => set('supportPerson', e.target.value)} /></Field></div></div>
        <div className="social-form-section"><h4>الوضع الاقتصادي</h4><div className="form-grid"><Field label="مصدر دخل الأسرة"><input value={form.incomeSource} onChange={e => set('incomeSource', e.target.value)} /></Field><Field label="مستوى الدخل"><input value={form.incomeLevel} onChange={e => set('incomeLevel', e.target.value)} /></Field><Field label="مدى كفاية الدخل"><input value={form.incomeAdequacy} onChange={e => set('incomeAdequacy', e.target.value)} /></Field><Field label="ديون والتزامات" span={3}><textarea value={form.debts} onChange={e => set('debts', e.target.value)} /></Field></div></div>
        <div className="social-form-section"><h4>العلاقات الاجتماعية</h4><div className="form-grid"><Field label="العلاقات مع الأقارب"><textarea value={form.relativesRelation} onChange={e => set('relativesRelation', e.target.value)} /></Field><Field label="العلاقات مع الأصدقاء"><textarea value={form.friendsRelation} onChange={e => set('friendsRelation', e.target.value)} /></Field><Field label="المشاركة في الأنشطة الاجتماعية"><textarea value={form.socialParticipation} onChange={e => set('socialParticipation', e.target.value)} /></Field><Field label="عزلة اجتماعية أو صعوبات في التواصل" span={3}><textarea value={form.isolationDifficulties} onChange={e => set('isolationDifficulties', e.target.value)} /></Field></div></div>
        <div className="social-form-section"><h4>الحالة الصحية</h4><div className="form-grid"><Field label="الأمراض المزمنة"><textarea value={form.chronicDiseases} onChange={e => set('chronicDiseases', e.target.value)} /></Field><Field label="الأدوية المستخدمة"><textarea value={form.medications} onChange={e => set('medications', e.target.value)} /></Field><Field label="الإعاقات أو المشكلات الصحية"><textarea value={form.disabilities} onChange={e => set('disabilities', e.target.value)} /></Field><Field label="تاريخ الدخول للمستشفى"><input value={admission.admissionDate} readOnly /></Field></div></div>
        <div className="social-form-section"><h4>المشكلات والاحتياجات</h4><div className="form-grid"><Field label="المشكلات الرئيسية" span={3}><textarea value={form.mainProblems} onChange={e => set('mainProblems', e.target.value)} /></Field><Field label="الاحتياجات" span={3}><textarea value={form.needs} onChange={e => set('needs', e.target.value)} /></Field></div></div>
        <div className="social-form-section"><h4>التدخلات المقترحة</h4><div className="form-grid"><Field label="الإرشاد النفسي"><textarea value={form.psychCounseling} onChange={e => set('psychCounseling', e.target.value)} /></Field><Field label="الإرشاد الأسري"><textarea value={form.familyCounseling} onChange={e => set('familyCounseling', e.target.value)} /></Field><Field label="الدعم الاجتماعي"><textarea value={form.socialSupport} onChange={e => set('socialSupport', e.target.value)} /></Field><Field label="الإحالة إلى جهات مختصة" span={2}><textarea value={form.referral} onChange={e => set('referral', e.target.value)} /></Field><Field label="المتابعة الدورية"><textarea value={form.periodicFollowup} onChange={e => set('periodicFollowup', e.target.value)} /></Field></div></div>
        <div className="social-form-section social-attachment-section"><h4>مرفق مصور للتقرير</h4><div className="form-grid"><Field label="إرفاق صورة" span={2}><label className="social-image-picker"><ImagePlus /><span>{form.imageDataUrl ? 'تغيير الصورة المرفقة' : 'اختر صورة لتظهر داخل التقرير'}</span><input type="file" accept="image/*" onChange={e => readAttachment(e.target.files?.[0])} /></label></Field><Field label="وصف الصورة"><input value={form.imageCaption} onChange={e => set('imageCaption', e.target.value)} placeholder="مثال: صورة الحالة الاجتماعية / المرفق" /></Field></div>{form.imageDataUrl && <div className="social-image-preview"><img src={form.imageDataUrl} alt={form.imageCaption || 'صورة مرفقة'} /><button type="button" onClick={() => setForm(current => ({ ...current, imageDataUrl: '', imageCaption: '' }))}><X />إزالة الصورة</button></div>}</div>
        <div className="form-grid social-signature-grid"><Field label="اسم الأخصائي"><input value={form.specialistName} onChange={e => set('specialistName', e.target.value)} /></Field><Field label="التوقيع"><input value={form.signature} onChange={e => set('signature', e.target.value)} /></Field><Field label="التاريخ واليوم"><input type="date" value={form.reportDate} onChange={e => set('reportDate', e.target.value)} /></Field></div>
        <FormActions>{canUpdate && <Button className="btn-primary" type="button" onClick={save}><Check />حفظ الدراسة</Button>}{canExport && <Button className="btn-ghost" type="button" onClick={() => setExporting(true)}><Download />طباعة / تصدير</Button>}</FormActions>
      </Panel>
      {savedReports.length > 0 && <Panel className="social-history-panel"><div className="panel-head"><h3><FileText />الدراسات السابقة</h3><Badge color="emerald">{savedReports.length}</Badge></div><div className="social-history-list">{savedReports.map(r => <button type="button" key={r.id} onClick={() => { if (r.metadata) setForm({ ...emptyForm, ...r.metadata, reportDate: r.date } as SocialForm); }}><ShieldCheck /><span><b>{r.date}</b><small>{r.author}</small></span><em>فتح</em></button>)}</div></Panel>}
      {exporting && <ReportExportModal title="دراسة الحالة الاجتماعية والنفسية" date={form.reportDate} patient={patient} admission={admission} coverage={coverage} sections={sections} signature={form.specialistName || user?.displayName || 'الأخصائي الاجتماعي والنفسي'} secondarySignature={form.signature} attachments={attachments} onClose={() => setExporting(false)} />}
    </>}
  </div>;
}
