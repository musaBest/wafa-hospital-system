import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Download, Pencil, Plus, RefreshCw, Search, Stethoscope, Trash2, UserPlus, WalletCards } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, PageHeader, Panel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { useI18n } from '../i18n';
import { useUi } from '../context/UiContext';
import { exportDentalClinicXlsx } from '../utils/dentalClinicExport';
import type { CivilRegistryRecord, Clinic, Doctor } from '../types';
import { DENTAL_SERVICE_OPTIONS, hospitalApi, type DentalServiceName, type DentalVisitResource, type DentalWaitlistResource, type SaveDentalVisitDTO, type SaveDentalWaitlistDTO } from '../services/hospitalApi.service';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const nowTime = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(11, 16); };
const money = (value: number) => `${(Number(value) || 0).toFixed(2)} ₪`;
const isEngineerMohammed = (user?: { id?: string; username?: string } | null) => Boolean(user && (user.id === '00000000-0000-4000-8000-000000000004' || user.username?.toLowerCase().trim() === 'eng.mohammed_moqbil'));

type PatientLike = { id: string; fullName: string; medicalSerial: string; idNumber?: string; phone?: string; dob?: string; gender?: 'male'|'female'; city?: string; area?: string; coverageEntity?: string };
type DentalTab = 'records' | 'waitlist' | 'stats' | 'doctors';

const normalizePatient = (value: any): PatientLike => {
  const row = value?.data ?? value;
  return {
    id: row.id,
    fullName: row.fullName || row.full_name || '—',
    medicalSerial: row.medicalSerial || row.medical_serial || '',
    idNumber: row.idNumber || row.id_number || '',
    phone: row.phone || '',
    dob: row.dob || '',
    gender: row.gender || 'male',
    city: row.city || '',
    area: row.area || '',
    coverageEntity: row.coverageEntity || row.coverage_entity || 'self',
  };
};

const emptyVisitForm = () => ({
  identity: '', phone: '', patient: null as PatientLike | null, registry: null as CivilRegistryRecord | null,
  doctorId: '', serviceName: 'Diagnosis' as DentalServiceName, otherService: '', visitDate: today(), totalAmount: '', paidAmount: '', notes: '',
});
const emptyWaitForm = () => ({
  identity: '', phone: '', patient: null as PatientLike | null, registry: null as CivilRegistryRecord | null,
  doctorId: '', serviceName: 'Diagnosis' as DentalServiceName, otherService: '', requestedDate: today(), appointmentTime: nowTime(), notes: '',
});
const emptyDoctorForm = () => ({ staffId: '', password: 'Dental@2026', name: '', phone: '', specialty: 'طب الأسنان', scheduleText: '' });

function serviceSelect(value: DentalServiceName, setValue: (value: DentalServiceName) => void, options: readonly DentalServiceName[]) {
  return <select value={value} onChange={e => setValue(e.target.value as DentalServiceName)}>
    {options.map(option => <option key={option} value={option}>{option === 'Other' ? 'Other...' : option}</option>)}
  </select>;
}

function patientCard(patient: PatientLike | null, registry: CivilRegistryRecord | null) {
  const row = patient || registry;
  if (!row) return null;
  return <div className="workflow-patient-card dental-patient-card">
    <strong>{row.fullName}</strong>
    <span><small>رقم الهوية</small><b>{row.idNumber || '—'}</b></span>
    <span><small>رقم الملف</small><b>{patient?.medicalSerial || 'غير مسجل بعد'}</b></span>
    <span><small>الجوال</small><b>{patient?.phone || '—'}</b></span>
    <span><small>المدينة/المنطقة</small><b>{row.city || '—'} · {row.area || '—'}</b></span>
  </div>;
}

export default function DentalClinicPage() {
  const { language } = useI18n();
  const { user, canAny } = useAuth();
  const hospital = useHospital();
  const { toast } = useUi();
  const [tab, setTab] = useState<DentalTab>('records');
  const [clinics, setClinics] = useState<Clinic[]>(hospital.clinics || []);
  const [doctors, setDoctors] = useState<Doctor[]>(hospital.doctors || []);
  const [services, setServices] = useState<readonly DentalServiceName[]>(DENTAL_SERVICE_OPTIONS);
  const [rows, setRows] = useState<DentalVisitResource[]>([]);
  const [waitRows, setWaitRows] = useState<DentalWaitlistResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupBusy, setLookupBusy] = useState<'visit' | 'wait' | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState(emptyVisitForm);
  const [waitForm, setWaitForm] = useState(emptyWaitForm);
  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm);
  const [filters, setFilters] = useState({ from: today(), to: today(), doctorId: '', serviceName: '', search: '' });

  const dentalClinic = clinics.find(clinic => clinic.key === 'dental' || clinic.code === 'DEN');
  const dentalDoctors = useMemo(() => doctors.filter(doctor => doctor.active !== false && (!dentalClinic || doctor.clinics?.includes(dentalClinic.id) || doctor.specialty === 'طب الأسنان')), [doctors, dentalClinic?.id]);
  const canManage = isEngineerMohammed(user) || canAny('dental.manage');
  const canExport = isEngineerMohammed(user) || canAny('dental.export','financial_audit.view');
  const canEdit = isEngineerMohammed(user) || canAny('dental.update','visits.create');

  const totals = useMemo(() => rows.reduce((acc, row) => ({ total: acc.total + (row.totalAmount || 0), paid: acc.paid + (row.paidAmount || 0), remaining: acc.remaining + (row.remainingAmount || 0) }), { total: 0, paid: 0, remaining: 0 }), [rows]);
  const doctorName = (id?: string | null) => dentalDoctors.find(row => row.id === id)?.name || rows.find(row => row.doctorId === id)?.doctor?.name || '—';

  const loadBase = async () => {
    try {
      const [clinicRows, doctorRows, serviceRows] = await Promise.all([
        hospitalApi.clinics().catch(() => clinics),
        hospitalApi.doctors().catch(() => doctors),
        hospitalApi.dentalServices().catch(() => DENTAL_SERVICE_OPTIONS as unknown as DentalServiceName[]),
      ]);
      setClinics(clinicRows as Clinic[]);
      setDoctors(doctorRows as Doctor[]);
      setServices(serviceRows as DentalServiceName[]);
    } catch { /* soft fallback to current context */ }
  };

  const loadDental = async () => {
    setLoading(true);
    try {
      const params: Record<string,string> = { from: filters.from, to: filters.to, doctor_id: filters.doctorId, service_name: filters.serviceName, search: filters.search };
      const [visitRows, waitingRows] = await Promise.all([hospitalApi.dentalVisits(params), hospitalApi.dentalWaitlist({ from: filters.from, to: filters.to, doctor_id: filters.doctorId, search: filters.search })]);
      setRows(visitRows);
      setWaitRows(waitingRows);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر تحميل بيانات عيادة الأسنان', 'warn');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (!visitForm.doctorId && dentalDoctors[0]) setVisitForm(v => ({ ...v, doctorId: dentalDoctors[0].id })); if (!waitForm.doctorId && dentalDoctors[0]) setWaitForm(v => ({ ...v, doctorId: dentalDoctors[0].id })); }, [dentalDoctors.length]);
  useEffect(() => { void loadDental(); }, [filters.from, filters.to, filters.doctorId, filters.serviceName]);

  const lookupPatient = async (kind: 'visit' | 'wait') => {
    const form = kind === 'visit' ? visitForm : waitForm;
    if (!form.identity.trim() && !form.phone.trim()) { toast('أدخل رقم الهوية أو رقم الجوال', 'warn'); return; }
    setLookupBusy(kind);
    try {
      const result = await hospitalApi.dentalPatientLookup(form.identity.trim(), form.phone.trim());
      const patch = result.patient ? { patient: normalizePatient(result.patient as any), registry: null } : result.registry ? { patient: null, registry: result.registry as CivilRegistryRecord } : { patient: null, registry: null };
      if (kind === 'visit') setVisitForm(v => ({ ...v, ...patch, phone: patch.patient?.phone || v.phone }));
      else setWaitForm(v => ({ ...v, ...patch, phone: patch.patient?.phone || v.phone }));
      toast(result.patient ? 'تم ربط المريض من ملف المستشفى' : result.registry ? 'تم جلب بيانات المريض من السجل المدني' : 'لا يوجد مريض مطابق', result.patient || result.registry ? 'ok' : 'warn');
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر البحث عن المريض', 'warn'); }
    finally { setLookupBusy(null); }
  };

  const ensurePatient = async (form: { patient: PatientLike | null; registry: CivilRegistryRecord | null; phone: string; identity: string }) => {
    if (form.patient) return form.patient;
    if (!form.registry) throw new Error('ابحث عن المريض أو اجلب بياناته من السجل المدني أولاً');
    const created = await hospitalApi.registerPatient({ identity_or_name: form.registry.idNumber || form.identity, phone: form.phone.trim(), registry_data: form.registry });
    const patient = normalizePatient(created as any);
    toast(`تم تسجيل المريض برقم ملف ${patient.medicalSerial}`);
    return patient;
  };

  const saveVisit = async (event: FormEvent) => {
    event.preventDefault();
    if (!visitForm.doctorId) { toast('اختر طبيب الأسنان', 'warn'); return; }
    if (visitForm.serviceName === 'Other' && !visitForm.otherService.trim()) { toast('اكتب نوع الخدمة في خيار Other', 'warn'); return; }
    const total = Number(visitForm.totalAmount || 0), paid = Number(visitForm.paidAmount || 0);
    if (paid > total) { toast('المدفوع لا يجوز أن يكون أكبر من الإجمالي', 'warn'); return; }
    setSaving(true);
    try {
      const patient = await ensurePatient(visitForm);
      const dto: SaveDentalVisitDTO = { patient_id: patient.id, doctor_id: visitForm.doctorId, service_name: visitForm.serviceName, other_service: visitForm.serviceName === 'Other' ? visitForm.otherService.trim() : '', visit_date: visitForm.visitDate, total_amount: total, paid_amount: paid, notes: visitForm.notes.trim() };
      if (editingVisitId) await hospitalApi.updateDentalVisit(editingVisitId, dto);
      else await hospitalApi.createDentalVisit(dto);
      setVisitForm(emptyVisitForm());
      setEditingVisitId(null);
      toast(editingVisitId ? 'تم تعديل سجل الأسنان وربطه بالمالية والطبيب' : 'تم تسجيل الحالة وظهرت تلقائياً في صفحة الطبيب');
      await loadDental();
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر حفظ خدمة الأسنان', 'warn'); }
    finally { setSaving(false); }
  };

  const saveWaitlist = async (event: FormEvent) => {
    event.preventDefault();
    if (waitForm.serviceName === 'Other' && !waitForm.otherService.trim()) { toast('اكتب نوع الخدمة في خيار Other', 'warn'); return; }
    setSaving(true);
    try {
      const patient = await ensurePatient(waitForm);
      const dto: SaveDentalWaitlistDTO = { patient_id: patient.id, doctor_id: waitForm.doctorId || undefined, requested_date: waitForm.requestedDate, appointment_time: waitForm.appointmentTime, service_name: waitForm.serviceName, other_service: waitForm.serviceName === 'Other' ? waitForm.otherService.trim() : '', notes: waitForm.notes.trim() };
      await hospitalApi.createDentalWaitlist(dto);
      setWaitForm(emptyWaitForm());
      toast('تمت إضافة المريض إلى قائمة انتظار الأسنان');
      await loadDental();
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر حفظ قائمة الانتظار', 'warn'); }
    finally { setSaving(false); }
  };

  const editVisit = (row: DentalVisitResource) => {
    setTab('records');
    setEditingVisitId(row.id);
    setVisitForm({ identity: row.patient?.idNumber || '', phone: row.patient?.phone || '', patient: row.patient ? normalizePatient(row.patient) : null, registry: null, doctorId: row.doctorId, serviceName: row.serviceName, otherService: row.otherService || '', visitDate: row.visitDate || today(), totalAmount: String(row.totalAmount || ''), paidAmount: String(row.paidAmount || ''), notes: row.notes || '' });
  };

  const removeVisit = async (row: DentalVisitResource) => {
    if (!window.confirm(`حذف/إلغاء سجل الأسنان للمريض ${row.patient?.fullName || ''}?`)) return;
    try { await hospitalApi.deleteDentalVisit(row.id); toast('تم إلغاء سجل الأسنان'); await loadDental(); }
    catch (error) { toast(error instanceof Error ? error.message : 'تعذر حذف السجل', 'warn'); }
  };

  const markWaitlist = async (row: DentalWaitlistResource, status: DentalWaitlistResource['status']) => {
    try { await hospitalApi.updateDentalWaitlist(row.id, { status }); toast('تم تحديث حالة قائمة الانتظار'); await loadDental(); }
    catch (error) { toast(error instanceof Error ? error.message : 'تعذر تحديث قائمة الانتظار', 'warn'); }
  };

  const saveDoctor = async (event: FormEvent) => {
    event.preventDefault();
    if (!dentalClinic) { toast('عيادة الأسنان غير معرفة في النظام', 'warn'); return; }
    if (!doctorForm.name.trim()) { toast('أدخل اسم الطبيب', 'warn'); return; }
    setSaving(true);
    try {
      if (editingDoctorId) {
        await hospitalApi.updateDoctor(editingDoctorId, { name: doctorForm.name.trim(), phone: doctorForm.phone.trim(), specialty: doctorForm.specialty.trim() || 'طب الأسنان', schedule_text: doctorForm.scheduleText.trim(), clinic_ids: [dentalClinic.id], ...(doctorForm.password.trim() ? { password: doctorForm.password.trim() } : {}) });
        toast('تم تعديل طبيب الأسنان');
      } else {
        if (!doctorForm.staffId.trim() || doctorForm.password.trim().length < 8) { toast('أدخل اسم المستخدم وكلمة مرور 8 أحرف على الأقل', 'warn'); return; }
        await hospitalApi.createDoctor({ staff_id: doctorForm.staffId.trim(), password: doctorForm.password.trim(), name: doctorForm.name.trim(), phone: doctorForm.phone.trim(), specialty: doctorForm.specialty.trim() || 'طب الأسنان', schedule_text: doctorForm.scheduleText.trim(), clinic_keys: ['dental'] });
        toast('تمت إضافة طبيب الأسنان ومنحه صلاحية واجهة الأسنان');
      }
      setDoctorForm(emptyDoctorForm()); setEditingDoctorId(null); await loadBase(); await loadDental();
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر حفظ الطبيب', 'warn'); }
    finally { setSaving(false); }
  };

  const beginDoctorEdit = (doctor: Doctor) => {
    setEditingDoctorId(doctor.id);
    setDoctorForm({ staffId: doctor.staffId || '', password: '', name: doctor.name, phone: doctor.phone || '', specialty: doctor.specialty || 'طب الأسنان', scheduleText: doctor.scheduleText || '' });
  };

  return <div className="dental-clinic-page">
    <PageHeader crumb="العيادات الخاصة" title="عيادة الأسنان" sub="تسجيل خدمات الأسنان، قائمة الانتظار، الإحصائيات، وربط تلقائي مع المالية وصفحة الطبيب." actions={<><Button className="btn-ghost" onClick={() => { void loadBase(); void loadDental(); }}><RefreshCw/>تحديث</Button>{canExport&&<Button className="btn-primary" disabled={!rows.length} onClick={() => void exportDentalClinicXlsx(rows, filters.from, filters.to, language === 'ar')}><Download/>تصدير Excel</Button>}</>} />

    <div className="diagnostic-overview dental-summary">
      <article className="glass"><Stethoscope/><div><span>أطباء الأسنان</span><b>{dentalDoctors.length}</b></div></article>
      <article className="glass"><ClipboardList/><div><span>سجلات الفترة</span><b>{rows.length}</b></div></article>
      <article className="glass"><WalletCards/><div><span>المدفوع</span><b>{money(totals.paid)}</b></div></article>
      <article className="glass"><CalendarClock/><div><span>قائمة الانتظار</span><b>{waitRows.length}</b></div></article>
    </div>

    <div className="chip-row dental-tabs">
      <button className={`chip ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}><Plus/>تسجيل خدمة</button>
      <button className={`chip ${tab === 'waitlist' ? 'active' : ''}`} onClick={() => setTab('waitlist')}><CalendarClock/>قائمة الانتظار</button>
      <button className={`chip ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}><WalletCards/>الإحصائيات والمالية</button>
      {canManage && <button className={`chip ${tab === 'doctors' ? 'active' : ''}`} onClick={() => setTab('doctors')}><Stethoscope/>أطباء الأسنان</button>}
    </div>

    <Panel className="workflow-filter-panel dental-filter-panel">
      <div className="workflow-toolbar">
        <label><Search/><span>بحث</span><input value={filters.search} onChange={e => setFilters(v => ({ ...v, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') void loadDental(); }} placeholder="اسم، هوية، جوال، خدمة..."/></label>
        <Field label="من"><input type="date" value={filters.from} onChange={e => setFilters(v => ({ ...v, from: e.target.value }))}/></Field>
        <Field label="إلى"><input type="date" value={filters.to} onChange={e => setFilters(v => ({ ...v, to: e.target.value }))}/></Field>
        <Field label="الطبيب"><select value={filters.doctorId} onChange={e => setFilters(v => ({ ...v, doctorId: e.target.value }))}><option value="">الكل</option>{dentalDoctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
        <Field label="الخدمة"><select value={filters.serviceName} onChange={e => setFilters(v => ({ ...v, serviceName: e.target.value }))}><option value="">الكل</option>{services.map(service => <option key={service} value={service}>{service}</option>)}</select></Field>
        <Button className="btn-ghost" onClick={() => void loadDental()} disabled={loading}><RefreshCw/>{loading ? 'جارٍ...' : 'تطبيق'}</Button>
      </div>
    </Panel>

    {tab === 'records' && <div className="dental-grid">
      <Panel>
        <div className="panel-head"><h3><UserPlus/>{editingVisitId ? 'تعديل خدمة أسنان' : 'تسجيل خدمة أسنان'}</h3><Badge color="cyan">تظهر للطبيب فوراً</Badge></div>
        <form className="form-grid" onSubmit={saveVisit}>
          <Field label="رقم الهوية / رقم الملف"><input value={visitForm.identity} onChange={e => setVisitForm(v => ({ ...v, identity: e.target.value }))} placeholder="مثال: 402918374"/></Field>
          <Field label="رقم الجوال"><input value={visitForm.phone} onChange={e => setVisitForm(v => ({ ...v, phone: e.target.value }))} placeholder="05xxxxxxxx"/></Field>
          <div className="field field-span2"><Button className="btn-ghost" disabled={lookupBusy === 'visit'} onClick={() => void lookupPatient('visit')}><Search/>{lookupBusy === 'visit' ? 'جارٍ البحث...' : 'بحث وربط بالسجل المدني'}</Button></div>
          <div className="field field-span2">{patientCard(visitForm.patient, visitForm.registry)}</div>
          <Field label="اسم الطبيب"><select value={visitForm.doctorId} onChange={e => setVisitForm(v => ({ ...v, doctorId: e.target.value }))}><option value="">اختر الطبيب</option>{dentalDoctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
          <Field label="تاريخ الزيارة"><input type="date" value={visitForm.visitDate} onChange={e => setVisitForm(v => ({ ...v, visitDate: e.target.value }))}/></Field>
          <Field label="نوع الخدمة">{serviceSelect(visitForm.serviceName, value => setVisitForm(v => ({ ...v, serviceName: value })), services)}</Field>
          {visitForm.serviceName === 'Other' && <Field label="خدمة أخرى"><input value={visitForm.otherService} onChange={e => setVisitForm(v => ({ ...v, otherService: e.target.value }))} placeholder="اكتب نوع الخدمة"/></Field>}
          <Field label="الإجمالي"><input type="number" min="0" step="0.01" value={visitForm.totalAmount} onChange={e => setVisitForm(v => ({ ...v, totalAmount: e.target.value }))}/></Field>
          <Field label="المدفوع"><input type="number" min="0" step="0.01" value={visitForm.paidAmount} onChange={e => setVisitForm(v => ({ ...v, paidAmount: e.target.value }))}/></Field>
          <Field label="المتبقي"><input readOnly value={money(Math.max(0, Number(visitForm.totalAmount || 0) - Number(visitForm.paidAmount || 0)))}/></Field>
          <Field label="ملاحظات أخرى" span={2}><textarea value={visitForm.notes} onChange={e => setVisitForm(v => ({ ...v, notes: e.target.value }))} rows={3}/></Field>
          <FormActions><Button className="btn-primary" type="submit" disabled={!canEdit || saving}><Plus/>{saving ? 'جارٍ الحفظ...' : editingVisitId ? 'حفظ التعديل' : 'تسجيل الخدمة'}</Button>{editingVisitId && <Button className="btn-ghost" onClick={() => { setEditingVisitId(null); setVisitForm(emptyVisitForm()); }}>إلغاء التعديل</Button>}</FormActions>
        </form>
      </Panel>
      <DentalRecordsTable rows={rows} canEdit={canEdit} canManage={canManage} onEdit={editVisit} onRemove={removeVisit}/>
    </div>}

    {tab === 'waitlist' && <div className="dental-grid">
      <Panel>
        <div className="panel-head"><h3><CalendarClock/>إضافة إلى قائمة انتظار الأسنان</h3><Badge color="amber">هوية + جوال</Badge></div>
        <form className="form-grid" onSubmit={saveWaitlist}>
          <Field label="رقم الهوية / رقم الملف"><input value={waitForm.identity} onChange={e => setWaitForm(v => ({ ...v, identity: e.target.value }))}/></Field>
          <Field label="رقم الجوال"><input value={waitForm.phone} onChange={e => setWaitForm(v => ({ ...v, phone: e.target.value }))}/></Field>
          <div className="field field-span2"><Button className="btn-ghost" disabled={lookupBusy === 'wait'} onClick={() => void lookupPatient('wait')}><Search/>{lookupBusy === 'wait' ? 'جارٍ البحث...' : 'إظهار بيانات المريض'}</Button></div>
          <div className="field field-span2">{patientCard(waitForm.patient, waitForm.registry)}</div>
          <Field label="اليوم"><input type="date" value={waitForm.requestedDate} onChange={e => setWaitForm(v => ({ ...v, requestedDate: e.target.value }))}/></Field>
          <Field label="الساعة"><input type="time" value={waitForm.appointmentTime} onChange={e => setWaitForm(v => ({ ...v, appointmentTime: e.target.value }))}/></Field>
          <Field label="الطبيب"><select value={waitForm.doctorId} onChange={e => setWaitForm(v => ({ ...v, doctorId: e.target.value }))}><option value="">غير محدد</option>{dentalDoctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
          <Field label="نوع العمل">{serviceSelect(waitForm.serviceName, value => setWaitForm(v => ({ ...v, serviceName: value })), services)}</Field>
          {waitForm.serviceName === 'Other' && <Field label="خدمة أخرى"><input value={waitForm.otherService} onChange={e => setWaitForm(v => ({ ...v, otherService: e.target.value }))}/></Field>}
          <Field label="ملاحظات" span={2}><textarea value={waitForm.notes} onChange={e => setWaitForm(v => ({ ...v, notes: e.target.value }))} rows={3}/></Field>
          <FormActions><Button className="btn-primary" type="submit" disabled={!canEdit || saving}><Plus/>إضافة لقائمة الانتظار</Button></FormActions>
        </form>
      </Panel>
      <Panel><div className="panel-head"><h3><ClipboardList/>قائمة الانتظار</h3><Badge color="cyan">{waitRows.length}</Badge></div>{waitRows.length ? <div className="table-wrap"><table><thead><tr><th>المريض</th><th>الموعد</th><th>الطبيب</th><th>نوع العمل</th><th>الحالة</th><th/></tr></thead><tbody>{waitRows.map(row => <tr key={row.id}><td><b>{row.fullName}</b><small>{row.idNumber || '—'} · {row.phone || '—'} · {row.medicalSerial || '—'}</small></td><td>{row.requestedDate}<small>{row.appointmentTime}</small></td><td>{doctorName(row.doctorId)}</td><td>{row.serviceLabel}</td><td><Badge color={row.status === 'served' ? 'emerald' : row.status === 'cancelled' ? 'rose' : 'amber'}>{row.status === 'served' ? 'تمت الخدمة' : row.status === 'cancelled' ? 'ملغي' : row.status === 'scheduled' ? 'مجدول' : 'انتظار'}</Badge></td><td className="row-actions"><Button className="btn-ghost btn-sm" onClick={() => void markWaitlist(row, 'served')}>تمت</Button><Button className="btn-danger btn-sm" onClick={() => void markWaitlist(row, 'cancelled')}>إلغاء</Button></td></tr>)}</tbody></table></div> : <EmptyState title="لا توجد مواعيد انتظار" sub="ستظهر هنا الحالات التي يضيفها الاستقبال أو عيادة الأسنان."/>}</Panel>
    </div>}

    {tab === 'stats' && <Panel><div className="panel-head"><h3><WalletCards/>إحصائيات عيادة الأسنان</h3>{canExport && <Button className="btn-primary" disabled={!rows.length} onClick={() => void exportDentalClinicXlsx(rows, filters.from, filters.to, language === 'ar')}><Download/>تصدير Excel</Button>}</div><div className="workflow-report-filter"><div><span>الإجمالي</span><strong>{money(totals.total)}</strong></div><div><span>المدفوع</span><strong>{money(totals.paid)}</strong></div><div><span>المتبقي</span><strong>{money(totals.remaining)}</strong></div><div><span>عدد الخدمات</span><strong>{rows.length}</strong></div></div><DentalRecordsTable rows={rows} canEdit={canEdit} canManage={canManage} onEdit={editVisit} onRemove={removeVisit}/></Panel>}

    {tab === 'doctors' && canManage && <Panel><div className="panel-head"><h3><Stethoscope/>إدارة أطباء الأسنان</h3><Badge color="violet">متاح لمهندس محمد</Badge></div><form className="form-grid" onSubmit={saveDoctor}><Field label="اسم المستخدم"><input value={doctorForm.staffId} onChange={e => setDoctorForm(v => ({ ...v, staffId: e.target.value }))} disabled={Boolean(editingDoctorId)} placeholder="Dr.Name"/></Field><Field label="كلمة المرور"><input value={doctorForm.password} onChange={e => setDoctorForm(v => ({ ...v, password: e.target.value }))} placeholder={editingDoctorId ? 'اتركها فارغة بدون تغيير' : 'Dental@2026'}/></Field><Field label="اسم الطبيب"><input value={doctorForm.name} onChange={e => setDoctorForm(v => ({ ...v, name: e.target.value }))}/></Field><Field label="الجوال"><input value={doctorForm.phone} onChange={e => setDoctorForm(v => ({ ...v, phone: e.target.value }))}/></Field><Field label="التخصص"><input value={doctorForm.specialty} onChange={e => setDoctorForm(v => ({ ...v, specialty: e.target.value }))}/></Field><Field label="الدوام/ملاحظات الطبيب"><input value={doctorForm.scheduleText} onChange={e => setDoctorForm(v => ({ ...v, scheduleText: e.target.value }))}/></Field><FormActions><Button className="btn-primary" type="submit" disabled={saving}><Plus/>{editingDoctorId ? 'حفظ الطبيب' : 'إضافة طبيب'}</Button>{editingDoctorId && <Button className="btn-ghost" onClick={() => { setEditingDoctorId(null); setDoctorForm(emptyDoctorForm()); }}>إلغاء</Button>}</FormActions></form><div className="table-wrap"><table><thead><tr><th>الطبيب</th><th>المستخدم</th><th>الجوال</th><th>الدوام</th><th/></tr></thead><tbody>{dentalDoctors.map(doctor => <tr key={doctor.id}><td><b>{doctor.name}</b><small>{doctor.specialty || 'طب الأسنان'}</small></td><td>{doctor.staffId}</td><td>{doctor.phone || '—'}</td><td>{doctor.scheduleText || '—'}</td><td className="row-actions"><Button className="btn-ghost btn-sm" onClick={() => beginDoctorEdit(doctor)}><Pencil/>تعديل</Button><Button className="btn-danger btn-sm" onClick={async () => { if (!window.confirm(`حذف الطبيب ${doctor.name}?`)) return; await hospitalApi.removeDoctor(doctor.id); toast('تم حذف الطبيب'); await loadBase(); }}><Trash2/>حذف</Button></td></tr>)}</tbody></table></div></Panel>}
  </div>;
}

function DentalRecordsTable({ rows, canEdit, canManage, onEdit, onRemove }:{ rows:DentalVisitResource[]; canEdit:boolean; canManage:boolean; onEdit:(row:DentalVisitResource)=>void; onRemove:(row:DentalVisitResource)=>void }) {
  if (!rows.length) return <Panel><EmptyState title="لا توجد سجلات أسنان" sub="سجّل خدمة أو غيّر الفترة لعرض البيانات."/></Panel>;
  return <Panel><div className="panel-head"><h3><ClipboardList/>سجلات عيادة الأسنان</h3><Badge color="cyan">{rows.length}</Badge></div><div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>المريض</th><th>الطبيب</th><th>الخدمة</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>ملاحظات</th><th/></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.visitDate}<small>دور: {row.queueNumber || '—'}</small></td><td><b>{row.patient?.fullName || '—'}</b><small>{row.patient?.idNumber || '—'} · {row.patient?.phone || '—'} · {row.patient?.medicalSerial || '—'}</small></td><td>{row.doctor?.name || '—'}</td><td>{row.serviceLabel}</td><td><b>{money(row.totalAmount)}</b></td><td>{money(row.paidAmount)}</td><td><b>{money(row.remainingAmount)}</b></td><td><Badge color={row.status === 'cancelled' ? 'rose' : row.status === 'completed' ? 'emerald' : row.remainingAmount > 0 ? 'amber' : 'cyan'}>{row.status === 'cancelled' ? 'ملغي' : row.status === 'completed' ? 'مكتمل' : row.remainingAmount > 0 ? 'متبقي' : 'مدفوع'}</Badge></td><td>{row.notes || '—'}</td><td className="row-actions">{canEdit && <Button className="btn-ghost btn-sm" onClick={() => onEdit(row)}><Pencil/>تعديل</Button>}{canManage && <Button className="btn-danger btn-sm" onClick={() => onRemove(row)}><Trash2/>حذف</Button>}</td></tr>)}</tbody></table></div></Panel>;
}
