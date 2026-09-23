import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, FileText, Printer, RefreshCw, Search, Stethoscope } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Badge, Button, EmptyState, Field, FormActions, PageHeader, Panel } from '../components/ui';
import { useUi } from '../context/UiContext';
import { useI18n } from '../i18n';
import { hospitalApi, type CreateOperationCaseDTO } from '../services/hospitalApi.service';
import type { OperationCase, OperationLookupRecord } from '../types';
import { captureElementCanvas, createSilentExportFrame, removeExportHosts } from '../utils/documentDownload';

const today = () => new Date().toISOString().slice(0, 10);
const nowHm = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
const fallback = (value: unknown, d = '') => String(value ?? '').trim() || d;
const dateDisplay = (value?: string) => value ? value.split('-').reverse().join('/') : '';
const ageFromDob = (dob?: string) => {
  if (!dob) return '';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return String(age);
};

const defaultReferralEntities = ['عمليات', 'خاص', 'مشروع', 'وزارة الصحة', 'تأمين خاص', 'جمعية خيرية'];
const customReferralKey = 'wafa_operations_custom_referrals_v1';
const loadCustomReferrals = () => {
  try { return JSON.parse(localStorage.getItem(customReferralKey) || '[]') as string[]; } catch { return []; }
};
const saveCustomReferrals = (items: string[]) => localStorage.setItem(customReferralKey, JSON.stringify(Array.from(new Set(items.filter(Boolean)))));

const initialRegistry: OperationLookupRecord = {
  source: 'civil_registry',
  patientId: null,
  medicalSerial: '',
  fullName: '',
  idNumber: '',
  dob: '',
  gender: 'male',
  phone: '',
  city: '',
  area: '',
  address: '',
  coverageEntity: 'self',
};

const admissionPermitCss = `
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-shadow:none!important;filter:none!important}
  html,body{margin:0;background:#fff;color:#000;font-family:Tahoma,"Times New Roman",Arial,sans-serif;direction:rtl}
  .op-permit-page{position:relative;width:794px;height:1123px;min-height:1123px;background:#fff;color:#000;padding:92px 52px 48px;direction:rtl;font-family:Tahoma,"Times New Roman",Arial,sans-serif;overflow:hidden}
  .op-logo{position:absolute;left:58px;top:54px;width:72px;height:72px;object-fit:contain}
  .op-date{position:absolute;right:430px;top:70px;font-size:15px;font-weight:900;display:flex;gap:22px;direction:ltr;align-items:center}
  .op-date b{font-weight:900}.op-date span{direction:rtl}
  .op-main-title{text-align:center;text-decoration:underline;font-weight:900;font-size:20px;margin:16px 0 18px;line-height:1.3}
  .op-section-title{text-align:right;text-decoration:underline;font-size:18px;font-weight:900;margin:0 90px 12px 0}
  .op-box{border:2.2px solid #000;border-radius:30px;padding:20px 34px;margin:0 0 22px;height:auto;min-height:228px;position:relative}
  .op-personal{min-height:238px}
  .op-case{min-height:286px}
  .op-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px 70px;font-size:15px;font-weight:800;line-height:2.05}
  .op-field{white-space:nowrap;display:flex;align-items:baseline;gap:6px;justify-content:flex-start}.op-field b{text-decoration:underline;font-weight:900}.op-field span{font-weight:900;min-width:72px;text-align:right}
  .op-field.wide{grid-column:1/3}.op-field.center{text-align:center;justify-content:center}.op-ltr{direction:ltr;unicode-bidi:isolate}
  .op-commit-row{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:12px;font-size:15px;font-weight:800}.op-check{display:inline-flex;align-items:center;gap:14px;margin:0 12px}.op-check i{display:inline-block;min-width:54px;border-bottom:1.7px solid #000;text-align:center;font-style:normal}.op-check b{font-weight:900;text-decoration:underline}.op-other-line{margin-top:18px;font-size:15px;font-weight:800}.op-other-line b{text-decoration:underline}.op-other-line span{display:inline-block;width:310px;border-bottom:2px solid #000;vertical-align:middle}
  .op-final{font-size:15px;font-weight:800;margin:10px 14px 0;display:flex;align-items:center;gap:8px}.op-final .fill-line{display:inline-block;border-bottom:1.8px solid #000;min-width:235px;height:19px}.op-footer{display:flex;justify-content:space-between;margin:18px 14px 0 0;font-size:14px;font-weight:900;text-decoration:underline;padding-left:410px}
`;

function buildAdmissionPermit(caseItem: OperationCase) {
  const gender = caseItem.gender === 'female' ? 'أنثى' : 'ذكر';
  const birthYear = (caseItem.dob || '').slice(0, 4);
  const admission = dateDisplay(caseItem.admissionDate);
  const discharge = dateDisplay(caseItem.dischargeDate || '');
  const nowTime = caseItem.admissionTime || nowHm();
  return `<section class="op-permit-page">
    <img class="op-logo" src="/wafaa-hospital-logo.png" alt="Wafaa Hospital"/>
    <div class="op-date"><span>التاريخ:</span><b>${escapeHtml(admission || dateDisplay(today()))}</b><b>${escapeHtml(nowTime)}</b></div>
    <div class="op-main-title">إذن دخول مريض</div>
    <div class="op-section-title">البيانات الشخصية</div>
    <div class="op-box op-personal">
      <div class="op-grid">
        <div class="op-field"><b>رقم المريض:</b><span class="op-ltr">${escapeHtml(caseItem.medicalSerial)}</span></div>
        <div class="op-field"><b>اسم المريض:</b><span>${escapeHtml(caseItem.patientName)}</span></div>
        <div class="op-field"><b>رقم الهوية:</b><span class="op-ltr">${escapeHtml(caseItem.idNumber)}</span></div>
        <div class="op-field"><b>الجنس:</b><span>${escapeHtml(gender)}</span></div>
        <div class="op-field"><b>سنة الميلاد:</b><span class="op-ltr">${escapeHtml(birthYear)}</span></div>
        <div class="op-field"><b>العنوان:</b><span>${escapeHtml(caseItem.address || caseItem.area || caseItem.city || '')}</span></div>
        <div class="op-field"><b>رقم الهاتف:</b><span class="op-ltr">${escapeHtml(caseItem.phone)}</span></div>
        <div class="op-field"><b>المهنة:</b><span></span></div>
        <div class="op-field"><b>رقم التأمين:</b><span>${escapeHtml(caseItem.insuranceNumber || '')}</span></div>
        <div class="op-field"><b>مواطن / لاجئ:</b><span>${escapeHtml(caseItem.maritalStatus || '')}</span></div>
      </div>
    </div>
    <div class="op-section-title">بيانات الحالة</div>
    <div class="op-box op-case">
      <div class="op-grid">
        <div class="op-field"><b>رقم الحالة:</b><span class="op-ltr">${escapeHtml(caseItem.caseNumber || '')}</span></div>
        <div class="op-field"><b>تاريخ التحويل:</b><span class="op-ltr">${escapeHtml(admission)}</span></div>
        <div class="op-field"><b>جهة التحويل:</b><span>${escapeHtml(caseItem.referralEntity)}</span></div>
        <div class="op-field"><b>القسم:</b><span>${escapeHtml(caseItem.department || 'عمليات')}</span></div>
        <div class="op-field"><b>سبب التحويل:</b><span>${escapeHtml(caseItem.conversionReason || '')}</span></div>
        <div class="op-field"><b>مدة التحويل:</b><span>${escapeHtml(caseItem.conversionDuration || '')}</span></div>
      </div>
      <div class="op-commit-row">
        <div><b>التزام الجهة المحولة:</b><span class="op-check">موجود <i></i></span><span class="op-check">غير موجود <i></i></span></div>
        <div></div>
        <div><b>التزام الأهل:</b><span class="op-check">موجود <i></i></span><span class="op-check">غير موجود <i></i></span></div>
        <div></div>
      </div>
      <div class="op-other-line"><b>التزامات أخرى:</b> <span></span></div>
    </div>
    <div class="op-final">يسمح للمريض المذكور أعلاه بالدخول لقسم <span class="fill-line"></span> اعتباراً من تاريخ <b>${escapeHtml(discharge || '20      /      /')}</b></div>
    <div class="op-footer"><span>الإدارة الطبية</span></div>
  </section>`;
}

async function downloadAdmissionPermit(caseItem: OperationCase) {
  removeExportHosts();
  const host = await createSilentExportFrame(`<style>${admissionPermitCss}</style>${buildAdmissionPermit(caseItem)}`,794,1220);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = Array.from(host.querySelectorAll('img'));
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
    await new Promise(resolve => window.setTimeout(resolve, 90));
    const page = host.querySelector('.op-permit-page') as HTMLElement | null;
    if (!page) throw new Error('تعذر تجهيز قالب إذن الدخول');
    const canvas = await captureElementCanvas(page, { scale: 1.8, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    pdf.save(`اذن-دخول-مريض-${caseItem.medicalSerial || caseItem.idNumber}.pdf`);
  } finally {
    host.remove();
    removeExportHosts();
  }
}

async function printAdmissionPermit(caseItem: OperationCase) {
  removeExportHosts();
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;height:1123px;border:0;background:#fff;pointer-events:none;z-index:-1;visibility:visible;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); throw new Error('تعذر تجهيز الطباعة'); }
  doc.open();
  doc.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>إذن دخول مريض</title><style>${admissionPermitCss}</style></head><body>${buildAdmissionPermit(caseItem)}</body></html>`);
  doc.close();
  await new Promise(resolve => window.setTimeout(resolve, 250));
  const cleanup = () => { try { frame.remove(); } catch { /* ignore */ } };
  try {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  } finally {
    window.setTimeout(cleanup, 1400);
  }
}

export function OperationAdmissionPage() {
  const { toast } = useUi();
  const { t } = useI18n();
  const [identity, setIdentity] = useState('');
  const [lookup, setLookup] = useState<OperationLookupRecord>(initialRegistry);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [admissionDate, setAdmissionDate] = useState(today());
  const [admissionTime, setAdmissionTime] = useState(nowHm());
  const [dischargeDate, setDischargeDate] = useState('');
  const [stayDays, setStayDays] = useState('');
  const [referralEntity, setReferralEntity] = useState('عمليات');
  const [newReferral, setNewReferral] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [conversionDuration, setConversionDuration] = useState('');
  const [conversionReason, setConversionReason] = useState('');
  const [department, setDepartment] = useState('عمليات');
  const [items, setItems] = useState<OperationCase[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customReferrals, setCustomReferrals] = useState<string[]>(loadCustomReferrals);
  const referrals = useMemo(() => Array.from(new Set([...defaultReferralEntities, ...customReferrals])), [customReferrals]);

  const refresh = async () => {
    try { setItems(await hospitalApi.operationCases(search)); }
    catch { toast('تعذر تحميل حالات العمليات', 'warn'); }
  };

  useEffect(() => { void refresh(); }, []);

  const fetchIdentity = async () => {
    if (!identity.trim()) { toast('أدخل رقم الهوية أولاً', 'warn'); return; }
    setLoading(true);
    try {
      const record = await hospitalApi.operationLookup(identity.trim());
      setLookup(record);
      setPhone(record.phone || '');
      setAddress(record.address || [record.city, record.area].filter(Boolean).join(' - '));
      toast(record.source === 'patient_file' ? 'تم جلب البيانات من ملف المريض' : 'تم جلب البيانات من السجل المدني');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر جلب بيانات الهوية', 'warn');
    } finally { setLoading(false); }
  };

  const addReferral = () => {
    const value = newReferral.trim();
    if (!value) return;
    const next = Array.from(new Set([...customReferrals, value]));
    setCustomReferrals(next);
    saveCustomReferrals(next);
    setReferralEntity(value);
    setNewReferral('');
    toast('تمت إضافة جهة التحويل للقائمة');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lookup.fullName || !lookup.idNumber) { toast('اجلب بيانات المريض برقم الهوية أولاً', 'warn'); return; }
    if (!phone.trim()) { toast('رقم الجوال مطلوب', 'warn'); return; }
    if (!referralEntity.trim()) { toast('جهة التحويل مطلوبة', 'warn'); return; }
    setSaving(true);
    try {
      const dto: CreateOperationCaseDTO = {
        registry_data: {
          fullName: lookup.fullName,
          idNumber: lookup.idNumber,
          dob: lookup.dob,
          gender: lookup.gender,
          city: lookup.city || '',
          area: lookup.area || '',
          coverageEntity: lookup.coverageEntity || 'self',
        },
        phone: phone.trim(),
        address: address.trim(),
        marital_status: maritalStatus.trim(),
        diagnosis: diagnosis.trim(),
        doctor_name: doctorName.trim(),
        admission_date: admissionDate,
        admission_time: admissionTime,
        discharge_date: dischargeDate || undefined,
        stay_days: stayDays ? Number(stayDays) : null,
        referral_entity: referralEntity.trim(),
        department: department.trim() || 'عمليات',
        case_number: caseNumber.trim(),
        insurance_number: insuranceNumber.trim(),
        conversion_duration: conversionDuration.trim(),
        conversion_reason: conversionReason.trim(),
      };
      const item = await hospitalApi.createOperationCase(dto);
      setItems(previous => [item, ...previous.filter(row => row.id !== item.id)]);
      setCaseNumber(item.caseNumber || '');
      toast('تم حفظ حالة العمليات ويمكن الآن طباعة إذن الدخول');
      await downloadAdmissionPermit(item);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر حفظ حالة العمليات', 'warn');
    } finally { setSaving(false); }
  };

  return <>
    <PageHeader
      crumb="قسم العمليات"
      title="العمليات"
      sub="تسجيل حالات العمليات برقم الهوية، إظهار البيانات تلقائياً، ثم طباعة إذن دخول مريض بنفس القالب المعتمد."
      actions={<Button className="btn-ghost" onClick={refresh}><RefreshCw /> تحديث</Button>}
    />

    <div className="operations-layout">
      <Panel className="operations-register-panel">
        <div className="panel-head"><h3><Search /> شاشة تسجيل الحالة</h3><span>رقم الهوية يجلب البيانات من ملف المريض أو API السجل المدني.</span></div>
        <div className="identity-row">
          <Field label="رقم الهوية"><input value={identity} onChange={event => setIdentity(event.target.value)} placeholder="أدخل رقم الهوية" /></Field>
          <Button className="btn-primary" onClick={fetchIdentity} disabled={loading}>{loading ? <RefreshCw className="spin" /> : <Search />} جلب البيانات</Button>
        </div>
        <div className="operations-patient-card glass-strong">
          <div><span>اسم المريض</span><b>{lookup.fullName || '—'}</b></div>
          <div><span>رقم المريض</span><b>{lookup.medicalSerial || 'سيتم توليده عند الحفظ'}</b></div>
          <div><span>الجنس</span><b>{lookup.gender === 'female' ? 'أنثى' : 'ذكر'}</b></div>
          <div><span>سنة الميلاد</span><b>{(lookup.dob || '').slice(0, 4) || '—'}</b></div>
        </div>

        <form onSubmit={submit} className="operations-form">
          <div className="form-grid">
            <Field label="رقم الجوال"><input value={phone} onChange={event => setPhone(event.target.value)} placeholder="05xxxxxxxx" required /></Field>
            <Field label="العنوان"><input value={address} onChange={event => setAddress(event.target.value)} placeholder="المدينة / المنطقة / العنوان" /></Field>
            <Field label="الحالة الاجتماعية"><input value={maritalStatus} onChange={event => setMaritalStatus(event.target.value)} placeholder="أعزب / متزوج / لاجئ..." /></Field>
            <Field label="رقم التأمين"><input value={insuranceNumber} onChange={event => setInsuranceNumber(event.target.value)} /></Field>
          </div>

          <div className="operations-case-block">
            <div className="panel-head compact"><h3><Stethoscope /> شاشة بيانات الحالة</h3><span>هذه البيانات تظهر في إذن دخول المريض.</span></div>
            <div className="form-grid">
              <Field label="التشخيص" span={2}><textarea value={diagnosis} onChange={event => setDiagnosis(event.target.value)} placeholder="التشخيص..." /></Field>
              <Field label="اسم الطبيب"><input value={doctorName} onChange={event => setDoctorName(event.target.value)} placeholder="اسم الطبيب" /></Field>
              <Field label="تاريخ الدخول"><input type="date" value={admissionDate} onChange={event => setAdmissionDate(event.target.value)} required /></Field>
              <Field label="وقت الدخول"><input type="time" value={admissionTime} onChange={event => setAdmissionTime(event.target.value)} /></Field>
              <Field label="تاريخ الخروج"><input type="date" value={dischargeDate} onChange={event => setDischargeDate(event.target.value)} /></Field>
              <Field label="مدة المكوث"><input type="number" min="0" value={stayDays} onChange={event => setStayDays(event.target.value)} placeholder="بالأيام" /></Field>
              <Field label="جهة التحويل"><select value={referralEntity} onChange={event => setReferralEntity(event.target.value)}>{referrals.map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
              <Field label="إضافة جهة أخرى"><div className="inline-input-action"><input value={newReferral} onChange={event => setNewReferral(event.target.value)} placeholder="اسم الجهة" /><Button className="btn-ghost btn-sm" onClick={addReferral}>إضافة</Button></div></Field>
              <Field label="القسم"><input value={department} onChange={event => setDepartment(event.target.value)} /></Field>
              <Field label="رقم الحالة"><input value={caseNumber} onChange={event => setCaseNumber(event.target.value)} placeholder="اختياري - يولد تلقائياً" /></Field>
              <Field label="سبب التحويل"><input value={conversionReason} onChange={event => setConversionReason(event.target.value)} /></Field>
              <Field label="مدة التحويل"><input value={conversionDuration} onChange={event => setConversionDuration(event.target.value)} /></Field>
            </div>
          </div>
          <FormActions>
            <Button className="btn-primary" type="submit" disabled={saving || !lookup.fullName}>{saving ? <RefreshCw className="spin" /> : <FileText />} حفظ وتصدير PDF</Button>
          </FormActions>
        </form>
      </Panel>

      <Panel className="operations-list-panel">
        <div className="panel-head"><h3><Printer /> حالات العمليات المسجلة</h3><span>محفوظة في قاعدة البيانات ولا تختفي بعد التحديث.</span></div>
        <div className="toolbar-row operations-search-row">
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث بالاسم أو الهوية أو رقم المريض أو الطبيب" />
          <Button className="btn-primary" onClick={refresh}><Search /> بحث</Button>
        </div>
        {items.length ? <div className="operations-table-wrap">
          <table className="data-table operations-table">
            <thead><tr><th>التاريخ</th><th>رقم المريض</th><th>اسم المريض</th><th>الهوية</th><th>الطبيب</th><th>جهة التحويل</th><th>القسم</th><th>PDF</th></tr></thead>
            <tbody>{items.map(item => <tr key={item.id}>
              <td>{dateDisplay(item.admissionDate)}</td><td>{item.medicalSerial}</td><td><b>{item.patientName}</b><small>{item.phone}</small></td><td>{item.idNumber}</td><td>{item.doctorName || '—'}</td><td><Badge color="cyan">{item.referralEntity}</Badge></td><td>{item.department || 'عمليات'}</td>
              <td><div className="row-actions"><Button className="btn-ghost btn-sm" onClick={() => downloadAdmissionPermit(item)}><FileText /> PDF</Button><Button className="btn-ghost btn-sm" onClick={() => printAdmissionPermit(item)}><Printer /> طباعة</Button></div></td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title="لا توجد حالات عمليات" sub="سجل حالة جديدة أو غيّر كلمات البحث." />}
      </Panel>
    </div>
  </>;
}
