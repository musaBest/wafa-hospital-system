import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BedDouble,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  DoorOpen,
  Download,
  FileSpreadsheet,
  FileText,
  Hospital,
  Landmark,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  UsersRound,
} from 'lucide-react';
import { Badge, Button, Field, FormActions, Modal, Panel } from '../components/ui';
import { useHospital } from '../context/HospitalContext';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import type { Admission, InpatientTransaction } from '../types';
import {
  downloadHealthCasesExcel,
  downloadHealthCasesPdf,
  downloadHealthCasesWord,
  healthReportCss,
  healthReportMarkup,
  printHealthCases,
  type HealthCasesReportData,
  type HealthReportRow,
} from '../utils/inpatientHealthReportExport';
import {
  downloadFinancialExcel,
  downloadFinancialPdf,
  downloadFinancialWord,
  type InpatientFinancialReport,
} from '../utils/inpatientFinancialExport';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const firstOfMonth = () => `${today().slice(0, 7)}-01`;
const inRange = (value: string | undefined, from: string, to: string) => Boolean(value && value >= from && value <= to);
const stayDays = (from: string, to?: string) => Math.max(1, Math.floor((new Date(`${to || today()}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000) + 1);
const sponsorText = (name: string) => name.includes('وزارة الصحة') ? 'health' : name.includes('هلال') ? 'qatar' : name.includes('خاص') ? 'private' : 'other';
const isHealth = (name: string) => name.includes('وزارة الصحة') || name.toLowerCase() === 'moh';
const isDiscountTx = (tx: InpatientTransaction) => /خصم|إعفاء|اعفاء|discount/i.test(tx.description || '') || tx.method === 'discount';
const isHelpTx = (tx: InpatientTransaction) => /مساعدة|help/i.test(tx.description || '') || tx.method === 'help';

const toArabicGender = (gender: 'male' | 'female') => gender === 'female' ? 'أنثى' : 'ذكر';
const money = (value: number) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

type OperationKey = 'current' | 'healthIn' | 'healthOut' | 'allOut' | 'missingReferral' | 'renewals' | 'claims' | 'accounts' | 'statements' | 'debts';
type FinanceAction = 'payment' | 'discount' | 'help';

const ACTIONS: Array<{ key: OperationKey; label: string; sub: string; icon: any; tone: string }> = [
  { key: 'current', label: 'الموجودين حالياً', sub: 'الحالات النشطة', icon: BedDouble, tone: 'blue' },
  { key: 'healthIn', label: 'دخول صحة', sub: 'وزارة الصحة', icon: Hospital, tone: 'dark' },
  { key: 'healthOut', label: 'خروج صحة', sub: 'تاريخ الخروج يدوي', icon: DoorOpen, tone: 'dark' },
  { key: 'allOut', label: 'خروج جميع الحالات', sub: 'كل جهات التغطية', icon: DoorOpen, tone: 'orange' },
  { key: 'missingReferral', label: 'لم تصل التحويلة', sub: 'متابعة النواقص', icon: AlertTriangle, tone: 'green' },
  { key: 'renewals', label: 'كشف التجديدات', sub: 'حسب الفترة', icon: RefreshCw, tone: 'purple' },
  { key: 'claims', label: 'المطالبات المالية', sub: 'الفترة المحددة', icon: ClipboardList, tone: 'purple' },
  { key: 'accounts', label: 'حسابات المرضى', sub: 'الرسوم والمدفوع', icon: ReceiptText, tone: 'red' },
  { key: 'statements', label: 'إفادات مالية', sub: 'حركة مالية', icon: FileText, tone: 'red' },
  { key: 'debts', label: 'كشف الديون المالية', sub: 'الرصيد المتبقي', icon: CircleDollarSign, tone: 'red' },
];

function financials(a: Admission) {
  const tx = a.transactions || [];
  const gross = tx.filter(item => item.type === 'charge' && !isDiscountTx(item) && !isHelpTx(item)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const discount = tx.filter(isDiscountTx).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const help = tx.filter(isHelpTx).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = tx.filter(item => item.type === 'payment' && !isDiscountTx(item) && !isHelpTx(item)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return { gross, paid, discount, help, net: Math.max(0, gross - paid - discount - help) };
}

export function InpatientOperationsConsole({ onNew, onOpenCase }: { onNew: () => void; onOpenCase: (id: string) => void }) {
  const { patients, admissions, sponsors, updateAdmission, addInpatientTransaction } = useHospital();
  const { can } = useAuth();
  const { toast } = useUi();
  const [action, setAction] = useState<OperationKey>('current');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [q, setQ] = useState('');
  const [financeAction, setFinanceAction] = useState<FinanceAction | null>(null);
  const [editorAdmission, setEditorAdmission] = useState('');
  const [editorDate, setEditorDate] = useState(today());
  const [editorReferral, setEditorReferral] = useState('');
  const [editorRenewal, setEditorRenewal] = useState('');
  const [editorNote, setEditorNote] = useState('');
  const [financeAdmissionId, setFinanceAdmissionId] = useState('');
  const [financeAmount, setFinanceAmount] = useState('');
  const exportingRef = useRef(false);
  const [healthMerge, setHealthMerge] = useState({ entry: true, healthExit: true, allExit: true });
  const editorRef = useRef<HTMLDivElement | null>(null);
  const healthRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const scrollToPanel = (target: 'editor' | 'health' | 'table') => window.setTimeout(() => {
    const node = target === 'health' ? healthRef.current : target === 'editor' ? editorRef.current : tableRef.current;
    if (!node) return;
    const top = Math.max(0, window.scrollY + node.getBoundingClientRect().top - 106);
    window.scrollTo({ top, behavior: 'smooth' });
  }, 90);

  useEffect(() => {
    scrollToPanel((action === 'healthIn' || action === 'healthOut' || action === 'allOut') ? 'health' : (action === 'current' ? 'table' : 'editor'));
  }, [action]);

  const canUpdate = can('admissions.update');
  const canFinanceUpdate = can('inpatient_finance.update') || can('admissions.update');
  const sponsorName = (a: Admission) => sponsors.find(s => s.id === a.coverageEntity)?.nameAr || a.coverageEntity || '—';

  const rows = useMemo(() => admissions.filter(a => {
    const p = patients.find(x => x.id === a.patientId);
    if (!p) return false;
    const sponsor = sponsorName(a);
    const discharge = a.dischargedAt?.slice(0, 10);
    const text = `${p.fullName} ${p.idNumber} ${p.medicalSerial} ${a.diagnosis} ${sponsor} ${a.referralHospital || ''}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    switch (action) {
      case 'current': return a.status === 'admitted';
      case 'healthIn': return isHealth(sponsor) && inRange(a.admissionDate, from, to);
      case 'healthOut': return isHealth(sponsor) && (inRange(a.admissionDate, from, to) || inRange(discharge, from, to));
      case 'allOut': return inRange(discharge, from, to) || inRange(a.admissionDate, from, to);
      case 'missingReferral': return a.status === 'admitted' && (!a.rehabRenewalNo || a.rehabRenewalNo === '0' || !a.referralHospital);
      case 'renewals': return inRange(a.rehabReferralEndDate || a.admissionDate, from, to);
      case 'claims':
      case 'accounts':
      case 'statements': return inRange(a.admissionDate, from, to) || inRange(discharge, from, to);
      case 'debts': return (inRange(a.admissionDate, from, to) || inRange(discharge, from, to)) && financials(a).net > 0;
    }
  }).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate)), [admissions, patients, sponsors, action, from, to, q]);

  const totals = rows.reduce((sum, a) => {
    const f = financials(a);
    return { gross: sum.gross + f.gross, paid: sum.paid + f.paid, discount: sum.discount + f.discount, help: sum.help + f.help, net: sum.net + f.net };
  }, { gross: 0, paid: 0, discount: 0, help: 0, net: 0 });

  const reportData = useMemo<HealthCasesReportData>(() => {
    const mapRow = (a: Admission, index: number): HealthReportRow => {
      const p = patients.find(x => x.id === a.patientId)!;
      return {
        seq: index + 1,
        name: p.fullName,
        coveragePct: `${Math.max(0, 100 - Number(a.contributionPct || 0))}%`,
        nationalId: p.idNumber,
        admissionDate: a.admissionDate.replace(/-/g, '/'),
        dischargeDate: a.dischargedAt?.slice(0, 10).replace(/-/g, '/'),
        recommendations: a.status === 'admitted' ? 'متابعة' : 'خروج',
        stayDays: stayDays(a.admissionDate, a.dischargedAt?.slice(0, 10)),
        notes: a.status === 'discharged' ? 'خروج' : 'متابعة',
      };
    };
    const health = admissions.filter(a => isHealth(sponsorName(a)) && (inRange(a.admissionDate, from, to) || inRange(a.dischargedAt?.slice(0, 10), from, to)));
    const male = health.filter(a => patients.find(p => p.id === a.patientId)?.gender === 'male');
    const female = health.filter(a => patients.find(p => p.id === a.patientId)?.gender === 'female');
    const exits = health.filter(a => a.dischargedAt && inRange(a.dischargedAt.slice(0, 10), from, to));
    const allExits = admissions.filter(a => a.dischargedAt && inRange(a.dischargedAt.slice(0, 10), from, to));
    return {
      mode: action === 'healthOut' || action === 'allOut' ? 'exit' : 'entry',
      reportDate: today(),
      from,
      to,
      maleRows: male.map(mapRow),
      femaleRows: female.map(mapRow),
      exitRows: (action === 'allOut' ? allExits : exits).map(mapRow),
      allExitRows: allExits.map(mapRow),
    };
  }, [admissions, patients, sponsors, from, to, action]);

  const mergedHealthReport = useMemo<HealthCasesReportData>(() => ({
    ...reportData,
    mode: 'combined',
    includeEntry: healthMerge.entry,
    includeHealthExit: healthMerge.healthExit,
    includeAllExit: healthMerge.allExit,
  }), [reportData, healthMerge]);


  const runHealthExport = async (kind: 'print' | 'pdf' | 'word' | 'excel') => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    try {
      if (kind === 'print') await printHealthCases(reportData);
      else if (kind === 'pdf') await downloadHealthCasesPdf(reportData);
      else if (kind === 'word') await downloadHealthCasesWord(reportData);
      else await downloadHealthCasesExcel(reportData);
      toast(`تم إنشاء كشف حالات الصحة بصيغة ${kind === 'print' ? 'طباعة' : kind === 'pdf' ? 'PDF' : kind === 'word' ? 'Word' : 'Excel'}`);
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : 'تعذر إنشاء كشف حالات الصحة', 'warn');
    } finally {
      window.setTimeout(() => { exportingRef.current = false; }, 120);
    }
  };
  const exportMergedHealth = async (kind: 'print' | 'pdf' | 'word' | 'excel') => {
    if (!healthMerge.entry && !healthMerge.healthExit && !healthMerge.allExit) { toast('اختر كشفاً واحداً على الأقل للدمج', 'warn'); return; }
    try {
      if (kind === 'print') await printHealthCases(mergedHealthReport);
      else if (kind === 'pdf') await downloadHealthCasesPdf(mergedHealthReport);
      else if (kind === 'word') await downloadHealthCasesWord(mergedHealthReport);
      else await downloadHealthCasesExcel(mergedHealthReport);
      toast('تم إنشاء كشف الصحة المدمج');
    } catch { toast('تعذر إنشاء كشف الصحة المدمج', 'warn'); }
  };

  const selectedAction = ACTIONS.find(x => x.key === action)!;
  const actionOptions = (rows.length ? rows : admissions.filter(a => a.status === 'admitted')).slice(0, 250);
  const selectedFinanceAdmission = admissions.find(a => a.id === financeAdmissionId);
  const selectedFinancePatient = selectedFinanceAdmission ? patients.find(p => p.id === selectedFinanceAdmission.patientId) : undefined;
  const currentFinance = selectedFinanceAdmission ? financials(selectedFinanceAdmission) : undefined;
  const amountNumber = Number(financeAmount || 0);
  const projectedNet = currentFinance ? Math.max(0, currentFinance.net - (Number.isFinite(amountNumber) ? amountNumber : 0)) : 0;

  const operationReport = useMemo<InpatientFinancialReport>(() => {
    const columns = [
      { key: 'seq', label: 'م.' }, { key: 'name', label: 'اسم المريض' }, { key: 'nationalId', label: 'رقم الهوية' },
      { key: 'gender', label: 'الجنس' }, { key: 'birthYear', label: 'سنة الميلاد' }, { key: 'coverage', label: 'جهة التغطية' },
      { key: 'admissionDate', label: 'تاريخ الدخول' }, { key: 'dischargeDate', label: 'تاريخ الخروج' }, { key: 'stayDays', label: 'مدة المكوث' },
      { key: 'diagnosis', label: 'التشخيص' }, { key: 'gross', label: 'المبلغ' }, { key: 'paid', label: 'المدفوع' },
      { key: 'discount', label: 'الخصم' }, { key: 'help', label: 'المساعدة' }, { key: 'net', label: 'NET' },
    ];
    const reportRows = rows.map((a, index) => {
      const p = patients.find(x => x.id === a.patientId)!;
      const f = financials(a);
      return {
        seq: index + 1,
        name: p.fullName,
        nationalId: p.idNumber,
        gender: toArabicGender(p.gender),
        birthYear: p.dob?.slice(0, 4) || '—',
        coverage: sponsorName(a),
        admissionDate: a.admissionDate,
        dischargeDate: a.dischargedAt?.slice(0, 10) || 'متابعة',
        stayDays: stayDays(a.admissionDate, a.dischargedAt?.slice(0, 10)),
        diagnosis: a.diagnosis,
        gross: f.gross,
        paid: f.paid,
        discount: f.discount,
        help: f.help,
        net: f.net,
      };
    });
    return {
      title: selectedAction.label,
      subtitle: selectedAction.sub,
      dateFrom: from,
      dateTo: to,
      reportDate: today(),
      columns,
      rows: reportRows,
      summary: [
        { label: 'عدد السجلات', value: rows.length },
        { label: 'إجمالي الرسوم', value: totals.gross },
        { label: 'المدفوع', value: totals.paid },
        { label: 'الخصم', value: totals.discount },
        { label: 'المساعدة', value: totals.help },
        { label: 'الصافي', value: totals.net },
      ],
      filename: `inpatient-${action}-${from}-${to}`,
    };
  }, [rows, patients, action, from, to, totals.gross, totals.paid, totals.discount, totals.help, totals.net, selectedAction.label, selectedAction.sub]);

  const runReportExport = async (kind: 'pdf' | 'word' | 'excel') => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    try {
      if (kind === 'pdf') await downloadFinancialPdf(operationReport);
      else if (kind === 'word') await downloadFinancialWord(operationReport);
      else await downloadFinancialExcel(operationReport);
      toast(`تم تصدير ${selectedAction.label} بصيغة ${kind === 'pdf' ? 'PDF' : kind === 'word' ? 'Word' : 'Excel'}`);
    } catch {
      toast('تعذر تصدير التقرير، حاول مرة أخرى', 'warn');
    } finally {
      window.setTimeout(() => { exportingRef.current = false; }, 120);
    }
  };

  const setDischargeDate = (a: Admission, value: string) => {
    if (!canUpdate) {
      toast('لا توجد صلاحية لتعديل تاريخ الخروج', 'warn');
      return;
    }
    updateAdmission(a.id, {
      dischargedAt: value ? new Date(`${value}T12:00:00`).toISOString() : undefined,
      status: value ? 'discharged' : 'admitted',
    });
    toast(value ? 'تم حفظ تاريخ الخروج' : 'تم مسح تاريخ الخروج');
  };

  const saveOperationDetails = () => {
    if (!editorAdmission) { toast('اختر حالة المبيت أولاً', 'warn'); return; }
    if (!canUpdate) { toast('لا توجد صلاحية لتعديل ملف المبيت', 'warn'); return; }
    const patch: Partial<Admission> = {};
    if (action === 'healthOut' || action === 'allOut') {
      if (!editorDate) { toast('حدد تاريخ الخروج', 'warn'); return; }
      patch.dischargedAt = new Date(`${editorDate}T12:00:00`).toISOString();
      patch.status = 'discharged';
      patch.rehabRenewalNotes = editorNote.trim() || undefined;
    } else if (action === 'missingReferral') {
      patch.referralHospital = editorReferral.trim() || undefined;
      patch.rehabRenewalNo = editorRenewal.trim() || undefined;
      patch.rehabRenewalNotes = editorNote.trim() || undefined;
    } else if (action === 'renewals') {
      patch.rehabRenewalNo = editorRenewal.trim() || undefined;
      patch.rehabReferralEndDate = editorDate || undefined;
      patch.rehabRenewalNotes = editorNote.trim() || undefined;
    } else {
      patch.rehabRenewalNotes = editorNote.trim() || undefined;
    }
    updateAdmission(editorAdmission, patch);
    toast('تم حفظ بيانات الإجراء على ملف المبيت');
    setEditorReferral(''); setEditorRenewal(''); setEditorNote('');
  };

  const openFinance = (kind: FinanceAction, admissionId?: string) => {
    setFinanceAction(kind);
    setFinanceAdmissionId(admissionId || rows[0]?.id || admissions.find(a => a.status === 'admitted')?.id || '');
    setFinanceAmount('');
  };

  const submitFinance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!financeAction || !canFinanceUpdate) return;
    const amount = Number(financeAmount || 0);
    if (!financeAdmissionId || !Number.isFinite(amount) || amount <= 0) {
      toast('اختر المريض وأدخل مبلغاً صحيحاً في خانة المبلغ', 'warn');
      return;
    }
    const description = financeAction === 'payment' ? 'دفعة مبيت' : financeAction === 'discount' ? 'خصم مالي للمبيت' : 'مساعدة مالية للمبيت';
    addInpatientTransaction(financeAdmissionId, {
      type: 'payment',
      amount,
      date: today(),
      description,
      method: financeAction === 'payment' ? 'cash' : financeAction,
      receiptNumber: undefined,
      category: 'payment',
    });
    toast(financeAction === 'payment' ? 'تم تسجيل الدفعة وحساب الرصيد' : financeAction === 'discount' ? 'تم تسجيل الخصم وحساب الرصيد' : 'تم تسجيل المساعدة وحساب الرصيد');
    setFinanceAction(null); setFinanceAmount('');
  };

  const financeTitle = financeAction === 'payment' ? 'تسجيل دفعة' : financeAction === 'discount' ? 'تسجيل خصم' : 'تسجيل مساعدة مالية';
  const financeAdmissions = admissions.filter(a => a.status === 'admitted' || rows.some(row => row.id === a.id));
  const showActionEditor = action !== 'current';
  const SelectedActionIcon = selectedAction.icon;

  return <div className="legacy-inpatient-console">
    <section className="legacy-inpatient-head glass-strong">
      <div>
        <span>ملف مرضى المبيت داخل المستشفى</span>
        <h2>واجهة تشغيل مبيت تفاعلية</h2>
        <p>اختر الأيقونة، حدّد الفترة، أدخل البيانات المطلوبة، ثم صدّر الكشف PDF / Word / Excel.</p>
      </div>
      <Button className="btn-primary" onClick={onNew}><Plus />إضافة سجل / حالة مبيت</Button>
    </section>

    <div className="legacy-inpatient-actions">
      {ACTIONS.map(item => {
        const Icon = item.icon;
        return <button key={item.key} type="button" className={`${action === item.key ? 'active' : ''} tone-${item.tone}`} onClick={() => { setAction(item.key); setEditorAdmission(''); scrollToPanel((item.key === 'healthIn' || item.key === 'healthOut' || item.key === 'allOut') ? 'health' : (item.key === 'current' ? 'table' : 'editor')); }}>
          <Icon />
          <span><b>{item.label}</b><small>{item.sub}</small></span>
        </button>;
      })}
    </div>

    <Panel className="legacy-inpatient-filter-panel">
      <div className="legacy-inpatient-filter">
        <label><CalendarDays /><span>من تاريخ</span><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label><CalendarDays /><span>إلى تاريخ</span><input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} /></label>
        <label className="search"><Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم أو الهوية أو رقم الملف..." /></label>
        <div className="legacy-filter-title"><b>{selectedAction.label}</b><span>{rows.length} سجل</span></div>
      </div>
    </Panel>

    <div className="legacy-finance-strip">
      <article><span>NET</span><b>{money(totals.net)}</b></article>
      <article><span>Discount</span><b>{money(totals.discount)}</b></article>
      <article><span>HELP</span><b>{money(totals.help)}</b></article>
      <article><span>PAID</span><b>{money(totals.paid)}</b></article>
      <article><span>إجمالي الرسوم</span><b>{money(totals.gross)}</b></article>
    </div>

    <div className="legacy-finance-quick-actions">
      <Button className="btn-ghost" type="button" disabled={!canFinanceUpdate} onClick={() => openFinance('payment')}><CircleDollarSign />تسجيل دفعة</Button>
      <Button className="btn-ghost" type="button" disabled={!canFinanceUpdate} onClick={() => openFinance('discount')}><ReceiptText />تسجيل خصم</Button>
      <Button className="btn-ghost" type="button" disabled={!canFinanceUpdate} onClick={() => openFinance('help')}><Landmark />مساعدة مالية</Button>
      <Button className="btn-ghost" type="button" onClick={() => setAction('accounts')}><UsersRound />حسابات المرضى</Button>
    </div>

    {showActionEditor && <div ref={editorRef}><Panel className="legacy-action-editor-panel">
      <div className="panel-head"><h3><SelectedActionIcon />{selectedAction.label} - إدخال بيانات</h3><Badge color="cyan">تفاعلي</Badge></div>
      <div className="legacy-action-editor-grid">
        <Field label="حالة المبيت / المريض" span={2}>
          <select value={editorAdmission} onChange={e => setEditorAdmission(e.target.value)}>
            <option value="">اختر الحالة</option>
            {actionOptions.map(a => {
              const p = patients.find(x => x.id === a.patientId);
              return <option key={a.id} value={a.id}>{p?.fullName || a.patientId} · {p?.idNumber || ''} · {a.admissionDate}</option>;
            })}
          </select>
        </Field>
        {(action === 'healthOut' || action === 'allOut' || action === 'renewals') && <Field label={action === 'renewals' ? 'تاريخ انتهاء التحويلة / التجديد' : 'تاريخ الخروج'}><input type="date" value={editorDate} onChange={e => setEditorDate(e.target.value)} /></Field>}
        {(action === 'missingReferral') && <Field label="جهة التحويلة / المشفى"><input value={editorReferral} onChange={e => setEditorReferral(e.target.value)} placeholder="مثال: وزارة الصحة / مستشفى الشفاء" /></Field>}
        {(action === 'missingReferral' || action === 'renewals') && <Field label="رقم التحويلة / التجديد"><input value={editorRenewal} onChange={e => setEditorRenewal(e.target.value)} placeholder="رقم اختياري" /></Field>}
        {(action === 'claims' || action === 'accounts' || action === 'statements' || action === 'debts') && <div className="legacy-action-finance-shortcuts">
          <Button className="btn-primary" type="button" onClick={() => openFinance('payment', editorAdmission)} disabled={!editorAdmission || !canFinanceUpdate}><Banknote />دفعة للمريض المحدد</Button>
          <Button className="btn-ghost" type="button" onClick={() => openFinance('discount', editorAdmission)} disabled={!editorAdmission || !canFinanceUpdate}><ReceiptText />خصم للمريض المحدد</Button>
          <Button className="btn-ghost" type="button" onClick={() => openFinance('help', editorAdmission)} disabled={!editorAdmission || !canFinanceUpdate}><Landmark />مساعدة للمريض المحدد</Button>
        </div>}
        <Field label="ملاحظات الإجراء" span={2}><input value={editorNote} onChange={e => setEditorNote(e.target.value)} placeholder="اختياري: ملاحظة تظهر داخل ملف الحالة" /></Field>
      </div>
      <FormActions><Button className="btn-primary" type="button" onClick={saveOperationDetails} disabled={!canUpdate}><Save />حفظ بيانات الإجراء</Button></FormActions>
    </Panel></div>}

    <Panel className="legacy-export-panel">
      <div className="panel-head"><h3><Download />تصدير كشف {selectedAction.label}</h3><Badge color="emerald">PDF / Word / Excel</Badge></div>
      <FormActions>
        <Button className="btn-ghost" type="button" onClick={() => void runReportExport('pdf')}><FileText />PDF</Button>
        <Button className="btn-ghost" type="button" onClick={() => void runReportExport('word')}><FileText />Word</Button>
        <Button className="btn-ghost" type="button" onClick={() => void runReportExport('excel')}><FileSpreadsheet />Excel</Button>
      </FormActions>
    </Panel>

    {(action === 'healthIn' || action === 'healthOut' || action === 'allOut') && <div ref={healthRef}><Panel className="health-official-panel">
      <div className="panel-head">
        <h3><Hospital />كشف حالات الصحة</h3>
        <div className="head-actions">
          <Badge color="emerald">القالب الرسمي</Badge>
          <Button className="btn-ghost btn-sm" onClick={() => void runHealthExport('print')}><Printer />طباعة</Button>
          <Button className="btn-ghost btn-sm" onClick={() => void runHealthExport('pdf')}><Download />PDF</Button>
          <Button className="btn-ghost btn-sm" onClick={() => void runHealthExport('word')}><FileText />Word</Button>
          <Button className="btn-ghost btn-sm" onClick={() => void runHealthExport('excel')}><FileSpreadsheet />Excel</Button>
        </div>
      </div>
      <div className="health-merge-box">
        <div><b>دمج كشوف الصحة في تقرير واحد</b><span>اختر أي كشف تريد دمجه: دخول صحة، خروج صحة، أو خروج جميع الحالات.</span></div>
        <label><input type="checkbox" checked={healthMerge.entry} onChange={e=>setHealthMerge(v=>({...v,entry:e.target.checked}))}/>دخول صحة</label>
        <label><input type="checkbox" checked={healthMerge.healthExit} onChange={e=>setHealthMerge(v=>({...v,healthExit:e.target.checked}))}/>خروج صحة</label>
        <label><input type="checkbox" checked={healthMerge.allExit} onChange={e=>setHealthMerge(v=>({...v,allExit:e.target.checked}))}/>خروج جميع الحالات</label>
        <Button className="btn-primary btn-sm" onClick={() => void exportMergedHealth('pdf')}><Download/>PDF مدمج</Button>
        <Button className="btn-ghost btn-sm" onClick={() => void exportMergedHealth('word')}><FileText/>Word مدمج</Button>
        <Button className="btn-ghost btn-sm" onClick={() => void exportMergedHealth('excel')}><FileSpreadsheet/>Excel مدمج</Button>
      </div>
      <div className="health-report-screen-preview"><style>{healthReportCss}</style><div dangerouslySetInnerHTML={{ __html: healthReportMarkup(reportData) }} /></div>
      <p className="health-exit-hint">تاريخ الخروج يعبئه الموظف المسؤول من الجدول التشغيلي أو لوحة الإدخال أعلاه، ويظهر باللون الأحمر في كشف الصحة.</p>
    </Panel></div>}

    <div ref={tableRef}><Panel className="legacy-inpatient-table-panel">
      <div className="panel-head"><h3><UsersRound />{selectedAction.label}</h3><Badge color="cyan">{rows.length}</Badge></div>
      <div className="legacy-inpatient-table-wrap">
        <table className="legacy-inpatient-table">
          <thead><tr><th>م.</th><th>المريض</th><th>رقم الهوية</th><th>الجنس</th><th>سنة الميلاد</th><th>جهة التغطية</th><th>تاريخ الدخول</th><th>تاريخ الخروج</th><th>مدة المكوث</th><th>التشخيص</th><th>المبلغ</th><th>المدفوع</th><th>NET</th><th>إجراءات</th></tr></thead>
          <tbody>
            {rows.map((a, index) => {
              const p = patients.find(x => x.id === a.patientId)!;
              const sponsor = sponsorName(a);
              const f = financials(a);
              return <tr key={a.id} onDoubleClick={() => onOpenCase(a.id)}>
                <td>{index + 1}</td>
                <td><button className="patient-link" type="button" onClick={() => onOpenCase(a.id)}>{p.fullName}<small>{p.medicalSerial}</small></button></td>
                <td>{p.idNumber}</td>
                <td>{toArabicGender(p.gender)}</td>
                <td>{p.dob?.slice(0, 4) || '—'}</td>
                <td><span className={`coverage-label coverage-${sponsorText(sponsor)}`}>{sponsor}</span></td>
                <td className="admission-date-cell">{a.admissionDate}</td>
                <td className="discharge-date-cell">{(action === 'healthOut' || action === 'allOut') ? <input type="date" value={a.dischargedAt?.slice(0, 10) || ''} onClick={e => e.stopPropagation()} onChange={e => setDischargeDate(a, e.target.value)} /> : a.dischargedAt?.slice(0, 10) || 'متابعة'}</td>
                <td>{stayDays(a.admissionDate, a.dischargedAt?.slice(0, 10))}</td>
                <td className="diagnosis">{a.diagnosis}</td>
                <td>{money(f.gross)}</td>
                <td>{money(f.paid)}</td>
                <td className={f.net > 0 ? 'debt' : ''}>{money(f.net)}</td>
                <td><div className="legacy-row-actions"><button type="button" onClick={() => openFinance('payment', a.id)}>دفع</button><button type="button" onClick={() => openFinance('discount', a.id)}>خصم</button><button type="button" onClick={() => onOpenCase(a.id)}>فتح</button></div></td>
              </tr>;
            })}
            {!rows.length && <tr><td colSpan={14} className="empty-row">لا توجد سجلات مطابقة للفترة والفلتر المحدد</td></tr>}
          </tbody>
        </table>
      </div>
      <FormActions><span className="legacy-table-note"><Landmark />انقر على اسم المريض لفتح ملف الحالة. إدخال تاريخ الخروج يتم يدوياً في كشوف الخروج.</span></FormActions>
    </Panel></div>

    {financeAction && <Modal title={<><CircleDollarSign />{financeTitle}</>} onClose={() => setFinanceAction(null)} className="inpatient-finance-action-modal">
      <form onSubmit={submitFinance}>
        <div className="finance-one-amount-form">
          <Field label="المريض / حالة المبيت" span={2}>
            <select value={financeAdmissionId} onChange={e => setFinanceAdmissionId(e.target.value)} required>
              <option value="" disabled>اختر المريض</option>
              {financeAdmissions.map(a => {
                const p = patients.find(x => x.id === a.patientId);
                return <option key={a.id} value={a.id}>{p?.fullName || a.patientId} · {a.admissionDate}</option>;
              })}
            </select>
          </Field>
          <Field label="المبلغ فقط" span={2}><input autoFocus value={financeAmount} onChange={e => setFinanceAmount(e.target.value)} type="number" min="0.01" step="0.01" required placeholder="أدخل مبلغ العملية" /></Field>
        </div>
        <div className="finance-live-calc">
          <article><span>المريض</span><b>{selectedFinancePatient?.fullName || '—'}</b></article>
          <article><span>الرصيد الحالي NET</span><b>{money(currentFinance?.net || 0)}</b></article>
          <article><span>قيمة العملية</span><b>{money(Number.isFinite(amountNumber) ? amountNumber : 0)}</b></article>
          <article><span>الرصيد بعد الحفظ</span><b>{money(projectedNet)}</b></article>
        </div>
        <FormActions><Button className="btn-primary" type="submit"><CircleDollarSign />حفظ وحساب العملية</Button></FormActions>
      </form>
    </Modal>}
  </div>;
}
