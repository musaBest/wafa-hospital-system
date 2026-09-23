import { jsPDF } from 'jspdf';
import { downloadXlsx } from './exportXlsx';
import { captureElementCanvas, cleanupExportArtifacts, createSilentExportFrame, downloadElementsAsDocx } from './documentDownload';

export interface FinancialReportColumn { key:string; label:string }
export interface FinancialReportRow { [key:string]:string|number }
export interface FinancialReportSummary { label:string; value:string|number }
export interface FinancialReportInfoField { label:string; value:string|number }
export interface InpatientFinancialReport {
  title:string;
  dateFrom:string;
  dateTo:string;
  reportDate?:string;
  subtitle?:string;
  columns:FinancialReportColumn[];
  rows:FinancialReportRow[];
  summary?:FinancialReportSummary[];
  note?:string;
  filename:string;
  template?:'standard'|'accountStatement'|'dischargeListing'|'rehabRenewalListing'|'ptInternalReport';
  patientInfo?:FinancialReportInfoField[];
  statementTotals?:{
    gross:string|number;
    covered:string|number;
    discount:string|number;
    paid:string|number;
    remaining:string|number;
  };
  theme?:{
    referralNoColor?: string;
  };
}

const escapeHtml=(value:string|number|undefined)=>String(value??'—')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const safePrintColor=(value?:string)=>/^#[0-9a-fA-F]{6}$/.test(String(value||''))?String(value):'#fff200';
const readableOnPrintColor=(value?:string)=>{
  const hex=safePrintColor(value).replace('#','');
  const r=parseInt(hex.slice(0,2),16); const g=parseInt(hex.slice(2,4),16); const b=parseInt(hex.slice(4,6),16);
  const brightness=(r*299+g*587+b*114)/1000;
  return brightness<135?'#ffffff':'#000000';
};

const standardStyles=`
  *{box-sizing:border-box}body{margin:0;background:#fff;color:#15293a;font-family:Tahoma,Arial,sans-serif}
  .page{width:1123px;min-height:794px;padding:34px 44px 42px;background:#fff;position:relative;overflow:hidden}
  .head{display:grid;grid-template-columns:120px 1fr auto;align-items:end;gap:16px;margin-bottom:16px}.head img{width:96px;height:70px;object-fit:contain}.head-line{height:4px;border-radius:99px;background:linear-gradient(90deg,#35bfd7,#9edee8);margin-bottom:13px}.head-name{text-align:left;color:#397389;display:grid;gap:2px}.head-name b{font-size:15px}.head-name span{font-size:10px;color:#7595a2}.range{text-align:left;font-size:11px;color:#59727e;margin-bottom:7px}.title{text-align:center;margin:0 0 17px}.title h1{margin:0;font-size:23px}.title p{margin:5px 0 0;color:#6a808a;font-size:10px}
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:0 0 14px}.summary div{border:1px solid #c8d7de;background:#f8fbfc;border-radius:10px;padding:9px 10px;display:grid;gap:3px}.summary span{font-size:8.5px;color:#6d8691}.summary b{font-size:13px;color:#173d4b}
  table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.2px}th{background:#eaf5f7;color:#173f4e;font-weight:900;border:1px solid #9eb7c1;padding:7px 5px}td{border:1px solid #c1d0d7;padding:6px 5px;vertical-align:top;line-height:1.45;word-break:break-word}tbody tr:nth-child(even){background:#fbfdfe}.empty{text-align:center;padding:30px;color:#70858e}.note{margin-top:13px;padding:10px 12px;border:1px solid #cbd9df;border-radius:10px;background:#fafcfd;font-size:9px;line-height:1.7}.foot{position:absolute;left:44px;right:44px;bottom:20px;color:#7997a3;font-size:8px;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px}.foot i{height:4px;background:linear-gradient(90deg,#35bfd7,#9edee8);border-radius:99px}.foot p,.foot span{margin:0;white-space:nowrap}
`;

const ptInternalStyles=`
  @page{size:A4 landscape;margin:0}
  *{box-sizing:border-box!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  html,body{margin:0!important;padding:0!important;background:#fff!important;color:#0b1f2d!important;font-family:"Arial","Tahoma",sans-serif!important}
  .pt-print-page{width:1123px!important;min-height:794px!important;background:#fff!important;padding:26px 28px 32px!important;direction:rtl!important;color:#000!important;position:relative!important;overflow:visible!important}
  .pt-print-head{display:grid!important;grid-template-columns:170px 1fr 96px!important;align-items:center!important;gap:18px!important;margin-bottom:12px!important}.pt-print-brand{text-align:right!important;color:#2f6f86!important;font-weight:900!important;line-height:1.35!important}.pt-print-brand b{display:block!important;font-size:17px!important;color:#2e7590!important}.pt-print-brand span{display:block!important;font-size:10.5px!important;color:#6d8794!important}.pt-print-line{height:4px!important;border-radius:99px!important;background:#53c5d8!important}.pt-print-logo{width:82px!important;height:82px!important;object-fit:contain!important;justify-self:end!important}
  .pt-print-title{text-align:center!important;margin:8px 0 9px!important}.pt-print-title h1{margin:0!important;font-size:24px!important;line-height:1.35!important;color:#000!important;font-weight:950!important}.pt-print-title p{margin:4px 0 0!important;font-size:12px!important;color:#5a7180!important;font-weight:800!important;direction:rtl!important;unicode-bidi:isolate!important}
  .pt-print-summary{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:8px!important;margin:12px 0 16px!important}.pt-print-summary div{min-height:48px!important;border:1.45px solid #000!important;background:#f8fcfe!important;border-radius:10px!important;padding:8px!important;display:grid!important;align-content:center!important;gap:3px!important;text-align:center!important}.pt-print-summary span{font-size:10px!important;color:#000!important;font-weight:950!important}.pt-print-summary b{font-size:15px!important;color:#000!important;font-weight:950!important}
  .pt-print-table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:8.45px!important;color:#000!important;direction:rtl!important;border:1.55px solid #000!important}.pt-print-table thead{display:table-header-group!important}.pt-print-table tr{page-break-inside:avoid!important;break-inside:avoid!important}.pt-print-table th,.pt-print-table td{border:1.25px solid #000!important;text-align:center!important;vertical-align:middle!important;padding:4px 2px!important;line-height:1.22!important;color:#000!important;font-weight:850!important;word-break:break-word!important;overflow-wrap:anywhere!important;white-space:normal!important;min-width:0!important;max-width:0!important}.pt-print-table th{background:#e4f4f8!important;color:#000!important;font-size:8.2px!important;font-weight:950!important}.pt-print-table td{background:#fff!important}.pt-print-table tbody tr:nth-child(even) td{background:#f8fbfd!important}.pt-print-table .num{direction:ltr!important;unicode-bidi:plaintext!important;white-space:normal!important;word-break:break-all!important;overflow-wrap:anywhere!important;font-weight:950!important}.pt-print-table .empty{padding:30px!important;color:#536b77!important}.pt-print-note{margin-top:12px!important;border:1.35px solid #000!important;background:#fbfdfe!important;border-radius:10px!important;padding:10px 12px!important;font-size:11px!important;font-weight:850!important;line-height:1.7!important;color:#000!important}.pt-print-foot{position:absolute!important;left:38px!important;right:38px!important;bottom:16px!important;display:grid!important;grid-template-columns:1fr auto auto!important;gap:12px!important;align-items:center!important;color:#7b96a4!important;font-size:9px!important;font-weight:800!important}.pt-print-foot i{height:3px!important;background:#53c5d8!important;border-radius:99px!important}.pt-print-foot p,.pt-print-foot span{margin:0!important;white-space:nowrap!important}
`;

const PT_COL_WEIGHTS:Record<string,number>={seq:3.4,patient:13,nationalId:11.2,medicalSerial:10.2,gender:6.2,age:5.4,ward:6.8,coverage:9.5,diagnosis:10.5,ptDiagnosis:10.5,admissionDate:8.9,therapist:10.4,sessions:6.7,completedSessions:6.7,remainingSessions:6.7,schedule:10.5,status:7.2,evaluation:12.5,scope:8,cases:25,count:7};
const ptColgroup=(columns:FinancialReportColumn[])=>{const total=columns.reduce((sum,col)=>sum+(PT_COL_WEIGHTS[col.key]||8),0)||1;return `<colgroup>${columns.map(col=>`<col style="width:${(((PT_COL_WEIGHTS[col.key]||8)/total)*100).toFixed(4)}%">`).join('')}</colgroup>`};
const ptCell=(key:string,value:string|number|undefined)=>['seq','nationalId','medicalSerial','age','sessions','completedSessions','remainingSessions','count'].includes(key)?`<span class="num">${escapeHtml(value)}</span>`:escapeHtml(value);
const ptInternalMarkup=(report:InpatientFinancialReport)=>`<div class="pt-print-page" dir="rtl">
  <header class="pt-print-head"><div class="pt-print-brand"><b>مستشفى الوفاء</b><span>التأهيل الطبي والرعاية التخصصية</span></div><div class="pt-print-line"></div><img class="pt-print-logo" src="${logoUrl()}" alt="Wafaa Hospital"/></header>
  <section class="pt-print-title"><h1>${escapeHtml(report.title)}</h1>${report.subtitle?`<p>${escapeHtml(report.subtitle)}</p>`:''}</section>
  ${report.summary?.length?`<section class="pt-print-summary">${report.summary.map(item=>`<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join('')}</section>`:''}
  <table class="pt-print-table">${ptColgroup(report.columns)}<thead><tr>${report.columns.map(col=>`<th>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(col=>`<td>${ptCell(col.key,row[col.key])}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="${Math.max(1,report.columns.length)}">لا توجد بيانات ضمن الفترة المحددة</td></tr>`}</tbody></table>
  ${report.note?`<div class="pt-print-note">${escapeHtml(report.note)}</div>`:''}
  <footer class="pt-print-foot"><i></i><p>مستشفى الوفاء · غزة - فلسطين</p><span>Wafaa HIS</span></footer>
</div>`;

const accountStyles=`
  *{box-sizing:border-box!important}html,body{margin:0!important;padding:0!important;background:#fff!important;color:#000!important;font-family:Tahoma,Arial,sans-serif!important}.account-page{width:794px!important;min-height:1123px!important;background:#fff!important;padding:28px 34px 36px!important;direction:rtl!important;color:#000!important;position:relative!important;overflow:hidden!important}.account-head{display:grid!important;grid-template-columns:1fr 1fr!important;align-items:start!important;margin-bottom:4px!important;font-weight:700!important;color:#000!important}.account-head .en{direction:ltr!important;text-align:left!important;font-size:13px!important;line-height:1.23!important;color:#000!important}.account-head .ar{text-align:right!important;font-size:12.5px!important;line-height:1.25!important;color:#000!important}.account-rule{border-top:2px solid #000!important;border-bottom:1px solid #000!important;height:5px!important;margin:4px 0 6px!important}.account-date{text-align:right!important;font-size:14px!important;font-weight:700!important;margin:4px 0 5px!important;color:#000!important}.account-date b{display:inline-block!important;min-width:88px!important;text-align:center!important}.account-title{text-align:center!important;font-size:18px!important;font-weight:900!important;text-decoration:underline!important;margin:0 0 7px!important;line-height:1.2!important;color:#000!important}
  .account-patient-box{border:1.4px solid #000!important;border-radius:8px!important;overflow:hidden!important;margin:0!important;color:#000!important}.account-patient-row{display:grid!important;min-height:36px!important;border-bottom:1.1px solid #000!important}.account-patient-row.top{grid-template-columns:1.55fr .92fr .82fr .70fr!important}.account-patient-row.bottom{grid-template-columns:.78fr 1.85fr 1.16fr!important}.account-patient-row:last-child{border-bottom:0!important}.account-patient-row .cell{min-width:0!important;border-left:1.1px solid #000!important;padding:7px 8px!important;display:flex!important;align-items:center!important;gap:6px!important;justify-content:center!important;font-size:12.4px!important;font-weight:700!important;white-space:nowrap!important;color:#000!important}.account-patient-row .cell:first-child{justify-content:flex-start!important}.account-patient-row .cell:last-child{border-left:0!important}.account-patient-row .label{text-decoration:underline!important;font-weight:900!important;color:#000!important}.account-patient-row .value{font-weight:900!important;color:#000!important;overflow:hidden!important;text-overflow:ellipsis!important}.account-section-label{width:340px!important;min-height:24px!important;border:1.2px solid #000!important;background:#d8d8d8!important;margin:-1px auto 0!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:12.6px!important;font-weight:900!important;text-decoration:underline!important;color:#000!important}
  .account-table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;margin-top:0!important;font-size:9.6px!important;color:#000!important;direction:rtl!important}.account-table col{width:auto}.account-table th{background:#d8d8d8!important;color:#000!important;border:1.1px solid #000!important;padding:4px 2px!important;text-align:center!important;font-weight:900!important;line-height:1.18!important;vertical-align:middle!important;white-space:normal!important;overflow-wrap:break-word!important}.account-table td{background:#fff!important;color:#000!important;border:1.1px solid #000!important;padding:5px 2px!important;text-align:center!important;font-weight:700!important;line-height:1.18!important;vertical-align:middle!important;white-space:normal!important;overflow-wrap:break-word!important;word-break:normal!important}.account-table .num{direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}.account-table .empty{padding:20px!important;text-align:center!important}.account-table .total-label{background:#d8d8d8!important;font-weight:900!important;color:#000!important}.account-total-line{border-top:2px solid #000!important;margin:10px 0 5px!important}.account-subtitle{text-align:right!important;font-size:12px!important;font-weight:900!important;text-decoration:underline!important;margin:8px 0 5px!important;color:#000!important}.account-bottom{border:1.2px solid #000!important;border-radius:8px!important;overflow:hidden!important;display:grid!important;grid-template-columns:1fr 1.15fr 1fr!important;min-height:90px!important;color:#000!important}.account-bottom>div{border-left:1.1px solid #000!important;display:grid!important;align-content:center!important;justify-items:center!important;gap:5px!important;padding:10px!important}.account-bottom>div:last-child{border-left:0!important}.account-bottom span{min-width:136px!important;text-align:center!important;background:#d8d8d8!important;color:#000!important;padding:5px 10px!important;font-size:12px!important;font-weight:900!important}.account-bottom b{font-size:14px!important;font-weight:900!important;color:#000!important}.account-note{margin-top:10px!important;border:1px solid #000!important;padding:8px 10px!important;font-size:11px!important;font-weight:700!important;line-height:1.8!important;color:#000!important}.account-custom{margin:8px 0 0!important;border:1px solid #000!important;border-radius:7px!important;padding:8px 10px!important;font-size:11px!important;display:grid!important;gap:5px!important;color:#000!important}.account-custom div{display:flex!important;gap:8px!important}.account-custom b{text-decoration:underline!important;color:#000!important}.account-custom span{color:#000!important}
`;


const dischargeStyles=`
  @page{size:A4 landscape;margin:0}*{box-sizing:border-box!important}html,body{margin:0!important;padding:0!important;background:#fff!important;color:#000!important;font-family:Tahoma,Arial,sans-serif!important}.discharge-page{width:1123px!important;min-height:794px!important;background:#fff!important;padding:22px 26px 32px!important;direction:rtl!important;color:#000!important;position:relative!important;overflow:visible!important}.discharge-title{font-weight:900!important;text-align:center!important;margin:0 auto 12px!important;line-height:1.32!important;color:#000!important;letter-spacing:normal!important;word-spacing:normal!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;max-width:1040px!important;direction:rtl!important;unicode-bidi:isolate!important}.discharge-title span{display:block!important;color:#000!important;direction:rtl!important;unicode-bidi:isolate!important;white-space:normal!important}.discharge-title .main{font-size:18.2px!important;line-height:1.32!important}.discharge-title .ref{font-size:20px!important;line-height:1.25!important}.discharge-table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:13.1px!important;color:#000!important;direction:rtl!important}.discharge-table th,.discharge-table td{border:1.35px solid #000!important;text-align:center!important;vertical-align:middle!important;padding:5px 4px!important;line-height:1.18!important;color:#000!important;word-break:normal!important;overflow-wrap:normal!important;white-space:normal!important}.discharge-table th{background:#e6e6e6!important;font-weight:900!important}.discharge-table td{background:#fff!important;font-weight:800!important}.discharge-table tbody tr:nth-child(even) td{background:#f2f2f2!important}.discharge-table .date-in{display:inline-block!important;color:#0070c0!important;font-weight:900!important;direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}.discharge-table .date-out{display:inline-block!important;color:#c00000!important;font-weight:900!important;direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}.discharge-table .amount{font-weight:900!important}.discharge-table .empty{height:42px!important;color:#000!important}.discharge-summary{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:24px!important;margin:9px 8px 24px!important}.discharge-summary .box{display:grid!important;grid-template-columns:1fr 1fr!important;border:1.35px solid #000!important;width:260px!important;min-height:28px!important;font-size:13px!important;font-weight:900!important;text-align:center!important;color:#000!important}.discharge-summary .box span,.discharge-summary .box b{display:flex!important;align-items:center!important;justify-content:center!important;padding:4px 8px!important;color:#000!important}.discharge-summary .box span{background:#fff!important}.discharge-summary .box b{background:#fff!important;border-inline-start:1.35px solid #000!important}.discharge-summary .spacer{flex:1!important}.discharge-signatures{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:80px!important;margin-top:16px!important;padding:0 64px!important;text-align:center!important;color:#000!important;font-size:14px!important;font-weight:900!important}.discharge-signatures div{display:grid!important;gap:8px!important}.discharge-signatures span{font-weight:900!important;color:#000!important}.discharge-signatures b{font-size:13px!important;color:#000!important}.discharge-custom{margin-top:8px;border:1px solid #000!important;padding:6px 8px!important;font-size:12px!important;font-weight:800!important;line-height:1.7!important;color:#000!important}.discharge-custom b{text-decoration:underline!important}.discharge-table .num{direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}
`;
const DISCHARGE_COL_WEIGHTS:Record<string,number>={seq:4.2,name:9.8,fatherName:7.2,grandName:7.2,familyName:9.2,nationalId:10.6,admissionDate:10.3,dischargeDate:10.3,stayDays:7.5,patientContributionPct:7.1,claimAmount:10.6,notes:8.5,gender:6.5,age:5.6,medicalSerial:8.4,coverage:9.8,ward:6.7,diagnosis:14,referralHospital:10};
const dischargeColgroup=(columns:FinancialReportColumn[])=>{const total=columns.reduce((sum,col)=>sum+(DISCHARGE_COL_WEIGHTS[col.key]||8),0)||1;return `<colgroup>${columns.map(col=>`<col style="width:${(((DISCHARGE_COL_WEIGHTS[col.key]||8)/total)*100).toFixed(4)}%">`).join('')}</colgroup>`};
const dischargeCell=(key:string,value:string|number|undefined)=>{const text=escapeHtml(value);if(key==='admissionDate')return `<span class="date-in">${text}</span>`;if(key==='dischargeDate')return `<span class="date-out">${text}</span>`;if(['seq','nationalId','medicalSerial','stayDays','patientContributionPct','claimAmount','age'].includes(key))return `<span class="num ${key==='claimAmount'?'amount':''}">${text}</span>`;return text};
const splitDischargeTitle=(title:string)=>{
  const match=title.match(/^(.*?)\s+رقم\s*\/\s*([0-9٠-٩]+)\s+لعام\s+([0-9٠-٩]+)$/);
  return match?{main:match[1].trim(),ref:`رقم / ${match[2]} لعام ${match[3]}`}:{main:title,ref:''};
};
const dischargeTitleMarkup=(title:string)=>{
  const parts=splitDischargeTitle(title);
  return `<h1 class="discharge-title"><span class="main">${escapeHtml(parts.main)}</span>${parts.ref?`<span class="ref">${escapeHtml(parts.ref)}</span>`:''}</h1>`;
};
const dischargeMarkup=(report:InpatientFinancialReport)=>{
  const count=report.summary?.find(item=>item.label==='عدد التحويلات')?.value ?? report.rows.length;
  const total=report.summary?.find(item=>item.label==='الإجمالي المستحق')?.value ?? '';
  const custom=(report.patientInfo||[]).filter(item=>item.label.startsWith('custom:')).map(item=>({label:item.label.replace(/^custom:/,''),value:item.value}));
  return `<div class="discharge-page" dir="rtl">
    ${dischargeTitleMarkup(report.title)}
    <table class="discharge-table">${dischargeColgroup(report.columns)}<thead><tr>${report.columns.map(col=>`<th${renewalCellClass(col.key)}>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(col=>`<td>${dischargeCell(col.key,row[col.key])}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="${Math.max(1,report.columns.length)}">لا توجد بيانات ضمن الفترة المحددة</td></tr>`}</tbody></table>
    <section class="discharge-summary"><div class="box"><span>عدد التحويلات</span><b>${escapeHtml(count)}</b></div><span class="spacer"></span><div class="box"><span>الإجمالي المستحق</span><b>${escapeHtml(total)}</b></div></section>
    ${custom.length?`<section class="discharge-custom">${custom.map(item=>`<div><b>${escapeHtml(item.label)}:</b> ${escapeHtml(item.value)}</div>`).join('')}</section>`:''}
    <section class="discharge-signatures"><div><span>محاسب المستشفى</span><b>أ. زاند بدوي</b></div><div><span>رئيس قسم خدمات المرضى</span><b>أ. يوسف الحايك</b></div><div><span>رئيس قسم الدائرة المالية</span><b>أ. هاني حلس</b></div></section>
  </div>`;
};


const renewalStyles=`
  @page{size:A4 landscape;margin:0}
  *{box-sizing:border-box!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  html,body{margin:0!important;padding:0!important;background:#fff!important;color:#000!important;font-family:Tahoma,Arial,sans-serif!important}
  .renewal-page{width:1123px!important;min-height:794px!important;background:#fff!important;padding:20px 18px 28px!important;direction:rtl!important;color:#000!important;position:relative!important;overflow:visible!important}
  .renewal-title{display:flex!important;justify-content:center!important;align-items:center!important;margin:0 0 9px!important;line-height:1.25!important;color:#000!important;text-align:center!important}
  .renewal-title span{display:inline-block!important;background:#e9ecef!important;padding:2px 12px!important;font-size:20px!important;font-weight:900!important;line-height:1.25!important;color:#000!important;text-align:center!important;direction:rtl!important;unicode-bidi:isolate!important;white-space:nowrap!important}
  .renewal-table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:12px!important;color:#000!important;direction:rtl!important;border:1.35px solid #000!important}
  .renewal-table thead{display:table-header-group!important}.renewal-table tr{page-break-inside:avoid!important;break-inside:avoid!important}
  .renewal-table th,.renewal-table td{border:1.25px solid #000!important;text-align:center!important;vertical-align:middle!important;padding:4px 3px!important;line-height:1.18!important;color:#000!important;word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important;min-height:24px!important}
  .renewal-table th{background:#e6e6e6!important;font-weight:900!important}.renewal-table td{background:#fff!important;font-weight:850!important}.renewal-table tbody tr:nth-child(even) td:not(.referral-no){background:#f2f2f2!important}
  .renewal-table th.referral-no,.renewal-table td.referral-no{background:var(--referral-no-color,#fff200)!important;font-weight:950!important;color:var(--referral-no-text-color,#000)!important}
  .renewal-table th.referral-no *,.renewal-table td.referral-no *{background:transparent!important;color:var(--referral-no-text-color,#000)!important}
  .renewal-table .date-in{display:inline-block!important;color:#0070c0!important;font-weight:950!important;direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}
  .renewal-table .date-end{display:inline-block!important;color:#00a65a!important;font-weight:950!important;direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}
  .renewal-table .stay-days{display:inline-block!important;color:#d71920!important;font-weight:950!important;direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}
  .renewal-table .num{direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important}
  .renewal-table .empty{height:44px!important;color:#000!important}
  .renewal-custom{margin-top:10px;border:1px solid #000!important;padding:6px 8px!important;font-size:12px!important;font-weight:800!important;line-height:1.7!important;color:#000!important}.renewal-custom b{text-decoration:underline!important}
`;

const RENEWAL_COL_WEIGHTS:Record<string,number>={seq:4.4,name:8.5,fatherName:7.3,grandName:7.3,familyName:9.2,patientContributionPct:8.4,nationalId:10.6,referralNo:7.7,admissionDate:9.3,referralEndDate:9.5,dischargeDate:9.2,stayDays:7.4,notes:9.5,gender:6.5,age:5.5,ward:6.8,coverage:10.5,diagnosis:13.2,medicalSerial:8.4};
const renewalColgroup=(columns:FinancialReportColumn[])=>{const total=columns.reduce((sum,col)=>sum+(RENEWAL_COL_WEIGHTS[col.key]||8),0)||1;return `<colgroup>${columns.map(col=>`<col style="width:${(((RENEWAL_COL_WEIGHTS[col.key]||8)/total)*100).toFixed(4)}%">`).join('')}</colgroup>`};
const renewalCellClass=(key:string)=>key==='referralNo'?' class="referral-no"':'';
const renewalCellAttrs=(key:string,background:string,textColor:string)=>key==='referralNo'?` class="referral-no" style="background-color:${background}!important;color:${textColor}!important"`:'';
const renewalCell=(key:string,value:string|number|undefined)=>{const text=escapeHtml(value);if(key==='admissionDate')return `<span class="date-in">${text}</span>`;if(key==='referralEndDate')return `<span class="date-end">${text}</span>`;if(key==='stayDays')return `<span class="stay-days">${text}</span>`;if(['seq','nationalId','medicalSerial','patientContributionPct','referralNo','age'].includes(key))return `<span class="num">${text}</span>`;return text};
const renewalMarkup=(report:InpatientFinancialReport)=>{
  const custom=(report.patientInfo||[]).filter(item=>item.label.startsWith('custom:')).map(item=>({label:item.label.replace(/^custom:/,''),value:item.value}));
  const referralColor=safePrintColor(report.theme?.referralNoColor);
  const referralText=readableOnPrintColor(referralColor);
  return `<div class="renewal-page" dir="rtl" style="--referral-no-color:${referralColor};--referral-no-text-color:${referralText}">
    <h1 class="renewal-title"><span>${escapeHtml(report.title)}</span></h1>
    <table class="renewal-table">${renewalColgroup(report.columns)}<thead><tr>${report.columns.map(col=>`<th${renewalCellAttrs(col.key,referralColor,referralText)}>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(col=>`<td${renewalCellAttrs(col.key,referralColor,referralText)}>${renewalCell(col.key,row[col.key])}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="${Math.max(1,report.columns.length)}">لا توجد حالات مطابقة للمحددات</td></tr>`}</tbody></table>
    ${custom.length?`<section class="renewal-custom">${custom.map(item=>`<div><b>${escapeHtml(item.label)}:</b> ${escapeHtml(item.value)}</div>`).join('')}</section>`:''}
  </div>`;
};

const ACCOUNT_COL_WEIGHTS:Record<string,number>={seq:4.5,coverageNo:8,coverageStart:11,coverageEnd:11,days:7,rate:8,gross:10,coverage:12,pct:8,covered:10,remaining:10.5};
const accountColgroup=(columns:FinancialReportColumn[])=>{const total=columns.reduce((sum,col)=>sum+(ACCOUNT_COL_WEIGHTS[col.key]||9),0)||1;return `<colgroup>${columns.map(col=>`<col style="width:${(((ACCOUNT_COL_WEIGHTS[col.key]||9)/total)*100).toFixed(4)}%">`).join('')}</colgroup>`};
const numericCell=(value:string|number|undefined)=>`<span class="num">${escapeHtml(value)}</span>`;
const totalCell=(key:string,totals:InpatientFinancialReport['statementTotals'])=>key==='rate'?'الإجمالي':key==='gross'?numericCell(totals?.gross):key==='covered'?numericCell(totals?.covered):key==='remaining'?numericCell(totals?.remaining):'';

const logoUrl=()=>`${window.location.origin}/wafaa-hospital-logo.png`;

const standardMarkup=(report:InpatientFinancialReport)=>`<div class="page" dir="rtl">
  <header class="head"><img src="${logoUrl()}" alt="Wafaa Hospital"/><div class="head-line"></div><div class="head-name"><b>مستشفى الوفاء</b><span>للتأهيل الطبي والرعاية التخصصية</span></div></header>
  <div class="range">الفترة: <b>${escapeHtml(report.dateFrom)}</b> — <b>${escapeHtml(report.dateTo)}</b></div>
  <section class="title"><h1>${escapeHtml(report.title)}</h1>${report.subtitle?`<p>${escapeHtml(report.subtitle)}</p>`:''}</section>
  ${report.summary?.length?`<section class="summary">${report.summary.map(item=>`<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join('')}</section>`:''}
  <table><thead><tr>${report.columns.map(col=>`<th${renewalCellClass(col.key)}>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(col=>`<td>${escapeHtml(row[col.key])}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="${Math.max(1,report.columns.length)}">لا توجد بيانات ضمن الفترة المحددة</td></tr>`}</tbody></table>
  ${report.note?`<div class="note">${escapeHtml(report.note)}</div>`:''}
  <footer class="foot"><i></i><p>مستشفى الوفاء · غزة - فلسطين</p><span>Wafaa Hospital Information System</span></footer>
</div>`;

const findInfo=(report:InpatientFinancialReport,label:string)=>report.patientInfo?.find(item=>item.label===label)?.value || '—';

const accountMarkup=(report:InpatientFinancialReport)=>{
  const info=report.patientInfo||[];
  const custom=info.filter(item=>item.label.startsWith('custom:')).map(item=>({label:item.label.replace(/^custom:/,''),value:item.value}));
  return `<div class="account-page" dir="rtl">
  <header class="account-head"><div class="ar">مستشفى الوفاء للتأهيل الطبي<br/>والجراحة التخصصية<br/>فلسطين – قطاع غزة</div><div class="en">El–Wafa Medical Rehab. &<br/>Specialized Surgery Hospital<br/>Gaza Strip – Palestine</div></header>
  <div class="account-rule"></div>
  <div class="account-date"><span>التاريخ: </span><b>${escapeHtml(report.reportDate||report.dateTo)}</b></div>
  <h1 class="account-title">${escapeHtml(report.title)}</h1>
  <section class="account-patient-box">
    <div class="account-patient-row top"><div class="cell"><span class="label">الاسم</span><span class="value">${escapeHtml(findInfo(report,'الاسم'))}</span></div><div class="cell"><span class="label">تاريخ الدخول</span><span class="value">${escapeHtml(findInfo(report,'تاريخ الدخول'))}</span></div><div class="cell"><span class="label">تاريخ الخروج</span><span class="value">${escapeHtml(findInfo(report,'تاريخ الخروج'))}</span></div><div class="cell"><span class="label">عدد الأيام</span><span class="value">${escapeHtml(findInfo(report,'عدد الأيام'))}</span></div></div>
    <div class="account-patient-row bottom"><div class="cell"><span class="label">ز.مريض</span><span class="value">${escapeHtml(findInfo(report,'رقم المريض'))}</span></div><div class="cell"><span class="label">العنوان</span><span class="value">${escapeHtml(findInfo(report,'العنوان'))}</span></div><div class="cell"><span class="label">الهاتف</span><span class="value">${escapeHtml(findInfo(report,'الهاتف'))}</span></div></div>
  </section>
  ${custom.length?`<section class="account-custom">${custom.map(item=>`<div><b>${escapeHtml(item.label)}:</b><span>${escapeHtml(item.value)}</span></div>`).join('')}</section>`:''}
  <div class="account-section-label">استحقاقات / شيكل:</div>
  <table class="account-table">${accountColgroup(report.columns)}<thead><tr>${report.columns.map(col=>`<th${renewalCellClass(col.key)}>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(col=>`<td>${['seq','coverageNo','days','rate','gross','pct','covered','remaining'].includes(col.key)?numericCell(row[col.key]):escapeHtml(row[col.key])}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="${Math.max(1,report.columns.length)}">لا توجد حركات تغطية لهذه الحالة</td></tr>`}<tr>${report.columns.map(col=>`<td class="${col.key==='rate'?'total-label':''}">${totalCell(col.key,report.statementTotals)}</td>`).join('')}</tr></tbody></table>
  <div class="account-total-line"></div>
  <div class="account-subtitle">صافي المبالغ عن فترة مكوث المريض</div>
  <section class="account-bottom"><div><span>إجمالي المبالغ المطلوبة</span><b>${escapeHtml(report.statementTotals?.gross)}</b></div><div><span>مبلغ تغطية</span><b>${escapeHtml(report.statementTotals?.covered)}</b><span>قيمة إعفاء</span><b>${escapeHtml(report.statementTotals?.discount)}</b><span>قيمة مدفوعة</span><b>${escapeHtml(report.statementTotals?.paid)}</b></div><div><span>صافي المبالغ المتبقية</span><b>${escapeHtml(report.statementTotals?.remaining)}</b></div></section>
  ${report.note?`<div class="account-note">${escapeHtml(report.note)}</div>`:''}
</div>`;
};

const getStyles=(report:InpatientFinancialReport)=>report.template==='accountStatement'?accountStyles:report.template==='dischargeListing'?dischargeStyles:report.template==='rehabRenewalListing'?renewalStyles:report.template==='ptInternalReport'?ptInternalStyles:standardStyles;
const getMarkup=(report:InpatientFinancialReport)=>report.template==='accountStatement'?accountMarkup(report):report.template==='dischargeListing'?dischargeMarkup(report):report.template==='rehabRenewalListing'?renewalMarkup(report):report.template==='ptInternalReport'?ptInternalMarkup(report):standardMarkup(report);

async function createHost(report:InpatientFinancialReport){
  const width=report.template==='accountStatement'?794:1123;
  return createSilentExportFrame(`<style>${getStyles(report)}</style>${getMarkup(report)}`,width,report.template==='accountStatement'?1300:980);
}

export async function downloadFinancialPdf(report:InpatientFinancialReport){
  const host=await createHost(report);
  try{
    const page=host.querySelector(report.template==='accountStatement'?'.account-page':report.template==='dischargeListing'?'.discharge-page':report.template==='rehabRenewalListing'?'.renewal-page':report.template==='ptInternalReport'?'.pt-print-page':'.page') as HTMLElement;
    const canvas=await captureElementCanvas(page,{scale:1.8,useCORS:true,backgroundColor:'#ffffff'});
    if(canvas.width<50 || canvas.height<50) throw new Error('empty canvas');
    const isPortrait=report.template==='accountStatement';
    const pdf=new jsPDF({orientation:isPortrait?'portrait':'landscape',unit:'mm',format:'a4'});
    const width=isPortrait?190:267; const pageHeight=isPortrait?277:190; const imageHeight=canvas.height*width/canvas.width; const image=canvas.toDataURL('image/png');
    let offset=0; let pageNo=0;
    do{ if(pageNo>0)pdf.addPage(); pdf.addImage(image,'PNG',10,10-offset,width,imageHeight,'','FAST'); offset+=pageHeight; pageNo++; }while(offset<imageHeight-1);
    pdf.save(`${report.filename}.pdf`);
  }finally{host.remove();cleanupExportArtifacts();}
}

export async function downloadFinancialExcel(report:InpatientFinancialReport){
  const rows:(string|number)[][]=[];
  if(report.patientInfo?.length){rows.push(['بيانات المريض','']);report.patientInfo.filter(item=>!item.label.startsWith('custom:')).forEach(item=>rows.push([item.label,item.value]));rows.push([])}
  rows.push(...report.rows.map(row=>report.columns.map(col=>row[col.key]??'')));
  if(report.summary?.length){rows.push([]);rows.push(...report.summary.map(item=>[item.label,item.value]))}
  await downloadXlsx(`${report.filename}.xlsx`,report.columns.map(col=>col.label),rows,true)
}

export async function downloadFinancialWord(report:InpatientFinancialReport){
  const host=await createHost(report);
  try{
    const selector=report.template==='accountStatement'?'.account-page':report.template==='dischargeListing'?'.discharge-page':report.template==='rehabRenewalListing'?'.renewal-page':report.template==='ptInternalReport'?'.pt-print-page':'.page';
    const page=host.querySelector(selector) as HTMLElement|null;
    if(!page)throw new Error('تعذر العثور على قالب التقرير');
    await downloadElementsAsDocx(report.filename,[page],report.template==='accountStatement'?'portrait':'landscape');
  }finally{host.remove();cleanupExportArtifacts();}
}
