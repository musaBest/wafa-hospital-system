import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, Download, Edit3, HeartHandshake, ListChecks, RefreshCw, Search, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, PageHeader, Panel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { downloadXlsx } from '../utils/exportXlsx';
import { hospitalApi, type ElderlyLookupRecord, type ElderlyResidentResource, type ElderlyResidentStatus, type SaveElderlyResidentDTO, type SaveElderlyStatusDTO } from '../services/hospitalApi.service';

const fixedAddress = 'مركز الوفاء لرعاية المسنين والمسنات';
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const disabilityDefaults = ['ذهنية', 'حركية', 'سمعية', 'نفسية', 'بصرية', 'كلية'];
const isEngineerMohammed = (user?: { id?: string; username?: string } | null) => Boolean(user && (user.id === '00000000-0000-4000-8000-000000000004' || user.username?.toLowerCase().trim() === 'eng.mohammed_moqbil'));

type Tab = 'form' | 'list' | 'stats';
type ResidentForm = {
  patientId: string;
  fullName: string;
  medicalSerial: string;
  idNumber: string;
  dob: string;
  gender: '' | 'male' | 'female';
  maritalStatus: string;
  originalTown: string;
  housingType: '' | 'owned' | 'rented';
  admissionDate: string;
  receivesAssistance: boolean;
  assistanceType: string;
  assistanceDetails: string;
  disabilities: string[];
  customDisability: string;
  isDeceased: boolean;
  exitDate: string;
  healthStatusDetails: string;
  employmentStatus: 'working' | 'not_working';
  workType: string;
  medications: string[];
  assistiveTools: string[];
  belongings: string;
  notes: string;
};

type StatusDraft = {
  row: ElderlyResidentResource;
  status: ElderlyResidentStatus;
  finalExitDate: string;
  temporaryLeaveFrom: string;
  temporaryLeaveTo: string;
  temporaryLeaveReason: string;
  exitDate: string;
  notes: string;
};

const emptyForm = (): ResidentForm => ({
  patientId: '', fullName: '', medicalSerial: '', idNumber: '', dob: '', gender: '', maritalStatus: '', originalTown: '', housingType: '', admissionDate: today(),
  receivesAssistance: false, assistanceType: '', assistanceDetails: '', disabilities: [], customDisability: '', isDeceased: false, exitDate: '', healthStatusDetails: '',
  employmentStatus: 'not_working', workType: '', medications: [''], assistiveTools: [''], belongings: '', notes: '',
});

const labels = {
  gender: (v?: string | null) => v === 'male' ? 'ذكر' : v === 'female' ? 'أنثى' : '—',
  housing: (v?: string | null) => v === 'owned' ? 'ملك' : v === 'rented' ? 'إيجار' : '—',
  employment: (v?: string | null) => v === 'working' ? 'يعمل' : 'لا يعمل',
  status: (v?: string | null) => v === 'temporary_leave' ? 'بإذن مؤقت / زيارة' : v === 'final_exit' ? 'خروج نهائي' : v === 'deceased' ? 'وفاة' : 'مقيم حالياً',
};

const countBy = (rows: ElderlyResidentResource[], predicate: (row: ElderlyResidentResource) => boolean) => rows.filter(predicate).length;
const ageFromDob = (dob?: string | null) => {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

function NumberedListInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const normalized = values.length ? values : [''];
  const update = (index: number, value: string) => onChange(normalized.map((row, i) => i === index ? value : row));
  const remove = (index: number) => onChange(normalized.filter((_, i) => i !== index).length ? normalized.filter((_, i) => i !== index) : ['']);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const isLast = index === normalized.length - 1;
    if (isLast && normalized[index].trim()) {
      onChange([...normalized, '']);
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement>(`input[data-numbered-list="${label}-${index + 1}"]`)?.focus();
      }, 20);
    } else {
      document.querySelector<HTMLInputElement>(`input[data-numbered-list="${label}-${index + 1}"]`)?.focus();
    }
  };
  return <div className="elderly-numbered-list field-span2">
    <div className="elderly-subtitle"><b>{label}</b><span>اكتب البند واضغط Enter للانتقال تلقائياً للرقم التالي</span></div>
    {normalized.map((value, index) => <div className="elderly-numbered-row" key={`${label}-${index}`}>
      <b>{index + 1}</b>
      <input data-numbered-list={`${label}-${index}`} value={value} onChange={event => update(index, event.target.value)} onKeyDown={event => onKeyDown(event, index)} placeholder={placeholder} />
      <button type="button" onClick={() => remove(index)} disabled={normalized.length === 1 && !value.trim()}>حذف</button>
    </div>)}
  </div>;
}

function applyLookupToForm(record: ElderlyLookupRecord, current: ResidentForm): ResidentForm {
  return {
    ...current,
    patientId: record.patientId || '',
    fullName: record.fullName || current.fullName,
    medicalSerial: record.medicalSerial || current.medicalSerial,
    idNumber: record.idNumber || current.idNumber,
    dob: record.dob || current.dob,
    gender: (record.gender || current.gender || '') as ResidentForm['gender'],
    maritalStatus: record.maritalStatus || current.maritalStatus,
  };
}

function formFromResident(row: ElderlyResidentResource): ResidentForm {
  return {
    patientId: row.patientId || '',
    fullName: row.fullName || '',
    medicalSerial: row.medicalSerial || '',
    idNumber: row.idNumber || '',
    dob: row.dob || '',
    gender: (row.gender || '') as ResidentForm['gender'],
    maritalStatus: row.maritalStatus || '',
    originalTown: row.originalTown || '',
    housingType: (row.housingType || '') as ResidentForm['housingType'],
    admissionDate: row.admissionDate || today(),
    receivesAssistance: Boolean(row.receivesAssistance),
    assistanceType: row.assistanceType || '',
    assistanceDetails: row.assistanceDetails || '',
    disabilities: row.disabilities || [],
    customDisability: row.customDisability || '',
    isDeceased: Boolean(row.isDeceased),
    exitDate: row.exitDate || '',
    healthStatusDetails: row.healthStatusDetails || '',
    employmentStatus: row.employmentStatus || 'not_working',
    workType: row.workType || '',
    medications: row.medications?.length ? row.medications : [''],
    assistiveTools: row.assistiveTools?.length ? row.assistiveTools : [''],
    belongings: row.belongings || '',
    notes: row.notes || '',
  };
}

function toDto(form: ResidentForm): SaveElderlyResidentDTO {
  return {
    patient_id: form.patientId || null,
    full_name: form.fullName.trim(),
    medical_serial: form.medicalSerial.trim() || null,
    id_number: form.idNumber.trim(),
    dob: form.dob || null,
    gender: form.gender || null,
    marital_status: form.maritalStatus.trim(),
    original_town: form.originalTown.trim(),
    housing_type: form.housingType || undefined,
    admission_date: form.admissionDate,
    receives_assistance: form.receivesAssistance,
    assistance_type: form.receivesAssistance ? form.assistanceType.trim() : '',
    assistance_details: form.receivesAssistance ? form.assistanceDetails.trim() : '',
    disabilities: form.disabilities,
    custom_disability: form.customDisability.trim(),
    is_deceased: form.isDeceased,
    exit_date: form.isDeceased ? form.exitDate : '',
    health_status_details: form.healthStatusDetails.trim(),
    employment_status: form.employmentStatus,
    work_type: form.employmentStatus === 'working' ? form.workType.trim() : '',
    medications: form.medications.map(item => item.trim()).filter(Boolean),
    assistive_tools: form.assistiveTools.map(item => item.trim()).filter(Boolean),
    belongings: form.belongings.trim(),
    notes: form.notes.trim(),
  };
}

export function ElderlyCarePage() {
  const { user, canAny } = useAuth();
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('form');
  const [identity, setIdentity] = useState('');
  const [form, setForm] = useState<ResidentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState<ElderlyResidentResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [disabilityOptions, setDisabilityOptions] = useState(disabilityDefaults);
  const [filters, setFilters] = useState({ search: '', from: '', to: '', status: 'all', gender: '', housingType: '' });
  const [statusDraft, setStatusDraft] = useState<StatusDraft | null>(null);

  const canEdit = isEngineerMohammed(user) || canAny('elderly.update');
  const canExport = isEngineerMohammed(user) || canAny('elderly.export');

  const filteredRows = useMemo(() => rows.filter(row => {
    const text = `${row.fullName} ${row.idNumber} ${row.medicalSerial || ''} ${row.originalTown || ''} ${row.healthStatusDetails || ''}`.toLowerCase();
    return (!filters.search.trim() || text.includes(filters.search.trim().toLowerCase()))
      && (!filters.status || filters.status === 'all' || row.status === filters.status)
      && (!filters.gender || row.gender === filters.gender)
      && (!filters.housingType || row.housingType === filters.housingType)
      && (!filters.from || (row.admissionDate || '') >= filters.from)
      && (!filters.to || (row.admissionDate || '') <= filters.to);
  }), [rows, filters]);

  const stats = useMemo(() => {
    const disabilityCounts = new Map<string, number>();
    filteredRows.forEach(row => [...(row.disabilities || []), row.customDisability || ''].filter(Boolean).forEach(item => disabilityCounts.set(item, (disabilityCounts.get(item) || 0) + 1)));
    return {
      total: filteredRows.length,
      active: countBy(filteredRows, row => row.status === 'active'),
      temporary: countBy(filteredRows, row => row.status === 'temporary_leave'),
      finalExit: countBy(filteredRows, row => row.status === 'final_exit'),
      deceased: countBy(filteredRows, row => row.status === 'deceased' || row.isDeceased),
      male: countBy(filteredRows, row => row.gender === 'male'),
      female: countBy(filteredRows, row => row.gender === 'female'),
      assistance: countBy(filteredRows, row => row.receivesAssistance),
      working: countBy(filteredRows, row => row.employmentStatus === 'working'),
      owned: countBy(filteredRows, row => row.housingType === 'owned'),
      rented: countBy(filteredRows, row => row.housingType === 'rented'),
      disabilityCounts: Array.from(disabilityCounts.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [filteredRows]);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { from: filters.from, to: filters.to, status: filters.status, gender: filters.gender, housing_type: filters.housingType, search: filters.search };
      const data = await hospitalApi.elderlyResidents(params);
      setRows(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر تحميل ملفات المسنين والمسنات', 'warn');
    } finally { setLoading(false); }
  };

  useEffect(() => { hospitalApi.elderlyDisabilities().then(setDisabilityOptions).catch(() => setDisabilityOptions(disabilityDefaults)); void load(); }, []);
  useEffect(() => { const id = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(id); }, [filters.from, filters.to, filters.status, filters.gender, filters.housingType]);

  const lookup = async () => {
    if (!identity.trim()) { toast('أدخل رقم الهوية أولاً', 'warn'); return; }
    setLookupBusy(true);
    try {
      const result = await hospitalApi.elderlyLookup(identity.trim());
      if (result.record) {
        setForm(current => applyLookupToForm(result.record as ElderlyLookupRecord, current));
        toast(result.source === 'patient_file' ? 'تم جلب البيانات من ملف المريض' : 'تم جلب البيانات من السجل المدني');
      } else {
        setForm(current => ({ ...current, idNumber: identity.trim() }));
        toast('لم يتم العثور على بيانات، يمكنك تعبئة الملف يدوياً مع تثبيت رقم الهوية', 'warn');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر جلب بيانات الهوية', 'warn');
    } finally { setLookupBusy(false); }
  };

  const toggleDisability = (value: string) => {
    setForm(current => ({ ...current, disabilities: current.disabilities.includes(value) ? current.disabilities.filter(item => item !== value) : [...current.disabilities, value] }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) { toast('لا تملك صلاحية تعديل قسم المسنين والمسنات', 'warn'); return; }
    if (!form.fullName.trim() || !form.idNumber.trim() || !form.admissionDate) { toast('الاسم ورقم الهوية وتاريخ الدخول حقول مطلوبة', 'warn'); return; }
    if (form.receivesAssistance && !form.assistanceType.trim()) { toast('حدد نوع المساعدة عند تفعيل خانة يتلقى مساعدة', 'warn'); return; }
    if (form.isDeceased && !form.exitDate) { toast('حدد تاريخ الخروج/الوفاة', 'warn'); return; }
    if (form.employmentStatus === 'working' && !form.workType.trim()) { toast('اكتب نوع العمل عند اختيار يعمل', 'warn'); return; }
    setSaving(true);
    try {
      if (editingId) await hospitalApi.updateElderlyResident(editingId, toDto(form));
      else await hospitalApi.createElderlyResident(toDto(form));
      toast(editingId ? 'تم تعديل ملف المسن/المسنة' : 'تم إنشاء ملف المسن/المسنة بنجاح');
      setForm(emptyForm()); setIdentity(''); setEditingId(null); await load(); setTab('list');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر حفظ الملف', 'warn');
    } finally { setSaving(false); }
  };

  const edit = (row: ElderlyResidentResource) => {
    setForm(formFromResident(row));
    setIdentity(row.idNumber);
    setEditingId(row.id);
    setTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openStatusDraft = (row: ElderlyResidentResource, status: ElderlyResidentStatus) => {
    setStatusDraft({
      row,
      status,
      finalExitDate: row.finalExitDate || today(),
      temporaryLeaveFrom: row.temporaryLeaveFrom || today(),
      temporaryLeaveTo: row.temporaryLeaveTo || '',
      temporaryLeaveReason: row.temporaryLeaveReason || 'زيارة مؤقتة',
      exitDate: row.exitDate || today(),
      notes: row.notes || '',
    });
  };

  const saveStatus = async () => {
    if (!statusDraft) return;
    const dto: SaveElderlyStatusDTO = { status: statusDraft.status, notes: statusDraft.notes };
    if (statusDraft.status === 'final_exit') dto.final_exit_date = statusDraft.finalExitDate;
    if (statusDraft.status === 'temporary_leave') { dto.temporary_leave_from = statusDraft.temporaryLeaveFrom; dto.temporary_leave_to = statusDraft.temporaryLeaveTo; dto.temporary_leave_reason = statusDraft.temporaryLeaveReason; }
    if (statusDraft.status === 'deceased') dto.exit_date = statusDraft.exitDate;
    setSaving(true);
    try {
      await hospitalApi.updateElderlyStatus(statusDraft.row.id, dto);
      toast('تم تحديث حالة المقيم/ة'); setStatusDraft(null); await load();
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر تحديث الحالة', 'warn'); }
    finally { setSaving(false); }
  };

  const exportExcel = async () => {
    if (!canExport) { toast('لا تملك صلاحية التصدير', 'warn'); return; }
    const headers = ['#','اسم المسن/المسنة','رقم الهوية','رقم الملف','العمر','الجنس','الحالة الاجتماعية','العنوان الحالي','البلدة الأصلية','نوع السكن','تاريخ الدخول','الحالة','خروج نهائي','زيارة من','زيارة إلى','يتلقى مساعدة','نوع المساعدة','تفاصيل المساعدة','الإعاقات','الحالة الصحية','الوضع الوظيفي','نوع العمل','الأدوية','الأدوات المساعدة','الأمانات','ملاحظات'];
    const data = filteredRows.map((row, index) => [
      index + 1, row.fullName, row.idNumber, row.medicalSerial || '', row.age ?? (ageFromDob(row.dob) || ''), labels.gender(row.gender), row.maritalStatus || '', row.currentAddress || fixedAddress,
      row.originalTown || '', labels.housing(row.housingType), row.admissionDate || '', labels.status(row.status), row.finalExitDate || row.exitDate || '', row.temporaryLeaveFrom || '', row.temporaryLeaveTo || '',
      row.receivesAssistance ? 'نعم' : 'لا', row.assistanceType || '', row.assistanceDetails || '', [...(row.disabilities || []), row.customDisability || ''].filter(Boolean).join('، '), row.healthStatusDetails || '',
      labels.employment(row.employmentStatus), row.workType || '', (row.medications || []).join('، '), (row.assistiveTools || []).join('، '), row.belongings || '', row.notes || '',
    ]);
    await downloadXlsx(`elderly-care-${today()}.xlsx`, headers, data, true);
    toast('تم تصدير ملف Excel لقسم المسنين والمسنات');
  };

  return <div className="elderly-page">
    <PageHeader
      crumb="قسم المسنين والمسنات"
      title="واجهة رعاية المسنين والمسنات المقيمين"
      sub="ملف اجتماعي وصحي وإداري متكامل مع قائمة المقيمين والخروج النهائي والزيارات والإحصائيات."
      actions={<div className="head-actions"><Button onClick={load} disabled={loading}><RefreshCw size={16}/> تحديث</Button>{canExport && <Button className="btn-primary" onClick={exportExcel}><Download size={16}/> Excel</Button>}</div>}
    />

    <div className="tabs compact-tabs">
      <button className={tab === 'form' ? 'active' : ''} onClick={() => setTab('form')}><UserCheck/> تسجيل / تعديل ملف</button>
      <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}><UsersRound/> قائمة المسنين والمسنات</button>
      <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}><ListChecks/> الإحصائيات والتصدير</button>
    </div>

    {tab === 'form' && <Panel className="elderly-form-panel">
      <div className="panel-title"><div><b>{editingId ? 'تعديل ملف مقيم/ة' : 'إنشاء ملف مقيم/ة جديد'}</b><span>العنوان الحالي ثابت ولا يمكن تغييره: {fixedAddress}</span></div></div>
      <div className="identity-lookup-row">
        <input value={identity} onChange={event => setIdentity(event.target.value)} placeholder="أدخل رقم الهوية لجلب البيانات" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void lookup(); } }} />
        <Button className="btn-primary" onClick={lookup} disabled={lookupBusy}><Search size={16}/> {lookupBusy ? 'جارٍ الجلب...' : 'جلب البيانات'}</Button>
      </div>

      <form className="form-grid elderly-form-grid" onSubmit={save}>
        <Field label="اسم المسن/المسنة"><input value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} required /></Field>
        <Field label="رقم الهوية"><input value={form.idNumber} onChange={event => setForm({ ...form, idNumber: event.target.value })} required /></Field>
        <Field label="رقم الملف"><input value={form.medicalSerial} onChange={event => setForm({ ...form, medicalSerial: event.target.value })} placeholder="يظهر تلقائياً إن وجد" /></Field>
        <Field label="تاريخ الميلاد"><input type="date" value={form.dob} onChange={event => setForm({ ...form, dob: event.target.value })} /></Field>
        <Field label="العمر"><input value={ageFromDob(form.dob)} readOnly /></Field>
        <Field label="الجنس"><select value={form.gender} onChange={event => setForm({ ...form, gender: event.target.value as ResidentForm['gender'] })}><option value="">غير محدد</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field>
        <Field label="الحالة الاجتماعية"><input value={form.maritalStatus} onChange={event => setForm({ ...form, maritalStatus: event.target.value })} placeholder="أعزب / متزوج / أرمل..." /></Field>
        <Field label="العنوان الحالي - ثابت" span={2}><input value={fixedAddress} readOnly /></Field>
        <Field label="البلدة الأصلية"><input value={form.originalTown} onChange={event => setForm({ ...form, originalTown: event.target.value })} placeholder="تعبئة يدوية" /></Field>
        <Field label="نوع السكن"><select value={form.housingType} onChange={event => setForm({ ...form, housingType: event.target.value as ResidentForm['housingType'] })}><option value="">اختر</option><option value="owned">ملك</option><option value="rented">إيجار</option></select></Field>
        <Field label="تاريخ الدخول"><input type="date" value={form.admissionDate} onChange={event => setForm({ ...form, admissionDate: event.target.value })} required /></Field>

        <div className="elderly-check-card field-span2">
          <label className="check-row"><input type="checkbox" checked={form.receivesAssistance} onChange={event => setForm({ ...form, receivesAssistance: event.target.checked })} /><span>هل يتلقى مساعدة؟</span></label>
          {form.receivesAssistance && <div className="nested-grid">
            <Field label="نوع المساعدة"><input value={form.assistanceType} onChange={event => setForm({ ...form, assistanceType: event.target.value })} placeholder="مالية / عينية / علاجية..." /></Field>
            <Field label="تفاصيل المساعدة"><textarea value={form.assistanceDetails} onChange={event => setForm({ ...form, assistanceDetails: event.target.value })} placeholder="تفاصيل الجهة، القيمة، الدورية..." /></Field>
          </div>}
        </div>

        <div className="elderly-check-card field-span2">
          <div className="elderly-subtitle"><b>نوع الإعاقة</b><span>يمكن اختيار أكثر من نوع وإضافة إعاقة استثنائية</span></div>
          <div className="elderly-chip-grid">
            {disabilityOptions.map(option => <label key={option} className={form.disabilities.includes(option) ? 'chip-check active' : 'chip-check'}><input type="checkbox" checked={form.disabilities.includes(option)} onChange={() => toggleDisability(option)} />{option}</label>)}
          </div>
          <input value={form.customDisability} onChange={event => setForm({ ...form, customDisability: event.target.value })} placeholder="إضافة إعاقة جديدة / استثنائية إن وجدت" />
        </div>

        <div className="elderly-check-card field-span2">
          <label className="check-row danger"><input type="checkbox" checked={form.isDeceased} onChange={event => setForm({ ...form, isDeceased: event.target.checked, exitDate: event.target.checked && !form.exitDate ? today() : form.exitDate })} /><span>المسن/المسنة توفى/توفيت</span></label>
          {form.isDeceased && <Field label="تاريخ الخروج / الوفاة"><input type="date" value={form.exitDate} onChange={event => setForm({ ...form, exitDate: event.target.value })} /></Field>}
        </div>

        <Field label="تفاصيل الحالة الصحية" span={2}><textarea value={form.healthStatusDetails} onChange={event => setForm({ ...form, healthStatusDetails: event.target.value })} rows={4} placeholder="اكتب ملخص الحالة الصحية، الأمراض المزمنة، الملاحظات الطبية المهمة..." /></Field>

        <div className="elderly-check-card field-span2">
          <div className="elderly-subtitle"><b>الوضع الوظيفي</b><span>في حالة يعمل تظهر خانة نوع العمل تلقائياً</span></div>
          <div className="segmented-mini">
            <button type="button" className={form.employmentStatus === 'not_working' ? 'active' : ''} onClick={() => setForm({ ...form, employmentStatus: 'not_working', workType: '' })}>لا يعمل</button>
            <button type="button" className={form.employmentStatus === 'working' ? 'active' : ''} onClick={() => setForm({ ...form, employmentStatus: 'working' })}>يعمل</button>
          </div>
          {form.employmentStatus === 'working' && <input value={form.workType} onChange={event => setForm({ ...form, workType: event.target.value })} placeholder="حدد نوع العمل" />}
        </div>

        <NumberedListInput label="الأدوية التي يتلقاها" values={form.medications} onChange={values => setForm({ ...form, medications: values })} placeholder="اسم الدواء والجرعة والتكرار" />
        <NumberedListInput label="الأدوات المساعدة" values={form.assistiveTools} onChange={values => setForm({ ...form, assistiveTools: values })} placeholder="كرسي، مشاية، نظارة، سماعة..." />
        <Field label="الأمانات عند الدخول" span={2}><textarea value={form.belongings} onChange={event => setForm({ ...form, belongings: event.target.value })} rows={3} placeholder="نقود، أوراق، جوال، ملابس، أدوات شخصية..." /></Field>
        <Field label="ملاحظات إدارية" span={2}><textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} rows={3} /></Field>
        <FormActions>
          <Button type="button" onClick={() => { setForm(emptyForm()); setEditingId(null); setIdentity(''); }}>تفريغ</Button>
          <Button type="submit" className="btn-primary" disabled={saving || !canEdit}><ShieldCheck size={16}/> {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'إنشاء الملف'}</Button>
        </FormActions>
      </form>
    </Panel>}

    {(tab === 'list' || tab === 'stats') && <Panel className="elderly-filters-panel">
      <div className="elderly-filter-grid">
        <input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="بحث بالاسم أو الهوية أو رقم الملف أو البلدة..." />
        <input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} />
        <input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} />
        <select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="all">كل الحالات</option><option value="active">المقيمون حالياً</option><option value="temporary_leave">بإذن مؤقت / زيارة</option><option value="final_exit">خروج نهائي</option><option value="deceased">وفاة</option></select>
        <select value={filters.gender} onChange={event => setFilters({ ...filters, gender: event.target.value })}><option value="">كل الجنس</option><option value="male">ذكور</option><option value="female">إناث</option></select>
        <select value={filters.housingType} onChange={event => setFilters({ ...filters, housingType: event.target.value })}><option value="">كل السكن</option><option value="owned">ملك</option><option value="rented">إيجار</option></select>
        <Button onClick={load} disabled={loading}><RefreshCw size={16}/> تطبيق</Button>
      </div>
    </Panel>}

    {tab === 'list' && <Panel>
      <div className="panel-title"><div><b>قائمة المسنين والمسنات</b><span>تظهر كل الملفات بلا استثناء مع أوامر الخروج النهائي والزيارة المؤقتة</span></div><Badge color="emerald">{filteredRows.length} ملف</Badge></div>
      {statusDraft && <div className="elderly-status-box">
        <b>تحديث حالة: {statusDraft.row.fullName}</b>
        <select value={statusDraft.status} onChange={event => setStatusDraft({ ...statusDraft, status: event.target.value as ElderlyResidentStatus })}>
          <option value="active">مقيم حالياً</option><option value="temporary_leave">بإذن مؤقت / زيارة</option><option value="final_exit">خروج نهائي</option><option value="deceased">وفاة</option>
        </select>
        {statusDraft.status === 'temporary_leave' && <><input type="date" value={statusDraft.temporaryLeaveFrom} onChange={event => setStatusDraft({ ...statusDraft, temporaryLeaveFrom: event.target.value })} /><input type="date" value={statusDraft.temporaryLeaveTo} onChange={event => setStatusDraft({ ...statusDraft, temporaryLeaveTo: event.target.value })} /><input value={statusDraft.temporaryLeaveReason} onChange={event => setStatusDraft({ ...statusDraft, temporaryLeaveReason: event.target.value })} placeholder="سبب/تفاصيل الزيارة" /></>}
        {statusDraft.status === 'final_exit' && <input type="date" value={statusDraft.finalExitDate} onChange={event => setStatusDraft({ ...statusDraft, finalExitDate: event.target.value })} />}
        {statusDraft.status === 'deceased' && <input type="date" value={statusDraft.exitDate} onChange={event => setStatusDraft({ ...statusDraft, exitDate: event.target.value })} />}
        <textarea value={statusDraft.notes} onChange={event => setStatusDraft({ ...statusDraft, notes: event.target.value })} placeholder="ملاحظات الحالة" />
        <div><Button onClick={() => setStatusDraft(null)}>إلغاء</Button><Button className="btn-primary" onClick={saveStatus} disabled={saving}>حفظ الحالة</Button></div>
      </div>}
      <div className="responsive-table elderly-table-wrap">
        <table className="data-table elderly-table">
          <thead><tr><th>م</th><th>الاسم</th><th>الهوية</th><th>العمر</th><th>الجنس</th><th>الأصل</th><th>السكن</th><th>الدخول</th><th>المساعدة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>{filteredRows.map((row, index) => <tr key={row.id}>
            <td>{index + 1}</td><td><b>{row.fullName}</b><small>{row.medicalSerial || '—'}</small></td><td>{row.idNumber}</td><td>{row.age ?? (ageFromDob(row.dob) || '—')}</td><td>{labels.gender(row.gender)}</td><td>{row.originalTown || '—'}</td><td>{labels.housing(row.housingType)}</td><td>{row.admissionDate}</td><td>{row.receivesAssistance ? row.assistanceType || 'نعم' : 'لا'}</td><td><Badge color={row.status === 'active' ? 'emerald' : row.status === 'temporary_leave' ? 'amber' : row.status === 'deceased' ? 'rose' : 'violet'}>{labels.status(row.status)}</Badge></td>
            <td><div className="row-actions"><Button onClick={() => edit(row)}><Edit3 size={14}/> تعديل</Button><Button onClick={() => openStatusDraft(row, 'final_exit')}>خروج نهائي</Button><Button onClick={() => openStatusDraft(row, 'temporary_leave')}>إذن مؤقت</Button><Button onClick={() => openStatusDraft(row, 'active')}>إرجاع مقيم</Button></div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!filteredRows.length && <EmptyState title="لا توجد ملفات مطابقة" sub="ستظهر هنا ملفات المسنين والمسنات بعد التسجيل أو تغيير الفلاتر." />}
    </Panel>}

    {tab === 'stats' && <div className="elderly-stats-grid">
      {[['إجمالي الملفات', stats.total], ['المقيمون حالياً', stats.active], ['زيارات مؤقتة', stats.temporary], ['خروج نهائي', stats.finalExit], ['وفيات', stats.deceased], ['ذكور', stats.male], ['إناث', stats.female], ['يتلقون مساعدة', stats.assistance], ['يعملون', stats.working], ['سكن ملك', stats.owned], ['سكن إيجار', stats.rented]].map(([label, value]) => <Panel key={label} className="stat-card elderly-stat-card"><span>{label}</span><b>{value}</b></Panel>)}
      <Panel className="elderly-stats-wide"><div className="panel-title"><div><b>تفصيل الإعاقات المسجلة</b><span>حسب الملفات ضمن الفلاتر الحالية</span></div><Button className="btn-primary" onClick={exportExcel}><Download size={16}/> تصدير Excel كامل</Button></div>{stats.disabilityCounts.length ? <div className="elderly-chip-grid">{stats.disabilityCounts.map(([name, count]) => <span className="chip-check active" key={name}>{name} <b>{count}</b></span>)}</div> : <EmptyState title="لا توجد إعاقات مسجلة" sub="لم يتم اختيار أي إعاقة ضمن النتائج الحالية." />}</Panel>
    </div>}
  </div>;
}

export default ElderlyCarePage;
