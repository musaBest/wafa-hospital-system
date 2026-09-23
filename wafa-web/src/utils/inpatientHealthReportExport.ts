import { jsPDF } from 'jspdf';
import { printHtmlDocument } from './printDocument';
import { downloadXlsx } from './exportXlsx';
import { captureElementCanvas, cleanupExportArtifacts, createSilentExportFrame, downloadElementsAsDocx } from './documentDownload';

export interface HealthReportRow{
  seq:number; name:string; coveragePct:string; nationalId:string; admissionDate:string; dischargeDate?:string; recommendations?:string; stayDays?:number; notes?:string;
}
export interface HealthCasesReportData{
  mode:'entry'|'exit'|'combined'; reportDate:string; from:string; to:string; maleRows:HealthReportRow[]; femaleRows:HealthReportRow[]; exitRows:HealthReportRow[]; allExitRows?:HealthReportRow[]; includeEntry?:boolean; includeHealthExit?:boolean; includeAllExit?:boolean;
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]||m));
const logo=()=>`${window.location.origin}/wafaa-hospital-logo.png`;

export const healthReportCss=`
@page{size:A4 portrait;margin:8mm}.health-report-doc{width:794px;min-height:1123px;background:#fff;color:#000;padding:18px 18px 28px;margin:0 auto;direction:rtl;font-family:Tahoma,"Segoe UI",Arial,sans-serif;text-shadow:none!important;filter:none!important}.health-report-doc .letter-head{text-align:center;position:relative;min-height:66px;padding-top:3px}.health-report-doc .letter-head img{position:absolute;right:0;top:0;width:72px;height:58px;object-fit:contain}.health-report-doc .letter-head p{margin:0;font-size:11.5px;line-height:1.65;font-weight:800}.health-report-doc .letter-head b{display:block;font-size:13px}.health-report-doc .official-note{position:absolute;left:4px;top:0;font-size:8px;font-weight:900}.health-report-doc .section-title{font-size:12px;font-weight:900;text-align:right;margin:10px 0 4px}.health-report-doc .period-line{text-align:center;font-size:10px;margin:2px 0 7px}.health-report-doc table{width:100%;border-collapse:collapse!important;border-spacing:0!important;table-layout:fixed;margin-bottom:10px;direction:rtl;border:1.35px solid #111}.health-report-doc th,.health-report-doc td{border:1.15px solid #111!important;padding:3px 2.5px;text-align:center;vertical-align:middle;font-size:8.05px;line-height:1.18;overflow-wrap:break-word;word-break:normal;color:#000;background-clip:padding-box;box-shadow:none!important;text-shadow:none!important}.health-report-doc th{background:#dedede;font-weight:900;font-size:8px}.health-report-doc .c-seq{width:4.6%}.health-report-doc .c-name{width:26%;text-align:right}.health-report-doc .c-pct{width:8%}.health-report-doc .c-id{width:14%}.health-report-doc .c-date{width:14%}.health-report-doc .c-stay{width:7%}.health-report-doc .c-note{width:12%}.health-entry-table .c-seq{width:4.5%}.health-entry-table .c-name{width:27%}.health-entry-table .c-pct{width:8%}.health-entry-table .c-id{width:14%}.health-entry-table .c-date{width:14.2%}.health-entry-table .c-note{width:13.9%}.health-exit-table .c-seq{width:4%}.health-exit-table .c-name{width:24%}.health-exit-table .c-pct{width:7.3%}.health-exit-table .c-id{width:13.3%}.health-exit-table .c-date{width:12.4%}.health-exit-table .c-stay{width:6.5%}.health-exit-table .c-note{width:12.7%}.health-report-doc .ltr{direction:ltr!important;unicode-bidi:plaintext!important;white-space:nowrap!important;letter-spacing:-.35px;font-variant-numeric:tabular-nums}.health-report-doc .c-id,.health-report-doc .c-date,.health-report-doc .admission-date,.health-report-doc .discharge-date{font-size:7.65px!important;white-space:nowrap!important;letter-spacing:-.42px!important}.health-report-doc .admission-date,.health-report-doc .admission-head{color:#006db8!important;font-weight:900}.health-report-doc .discharge-date,.health-report-doc .discharge-head{color:#e21b2d!important;font-weight:900}.health-report-doc .health-tag{color:#111;font-weight:900}.health-report-doc .health-tag.covered{color:#111}.health-report-doc .recent-title{display:table;margin:10px auto 6px;background:#46f65d;padding:2px 12px;font-size:11px;font-weight:900}.health-report-doc .merged-title{display:block;text-align:center;background:#e7f7fb;border:1px solid #000;border-radius:5px;padding:4px 8px;margin:10px auto 8px;width:max-content;max-width:92%;font-size:12px;font-weight:900}.health-report-doc .empty{height:28px;color:#777}.health-report-doc .footer-note{font-size:8px;color:#444;margin-top:8px;text-align:left;direction:ltr}
.health-report-doc{page-break-after:always}.health-report-doc:last-child{page-break-after:auto}@media print{.health-report-doc{width:auto;min-height:auto;padding:0}.health-report-doc table{break-inside:auto}.health-report-doc tr{break-inside:avoid}.health-report-doc th,.health-report-doc td{font-size:8px!important}}
`;

const entryTable=(title:string,rows:HealthReportRow[])=>`<div class="section-title">** ${esc(title)}:</div><table class="health-entry-table"><thead><tr><th class="c-seq">م.</th><th class="c-name">اسم المريض</th><th class="c-pct">نسبة التغطية</th><th class="c-id">رقم الهوية</th><th class="c-date admission-head">تاريخ الدخول</th><th class="c-date discharge-head">تاريخ الخروج</th><th class="c-note">التوصيات</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td class="ltr">${r.seq}</td><td class="c-name">${esc(r.name)}</td><td class="health-tag covered ltr">${esc(r.coveragePct)}</td><td class="ltr">${esc(r.nationalId)}</td><td class="admission-date ltr">${esc(r.admissionDate)}</td><td class="discharge-date ltr">${esc(r.dischargeDate||'')}</td><td>${esc(r.recommendations||'متابعة')}</td></tr>`).join(''):`<tr><td class="empty" colspan="7">لا توجد حالات ضمن الفترة المحددة</td></tr>`}</tbody></table>`;
const exitTable=(rows:HealthReportRow[],year:string,month:string,title=`الحالات التي خرجت مؤخرًا لعام ${esc(year)}/${esc(month)}م`)=>`<div class="recent-title">${title}</div><table class="health-exit-table"><thead><tr><th class="c-seq">رقم</th><th class="c-name">اسم المريض</th><th class="c-pct">نسبة التغطية</th><th class="c-id">رقم الهوية</th><th class="c-date admission-head">تاريخ الدخول</th><th class="c-date discharge-head">تاريخ الخروج</th><th class="c-stay">مدة المكوث</th><th class="c-note">ملاحظات</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td class="ltr">${r.seq}</td><td class="c-name">${esc(r.name)}</td><td class="health-tag covered ltr">${esc(r.coveragePct)}</td><td class="ltr">${esc(r.nationalId)}</td><td class="admission-date ltr">${esc(r.admissionDate)}</td><td class="discharge-date ltr">${esc(r.dischargeDate||'')}</td><td class="ltr">${esc(r.stayDays||'')}</td><td>${esc(r.notes||'خروج')}</td></tr>`).join(''):`<tr><td class="empty" colspan="8">لا توجد حالات خروج ضمن الفترة المحددة</td></tr>`}</tbody></table>`;

const chunk=<T,>(rows:T[],size:number)=>rows.length?Array.from({length:Math.ceil(rows.length/size)},(_,i)=>rows.slice(i*size,(i+1)*size)):[[] as T[]];
const letterHead=(data:HealthCasesReportData)=>`<div class="letter-head"><img src="${logo()}" alt="Wafaa Hospital"><span class="official-note">ملاحظة هامة</span><p>الأخ/ د. سامي عويمر مدير وحدة العلاج الطبيعي والتأهيل حفظه الله،<br/><b>كشف أسماء المرضى التابعين لوزارة الصحة - قسم المبيت - في مستشفى الوفاء للتأهيل الطبي</b></p></div><div class="period-line">الفترة من ${esc(data.from.replace(/-/g,'/'))} إلى ${esc(data.to.replace(/-/g,'/'))} &nbsp; | &nbsp; تاريخ الكشف: ${esc(data.reportDate.replace(/-/g,'/'))}</div>`;
export function healthReportMarkup(data:HealthCasesReportData){
  const year=(data.to||data.reportDate).slice(0,4); const month=(data.to||data.reportDate).slice(5,7);
  const pages:string[]=[];
  const pushEntry = (titlePrefix='') => {
    const sections:[string,HealthReportRow[]][]=[['قسم الرجال',data.maleRows],['قسم الحريم',data.femaleRows]];
    sections.forEach(([title,rows])=>chunk(rows,30).forEach((part,index)=>pages.push(`<article class="health-report-doc">${letterHead(data)}${titlePrefix?`<div class="merged-title">${titlePrefix}</div>`:''}${entryTable(index?`${title} - تابع`:title,part)}<div class="footer-note">Wafaa Hospital Information System</div></article>`)));
  };
  const pushExit = (rows:HealthReportRow[], title:string, pageSize=18) => {
    chunk(rows,pageSize).forEach((part,index)=>pages.push(`<article class="health-report-doc">${letterHead(data)}${exitTable(part,year,month,index?`${title} - تابع صفحة ${index+1}`:title)}<div class="footer-note">Wafaa Hospital Information System</div></article>`));
  };
  if(data.mode==='combined'){
    if(data.includeEntry!==false) pushEntry('دخول صحة');
    if(data.includeHealthExit!==false) pushExit(data.exitRows,`خروج صحة - الحالات التي خرجت مؤخرًا لعام ${esc(year)}/${esc(month)}م`);
    if(data.includeAllExit) pushExit(data.allExitRows||[],`خروج جميع الحالات - الفترة ${esc(data.from.replace(/-/g,'/'))} إلى ${esc(data.to.replace(/-/g,'/'))}`);
  }else if(data.mode==='entry'){
    pushEntry();
  }else{
    pushExit(data.exitRows,`الحالات التي خرجت مؤخرًا لعام ${esc(year)}/${esc(month)}م`);
  }
  return pages.join('');
}

async function embeddedMarkup(data:HealthCasesReportData){
  let markup=healthReportMarkup(data);
  try{const blob=await (await fetch('/wafaa-hospital-logo.png')).blob();const uri=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob)});markup=markup.replace(logo(),uri)}catch{/* same-origin URL stays */}
  return markup;
}
async function createHost(data:HealthCasesReportData){
  // Embed the hospital logo before capture so PDF/Word export does not depend on
  // the browser resolving an image URL inside an off-screen export frame.
  const markup=await embeddedMarkup(data);
  return createSilentExportFrame(`<style>${healthReportCss}</style>${markup}`,794,1320)
}
export async function downloadHealthCasesPdf(data:HealthCasesReportData){
  const host=await createHost(data);
  try{
    const pages=Array.from(host.querySelectorAll('.health-report-doc')) as HTMLElement[];
    if(!pages.length) throw new Error('تعذر تجهيز صفحات كشف حالات الصحة');
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    for(let i=0;i<pages.length;i++){
      const canvas=await captureElementCanvas(pages[i],{scale:1.65,useCORS:true,backgroundColor:'#ffffff'});
      if(canvas.width<50 || canvas.height<50) throw new Error('تعذر التقاط صفحة كشف حالات الصحة');
      if(i)pdf.addPage('a4','portrait');
      // The report canvas already uses the A4 ratio. Fit it with a small safety
      // margin so printers do not crop the outer table border.
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',5,5,200,287,undefined,'FAST');
    }
    pdf.save(`health-cases-${data.mode}-${data.from}-${data.to}.pdf`)
  }finally{cleanupExportArtifacts();}
}
export async function downloadHealthCasesWord(data:HealthCasesReportData){
  const host=await createHost(data);
  try{
    const pages=Array.from(host.querySelectorAll('.health-report-doc')) as HTMLElement[];
    if(!pages.length) throw new Error('تعذر تجهيز صفحات كشف حالات الصحة');
    await downloadElementsAsDocx(`health-cases-${data.mode}-${data.from}-${data.to}`,pages,'portrait');
  }finally{cleanupExportArtifacts();}
}

export async function downloadHealthCasesExcel(data:HealthCasesReportData){
  const baseHeaders=data.mode==='exit'
    ? ['م.','اسم المريض','نسبة التغطية','رقم الهوية','تاريخ الدخول','تاريخ الخروج','مدة المكوث','ملاحظات']
    : ['م.','نوع الكشف','القسم','اسم المريض','نسبة التغطية','رقم الهوية','تاريخ الدخول','تاريخ الخروج','مدة المكوث','التوصيات/ملاحظات'];
  const rows:(string|number)[][]=[];
  if(data.mode==='exit'){
    data.exitRows.forEach(r=>rows.push([r.seq,r.name,r.coveragePct,r.nationalId,r.admissionDate,r.dischargeDate||'',r.stayDays||'',r.notes||'خروج']));
  }else{
    if(data.mode!=='combined' || data.includeEntry!==false){
      data.maleRows.forEach(r=>rows.push([r.seq,'دخول صحة','قسم الرجال',r.name,r.coveragePct,r.nationalId,r.admissionDate,r.dischargeDate||'',r.stayDays||'',r.recommendations||'متابعة']));
      data.femaleRows.forEach(r=>rows.push([r.seq,'دخول صحة','قسم الحريم',r.name,r.coveragePct,r.nationalId,r.admissionDate,r.dischargeDate||'',r.stayDays||'',r.recommendations||'متابعة']));
    }
    if(data.mode==='combined' && data.includeHealthExit!==false){
      data.exitRows.forEach(r=>rows.push([r.seq,'خروج صحة','—',r.name,r.coveragePct,r.nationalId,r.admissionDate,r.dischargeDate||'',r.stayDays||'',r.notes||'خروج']));
    }
    if(data.mode==='combined' && data.includeAllExit){
      (data.allExitRows||[]).forEach(r=>rows.push([r.seq,'خروج جميع الحالات','—',r.name,r.coveragePct,r.nationalId,r.admissionDate,r.dischargeDate||'',r.stayDays||'',r.notes||'خروج']));
    }
  }
  rows.push([]);
  rows.push(['الفترة من',data.from.replace(/-/g,'/'),'إلى',data.to.replace(/-/g,'/'),'تاريخ الكشف',data.reportDate.replace(/-/g,'/')]);
  await downloadXlsx(`health-cases-${data.mode}-${data.from}-${data.to}.xlsx`,baseHeaders,rows,true);
}

export async function printHealthCases(data:HealthCasesReportData){const markup=await embeddedMarkup(data);await printHtmlDocument('كشف حالات الصحة',markup,healthReportCss)}
