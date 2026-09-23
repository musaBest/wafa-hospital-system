import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Printer, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, FormActions, Panel } from '../components/ui';
import { useHospital } from '../context/HospitalContext';
import { useUi } from '../context/UiContext';
import {
  downloadFinancialDeclarationPdf,
  downloadFinancialDeclarationWord,
  financialDeclarationCss,
  financialDeclarationMarkup,
  printFinancialDeclaration,
  type FinancialDeclarationData,
} from '../utils/financialDeclarationExport';

const today = () => new Date().toISOString().slice(0, 10);
const STORAGE = 'wafaa_inpatient_financial_declarations_v2';
type Saved = FinancialDeclarationData & { id: string; createdAt: string };
const load = (): Saved[] => {
  try {
    const x = JSON.parse(localStorage.getItem(STORAGE) || localStorage.getItem('wafaa_inpatient_financial_declarations_v1') || '[]');
    return Array.isArray(x)
      ? x.map(item => ({ age: '', stayDays: '', ...item }))
      : [];
  } catch { return []; }
};

const ageFromDob = (dob?: string) => {
  if (!dob) return '';
  const birth = new Date(`${dob.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
};
const stayDaysBetween = (from?: string, to?: string) => {
  if (!from) return '';
  const a = new Date(`${from.slice(0, 10)}T12:00:00`);
  const b = new Date(`${(to || today()).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  return String(Math.max(1, Math.floor((b.getTime() - a.getTime()) / 86400000) + 1));
};
const emptyForm = (): FinancialDeclarationData => ({
  name: '',
  date: today(),
  year: today().slice(0, 4),
  age: '',
  stayDays: '',
  dailyAmount: '',
  totalAmount: '',
});

export function InpatientFinancialDeclarationFile() {
  const { patients, admissions } = useHospital();
  const { toast } = useUi();
  const [records, setRecords] = useState<Saved[]>(load);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FinancialDeclarationData>(emptyForm);
  const normalizedForm = useMemo(() => ({
    ...form,
    year: form.year || (form.date ? form.date.slice(0, 4) : today().slice(0, 4)),
  }), [form]);

  const patientMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return patients.filter(p => `${p.fullName} ${p.idNumber} ${p.medicalSerial}`.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, query]);

  const choosePatient = (patientId: string) => {
    const p = patients.find(item => item.id === patientId);
    const adm = admissions.find(a => a.patientId === patientId && a.status === 'admitted') || admissions.find(a => a.patientId === patientId);
    if (!p) return;
    setForm(v => ({
      ...v,
      name: p.fullName,
      age: ageFromDob(p.dob) || v.age,
      stayDays: stayDaysBetween(adm?.admissionDate, adm?.dischargedAt?.slice(0, 10)) || v.stayDays,
      dailyAmount: adm?.dailyRate ? String(adm.dailyRate) : v.dailyAmount,
    }));
    setQuery('');
  };

  const save = () => {
    if (!form.name.trim() || !form.date || !form.year.trim() || !form.age.trim() || !form.stayDays.trim() || !form.dailyAmount.trim() || !form.totalAmount.trim()) {
      toast('أكمل الاسم والتاريخ والسنة والعمر ومدة الأيام والمبلغ لكل ليلة والمبلغ الإجمالي', 'warn');
      return;
    }
    const next = [{ ...form, id: `FDEC-${Date.now()}`, createdAt: new Date().toISOString() }, ...records];
    setRecords(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
    toast('تم حفظ ملف الإقرار المالي');
  };
  const remove = (id: string) => {
    const next = records.filter(r => r.id !== id);
    setRecords(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
    toast('تم حذف الإقرار المحفوظ');
  };

  useEffect(() => {
    if (form.name) return;
    const admitted = admissions.find(a => a.status === 'admitted');
    const patient = admitted && patients.find(p => p.id === admitted.patientId);
    if (patient) {
      setForm(v => ({
        ...v,
        name: patient.fullName,
        age: ageFromDob(patient.dob),
        stayDays: stayDaysBetween(admitted.admissionDate, admitted.dischargedAt?.slice(0, 10)),
        dailyAmount: String(admitted.dailyRate || ''),
      }));
    }
  }, []);

  return <div className="financial-declaration-shell">
    <section className="financial-declaration-hero glass-strong">
      <div><span><Sparkles />ملف الإقرار المالي</span><h2>سند إقرار والتزام<br /><em>بنفس القالب الرسمي.</em></h2><p>أدخل الاسم والعمر ومدة الأيام والمبالغ، ثم صدّر PDF / Word بدون شاشة بيضاء مزعجة.</p></div>
      <Badge color="emerald">A4 رسمي</Badge>
    </section>
    <div className="financial-declaration-layout">
      <Panel className="financial-declaration-editor">
        <div className="panel-head"><h3><FileText />بيانات الإقرار</h3></div>
        <label className="declaration-patient-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="اختياري: ابحث عن مريض لتعبئة الاسم والعمر ومدة المبيت تلقائياً" /></label>
        {patientMatches.length > 0 && <div className="declaration-patient-results">{patientMatches.map(p => <button key={p.id} type="button" onClick={() => choosePatient(p.id)}><b>{p.fullName}</b><span>{p.idNumber} · {p.medicalSerial}</span></button>)}</div>}
        <div className="declaration-form-grid">
          <label><span>الاسم</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="date-field"><span>التاريخ</span><input type="date" dir="ltr" value={form.date} onChange={e => setForm({ ...form, date: e.target.value, year: e.target.value.slice(0, 4) || form.year })} /></label>
          <label><span>السنة</span><input inputMode="numeric" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></label>
          <label><span>العمر</span><input type="number" min="0" max="130" inputMode="numeric" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="مثال: 42" /></label>
          <label><span>مدة المبيت / عدد الأيام</span><input type="number" min="1" inputMode="numeric" value={form.stayDays} onChange={e => setForm({ ...form, stayDays: e.target.value })} placeholder="مثال: 7" /></label>
          <label><span>المبلغ المستحق لكل ليلة (شيكل)</span><input type="number" min="0" step="0.01" value={form.dailyAmount} onChange={e => setForm({ ...form, dailyAmount: e.target.value })} /></label>
          <label className="span2"><span>المبلغ الإجمالي (شيكل)</span><input type="number" min="0" step="0.01" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} /></label>
        </div>
        <FormActions>
          <Button className="btn-primary" type="button" onClick={save}><Save />حفظ الإقرار</Button>
          <Button className="btn-ghost" type="button" onClick={() => void printFinancialDeclaration(normalizedForm)}><Printer />طباعة</Button>
          <Button className="btn-ghost" type="button" onClick={() => void downloadFinancialDeclarationPdf(normalizedForm)}><Download />PDF</Button>
          <Button className="btn-ghost" type="button" onClick={() => void downloadFinancialDeclarationWord(normalizedForm)}><FileText />Word</Button>
        </FormActions>
        {records.length > 0 && <div className="declaration-history"><b>الإقرارات المحفوظة</b>{records.slice(0, 10).map(r => <article key={r.id}><button type="button" onClick={() => setForm({ name: r.name, date: r.date, year: r.year, age: r.age || '', stayDays: r.stayDays || '', dailyAmount: r.dailyAmount, totalAmount: r.totalAmount })}><strong>{r.name}</strong><span>{r.date} · عمر {r.age || '—'} · {r.stayDays || '—'} أيام · إجمالي {r.totalAmount} ₪</span></button><button className="delete" type="button" onClick={() => remove(r.id)}><Trash2 /></button></article>)}</div>}
      </Panel>
      <Panel className="financial-declaration-preview-panel"><div className="panel-head"><h3>معاينة مطابقة للطباعة</h3><Badge color="cyan">A4</Badge></div><div className="financial-declaration-preview"><style>{financialDeclarationCss}</style><div dangerouslySetInnerHTML={{ __html: financialDeclarationMarkup(normalizedForm) }} /></div></Panel>
    </div>
  </div>;
}
