import { FormEvent, useMemo, useState } from 'react';
import {
  BadgeCheck, Banknote, Check, Download, FileSearch, FileText, Pencil, Plus,
  Printer, ReceiptText, Search, ShieldCheck, Trash2, UserCheck, WalletCards,
} from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, PageHeader, Panel } from '../components/ui';
import { useHospital } from '../context/HospitalContext';
import { useUi } from '../context/UiContext';
import { useAuth } from '../context/AuthContext';
import type { CashierWorkflowCase } from '../types';
import {
  BANKING_APPS,
  exportDailyRevenuePdf,
  exportFinancialAuditExcel,
  exportPaymentAuditExcel,
  printVisitReceipt,
  exportVisitReceiptPdf,
  getVisitReceiptDocument,
  fromReceiptUnit,
  toReceiptUnit,
} from '../utils/cashierWorkflowExport';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const isoDate = (value?: string | null) => value ? value.slice(0, 10) : '';
const displayTime = (value?: string | null) => value ? new Date(value).toLocaleString('ar-EG') : '—';
const paymentLabel = (item: CashierWorkflowCase) => item.paymentMethod === 'cash' ? 'نقدي' : item.paymentSource || 'تطبيق';
const errorText = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

function PaymentModal({ item, onClose }: { item: CashierWorkflowCase; onClose: () => void }) {
  const { completeWorkflowPayment } = useHospital();
  const { toast } = useUi();
  const [method, setMethod] = useState<'cash' | 'app'>(item.paymentMethod || 'app');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const amount = Number(d.get('amount') || 0);
    const senderName = String(d.get('senderName') || '').trim();
    const senderPhone = String(d.get('senderPhone') || '').trim();
    const source = method === 'cash' ? 'نقدي' : String(d.get('paymentSource') || '').trim();

    if (amount <= 0) {
      toast('أدخل المبلغ المحصل', 'warn');
      return;
    }
    if (method === 'app' && (!senderName || !senderPhone || !source)) {
      toast('اسم المحول ورقم الجوال وطريقة التحويل مطلوبة', 'warn');
      return;
    }
    if (!confirmed) {
      toast('ضع إشارة صح لاعتماد الدفع وتحويل الحالة إلى المحصل المالي', 'warn');
      return;
    }

    setBusy(true);
    try {
      await completeWorkflowPayment(item.id, {
        amount,
        paymentMethod: method,
        paymentSource: source,
        senderName: senderName || 'نفسه',
        senderPhone,
        notes: String(d.get('notes') || ''),
      });
      toast('تم اعتماد الدفع وتحويل الحالة إلى المحصل المالي');
      onClose();
    } catch (error) {
      toast(errorText(error, 'تعذر اعتماد عملية الدفع. حاول مرة أخرى.'), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={<><WalletCards />استكمال الدفع والتحصيل البنكي</>} onClose={onClose} className="cashier-payment-modal">
      <div className="workflow-patient-card">
        <strong>{item.patientName}</strong>
        <span>رقم المريض: {item.medicalSerial}</span>
        <span>{item.clinicName} · {item.doctorName}</span>
        <b>الدور المحجوز: {item.clinicCode}-{item.queueNumber}</b>
      </div>
      <form onSubmit={submit}>
        <div className="payment-method-switch">
          <button type="button" className={method === 'cash' ? 'active' : ''} onClick={() => setMethod('cash')}><Banknote />نقدي</button>
          <button type="button" className={method === 'app' ? 'active' : ''} onClick={() => setMethod('app')}><WalletCards />تطبيق / تحويل بنكي</button>
        </div>
        <div className="form-grid">
          <Field label="المبلغ"><input name="amount" type="number" min="0.01" step="0.01" defaultValue={item.amount} required /></Field>
          {method === 'app' && <>
            <Field label="اسم المحول"><input name="senderName" defaultValue={item.senderName || ''} required /></Field>
            <Field label="رقم جوال المحول"><input name="senderPhone" dir="ltr" defaultValue={item.senderPhone || ''} required /></Field>
            <Field label="طريقة التحويل" span={2}>
              <select name="paymentSource" defaultValue={item.paymentSource || 'بال باي PalPay'}>
                {BANKING_APPS.filter(name => name !== 'نقدي').map(name => <option key={name}>{name}</option>)}
              </select>
            </Field>
          </>}
          <Field label="ملاحظات" span={3}><textarea name="notes" defaultValue={item.notes || ''} /></Field>
        </div>
        <label className="workflow-payment-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span><Check />تمت مراجعة بيانات الدفع — اعتماد وتحويل للمحصل المالي</span></label>
        <FormActions>
          <Button className="btn-primary" type="submit" disabled={busy || !confirmed}><Check />{busy ? 'جارٍ الاعتماد...' : 'اعتماد الدفع والتحويل'}</Button>
          <Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button>
        </FormActions>
      </form>
    </Modal>
  );
}

export function PaymentAuditPage() {
  const { paymentCases } = useHospital();
  const { can } = useAuth();
  const { toast } = useUi();
  const [selected, setSelected] = useState<CashierWorkflowCase | null>(null);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(today());

  const rows = useMemo(() => paymentCases
    .filter(item => (item.status === 'registered' || item.status === 'paid') && (!date || item.visitDate === date))
    .filter(item => `${item.patientName} ${item.medicalSerial} ${item.clinicName} ${item.doctorName}`.includes(query))
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)), [paymentCases, date, query]);
  const paid = rows.filter(item => item.status === 'paid');

  const exportExcel = async () => {
    try {
      await exportPaymentAuditExcel(
        paymentCases.filter(item => item.status !== 'registered' && (!date || isoDate(item.paidAt) === date)),
        `كشف-التحصيل-${date || today()}.xlsx`,
      );
      toast('تم تجهيز كشف Excel اليومي');
    } catch {
      toast('تعذر تجهيز كشف Excel', 'warn');
    }
  };

  return <>
    <PageHeader
      crumb="مسار الكاشير"
      title="التطبيق والتحصيل البنكي والتدقيق"
      sub="تظهر الحالات تلقائياً فور تسجيل الزيارة. أدخل بيانات الدفع فقط ثم اعتمدها للمحصل المالي."
      actions={can('cashier_payment.export') ? <Button className="btn-primary" onClick={() => void exportExcel()}><Download />كشف Excel يومي</Button> : undefined}
    />
    <Panel>
      <div className="workflow-toolbar">
        <label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث باسم المريض أو رقمه أو العيادة..." /></label>
        <label>تاريخ الزيارة<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <Badge color="amber">بانتظار الدفع {rows.length - paid.length}</Badge>
        <Badge color="emerald">مدفوع {paid.length}</Badge>
      </div>
      {rows.length ? <div className="table-wrap">
        <table className="workflow-table">
          <thead><tr><th>✓</th><th>المريض</th><th>رقم المريض</th><th>العيادة</th><th>الطبيب</th><th>الدور</th><th>المبلغ</th><th>طريقة الدفع</th><th>الإجراء</th></tr></thead>
          <tbody>{rows.map(item => <tr key={item.id} className={item.status === 'paid' ? 'workflow-row-done' : ''}>
            <td>{item.status === 'paid' ? <BadgeCheck className="workflow-check done" /> : <span className="workflow-check" />}</td>
            <td><b>{item.patientName}</b><small>{item.visitDate}{item.idNumber ? ` · هوية ${item.idNumber}` : ''}{item.patientPhone ? ` · ${item.patientPhone}` : ''}</small></td>
            <td>{item.medicalSerial}</td><td>{item.clinicName}</td><td>{item.doctorName}</td>
            <td><b>{item.clinicCode}-{item.queueNumber}</b></td>
            <td>{item.amount.toFixed(2)} ₪</td><td>{item.status === 'paid' ? paymentLabel(item) : '—'}</td>
            <td>{item.status === 'registered'
              ? (can('cashier_payment.update') ? <Button className="btn-primary btn-sm" onClick={() => setSelected(item)}><WalletCards />استكمال الدفع</Button> : '—')
              : <Badge color="emerald">تم التحويل للمحصل</Badge>}
            </td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title="لا توجد حالات ضمن الفلتر" sub="الحالات الجديدة ستظهر هنا تلقائياً بعد تسجيل الزيارة." />}
    </Panel>
    {selected && <PaymentModal item={selected} onClose={() => setSelected(null)} />}
  </>;
}

function PaidReceiptsSearch({ onClose }: { onClose: () => void }) {
  const { paymentCases } = useHospital();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [clinic, setClinic] = useState('');
  const [doctor, setDoctor] = useState('');
  const [query, setQuery] = useState('');

  // Derive filter choices from the centrally-synced receipts themselves. This keeps
  // the search screen useful even when the collector works from another computer.
  const clinicOptions = useMemo(() => {
    const map = new Map<string, string>();
    paymentCases.forEach(item => map.set(item.clinicId, item.clinicName));
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [paymentCases]);
  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    paymentCases.filter(item => !clinic || item.clinicId === clinic).forEach(item => map.set(item.doctorId, item.doctorName));
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [paymentCases, clinic]);

  const rows = paymentCases
    .filter(item => item.status !== 'registered')
    .filter(item => !from || isoDate(item.paidAt) >= from)
    .filter(item => !to || isoDate(item.paidAt) <= to)
    .filter(item => !clinic || item.clinicId === clinic)
    .filter(item => !doctor || item.doctorId === doctor)
    .filter(item => !query || `${item.patientName} ${item.medicalSerial} ${item.receiptNumber || ''}`.includes(query))
    .sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''));

  return <Modal title={<><FileSearch />بحث إيصالات مدفوعة</>} onClose={onClose} className="paid-receipts-search">
    <div className="paid-search-box"><div className="form-grid">
      <Field label="عن الفترة من"><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
      <Field label="إلى"><input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
      <Field label="قسم العلاج / العيادة"><select value={clinic} onChange={e => { setClinic(e.target.value); setDoctor(''); }}><option value="">كل العيادات</option>{clinicOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="الطبيب"><select value={doctor} onChange={e => setDoctor(e.target.value)}><option value="">كل الأطباء</option>{doctorOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      <Field label="الاسم / رقم المريض / الإيصال" span={2}><input value={query} onChange={e => setQuery(e.target.value)} /></Field>
    </div></div>
    <div className="search-result-count">النتائج: <b>{rows.length}</b> · الإجمالي: <b>{rows.reduce((n, x) => n + x.amount, 0).toFixed(2)} ₪</b></div>
    <div className="table-wrap paid-search-results"><table><thead><tr><th>رقم المريض</th><th>الاسم</th><th>رقم الإيصال</th><th>تاريخ الإيصال</th><th>العيادة</th><th>الطبيب</th><th>المبلغ</th><th>الدفع</th></tr></thead><tbody>
      {rows.map(item => <tr key={item.id}><td>{item.medicalSerial}</td><td>{item.patientName}</td><td>{item.receiptNumber || '—'}</td><td>{displayTime(item.collectedAt || item.paidAt)}</td><td>{item.clinicName}</td><td>{item.doctorName}</td><td>{item.amount.toFixed(2)}</td><td>{paymentLabel(item)}</td></tr>)}
    </tbody></table></div>
    <FormActions><Button className="btn-ghost" onClick={onClose}>إغلاق</Button></FormActions>
  </Modal>;
}

function ReceiptTemplateModal({item,cashierName,busy,canPrint,canPdf,onClose,onPrint,onPdf}:{
  item:CashierWorkflowCase; cashierName:string; busy:boolean; canPrint:boolean; canPdf:boolean;
  onClose:()=>void; onPrint:()=>void; onPdf:()=>void;
}) {
  const document=getVisitReceiptDocument(item,cashierName);
  const srcDoc=`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><base href="${window.location.origin}/"><style>html,body{margin:0;background:#eef2f6;display:flex;justify-content:center;padding:14px 0}${document.css}</style></head><body>${document.body}</body></html>`;
  return <Modal title={<><ReceiptText/>معاينة قالب إيصال القبض</>} onClose={onClose} className="receipt-template-modal">
    <div className="receipt-template-summary">
      <div><span>المريض</span><b>{item.patientName}</b></div>
      <div><span>العيادة</span><b>{item.clinicName}</b></div>
      <div><span>رقم الدور</span><strong dir="ltr">{item.clinicCode}-{item.queueNumber}</strong></div>
      <div><span>المبلغ</span><b>{item.amount.toFixed(2)} ₪</b></div>
    </div>
    <div className="receipt-template-frame-wrap"><iframe className="receipt-template-frame" title="معاينة إيصال القبض" srcDoc={srcDoc}/></div>
    <p className="receipt-template-note">سيتم إنشاء رقم الإيصال النهائي واعتماد الحالة عند اختيار الطباعة أو PDF، مع الحفاظ على رقم الدور وترتيبه داخل العيادة.</p>
    <FormActions>
      {canPrint&&<Button className="btn-primary" type="button" disabled={busy} onClick={onPrint}><Printer/>{busy?'جارٍ التجهيز...':'طباعة واعتماد'}</Button>}
      {canPdf&&<Button className="btn-ghost" type="button" disabled={busy} onClick={onPdf}><Download/>{busy?'جارٍ التجهيز...':'PDF واعتماد'}</Button>}
      <Button className="btn-ghost" type="button" disabled={busy} onClick={onClose}>إلغاء</Button>
    </FormActions>
  </Modal>;
}

export function FinancialCollectorPage() {
  const { paymentCases, collectWorkflowCase } = useHospital();
  const { can, user } = useAuth();
  const { toast } = useUi();
  const [searchOpen, setSearchOpen] = useState(false);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState('');
  const [receiptPreview, setReceiptPreview] = useState<CashierWorkflowCase | null>(null);
  const [receiptWidth, setReceiptWidth] = useState(() => localStorage.getItem('wafaa_receipt_width_mm') || '80');
  const [receiptHeight, setReceiptHeight] = useState(() => localStorage.getItem('wafaa_receipt_height_mm') || '220');
  const [receiptMargin, setReceiptMargin] = useState(() => localStorage.getItem('wafaa_receipt_margin_mm') || '3');
  const [receiptScale, setReceiptScale] = useState(() => localStorage.getItem('wafaa_receipt_font_scale') || '1');
  /* v4.5.0 — وحدة القياس صارت قابلة للاختيار. القيم تُخزَّن دائماً بالمليمتر
     ليبقى حساب حجم الصفحة ثابتاً، وتُعرَض وتُدخَل بالوحدة التي يختارها المستخدم. */
  const [receiptUnit, setReceiptUnit] = useState(() => localStorage.getItem('wafaa_receipt_unit') || 'mm');
  const unitLabel = receiptUnit === 'cm' ? 'سم' : receiptUnit === 'in' ? 'بوصة' : 'مم';
  const show = (mm: string) => String(Number(toReceiptUnit(Number(mm) || 0, receiptUnit).toFixed(2)));
  const changeUnit = (next: string) => { setReceiptUnit(next); localStorage.setItem('wafaa_receipt_unit', next); };

  const saveReceiptSettings = () => {
    localStorage.setItem('wafaa_receipt_width_mm', String(fromReceiptUnit(Number(receiptWidth) || 0, receiptUnit) || 80));
    localStorage.setItem('wafaa_receipt_height_mm', String(fromReceiptUnit(Number(receiptHeight) || 0, receiptUnit) || 220));
    localStorage.setItem('wafaa_receipt_margin_mm', String(fromReceiptUnit(Number(receiptMargin) || 0, receiptUnit) || 3));
    localStorage.setItem('wafaa_receipt_unit', receiptUnit);
    localStorage.setItem('wafaa_receipt_font_scale', receiptScale || '1');
    toast('تم حفظ أبعاد الإيصال للطابعة الحالية');
  };

  const pending = paymentCases
    .filter(item => item.status === 'paid')
    .sort((a,b) => (a.clinicCode || '').localeCompare(b.clinicCode || '', 'en', {numeric:true}) || a.queueNumber-b.queueNumber || (a.paidAt || '').localeCompare(b.paidAt || ''));
  const collected = paymentCases.filter(item => item.status === 'collected' || item.status === 'audited');

  const finalizeReceipt = async (item:CashierWorkflowCase, mode:'print'|'pdf') => {
    setBusy(item.id);
    try {
      const approved = await collectWorkflowCase(item.id);
      if (!approved) throw new Error('الحالة غير موجودة');
      if(mode==='print') await printVisitReceipt(approved,user?.displayName || 'المحصل المالي');
      else await exportVisitReceiptPdf(approved,user?.displayName || 'المحصل المالي');
      toast(`تم اعتماد الإيصال والدور ${approved.clinicCode}-${approved.queueNumber}${mode==='pdf'?' وتصديره PDF':' وإرساله للطباعة'} وتحويل الحالة للمدقق المالي`);
      setReceiptPreview(null);
    } catch (error) {
      toast(errorText(error, mode==='pdf'?'تعذر اعتماد وتصدير الإيصال PDF':'تعذر اعتماد وطباعة الإيصال'), 'warn');
    } finally {
      setBusy('');
    }
  };

  const reportRows = collected.filter(item => (!from || isoDate(item.collectedAt || item.paidAt) >= from) && (!to || isoDate(item.collectedAt || item.paidAt) <= to));
  const pdf = async () => {
    try {
      await exportDailyRevenuePdf(reportRows, from, to, `كشف-الإيرادات-${from}-${to}.pdf`);
      toast('تم تجهيز كشف الإيرادات PDF بالقالب المفصل حسب كل عيادة');
    } catch {
      toast('تعذر تجهيز كشف الإيرادات PDF', 'warn');
    }
  };

  return <>
    <PageHeader
      crumb="مسار الكاشير"
      title="المحصل المالي"
      sub="طباعة الإيصال وتذكرة الدور، ثم تحويل الحالة تلقائياً إلى المدقق المالي أ. محمد الشكري."
      actions={<Button className="btn-ghost" onClick={() => setSearchOpen(true)}><FileSearch />بحث في إيصالات مدفوعة</Button>}
    />
    <Panel className="receipt-print-settings-panel">
      <div className="panel-head"><h3><Printer />إعدادات قياس الإيصال</h3><Badge color="cyan">حسب ماكينة الطباعة</Badge></div>
      <div className="receipt-settings-grid">
        <Field label="وحدة القياس"><select value={receiptUnit} onChange={e => { const previous = receiptUnit; changeUnit(e.target.value); setReceiptWidth(String(Number(toReceiptUnit(fromReceiptUnit(Number(receiptWidth) || 0, previous), e.target.value).toFixed(2)))); setReceiptHeight(String(Number(toReceiptUnit(fromReceiptUnit(Number(receiptHeight) || 0, previous), e.target.value).toFixed(2)))); setReceiptMargin(String(Number(toReceiptUnit(fromReceiptUnit(Number(receiptMargin) || 0, previous), e.target.value).toFixed(2)))); }}><option value="mm">مليمتر (مم)</option><option value="cm">سنتيمتر (سم)</option><option value="in">بوصة</option></select></Field>
                <Field label={`عرض الورق بالـ${unitLabel}`}><input type="number" min="0" step="any" value={receiptWidth} onChange={e => setReceiptWidth(e.target.value)} placeholder={show('80')} /></Field>
        <Field label={`طول الورق بالـ${unitLabel}`}><input type="number" min="0" step="any" value={receiptHeight} onChange={e => setReceiptHeight(e.target.value)} placeholder="220" /></Field>
        <Field label={`هامش الطباعة بالـ${unitLabel}`}><input type="number" min="0" step="any" value={receiptMargin} onChange={e => setReceiptMargin(e.target.value)} placeholder="3" /></Field>
        <Field label="تكبير / تصغير الخط"><input type="number" min="0.75" max="1.6" step="0.05" value={receiptScale} onChange={e => setReceiptScale(e.target.value)} placeholder="1" /></Field>
        <Button className="btn-primary" type="button" onClick={saveReceiptSettings}><Check />حفظ القياسات</Button>
      </div>
      <small className="receipt-settings-hint">القيم الافتراضية مناسبة لطابعة 80mm. عدّل العرض والهامش إذا كان الإيصال مقصوصًا من الطرف أو يظهر صغيرًا.</small>
    </Panel>
    <Panel>
      <div className="panel-head"><h3><Printer />حالات جاهزة للطباعة والتحصيل</h3><Badge color="amber">{pending.length}</Badge></div>
      {pending.length ? <div className="table-wrap"><table className="workflow-table collector-table">
        <thead><tr><th>م.</th><th>المريض</th><th>رقم المريض</th><th>العيادة</th><th>الطبيب</th><th>المحول</th><th>الدفع</th><th>المبلغ</th><th>الدور</th><th>قالب الإيصال</th></tr></thead>
        <tbody>{pending.map((item,index) => <tr key={item.id}>
          <td><b>{index+1}</b></td><td><b>{item.patientName}</b><small>{item.visitDate}{item.idNumber ? ` · هوية ${item.idNumber}` : ''}{item.patientPhone ? ` · ${item.patientPhone}` : ''}</small></td><td>{item.medicalSerial}</td><td>{item.clinicName}</td><td>{item.doctorName}</td>
          <td>{item.senderName || 'نفسه'}<small dir="ltr">{item.senderPhone || ''}</small></td><td>{paymentLabel(item)}</td><td><b>{item.amount.toFixed(2)} ₪</b></td>
          <td><strong className="queue-ticket-mini">{item.clinicCode}-{item.queueNumber}</strong></td>
          <td>{can('cashier_collection.update') && (can('cashier_collection.print') || can('cashier_collection.export'))
            ? <Button className="btn-primary btn-sm" disabled={busy === item.id} onClick={() => setReceiptPreview(item)} title="معاينة الإيصال ثم اختيار الطباعة أو PDF"><ReceiptText />{busy === item.id ? 'جارٍ...' : 'عرض القالب'}</Button>
            : '—'}</td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="لا توجد حالات بانتظار المحصل" sub="بعد اعتماد الدفع من موظف التحصيل البنكي ستظهر الحالات هنا تلقائياً." />}
    </Panel>
    <Panel>
      <div className="panel-head"><h3><FileText />كشف الإيرادات اليومية</h3><Badge color="emerald">{reportRows.length}</Badge></div>
      <div className="workflow-report-filter">
        <Field label="من"><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="إلى"><input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <div><b>الإجمالي</b><strong>{reportRows.reduce((n, x) => n + x.amount, 0).toFixed(2)} ₪</strong></div>
        {can('cashier_collection.export') && <Button className="btn-primary" onClick={() => void pdf()}><Download />تصدير PDF حسب كل عيادة</Button>}
      </div>
    </Panel>
    {receiptPreview && <ReceiptTemplateModal item={receiptPreview} cashierName={user?.displayName || 'المحصل المالي'} busy={busy===receiptPreview.id} canPrint={can('cashier_collection.print')} canPdf={can('cashier_collection.export')} onClose={()=>setReceiptPreview(null)} onPrint={()=>void finalizeReceipt(receiptPreview,'print')} onPdf={()=>void finalizeReceipt(receiptPreview,'pdf')}/>}
    {searchOpen && <PaidReceiptsSearch onClose={() => setSearchOpen(false)} />}
  </>;
}

function AuditEditModal({ item, onClose }: { item: CashierWorkflowCase; onClose: () => void }) {
  const { updateWorkflowCase } = useHospital();
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await updateWorkflowCase(item.id, {
        patientName: String(d.get('patientName')),
        medicalSerial: String(d.get('medicalSerial')),
        idNumber: String(d.get('idNumber') || ''),
        patientPhone: String(d.get('patientPhone') || ''),
        patientDob: String(d.get('patientDob') || ''),
        patientGender: String(d.get('patientGender') || '') as 'male' | 'female',
        patientCity: String(d.get('patientCity') || ''),
        patientArea: String(d.get('patientArea') || ''),
        coverageEntity: String(d.get('coverageEntity') || ''),
        clinicName: String(d.get('clinicName')),
        doctorName: String(d.get('doctorName')),
        amount: Number(d.get('amount')),
        senderName: String(d.get('senderName')),
        senderPhone: String(d.get('senderPhone')),
        paymentSource: String(d.get('paymentSource')),
        notes: String(d.get('notes')),
        status: 'audited',
        auditedAt: new Date().toISOString(),
      });
      toast('تم حفظ التدقيق والتعديلات');
      onClose();
    } catch (error) {
      toast(errorText(error, 'تعذر حفظ التعديلات'), 'warn');
    } finally {
      setBusy(false);
    }
  };
  return <Modal title={<><Pencil />تدقيق وتعديل السجل المالي</>} onClose={onClose}>
    <form onSubmit={submit}><div className="form-grid">
      <Field label="اسم المريض" span={2}><input name="patientName" defaultValue={item.patientName} required /></Field>
      <Field label="رقم المريض"><input name="medicalSerial" defaultValue={item.medicalSerial} /></Field>
      <Field label="رقم الهوية"><input name="idNumber" defaultValue={item.idNumber || ''} /></Field>
      <Field label="جوال المريض"><input name="patientPhone" dir="ltr" defaultValue={item.patientPhone || ''} /></Field>
      <Field label="تاريخ الميلاد"><input name="patientDob" type="date" defaultValue={item.patientDob || ''} /></Field>
      <Field label="الجنس"><select name="patientGender" defaultValue={item.patientGender || ''}><option value="">—</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field>
      <Field label="المدينة"><input name="patientCity" defaultValue={item.patientCity || ''} /></Field>
      <Field label="المنطقة"><input name="patientArea" defaultValue={item.patientArea || ''} /></Field>
      <Field label="جهة التغطية"><input name="coverageEntity" defaultValue={item.coverageEntity || ''} /></Field>
      <Field label="العيادة"><input name="clinicName" defaultValue={item.clinicName} /></Field>
      <Field label="الطبيب"><input name="doctorName" defaultValue={item.doctorName} /></Field>
      <Field label="المبلغ"><input name="amount" type="number" step="0.01" defaultValue={item.amount} /></Field>
      <Field label="اسم المحول"><input name="senderName" defaultValue={item.senderName || ''} /></Field>
      <Field label="رقم الجوال"><input name="senderPhone" defaultValue={item.senderPhone || ''} /></Field>
      <Field label="طريقة التحويل"><input name="paymentSource" defaultValue={item.paymentSource || 'نقدي'} /></Field>
      <Field label="ملاحظات" span={3}><textarea name="notes" defaultValue={item.notes || ''} /></Field>
    </div><FormActions>
      <Button className="btn-primary" type="submit" disabled={busy}><Check />{busy ? 'جارٍ الحفظ...' : 'حفظ واعتماد التدقيق'}</Button>
      <Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button>
    </FormActions></form>
  </Modal>;
}

function ManualAuditModal({ onClose }: { onClose: () => void }) {
  const { addManualWorkflowCase } = useHospital();
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const stamp = new Date().toISOString();
    const key = Date.now();
    setBusy(true);
    try {
      await addManualWorkflowCase({
        visitId: `MAN-${key}`,
        patientId: `MAN-${key}`,
        patientName: String(d.get('patientName')),
        medicalSerial: String(d.get('medicalSerial')),
        idNumber: String(d.get('idNumber') || ''), patientPhone: String(d.get('patientPhone') || ''), patientDob: String(d.get('patientDob') || ''),
        patientGender: String(d.get('patientGender') || '') as 'male' | 'female', patientCity: String(d.get('patientCity') || ''), patientArea: String(d.get('patientArea') || ''), coverageEntity: String(d.get('coverageEntity') || ''),
        clinicId: 'manual',
        clinicName: String(d.get('clinicName')),
        clinicCode: String(d.get('clinicCode') || 'MAN').toUpperCase(),
        doctorId: 'manual',
        doctorName: String(d.get('doctorName')),
        visitDate: String(d.get('visitDate') || today()),
        queueNumber: Number(d.get('queueNumber') || 1),
        amount: Number(d.get('amount') || 0),
        paymentMethod: String(d.get('paymentMethod')) as 'cash' | 'app',
        paymentSource: String(d.get('paymentSource') || 'نقدي'),
        senderName: String(d.get('senderName') || 'نفسه'),
        senderPhone: String(d.get('senderPhone') || ''),
        paidAt: stamp,
        collectedAt: stamp,
        receiptNumber: String(d.get('receiptNumber') || `RCP-M-${key}`),
        status: 'audited',
        auditedAt: stamp,
        notes: String(d.get('notes') || ''),
      });
      toast('تمت إضافة السجل المالي');
      onClose();
    } catch (error) {
      toast(errorText(error, 'تعذر إضافة السجل المالي'), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return <Modal title={<><Plus />إضافة سجل للتدقيق المالي</>} onClose={onClose}>
    <form onSubmit={submit}><div className="form-grid">
      <Field label="اسم المريض" span={2}><input name="patientName" required /></Field>
      <Field label="رقم المريض"><input name="medicalSerial" required /></Field>
      <Field label="رقم الهوية"><input name="idNumber" /></Field><Field label="جوال المريض"><input name="patientPhone" dir="ltr" /></Field>
      <Field label="تاريخ الميلاد"><input name="patientDob" type="date" /></Field><Field label="الجنس"><select name="patientGender"><option value="">—</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field>
      <Field label="المدينة"><input name="patientCity" /></Field><Field label="المنطقة"><input name="patientArea" /></Field><Field label="جهة التغطية"><input name="coverageEntity" /></Field>
      <Field label="العيادة"><input name="clinicName" required /></Field>
      <Field label="رمز العيادة"><input name="clinicCode" defaultValue="MAN" /></Field>
      <Field label="الطبيب"><input name="doctorName" required /></Field>
      <Field label="تاريخ الزيارة"><input name="visitDate" type="date" defaultValue={today()} /></Field>
      <Field label="رقم الدور"><input name="queueNumber" type="number" min="1" defaultValue="1" /></Field>
      <Field label="المبلغ"><input name="amount" type="number" step="0.01" required /></Field>
      <Field label="رقم الإيصال"><input name="receiptNumber" /></Field>
      <Field label="نوع الدفع"><select name="paymentMethod"><option value="cash">نقدي</option><option value="app">تطبيق / بنك</option></select></Field>
      <Field label="طريقة التحويل"><input name="paymentSource" /></Field>
      <Field label="اسم المحول"><input name="senderName" /></Field>
      <Field label="رقم الجوال"><input name="senderPhone" /></Field>
      <Field label="ملاحظات" span={3}><textarea name="notes" /></Field>
    </div><FormActions><Button className="btn-primary" type="submit" disabled={busy}><Check />{busy ? 'جارٍ الإضافة...' : 'إضافة'}</Button></FormActions></form>
  </Modal>;
}

export function FinancialAuditorPage() {
  const { paymentCases, deleteWorkflowCase, updateWorkflowCase } = useHospital();
  const { can } = useAuth();
  const { toast } = useUi();
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<CashierWorkflowCase | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');

  const rows = paymentCases
    .filter(item => item.status === 'collected' || item.status === 'audited')
    .filter(item => !from || isoDate(item.collectedAt || item.paidAt) >= from)
    .filter(item => !to || isoDate(item.collectedAt || item.paidAt) <= to)
    .filter(item => !query || `${item.patientName} ${item.medicalSerial} ${item.idNumber || ''} ${item.patientPhone || ''} ${item.receiptNumber || ''} ${item.clinicName} ${item.doctorName}`.includes(query))
    .sort((a, b) => (b.collectedAt || '').localeCompare(a.collectedAt || ''));

  const exportRows = async () => {
    try {
      await exportFinancialAuditExcel(rows, `تدقيق-مالي-${today()}.xlsx`);
      toast('تم تجهيز ملف Excel للتدقيق المالي');
    } catch {
      toast('تعذر تجهيز ملف Excel', 'warn');
    }
  };

  const approve = async (item: CashierWorkflowCase) => {
    setBusy(item.id);
    try {
      await updateWorkflowCase(item.id, { status: 'audited', auditedAt: new Date().toISOString() });
      toast('تم اعتماد التدقيق');
    } catch (error) {
      toast(errorText(error, 'تعذر اعتماد التدقيق'), 'warn');
    } finally {
      setBusy('');
    }
  };

  const remove = async (item: CashierWorkflowCase) => {
    if (!confirm(`حذف سجل ${item.patientName}؟`)) return;
    setBusy(item.id);
    try {
      await deleteWorkflowCase(item.id);
      toast('تم حذف السجل');
    } catch (error) {
      toast(errorText(error, 'تعذر حذف السجل'), 'warn');
    } finally {
      setBusy('');
    }
  };

  return <>
    <PageHeader
      crumb="الدائرة المالية"
      title="المدقق المالي - أ. محمد الشكري"
      sub="تصل هنا الحالات بعد إتمام التسجيل والدفع والتحصيل وطباعة الإيصال. يمكنك التعديل والإضافة والحذف والتصدير."
      actions={<>
        {can('financial_audit.create') && <Button className="btn-ghost" onClick={() => setAdding(true)}><Plus />إضافة سجل</Button>}
        {can('financial_audit.export') && <Button className="btn-primary" onClick={() => void exportRows()}><Download />تصدير Excel</Button>}
      </>}
    />
    <Panel>
      <div className="workflow-toolbar audit-toolbar">
        <label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث شامل..." /></label>
        <label>من<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>إلى<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <Badge color="emerald">{rows.length} سجل</Badge>
      </div>
      {rows.length ? <div className="table-wrap"><table className="workflow-table audit-table">
        <thead><tr><th>الحالة</th><th>رقم الإيصال</th><th>المريض</th><th>رقم المريض</th><th>بيانات المريض</th><th>العيادة / الطبيب</th><th>المحول</th><th>المبلغ</th><th>الدفع</th><th>الدور</th><th>الإجراءات</th></tr></thead>
        <tbody>{rows.map(item => <tr key={item.id}>
          <td>{item.status === 'audited'
            ? <Badge color="emerald"><ShieldCheck />تم التدقيق</Badge>
            : (can('financial_audit.update') ? <Button className="btn-ghost btn-sm" disabled={busy === item.id} onClick={() => void approve(item)}><UserCheck />اعتماد</Button> : <Badge color="amber">بانتظار التدقيق</Badge>)}</td>
          <td>{item.receiptNumber || '—'}<small>{displayTime(item.collectedAt)}</small></td><td><b>{item.patientName}</b></td><td>{item.medicalSerial}</td>
          <td><span>هوية: {item.idNumber || '—'}</span><small>جوال: {item.patientPhone || '—'} · ميلاد: {item.patientDob || '—'} · {item.patientGender === 'male' ? 'ذكر' : item.patientGender === 'female' ? 'أنثى' : '—'} · {[item.patientCity,item.patientArea].filter(Boolean).join(' / ') || '—'} · {item.coverageEntity || '—'}</small></td>
          <td>{item.clinicName}<small>{item.doctorName}</small></td><td>{item.senderName || 'نفسه'}<small dir="ltr">{item.senderPhone || ''}</small></td>
          <td><b>{item.amount.toFixed(2)} ₪</b></td><td>{paymentLabel(item)}</td><td>{item.clinicCode}-{item.queueNumber}</td>
          <td><div className="table-actions">
            {can('financial_audit.update') && <Button className="btn-ghost btn-sm" onClick={() => setEditing(item)}><Pencil />تعديل</Button>}
            {can('financial_audit.delete') && <Button className="btn-danger btn-sm" disabled={busy === item.id} onClick={() => void remove(item)}><Trash2 />حذف</Button>}
          </div></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="لا توجد سجلات مكتملة" sub="ستصل الحالات هنا بعد اعتماد المحصل المالي." />}
    </Panel>
    {editing && <AuditEditModal item={editing} onClose={() => setEditing(null)} />}
    {adding && <ManualAuditModal onClose={() => setAdding(false)} />}
  </>;
}
