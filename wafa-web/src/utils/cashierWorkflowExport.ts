import { jsPDF } from 'jspdf';
import type { CashierWorkflowCase } from '../types';
import { downloadXlsx } from './exportXlsx';
import { captureElementCanvas, cleanupExportArtifacts, createSilentExportFrame, removeExportHosts } from './documentDownload';
import { printHtmlDocument } from './printDocument';
import { logoUrl, reportHeadStyles, reportHeader } from './reportBranding';

const esc=(value:unknown)=>String(value??'—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const fmtDate=(iso?:string|null)=>{if(!iso)return '—';const d=new Date(iso.length===10?`${iso}T12:00:00`:iso);return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('en-GB')};
const fmtDateTime=(iso?:string|null)=>{if(!iso)return '—';const d=new Date(iso);return Number.isNaN(d.getTime())?iso:`${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`};
const dayAr=(iso?:string|null)=>{if(!iso)return '';const d=new Date(iso.length===10?`${iso}T12:00:00`:iso);return new Intl.DateTimeFormat('ar',{weekday:'long'}).format(d)};


const receiptNumberSetting=(key:string,fallback:number)=>{
  try{const raw=window.localStorage.getItem(key);const value=raw?Number(raw):fallback;return Number.isFinite(value)&&value>0?value:fallback}catch{return fallback}
};
const receiptSettings=()=>({
  widthMm:receiptNumberSetting('wafaa_receipt_width_mm',80),
  heightMm:receiptNumberSetting('wafaa_receipt_height_mm',220),
  marginMm:receiptNumberSetting('wafaa_receipt_margin_mm',3),
  fontScale:receiptNumberSetting('wafaa_receipt_font_scale',1),
});

const numberToArabicWords=(value:number)=>{
  const n=Math.max(0,Math.round(value));
  if(n===0)return 'صفر';
  const ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const underHundred=(x:number)=>x<20?ones[x]:`${x%10?ones[x%10]+' و':''}${tens[Math.floor(x/10)]}`;
  const underThousand=(x:number)=>{const parts:string[]=[];const h=Math.floor(x/100),r=x%100;if(h){parts.push(h===1?'مائة':h===2?'مائتان':`${ones[h]}مائة`)}if(r)parts.push(underHundred(r));return parts.join(' و')};
  const parts:string[]=[];const thousands=Math.floor(n/1000),rest=n%1000;
  if(thousands){if(thousands===1)parts.push('ألف');else if(thousands===2)parts.push('ألفان');else if(thousands<=10)parts.push(`${underThousand(thousands)} آلاف`);else parts.push(`${underThousand(thousands)} ألف`)}
  if(rest)parts.push(underThousand(rest));
  return parts.join(' و');
};

export const BANKING_APPS = [
  'نقدي',
  'بال باي PalPay',
  'جوال باي Jawwal Pay',
  'بنك فلسطين',
  'البنك العربي',
  'بنك القدس',
  'البنك الإسلامي الفلسطيني',
  'بنك الإسكان',
  'القاهرة عمان',
  'محفظة إلكترونية أخرى',
];

export async function exportPaymentAuditExcel(rows:CashierWorkflowCase[], filename='كشف-التحصيل-اليومي.xlsx'){
  const ordered=rows.slice().sort((a,b)=>(a.paidAt||a.registeredAt).localeCompare(b.paidAt||b.registeredAt));
  await downloadXlsx(filename,
    ['اليوم','التاريخ','اسم المريض','اسم العيادة','اسم الطبيب','اسم المحول','المبلغ','طريقة التحويل','رقم الجوال'],
    ordered.map(item=>[
      dayAr(item.paidAt||item.registeredAt),fmtDate(item.paidAt||item.registeredAt),item.patientName,item.clinicName,item.doctorName,
      item.senderName||'نفسه',Number(item.amount||0),item.paymentMethod==='cash'?'نقدي':item.paymentSource||'تطبيق',item.senderPhone||'—'
    ]),true);
}

export async function exportFinancialAuditExcel(rows:CashierWorkflowCase[], filename='تدقيق-مالي.xlsx'){
  await downloadXlsx(filename,
    ['مسلسل','رقم الإيصال','تاريخ الإيصال','رقم المريض','اسم المريض','رقم الهوية','جوال المريض','تاريخ الميلاد','الجنس','المدينة','المنطقة','جهة التغطية','العيادة','رمز العيادة','الطبيب','المبلغ','طريقة الدفع','اسم المحول','جوال المحول','رقم الدور','الحالة'],
    rows.map((item,index)=>[index+1,item.receiptNumber||'—',fmtDateTime(item.collectedAt||item.paidAt),item.medicalSerial,item.patientName,item.idNumber||'—',item.patientPhone||'—',item.patientDob||'—',item.patientGender==='male'?'ذكر':item.patientGender==='female'?'أنثى':'—',item.patientCity||'—',item.patientArea||'—',item.coverageEntity||'—',item.clinicName,item.clinicCode,item.doctorName,Number(item.amount||0),item.paymentMethod==='cash'?'نقدي':item.paymentSource||'تطبيق',item.senderName||'—',item.senderPhone||'—',`${item.clinicCode}-${item.queueNumber}`,item.status]),true);
}

/* ---------------------------------------------------------------------------
   v4.5.0 — إيصال القبض حسب القالب الرسمي المعتمد
   الشكل: ترويسة باسم المستشفى وشعاره، ثم صف لكل حقل بعنوان وقيمة، وخط أحمر
   فاصل، ثم بيانات المريض والخدمة، ثم أمين الصندوق.
   وحدة القياس صارت قابلة للاختيار (مم/سم/بوصة) بدل تثبيتها بالمليمتر.
--------------------------------------------------------------------------- */

const receiptUnit = () => {
  try { return window.localStorage.getItem('wafaa_receipt_unit') || 'mm'; } catch { return 'mm'; }
};

/** يحوّل القيمة المخزّنة (بالمليمتر دائماً) إلى وحدة العرض المختارة. */
export const toReceiptUnit = (mm: number, unit = receiptUnit()) =>
  unit === 'cm' ? mm / 10 : unit === 'in' ? mm / 25.4 : mm;

/** يحوّل قيمة أدخلها المستخدم بوحدته إلى مليمتر للتخزين. */
export const fromReceiptUnit = (value: number, unit = receiptUnit()) =>
  unit === 'cm' ? value * 10 : unit === 'in' ? value * 25.4 : value;

export function getVisitReceiptDocument(item: CashierWorkflowCase, cashierName='المحصل المالي') {
  const method = item.paymentMethod === 'cash' ? 'نقدي' : item.paymentSource || 'تطبيق';
  const stamp = fmtDateTime(item.collectedAt || item.paidAt || item.registeredAt);
  const queue = `${item.clinicCode || 'Q'}-${item.queueNumber ?? '—'}`;
  const service = item.clinicCode ? `${item.clinicCode} · ${item.clinicName}` : item.clinicName || '—';
  const row = (label: string, value: string, strong = false) =>
    `<div class="rc-row"><span class="rc-label">${esc(label)}</span><span class="rc-value${strong ? ' rc-strong' : ''}">${esc(value)}</span></div>`;

  const body = `<main class="rc" dir="rtl">
    <header class="rc-head">
      <img src="${logoUrl()}" alt="شعار مستشفى الوفاء" />
      <div><b>مستشفى الوفاء للتأهيل الطبي</b><span>والجراحة التخصصية</span></div>
    </header>
    <div class="rc-meta">${row('الوقت والتاريخ', stamp)}</div>
    ${row('إيصال قبض رقم:', item.receiptNumber || 'يُنشأ عند الاعتماد', true)}
    ${row('رقم المريض:', String(item.medicalSerial || '—'))}
    ${row('المبلغ بالشيكل:', Number(item.amount || 0).toFixed(2), true)}
    <div class="rc-rule"></div>
    ${row('الاسم', item.patientName || '—')}
    ${row('القسم', item.clinicName || '—')}
    ${row('الخدمة عن:', service)}
    ${row('الطبيب', item.doctorName || '—')}
    ${row('طريقة الدفع', method)}
    <div class="rc-queue"><span>رقم الدور</span><b>${esc(queue)}</b></div>
    <div class="rc-rule rc-rule-soft"></div>
    ${row('أمين الصندوق:', cashierName || 'المحصل المالي', true)}
  </main>`;

  const { widthMm, heightMm, marginMm, fontScale } = receiptSettings();
  const contentWidth = Math.max(44, widthMm - marginMm * 2);
  const fs = (base: number) => `${Math.max(8, base * fontScale)}px`;
  const css = `@page{size:${widthMm}mm ${heightMm}mm;margin:${marginMm}mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{width:${widthMm}mm;margin:0!important;background:#fff!important;color:#000!important;overflow:visible!important}
.rc{width:${contentWidth}mm;max-width:100%;margin:0 auto;padding:1mm .4mm 2mm;font-family:Tahoma,"Segoe UI",Arial,sans-serif;color:#000;background:#fff;font-size:${fs(11)};line-height:1.85}
.rc-head{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;margin:0 0 8px;text-align:center}
.rc-head img{width:min(24mm,72px);height:auto;max-height:20mm;object-fit:contain;display:block}
.rc-head div{display:grid;gap:1px}.rc-head b{font-size:${fs(13)};font-weight:900}.rc-head span{font-size:${fs(9)};font-weight:800}
.rc-row{display:grid;grid-template-columns:minmax(82px,.9fr) minmax(0,1.25fr);align-items:baseline;gap:7px;padding:1px 0}
.rc-label{font-weight:900;text-align:right;white-space:nowrap}.rc-value{font-weight:750;text-align:right;overflow-wrap:anywhere;unicode-bidi:plaintext}.rc-strong{font-weight:950;text-decoration:underline;text-underline-offset:3px}
.rc-rule{height:2px;background:#8f1111;margin:8px 0}.rc-rule-soft{height:1px;background:#222;margin-top:10px}
.rc-queue{margin:9px 0 7px;border:1.5px solid #111;padding:6px 7px;text-align:center;display:grid;gap:2px}.rc-queue span{font-size:${fs(9)};font-weight:900}.rc-queue b{font-family:"Segoe UI",Arial,sans-serif;font-size:${fs(17)};font-weight:950;letter-spacing:.8px;direction:ltr}
@media print{html,body{margin:0!important}.rc{break-inside:avoid;page-break-inside:avoid}}`;
  return { body, css, title: `إيصال ${item.patientName}`, widthMm, heightMm };
}

/** طباعة الإيصال مباشرة على الطابعة. */
export async function printVisitReceipt(item: CashierWorkflowCase, cashierName='المحصل المالي') {
  const { body, css, title } = getVisitReceiptDocument(item, cashierName);
  await printHtmlDocument(title, body, css);
}

/** تصدير نفس الإيصال كملف PDF بنفس القالب تماماً. */
export async function exportVisitReceiptPdf(item: CashierWorkflowCase, cashierName='المحصل المالي') {
  const { body, css, widthMm, heightMm } = getVisitReceiptDocument(item, cashierName);
  removeExportHosts();
  const widthPx = Math.max(220, Math.ceil(widthMm * 3.78));
  const heightPx = Math.max(320, Math.ceil(heightMm * 3.78));
  const host = await createSilentExportFrame(`<style>${css}</style>${body}`, widthPx, heightPx);
  try {
    const node = host.querySelector('.rc') as HTMLElement | null;
    if (!node) throw new Error('تعذر تجهيز قالب الإيصال');
    const canvas = await captureElementCanvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: widthMm > heightMm ? 'landscape' : 'portrait', unit: 'mm', format: [widthMm, heightMm] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
    pdf.save(`إيصال-${item.receiptNumber || item.medicalSerial || 'قبض'}.pdf`);
  } finally {
    removeExportHosts();
    cleanupExportArtifacts();
  }
}

function buildRevenueHtml(rows:CashierWorkflowCase[],from:string,to:string){
  const groups=new Map<string,CashierWorkflowCase[]>();
  rows.forEach(item=>{const key=item.clinicId||item.clinicName;groups.set(key,[...(groups.get(key)||[]),item])});
  const sections=[...groups.values()].sort((a,b)=>(a[0]?.clinicName||'').localeCompare(b[0]?.clinicName||'','ar')).map(group=>{
    const clinic=group[0]?.clinicName||'—';const sum=group.reduce((n,x)=>n+Number(x.amount||0),0);
    return `<section class="clinic-section"><div class="clinic-title">القسم / ${esc(clinic)}</div><table><thead><tr><th>مسلسل</th><th>رقم الإيصال</th><th>تاريخ الإيصال</th><th>الاسم</th><th>المبلغ</th><th>تطبيق / نقدي</th><th>رقم المريض</th><th>الطبيب</th></tr></thead><tbody>${group.map((item,index)=>`<tr><td>${index+1}</td><td>${esc(item.receiptNumber||'—')}</td><td>${esc(fmtDateTime(item.collectedAt||item.paidAt))}</td><td>${esc(item.patientName)}</td><td>${Number(item.amount||0).toFixed(0)}</td><td>${esc(item.paymentMethod==='cash'?'نقدي':item.paymentSource||'تطبيق')}</td><td><b>${esc(item.medicalSerial)}</b></td><td>${esc(item.doctorName)}</td></tr>`).join('')}</tbody></table><div class="clinic-total">إجمالي المبلغ المحصل: <b>${sum.toFixed(0)}</b></div></section>`;
  }).join('');
  const total=rows.reduce((n,x)=>n+Number(x.amount||0),0);
  return `<main class="daily-revenue-page" dir="rtl">${reportHeader({title:'كشف الإيرادات اليومية — العيادات الطبية الخارجية',meta:`خلال الفترة من ${esc(fmtDate(from))} حتى ${esc(fmtDate(to))}`})}<header><div>خلال الفترة من <b>${esc(fmtDate(from))}</b> حتى <b>${esc(fmtDate(to))}</b></div></header>${sections||'<p class="empty">لا توجد إيصالات مدفوعة ضمن الفترة المحددة</p>'}<div class="grand-total"><span>المبلغ الإجمالي للإيرادات اليومية: <b>${total.toFixed(0)}</b></span><span>المبلغ الإجمالي بالحروف: <b>${esc(numberToArabicWords(total))} شيكل</b></span></div><footer><span>توقيع المحصل: __________________</span><span>توقيع أمين الصندوق: __________________</span><span>توقيع مدير الدائرة المالية: __________________</span></footer></main>`;
}

const reportCss=`${reportHeadStyles}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}.daily-revenue-page{width:794px;min-height:1123px;background:white;color:#000;padding:20px 18px 30px;font-family:Tahoma,Arial,sans-serif;direction:rtl}.daily-revenue-page header{text-align:center;margin-bottom:18px}.daily-revenue-page h1{font-size:18px;margin:0 0 7px;font-weight:900}.daily-revenue-page header div{font-size:12px}.clinic-section{margin:12px 0;break-inside:avoid}.clinic-title{text-align:right;font-weight:900;font-size:12px;margin:0 4px 4px}.clinic-section table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}.clinic-section th,.clinic-section td{border:1px solid #111;padding:4px 3px;text-align:center;vertical-align:middle}.clinic-section th{font-weight:900;background:#fff}.clinic-section th:nth-child(1){width:6%}.clinic-section th:nth-child(2){width:12%}.clinic-section th:nth-child(3){width:16%}.clinic-section th:nth-child(4){width:21%}.clinic-section th:nth-child(5){width:8%}.clinic-section th:nth-child(6){width:10%}.clinic-section th:nth-child(7){width:12%}.clinic-section th:nth-child(8){width:15%}.clinic-total{font-size:11px;font-weight:700;text-align:center;margin:4px 0 8px}.grand-total{border:2px dotted #111;padding:8px;text-align:center;font-size:12px;margin-top:16px;font-weight:700;display:grid;gap:4px}.daily-revenue-page footer{display:flex;justify-content:space-between;gap:12px;margin-top:22px;font-size:10px;font-weight:700}.empty{text-align:center;border:1px solid #111;padding:40px}`;

export async function exportDailyRevenuePdf(rows:CashierWorkflowCase[],from:string,to:string,filename='كشف-الايرادات-اليومية.pdf'){
  removeExportHosts();
  const host=await createSilentExportFrame(`<style>${reportCss}</style>${buildRevenueHtml(rows,from,to)}`,794,1320);
  try{
    if(document.fonts?.ready)await document.fonts.ready;await new Promise(resolve=>setTimeout(resolve,70));
    const node=host.querySelector('.daily-revenue-page') as HTMLElement;const canvas=await captureElementCanvas(node,{scale:1.6,useCORS:true,backgroundColor:'#ffffff'});
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});const pageWidth=210,pageHeight=297;const pageHeightPx=Math.floor(canvas.width*(pageHeight/pageWidth));let y=0,page=0;
    while(y<canvas.height){const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.min(pageHeightPx,canvas.height-y);slice.getContext('2d')!.drawImage(canvas,0,y,canvas.width,slice.height,0,0,canvas.width,slice.height);if(page>0)pdf.addPage('a4','portrait');const imageHeight=slice.height*(pageWidth/slice.width);pdf.addImage(slice.toDataURL('image/png'),'PNG',0,0,pageWidth,imageHeight,undefined,'FAST');y+=pageHeightPx;page++;}
    pdf.save(filename);
  }finally{host.remove();cleanupExportArtifacts()}
}
