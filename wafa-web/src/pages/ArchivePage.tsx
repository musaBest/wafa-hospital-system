import { useEffect, useMemo, useState } from 'react';
import { Archive, Download, Eye, FileText, RefreshCw, Search, UserRoundCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Badge, Button, EmptyState, PageHeader, Panel } from '../components/ui';
import { useUi } from '../context/UiContext';
import { captureElementCanvas, createSilentExportFrame, downloadBlob, removeExportHosts, safeDownloadFilename } from '../utils/documentDownload';
import { hospitalApi } from '../services/hospitalApi.service';
import type { DischargedArchiveRecord } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};
const value = (input: unknown) => String(input ?? '').trim() || '—';
const escapeHtml = (input: unknown) => value(input)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
const genderLabel = (gender?: string | null) => gender === 'female' ? 'أنثى' : gender === 'male' ? 'ذكر' : '—';
const dateDisplay = (date?: string | null) => date ? new Date(date).toLocaleDateString('ar-EG') : '—';
const stayLabel = (days?: number | null) => days ? `${days} يوم` : '—';

const detailRows = (record: DischargedArchiveRecord) => [
  ['اسم المريض', record.patientName], ['رقم المريض', record.medicalSerial], ['رقم الهوية', record.idNumber], ['تاريخ الميلاد', dateDisplay(record.dob)],
  ['العمر', record.age ? `${record.age}` : '—'], ['الجنس', genderLabel(record.gender)], ['رقم الجوال', record.phone], ['العنوان', record.address || [record.city, record.area].filter(Boolean).join(' / ')],
  ['الحالة الاجتماعية', record.maritalStatus], ['جهة التغطية', record.coverageEntity], ['مصدر الأرشفة', record.sourceLabel], ['القسم', record.department],
  ['الغرفة', record.room], ['السرير', record.bed], ['اسم الطبيب', record.doctorName], ['التشخيص', record.diagnosis],
  ['تاريخ الدخول', dateDisplay(record.admissionDate)], ['وقت الدخول', record.admissionTime], ['تاريخ الخروج', dateDisplay(record.dischargeDate || record.dischargedAt)], ['مدة المكوث', stayLabel(record.stayDays)],
  ['جهة التحويل', record.referralEntity], ['الطبيب المحول', record.referringDoctor], ['رقم الحالة', record.caseNumber], ['رقم التأمين', record.insuranceNumber],
  ['سبب التحويل', record.conversionReason], ['مدة التحويل', record.conversionDuration], ['المسؤول/المسجل', record.responsiblePerson], ['حالة الأرشيف', record.archiveStatus],
];

const archivePdfCss = `
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-shadow:none!important;filter:none!important}
  body{margin:0;background:#fff;color:#162033;font-family:Tahoma,Arial,'Segoe UI',sans-serif;direction:rtl}
  .archive-pdf{width:794px;min-height:1123px;background:#f7fafc;padding:28px;color:#162033}
  .archive-pdf-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border:2px solid #17365d;border-radius:24px;background:#fff}
  .archive-pdf-brand{display:flex;align-items:center;gap:14px}.archive-pdf-logo{width:70px;height:70px;object-fit:contain;border:1px solid #d9e2ef;border-radius:16px;padding:6px;background:#fff}
  .archive-pdf h1{margin:0;color:#17365d;font-size:24px;font-weight:900}.archive-pdf .sub{margin-top:5px;color:#607089;font-weight:700;font-size:12px}.archive-pdf-date{text-align:left;font-weight:900;color:#17365d;line-height:1.8}
  .archive-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.archive-summary div{background:#17365d;color:#fff;border-radius:16px;padding:12px;text-align:center}.archive-summary b{display:block;font-size:24px}.archive-summary span{font-size:11px;color:#dceaff}
  .archive-record{background:#fff;border:1.5px solid #cbd7e8;border-radius:24px;padding:16px;margin:14px 0;break-inside:avoid;page-break-inside:avoid;box-shadow:0 8px 24px rgba(23,54,93,.08)}
  .archive-record-title{display:flex;justify-content:space-between;gap:10px;border-bottom:2px solid #e4ebf5;padding-bottom:10px;margin-bottom:12px}.archive-record-title h2{margin:0;font-size:18px;color:#0f2d52}.archive-record-title span{font-size:12px;font-weight:800;color:#607089}
  .archive-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #9eb1ca;border-radius:16px;overflow:hidden}.archive-cell{min-height:50px;padding:8px 10px;border-left:1px solid #c7d3e3;border-bottom:1px solid #c7d3e3}.archive-cell:nth-child(4n){border-left:0}.archive-cell label{display:block;font-size:10px;color:#51647e;font-weight:800;margin-bottom:4px}.archive-cell b{font-size:12px;line-height:1.55;color:#111827}.archive-cell.long{grid-column:span 4}.archive-cell.long b{white-space:pre-wrap}
  .archive-footer{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding-top:12px;border-top:2px solid #17365d;font-size:11px;color:#607089;font-weight:800}
`;

function archivePdfHtml(records: DischargedArchiveRecord[], from: string, to: string, search: string) {
  const inpatient = records.filter(row => row.sourceType === 'admission').length;
  const operations = records.filter(row => row.sourceType === 'operation').length;
  return `<section class="archive-pdf" dir="rtl">
    <header class="archive-pdf-header">
      <div class="archive-pdf-brand"><img class="archive-pdf-logo" src="/wafaa-hospital-logo.png"/><div><h1>أرشيف المرضى الخارجين من المستشفى</h1><div class="sub">ملف رسمي للعرض والتوثيق - مستشفى الوفاء</div></div></div>
      <div class="archive-pdf-date"><div>تاريخ الإصدار: ${escapeHtml(today())}</div><div>الفترة: ${escapeHtml(from || 'الكل')} - ${escapeHtml(to || 'الكل')}</div>${search ? `<div>البحث: ${escapeHtml(search)}</div>` : ''}</div>
    </header>
    <div class="archive-summary"><div><b>${records.length}</b><span>إجمالي الحالات</span></div><div><b>${inpatient}</b><span>مبيت داخلي</span></div><div><b>${operations}</b><span>عمليات</span></div><div><b>${records.reduce((sum, row) => sum + Number(row.stayDays || 0), 0)}</b><span>إجمالي أيام المكوث</span></div></div>
    ${records.length ? records.map((record, index) => `<article class="archive-record">
      <div class="archive-record-title"><div><h2>${index + 1}. ${escapeHtml(record.patientName)}</h2><span>${escapeHtml(record.sourceLabel)} · ${escapeHtml(record.archiveStatus)}</span></div><span>خروج: ${escapeHtml(dateDisplay(record.dischargeDate || record.dischargedAt))}</span></div>
      <div class="archive-grid">${detailRows(record).map(([label, cell]) => `<div class="archive-cell ${String(label) === 'التشخيص' ? 'long' : ''}"><label>${escapeHtml(label)}</label><b>${escapeHtml(cell)}</b></div>`).join('')}</div>
    </article>`).join('') : '<article class="archive-record"><h2>لا توجد بيانات مطابقة</h2></article>'}
    <footer class="archive-footer"><span>قسم الأرشيف - عرض فقط</span><span>تم إنشاء التقرير إلكترونيًا من نظام مستشفى الوفاء</span></footer>
  </section>`;
}

async function downloadArchivePdf(records: DischargedArchiveRecord[], from: string, to: string, search: string) {
  removeExportHosts();
  const host = await createSilentExportFrame(`<style>${archivePdfCss}</style>${archivePdfHtml(records, from, to, search)}`,794,1320);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(resolve => window.setTimeout(resolve, 120));
    const page = host.querySelector('.archive-pdf') as HTMLElement | null;
    if (!page) throw new Error('تعذر تجهيز قالب الأرشيف');
    const images = Array.from(page.querySelectorAll('img'));
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
    const canvas = await captureElementCanvas(page, { scale: 1.75, useCORS: true, backgroundColor: '#f7fafc' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const width = 210;
    const height = (canvas.height * width) / canvas.width;
    const pageHeight = 297;
    const image = canvas.toDataURL('image/png');
    for (let y = 0, pageIndex = 0; y < height; y += pageHeight, pageIndex += 1) {
      if (pageIndex > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(image, 'PNG', 0, -y, width, height, undefined, 'FAST');
    }
    const blob = pdf.output('blob');
    downloadBlob(blob, `${safeDownloadFilename(`archive-discharged-${from || 'all'}-${to || 'all'}`)}.pdf`);
  } finally {
    host.remove();
    removeExportHosts();
  }
}

export function ArchivePage() {
  const { toast } = useUi();
  const [records, setRecords] = useState<DischargedArchiveRecord[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => records.find(item => item.id === selectedId) || records[0] || null, [records, selectedId]);
  const stats = useMemo(() => ({
    total: records.length,
    inpatient: records.filter(item => item.sourceType === 'admission').length,
    operations: records.filter(item => item.sourceType === 'operation').length,
    stayDays: records.reduce((sum, item) => sum + Number(item.stayDays || 0), 0),
  }), [records]);

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await hospitalApi.dischargedArchive(search.trim(), from, to);
      setRecords(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (error) {
      if (!silent) toast(error instanceof Error ? error.message : 'تعذر تحميل بيانات الأرشيف', 'warn');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(true); }, 20000);
    return () => window.clearInterval(timer);
  }, [search, from, to]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadArchivePdf(records, from, to, search.trim());
      toast('تم تصدير ملف الأرشيف PDF بنجاح');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'تعذر تصدير ملف الأرشيف', 'warn');
    } finally { setExporting(false); }
  };

  return <>
    <PageHeader
      crumb="قسم الأرشيف"
      title="الأرشيف"
      sub="واجهة عرض فقط للمرضى الذين خرجوا من المستشفى. تظهر الحالات أولاً بأول بعد تسجيل الخروج الكامل، مع تقرير PDF أنيق للتوثيق."
      actions={<><Button className="btn-ghost" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> تحديث</Button><Button className="btn-primary" onClick={() => void exportPdf()} disabled={exporting}><Download /> تصدير PDF</Button></>}
    />

    <div className="archive-stats">
      <Panel><span>إجمالي الخارجين</span><b>{stats.total}</b><Archive /></Panel>
      <Panel><span>مبيت داخلي</span><b>{stats.inpatient}</b><UserRoundCheck /></Panel>
      <Panel><span>عمليات</span><b>{stats.operations}</b><FileText /></Panel>
      <Panel><span>أيام المكوث</span><b>{stats.stayDays}</b><Eye /></Panel>
    </div>

    <Panel className="archive-filters">
      <label><span>بحث</span><div><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="اسم المريض، الهوية، رقم الملف، الطبيب، القسم..." /></div></label>
      <label><span>من تاريخ خروج</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label><span>إلى تاريخ خروج</span><input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      <Button className="btn-primary" onClick={() => void refresh()}><Search /> عرض النتائج</Button>
    </Panel>

    <div className="archive-layout">
      <Panel className="archive-table-panel">
        <div className="panel-head"><h3><Archive /> المرضى الخارجون</h3><span>القائمة قراءة فقط ولا تحتوي أي تعديل أو حذف.</span></div>
        {loading ? <div className="inquiries-loading"><RefreshCw className="spin" /> جارٍ تحميل الأرشيف...</div> : records.length ? <div className="table-wrap"><table className="archive-table">
          <thead><tr><th>#</th><th>اسم المريض</th><th>رقم الملف</th><th>الهوية</th><th>القسم</th><th>الطبيب</th><th>الدخول</th><th>الخروج</th><th>الحالة</th></tr></thead>
          <tbody>{records.map((record, index) => <tr key={record.id} className={selected?.id === record.id ? 'selected' : ''} onClick={() => setSelectedId(record.id)}>
            <td>{index + 1}</td><td><b>{record.patientName}</b><small>{record.phone || '—'}</small></td><td>{record.medicalSerial}</td><td dir="ltr">{record.idNumber}</td><td>{record.department || record.sourceLabel}</td><td>{record.doctorName || '—'}</td><td>{dateDisplay(record.admissionDate)}</td><td>{dateDisplay(record.dischargeDate || record.dischargedAt)}</td><td><Badge color="emerald">{record.archiveStatus}</Badge></td>
          </tr>)}</tbody>
        </table></div> : <EmptyState title="لا توجد حالات خروج" sub="ستظهر هنا تلقائياً أسماء المرضى فور تسجيل خروجهم من المستشفى." />}
      </Panel>

      <Panel className="archive-detail-panel">
        <div className="panel-head"><h3><Eye /> تفاصيل ملف المريض</h3><span>عرض كامل للبيانات المتاحة في الأرشيف.</span></div>
        {selected ? <div className="archive-detail-grid">
          {detailRows(selected).map(([label, cell]) => <div key={String(label)} className={String(label) === 'التشخيص' ? 'span2' : ''}><span>{label}</span><b>{value(cell)}</b></div>)}
        </div> : <EmptyState title="اختر مريضاً" sub="اضغط على أي صف من الجدول لعرض تفاصيله الكاملة." />}
      </Panel>
    </div>
  </>;
}
