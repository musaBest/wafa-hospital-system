import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Building2, CalendarClock, Check, DatabaseZap, Plus, RefreshCw, Search, Ticket, UserRound, Users } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, PageHeader, Panel } from '../components/ui';
import { useUi } from '../context/UiContext';
import { fetchCivilRegistry } from '../services/civilRegistry.service';
import { hospitalApi } from '../services/hospitalApi.service';
import type { CashierWorkflowCase, CivilRegistryRecord, Clinic, Doctor, FollowUpAppointment, Patient, Visit } from '../types';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const appointmentComputed = (item: FollowUpAppointment) => item.computedStatus || (item.status === 'scheduled' && item.date < today() ? 'auto_closed' : item.status);
const appointmentLabel = (item: FollowUpAppointment) => item.statusLabel || (appointmentComputed(item) === 'auto_closed' ? 'تم إنهاء الحالة تلقائياً' : item.status === 'scheduled' ? 'مراجعة مجدولة' : item.status === 'booked' ? 'تم تسجيل زيارة المراجعة' : item.status === 'completed' ? 'مكتملة' : 'ملغية');
const normalizePatient = (value: unknown): Patient => {
  const raw = (value && typeof value === 'object' && 'data' in value) ? (value as { data: Patient }).data : value as Patient;
  return { ...raw, walletBalance: Number(raw?.walletBalance || 0), ledger: raw?.ledger || [], findings: raw?.findings || [], appointments: raw?.appointments || [] };
};
const normalizeVisit = (value: unknown): Visit => (value && typeof value === 'object' && 'data' in value) ? (value as { data: Visit }).data : value as Visit;
const workflowStatusLabel = (status: CashierWorkflowCase['status']) => status === 'registered' ? 'بانتظار الدفع' : status === 'paid' ? 'مدفوع / عند المحصل' : status === 'collected' ? 'جاهز للطبيب' : 'مدقق مالياً';
const normalizeArabicSearch = (value: string) => value
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/[\u064B-\u065F\u0640]/g, '')
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .trim();
const workflowToPatient = (item: CashierWorkflowCase): Patient => ({
  id: item.patientId,
  medicalSerial: item.medicalSerial,
  fullName: item.patientName,
  idNumber: item.idNumber || '',
  dob: item.patientDob || '',
  gender: item.patientGender || 'male',
  phone: item.patientPhone || '',
  city: item.patientCity || '',
  area: item.patientArea || '',
  coverageEntity: item.coverageEntity || 'self',
  regDate: item.visitDate,
  findings: [],
  walletBalance: 0,
  ledger: [],
  appointments: [],
});

export function RegistrationDeskPage() {
  const { toast } = useUi();
  const [identity, setIdentity] = useState('');
  const [phone, setPhone] = useState('');
  const [record, setRecord] = useState<CivilRegistryRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinicId, setClinicId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [visitBusy, setVisitBusy] = useState(false);
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);
  const [visitDate, setVisitDate] = useState(today());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [recentVisits, setRecentVisits] = useState<CashierWorkflowCase[]>([]);
  const [recentBusy, setRecentBusy] = useState(false);

  const refreshCatalog = async () => {
    try {
      const [clinicRows, doctorRows] = await Promise.all([hospitalApi.clinics(), hospitalApi.doctors()]);
      setClinics(clinicRows.filter(item => item.active && item.kind !== 'inpatient'));
      setDoctors(doctorRows.filter(item => item.active));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر تحميل العيادات والأطباء', 'warn');
    }
  };

  const loadRecentVisits = async () => {
    setRecentBusy(true);
    try { setRecentVisits(await hospitalApi.registrationVisits()); }
    catch (error) { toast(error instanceof Error ? error.message : 'تعذر تحميل آخر الزيارات المسجلة', 'warn'); }
    finally { setRecentBusy(false); }
  };

  useEffect(() => { void refreshCatalog(); void loadRecentVisits(); }, []);

  const eligibleDoctors = useMemo(() => doctors.filter(doctor => !clinicId || doctor.clinics.includes(clinicId)), [doctors, clinicId]);
  const selectedClinic = clinics.find(item => item.id === clinicId);
  const selectedDoctor = doctors.find(item => item.id === doctorId);
  const patientAppointments = useMemo(() => (patient?.appointments || []).slice().sort((a,b)=>a.date.localeCompare(b.date)), [patient]);
  const openFollowups = patientAppointments.filter(item => item.status === 'scheduled');

  useEffect(() => {
    if (!eligibleDoctors.some(item => item.id === doctorId)) setDoctorId(eligibleDoctors[0]?.id || '');
  }, [clinicId, doctors]);

  const clearSelection = () => {
    setPatient(null); setRecord(null); setIdentity(''); setPhone(''); setLastVisit(null); setSelectedAppointmentId(''); setVisitDate(today());
  };

  const lookup = async () => {
    const id = identity.trim();
    if (!/^\d{7,12}$/.test(id)) { toast('أدخل رقم هوية صحيح', 'warn'); return; }
    if (phone.trim().length < 7) { toast('أدخل رقم الجوال أولاً', 'warn'); return; }
    setLookupBusy(true); setPatient(null); setRecord(null); setLastVisit(null);
    try {
      const existingRows = await hospitalApi.patientSearch(id);
      const existing = existingRows.find(item => item.idNumber === id);
      if (existing) {
        const normalized = normalizePatient(existing);
        setPatient(normalized);
        setPhone(normalized.phone || phone.trim());
        setRecord({
          fullName: normalized.fullName, idNumber: normalized.idNumber, dob: normalized.dob,
          gender: normalized.gender, city: normalized.city || '', area: normalized.area || '', coverageEntity: normalized.coverageEntity || 'self',
        });
        toast(`المريض مسجل مسبقاً برقم ${normalized.medicalSerial}`);
        return;
      }
      const registry = await fetchCivilRegistry(id);
      setRecord(registry);
      toast('تم جلب بيانات المريض من السجل المدني');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر جلب بيانات المريض', 'warn');
    } finally { setLookupBusy(false); }
  };

  const registerPatient = async () => {
    if (!record || patient) return;
    setSaveBusy(true);
    try {
      const created = normalizePatient(await hospitalApi.registerPatient({ identity_or_name: record.idNumber, phone: phone.trim(), registry_data: record }) as unknown);
      setPatient(created);
      toast(`تم تسجيل المريض بنجاح · رقم المريض ${created.medicalSerial}`);
    } catch (error) {
      // If another desk registered the same ID a moment earlier, resolve it instead of duplicating it.
      try {
        const rows = await hospitalApi.patientSearch(record.idNumber);
        const existing = rows.find(item => item.idNumber === record.idNumber);
        if (existing) { setPatient(normalizePatient(existing)); toast('المريض أصبح مسجلاً بالفعل وتم فتح بياناته'); return; }
      } catch { /* preserve original error */ }
      toast(error instanceof Error ? error.message : 'تعذر تسجيل المريض', 'warn');
    } finally { setSaveBusy(false); }
  };

  const searchPatients = async (event?: FormEvent) => {
    event?.preventDefault();
    const term = search.trim();
    if (!term) { setResults([]); return; }
    setSearchBusy(true);
    try {
      const [apiRowsRaw, latestVisits] = await Promise.all([
        hospitalApi.patientSearch(term),
        hospitalApi.registrationVisits(),
      ]);
      setRecentVisits(latestVisits);
      const apiRows = apiRowsRaw.map(normalizePatient);
      const normalizedTerm = normalizeArabicSearch(term);
      const recentRows = latestVisits
        .filter(item => normalizeArabicSearch(`${item.patientName} ${item.medicalSerial} ${item.idNumber || ''} ${item.patientPhone || ''}`).includes(normalizedTerm))
        .map(workflowToPatient);
      const merged = new Map<string, Patient>();
      [...apiRows, ...recentRows].forEach((item, index) => {
        const key = item.id || item.medicalSerial || item.idNumber || `${item.fullName}-${index}`;
        merged.set(key, item);
      });
      setResults([...merged.values()]);
    }
    catch (error) { toast(error instanceof Error ? error.message : 'تعذر البحث عن المريض', 'warn'); }
    finally { setSearchBusy(false); }
  };

  const choosePatient = (item: Patient) => {
    setPatient(item); setIdentity(item.idNumber); setPhone(item.phone || ''); setRecord({
      fullName:item.fullName,idNumber:item.idNumber,dob:item.dob,gender:item.gender,city:item.city||'',area:item.area||'',coverageEntity:item.coverageEntity||'self',
    });
    setLastVisit(null); setSelectedAppointmentId(''); setVisitDate(today());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectFollowUp = (appointment: FollowUpAppointment) => {
    if (appointmentComputed(appointment) === 'auto_closed') { toast('هذه المراجعة انتهى موعدها تلقائياً، يمكن تسجيل زيارة جديدة عادية إذا لزم الأمر.', 'warn'); return; }
    setSelectedAppointmentId(appointment.id);
    setClinicId(appointment.clinicId);
    setDoctorId(appointment.doctorId);
    setVisitDate(appointment.date);
    toast('تم تجهيز نموذج الزيارة حسب موعد المراجعة المحدد');
  };

  const registerVisit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!patient || !clinicId || !doctorId) { toast('اختر المريض والعيادة والطبيب', 'warn'); return; }
    const data = new FormData(form);
    setVisitBusy(true);
    try {
      const visit = normalizeVisit(await hospitalApi.registerVisit({
        patient_id: patient.id, clinic_id: clinicId, doctor_id: doctorId,
        visit_date: String(data.get('date') || visitDate || today()), notes: String(data.get('notes') || ''), appointment_id: selectedAppointmentId || undefined,
      }) as unknown);
      setLastVisit(visit);
      toast(`${selectedAppointmentId ? 'تم تسجيل زيارة المراجعة' : 'تم تسجيل الزيارة بدون اشتراط الدفع'} · رقم الدور ${selectedClinic?.code || 'CLN'}-${visit.queueNumber}`);
      await loadRecentVisits();
      form.reset(); setSelectedAppointmentId(''); setVisitDate(today());
    } catch (error) { toast(error instanceof Error ? error.message : 'تعذر تسجيل الزيارة', 'warn'); }
    finally { setVisitBusy(false); }
  };

  return <>
    <PageHeader crumb="الاستقبال والتسجيل" title="تسجيل المرضى والزيارات" sub="المستخدم الأول: تسجيل المريض برقم الهوية والجوال ثم إنشاء الزيارة والعيادة والطبيب فقط، بدون اشتراط الدفع." />

    <div className="registration-desk-grid">
      <Panel className="registration-card">
        <div className="panel-head"><h3><DatabaseZap />تسجيل / فتح مريض بالهوية</h3><Badge color="violet">السجل المدني</Badge></div>
        <div className="form-grid compact-form">
          <Field label="رقم الهوية" span={2}><input dir="ltr" value={identity} onChange={e => { setIdentity(e.target.value.replace(/\D/g, '')); setRecord(null); setPatient(null); }} placeholder="أدخل رقم الهوية" /></Field>
          <Field label="رقم الجوال"><input dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" /></Field>
        </div>
        <FormActions>
          <Button className="btn-primary" onClick={() => void lookup()} disabled={lookupBusy}><DatabaseZap />{lookupBusy ? 'جارٍ الجلب...' : 'جلب البيانات'}</Button>
          {(record || patient) && <Button className="btn-ghost" onClick={clearSelection}>تفريغ</Button>}
        </FormActions>

        {record && <div className="registry-result registration-registry-result glass">
          <div className="verified-head"><BadgeCheck /><b>{patient ? 'مريض مسجل مسبقاً' : 'بيانات موثقة وجاهزة للتسجيل'}</b></div>
          <div className="registry-data">
            <span>الاسم الكامل<b>{record.fullName}</b></span><span>رقم الهوية<b dir="ltr">{record.idNumber}</b></span>
            <span>تاريخ الميلاد<b>{record.dob}</b></span><span>الجنس<b>{record.gender === 'male' ? 'ذكر' : 'أنثى'}</b></span>
            <span>المدينة<b>{record.city || '—'}</b></span><span>رقم الجوال<b dir="ltr">{phone || patient?.phone || '—'}</b></span>
            {patient && <span>رقم المريض<b>{patient.medicalSerial}</b></span>}
          </div>
          {!patient && <Button className="btn-primary" onClick={() => void registerPatient()} disabled={saveBusy}><Plus />{saveBusy ? 'جارٍ التسجيل...' : 'تأكيد تسجيل المريض'}</Button>}
        </div>}
        {patient && openFollowups.length > 0 && <div className="registration-followups glass">
          <div className="verified-head"><CalendarClock/><b>مراجعات المريض</b></div>
          <p>عند حضور المريض للمراجعة اختر الموعد لتسجيل الزيارة بنفس الطبيب والعيادة. إذا مر موعد المراجعة بدون تسجيل تظهر كحالة منتهية تلقائياً.</p>
          <div className="registration-followup-list">{openFollowups.map(item => { const computed = appointmentComputed(item); return <button type="button" key={item.id} onClick={() => selectFollowUp(item)} className={selectedAppointmentId === item.id ? 'active' : ''}>
            <CalendarClock/><span><b>{item.date}</b><small>{appointmentLabel(item)}{item.reason ? ` · ${item.reason}` : ''}</small></span><Badge color={computed === 'auto_closed' ? 'coral' : item.date === today() ? 'emerald' : 'amber'}>{computed === 'auto_closed' ? 'منتهية' : item.date === today() ? 'اليوم' : 'قادمة'}</Badge>
          </button> })}</div>
        </div>}
      </Panel>

      <Panel className="registration-card">
        <div className="panel-head"><h3><Search />البحث عن مريض مسجل</h3><span>بالاسم أو الهوية أو رقم المريض</span></div>
        <form className="registration-search" onSubmit={searchPatients}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="اكتب اسم المريض..." /><Button className="btn-primary" type="submit" disabled={searchBusy}><Search />بحث</Button></form>
        {results.length ? <div className="registration-search-results">{results.map(item => <button key={item.id} type="button" onClick={() => choosePatient(item)}><UserRound /><span><b>{item.fullName}</b><small>{item.medicalSerial} · {item.idNumber} · {item.phone}</small></span><Check /></button>)}</div> : search && !searchBusy ? <EmptyState title="لا توجد نتائج" sub="جرّب الاسم الكامل أو رقم الهوية." /> : null}
      </Panel>
    </div>

    <Panel className="visit-registration-panel">
      <div className="panel-head"><h3><Building2 />تسجيل زيارة جديدة</h3>{patient ? <Badge color="emerald">{patient.fullName} · {patient.medicalSerial}</Badge> : <Badge color="amber">اختر المريض أولاً</Badge>}</div>
      {patient ? <form onSubmit={registerVisit}>
        <div className="form-grid">
          <Field label="العيادة" span={2}><select value={clinicId} onChange={e => setClinicId(e.target.value)} required><option value="">— اختر العيادة —</option>{clinics.map(item => <option key={item.id} value={item.id}>{item.nameAr} · {item.code || item.key}</option>)}</select></Field>
          <Field label="الطبيب"><select value={doctorId} onChange={e => setDoctorId(e.target.value)} required><option value="">— اختر الطبيب —</option>{eligibleDoctors.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="تاريخ الزيارة"><input name="date" type="date" value={visitDate} onChange={e=>setVisitDate(e.target.value)} required /></Field>
          <Field label="ملاحظات" span={2}><textarea name="notes" placeholder="ملاحظات الاستقبال - اختياري" /></Field>
        </div>
        {selectedDoctor?.scheduleText && <div className="doctor-schedule-hint"><RefreshCw /><span><b>موعد الطبيب:</b> {selectedDoctor.scheduleText}</span></div>}
        {selectedAppointmentId && <div className="registration-payment-note followup-selected-note">هذه زيارة مراجعة مرتبطة بموعد سابق وستظهر للطبيب بعد استكمال الدفع والتحصيل.</div>}
        <div className="registration-payment-note">لا يشترط دفع الرسوم في هذه المرحلة. تنتقل الحالة مباشرةً إلى موظف التطبيق والتحصيل البنكي لاستكمال الدفع.</div>
        <FormActions><Button className="btn-primary" type="submit" disabled={visitBusy || !clinicId || !doctorId}><Ticket />{visitBusy ? 'جارٍ تسجيل الزيارة...' : 'تسجيل الزيارة وإعطاء رقم الدور'}</Button></FormActions>
      </form> : <EmptyState title="اختر أو سجّل المريض" sub="بعد اختيار المريض ستظهر هنا العيادات والأطباء وتسجيل الزيارة." />}

      {lastVisit && <div className="visit-ticket-success"><BadgeCheck /><div><b>تم تسجيل الزيارة بنجاح</b><span>{selectedClinic?.nameAr} · {selectedDoctor?.name}</span></div><strong>{selectedClinic?.code || 'CLN'}-{lastVisit.queueNumber}</strong><small>بانتظار التحصيل المالي</small></div>}
    </Panel>

    <Panel className="registration-recent-panel">
      <div className="panel-head"><h3><Users />آخر الزيارات المسجلة من الاستقبال</h3><Button className="btn-ghost btn-sm" onClick={() => void loadRecentVisits()} disabled={recentBusy}><RefreshCw />تحديث</Button></div>
      {recentVisits.length ? <div className="table-wrap"><table className="workflow-table"><thead><tr><th>المريض</th><th>رقم المريض</th><th>العيادة</th><th>الطبيب</th><th>الدور</th><th>الحالة</th><th>وقت التسجيل</th></tr></thead><tbody>
        {recentVisits.map(item => <tr key={item.id}><td><b>{item.patientName}</b><small>{item.idNumber || '—'} · {item.patientPhone || '—'}</small></td><td>{item.medicalSerial}</td><td>{item.clinicName}</td><td>{item.doctorName}</td><td><b>{item.clinicCode}-{item.queueNumber}</b></td><td><Badge color={item.status === 'registered' ? 'amber' : item.status === 'paid' ? 'violet' : 'emerald'}>{workflowStatusLabel(item.status)}</Badge></td><td>{item.registeredAt ? new Date(item.registeredAt).toLocaleString('ar-EG') : '—'}</td></tr>)}
      </tbody></table></div> : <EmptyState title="لا توجد زيارات مسجلة" sub="أي زيارة تسجلها ستبقى محفوظة هنا بعد التحديث لأنها مربوطة بقاعدة البيانات." />}
    </Panel>
  </>;
}
