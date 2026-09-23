import { jsPDF } from 'jspdf';
import { downloadXlsx } from './exportXlsx';
import { captureElementCanvas, cleanupExportArtifacts, createSilentExportFrame, downloadElementsAsDocx } from './documentDownload';
import { reportHeadStyles, reportHeader } from './reportBranding';

export interface PrintableField { label:string; value:string }
export interface PrintableSection { heading?:string; body?:string; items?:string[] }
export interface PrintableAttachment { label:string; dataUrl:string }
export interface InpatientReportStyle {
  accentColor?:string;
  textColor?:string;
  fontFamily?:string;
  titleFontSize?:number;
  bodyFontSize?:number;
  fontWeight?:'normal'|'bold'|'heavy';
  layoutStyle?:'classic'|'modern'|'minimal';
}
export interface InpatientPrintableReport {
  title:string;
  date:string;
  subtitle?:string;
  patientFields:PrintableField[];
  sections:PrintableSection[];
  signature?:string;
  secondarySignature?:string;
  attachments?:PrintableAttachment[];
  style?:InpatientReportStyle;
  filename:string;
}

const escapeHtml=(value:string|number|undefined)=>String(value??'—')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

const formatDate=(value:string)=>{
  if(!value)return '—';
  const parts=value.slice(0,10).split('-');
  return parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:value;
};
const field=(report:InpatientPrintableReport,label:string)=>report.patientFields.find(item=>item.label===label)?.value||'—';
const sectionBody=(report:InpatientPrintableReport,heading:string)=>report.sections.find(section=>section.heading===heading)?.body||'';
const sectionItems=(report:InpatientPrintableReport,heading:string)=>report.sections.find(section=>section.heading===heading)?.items||[];
const firstBody=(report:InpatientPrintableReport,index=0)=>report.sections[index]?.body||'';
const attachmentsMarkup=(report:InpatientPrintableReport)=>report.attachments?.length?`<section class="print-attachments"><h2>المرفقات المصورة</h2>${report.attachments.map(item=>`<figure><figcaption>${escapeHtml(item.label||'صورة مرفقة')}</figcaption><img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.label||'صورة مرفقة')}"/></figure>`).join('')}</section>`:'';

const safeColor=(value:string|undefined,fallback:string)=>/^#[0-9a-fA-F]{6}$/.test(String(value||''))?String(value):fallback;
const safeSize=(value:number|undefined,fallback:number,min:number,max:number)=>Number.isFinite(value)?Math.min(max,Math.max(min,Number(value))):fallback;
const safeFont=(value:string|undefined)=>['Tahoma','Arial','Times New Roman','Segoe UI','Courier New'].includes(String(value))?String(value):'Tahoma';
const fontStack=(font:string)=>font==='Times New Roman'?"'Times New Roman',Tahoma,Arial,sans-serif":font==='Courier New'?"'Courier New',Tahoma,Arial,sans-serif":`'${font}',Tahoma,Arial,sans-serif`;
const rootAttrs=(report:InpatientPrintableReport,classes:string)=>{
  const style=report.style||{};
  const accent=safeColor(style.accentColor,'#0891b2');
  const text=safeColor(style.textColor,'#000000');
  const family=fontStack(safeFont(style.fontFamily));
  const title=safeSize(style.titleFontSize,24,16,40);
  const body=safeSize(style.bodyFontSize,18,11,28);
  const weight=style.fontWeight==='heavy'?'900':style.fontWeight==='normal'?'500':'700';
  const layout=['classic','modern','minimal'].includes(String(style.layoutStyle))?String(style.layoutStyle):'classic';
  return `class="${classes} report-layout-${layout}" dir="rtl" style="--report-accent:${accent};--report-text:${text};--report-font:${family};--report-title-size:${title}px;--report-body-size:${body}px;--report-weight:${weight};"`;
};

const rehabNeedsMarkup=(report:InpatientPrintableReport)=>{
  const needs=sectionItems(report,'الاحتياجات');
  const needsRows = needs.map((item,index)=>`<div class="needs-rtl-row"><span class="needs-rtl-num">${index+1}</span><span class="needs-rtl-dash">-</span><span class="needs-rtl-text">${escapeHtml(item)}</span></div>`).join('');
  const rehabTeam=(report.secondarySignature||'').split('·').map(item=>item.trim()).filter(Boolean);
  const doctor=rehabTeam[0]||'';
  const occupational=rehabTeam[2]||rehabTeam[1]||'';
  return `<div ${rootAttrs(report,'official-report-page rehab-old-template needs-template')}>
    <div class="official-report-date"><span>تاريخ التقرير :</span><b>${escapeHtml(formatDate(report.date))}</b></div>
    ${reportHeader()}<h1 class="under-title">تقرير احتياجات</h1>
    <table class="needs-patient-table">
      <tr><td><b>الاسم :</b> ${escapeHtml(field(report,'الاسم الرباعي'))}</td><td><b>تاريخ الدخول :</b> ${escapeHtml(formatDate(field(report,'تاريخ الدخول')))}</td><td><b>رقم هوية :</b> ${escapeHtml(field(report,'رقم الهوية'))}</td></tr>
      <tr><td colspan="3"><b>العنوان :</b> ${escapeHtml(field(report,'العنوان'))}</td></tr>
    </table>
    <main class="needs-body">
      <p><b><u>التشخيص :</u></b> ${escapeHtml(sectionBody(report,'التشخيص'))}</p>
      <p><b><u>أمراض أخرى :</u></b> ${escapeHtml(sectionBody(report,'أمراض أخرى')||'—')}</p>
      <p><b><u>الحالة الوظيفية :</u></b> ${escapeHtml(sectionBody(report,'الحالة الوظيفية')||'—')}</p>
      <div class="needs-box-title">الاحتياجات</div>
      <div class="needs-rtl-list" dir="rtl">${needsRows}</div>
    </main>
    <section class="needs-signatures">
      <div class="needs-signature-side needs-signature-right">
        <p><b>الحكيم/</b><span>${escapeHtml(doctor||'')}</span></p>
        <p><b>أخصائي علاج وظيفي/</b><span>${escapeHtml(occupational||'')}</span></p>
      </div>
      <div class="needs-signature-side needs-signature-left">
        <p><b>المدير الطبي /</b><span>${escapeHtml(report.signature||'')}</span></p>
      </div>
    </section>
  </div>`;
};

const concernMarkup=(report:InpatientPrintableReport)=>{
  const body=firstBody(report,0);
  const note=firstBody(report,1)||'أعطي هذا التقرير بناءً على طلب الأهل';
  return `<div ${rootAttrs(report,'official-report-page rehab-old-template concern-template')}>
    <div class="concern-date"><b>${escapeHtml(formatDate(report.date))}</b></div>
    ${reportHeader()}<h1>لمن يهمه الأمر</h1>
    <table class="concern-patient-table">
      <tr><td><b>الاسم :</b> ${escapeHtml(field(report,'الاسم الرباعي'))}</td><td><b>تاريخ الميلاد :</b> ${escapeHtml(formatDate(field(report,'تاريخ الميلاد')))}</td><td><b>رقم هوية :</b> ${escapeHtml(field(report,'رقم الهوية'))}</td></tr>
      <tr><td colspan="2"><b>العنوان :</b> ${escapeHtml(field(report,'العنوان'))}</td><td><b>ت الدخول :</b> ${escapeHtml(formatDate(field(report,'تاريخ الدخول')))}</td></tr>
    </table>
    <div class="concern-body">${escapeHtml(body).replace(/\n/g,'<br/>')}</div>
    <h2>${escapeHtml(note)}</h2>
    <section class="concern-signature"><b>المدير الطبي /</b><span>${escapeHtml(report.signature||'')}</span></section>
  </div>`;
};

const followMarkup=(report:InpatientPrintableReport)=>{
  const text=sectionBody(report,'متابعة الحالة')||firstBody(report,1)||firstBody(report,0)||'—';
  const diagnosis=sectionBody(report,'التشخيص')||field(report,'التشخيص');
  return `<div ${rootAttrs(report,'official-report-page follow-old-template')}>
    <div class="follow-print-date" dir="ltr">Print Date: ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</div>
    <div class="follow-title" dir="ltr">FOLLOW CASES</div>
    <div class="follow-dept">القسم: ${escapeHtml(field(report,'قسم المبيت')||'حريم')}</div>
    <article class="follow-case">
      <div class="follow-case-header"><span>1</span><b>المريض: ${escapeHtml(field(report,'الاسم الرباعي'))}</b><b>ت. ميلاد: ${escapeHtml(formatDate(field(report,'تاريخ الميلاد')))}</b><b>ت. دخول: ${escapeHtml(formatDate(field(report,'تاريخ الدخول')))}</b><b>جهة تحويل: ${escapeHtml(field(report,'جهة التغطية'))}</b></div>
      <p><b>${escapeHtml(formatDate(report.date))} medical:</b> ${escapeHtml(diagnosis)}<br/>${escapeHtml(text).replace(/\n/g,'<br/>')}</p>
    </article>
  </div>`;
};

const genericMarkup=(report:InpatientPrintableReport)=>`<div ${rootAttrs(report,'official-report-page rehab-old-template generic-template')}>
  <div class="official-report-date"><span>تاريخ التقرير :</span><b>${escapeHtml(formatDate(report.date))}</b></div>
  <h1 class="under-title">${escapeHtml(report.title)}</h1>
  <table class="needs-patient-table">${report.patientFields.map((item,index)=>index%3===0?`<tr>${report.patientFields.slice(index,index+3).map(field=>`<td><b>${escapeHtml(field.label)} :</b> ${escapeHtml(field.value)}</td>`).join('')}</tr>`:'').join('')}</table>
  <main class="needs-body">${report.sections.map(section=>`<section>${section.heading?`<p><b><u>${escapeHtml(section.heading)} :</u></b> ${escapeHtml(section.body||'').replace(/\n/g,'<br/>')}</p>`:''}${section.items?.length?`<ol>${section.items.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ol>`:''}</section>`).join('')}</main>
  ${attachmentsMarkup(report)}
  <section class="concern-signature"><b>المدير الطبي /</b><span>${escapeHtml(report.signature||'')}</span></section>
</div>`;

const reportMarkup=(report:InpatientPrintableReport)=>{
  if(report.title==='لمن يهمه الأمر')return concernMarkup(report);
  if(report.title.includes('احتياجات'))return rehabNeedsMarkup(report);
  if(report.title.includes('متابعة'))return followMarkup(report);
  return genericMarkup(report);
};

const styles=`
  ${reportHeadStyles}
  *{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:"Times New Roman",Tahoma,Arial,sans-serif}.official-report-page{width:794px;min-height:1123px;background:#fff;color:#000;position:relative;overflow:hidden;padding:92px 64px 58px}.rehab-old-template{font-size:18px;line-height:1.9}.official-report-date,.concern-date{font-size:18px;text-align:right;margin:0 0 14px}.official-report-date span{margin-left:8px}.under-title{text-align:center;font-size:22px;text-decoration:underline;margin:0 0 18px;font-weight:700}.needs-patient-table,.concern-patient-table{width:100%;border-collapse:separate;border-spacing:0;border:1.5px solid #000;border-radius:10px;overflow:hidden;margin:0 auto 20px;font-size:18px}.needs-patient-table td,.concern-patient-table td{border-left:1.2px solid #000;border-bottom:1.2px solid #000;padding:8px 13px;vertical-align:middle}.needs-patient-table tr:last-child td,.concern-patient-table tr:last-child td{border-bottom:0}.needs-patient-table td:last-child,.concern-patient-table td:last-child{border-left:0}.needs-body{padding:0 22px;font-size:18px}.needs-body p{margin:6px 0}.needs-box-title{border:1px solid #000;background:#e6e6e6;display:inline-block;padding:2px 18px;margin:10px 0 6px;font-weight:700;text-decoration:underline}.needs-list{list-style:none;margin:8px 0 0 auto;padding:0;width:100%;direction:rtl;text-align:right;display:grid;gap:4px}.needs-line{display:grid;grid-template-columns:max-content minmax(0,1fr);justify-content:start;align-items:baseline;gap:8px;margin:0;padding:0;line-height:1.85;text-align:right;direction:rtl;white-space:normal}.needs-index{display:block;direction:ltr!important;unicode-bidi:isolate!important;font-weight:900;white-space:nowrap;text-align:right;min-width:34px}.needs-text{display:block;direction:rtl;unicode-bidi:plaintext;text-align:right;font-weight:800;min-width:0}.rehab-signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px 110px;margin-top:24px;font-size:17px}.rehab-signatures div{min-height:38px}.rehab-signatures b{display:block}.rehab-signatures span{display:block;margin-top:2px}.needs-signatures{display:flex;justify-content:space-between;align-items:flex-start;gap:90px;margin-top:34px;padding:0 34px 0 18px;font-size:18px;direction:rtl}.needs-signature-side{width:46%;min-height:72px}.needs-signature-right{text-align:right}.needs-signature-left{text-align:right}.needs-signature-side p{margin:0 0 10px}.needs-signature-side b{display:inline-block;margin-left:6px}.needs-signature-side span{display:inline-block;min-width:120px}.concern-template{padding-top:104px}.concern-date{text-align:right;margin-bottom:20px}.concern-template h1{text-align:center;font-size:34px;margin:0 0 18px;font-weight:900}.concern-patient-table{font-size:18px;margin-bottom:38px}.concern-patient-table td{padding:10px 14px}.concern-body{font-size:21px;line-height:2.25;text-align:right;margin:0 8px 40px;min-height:210px}.concern-template h2{text-align:center;font-size:25px;margin:8px 0 60px;font-weight:900}.concern-signature{font-size:19px;margin-right:22px;margin-top:30px}.concern-signature b{display:block;margin-bottom:8px}.follow-old-template{font-family:"Times New Roman",Tahoma,Arial,sans-serif;padding:28px 38px 48px;font-size:15px}.follow-print-date{position:absolute;left:40px;top:30px;font-size:12px;font-weight:700}.follow-title{width:200px;margin:10px auto 8px;border:2px solid #000;border-radius:4px;text-align:center;padding:5px 0;font-size:20px}.follow-dept{text-align:right;margin:8px 0 14px;font-size:15px}.follow-case{border-top:2px solid #000;padding:7px 0 10px}.follow-case-header{display:grid;grid-template-columns:34px 1.4fr 1fr 1fr 1fr;direction:rtl;align-items:center;border:1.5px solid #000;border-radius:5px;overflow:hidden;background:#e6e6e6;font-size:15px}.follow-case-header>*{padding:6px 7px;border-left:1px solid #000;min-height:28px}.follow-case-header>*:last-child{border-left:0}.follow-case-header span{text-align:center;background:#f1f1f1;font-weight:700}.follow-case p{direction:ltr;text-align:left;font-size:13px;line-height:1.35;margin:5px 0 0 12px}.generic-template{font-size:18px}.generic-template table{margin-bottom:24px}.generic-template .needs-body{font-size:18px}

/* v4.3.63 - definitive right-start needs numbering */
.wafa-needs-final-list{width:520px;max-width:100%;margin:16px auto 0;display:grid;gap:4px;direction:rtl!important;text-align:right!important}
.wafa-needs-final-row{display:flex!important;flex-direction:row!important;justify-content:flex-start!important;align-items:baseline!important;gap:10px!important;direction:rtl!important;text-align:right!important;font-size:22px!important;line-height:1.75!important;font-weight:900!important;white-space:normal!important}
.wafa-needs-final-index{flex:0 0 auto!important;direction:ltr!important;unicode-bidi:isolate!important;text-align:right!important;font-weight:950!important;white-space:nowrap!important}
.wafa-needs-final-text{flex:0 1 auto!important;direction:rtl!important;unicode-bidi:plaintext!important;text-align:right!important;font-weight:900!important;white-space:normal!important}


  /* v4.3.64 final: needs numbering is built as separate RTL cells: number ثم الشرطة ثم النص */
  .wafa-needs-final-list,.needs-numbered-list-fixed,.needs-list{display:none!important}
  .wafa-needs-final-table{display:table!important;border:0!important;border-collapse:separate!important;border-spacing:0 7px!important;width:auto!important;min-width:560px!important;max-width:100%!important;margin:18px auto 0!important;direction:rtl!important;table-layout:auto!important;background:transparent!important}
  .wafa-needs-final-row{display:table-row!important;direction:rtl!important;background:transparent!important}
  .wafa-needs-final-table td{border:0!important;background:transparent!important;padding:0!important;vertical-align:baseline!important;font:900 24px/1.72 Tahoma,Arial,sans-serif!important;color:#000!important;box-shadow:none!important;text-shadow:none!important;filter:none!important}
  .wafa-needs-final-marker{display:table-cell!important;width:88px!important;min-width:88px!important;max-width:88px!important;padding-left:12px!important;text-align:right!important;direction:rtl!important;unicode-bidi:isolate!important;white-space:nowrap!important}
  .wafa-needs-final-marker>div{display:flex!important;flex-direction:row!important;direction:rtl!important;justify-content:flex-start!important;align-items:baseline!important;gap:8px!important;width:100%!important;text-align:right!important;unicode-bidi:isolate!important}
  .wafa-needs-final-num,.wafa-needs-final-dash{display:inline-block!important;font:900 24px/1 Tahoma,Arial,sans-serif!important;direction:rtl!important;unicode-bidi:isolate!important;color:#000!important}
  .wafa-needs-final-text{display:table-cell!important;text-align:right!important;direction:rtl!important;unicode-bidi:plaintext!important;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important}
  /* v4.3.64b: isolated flex rows keep visual order on the right: 1 - النص */
  .needs-rtl-list{width:min(620px,100%);margin:18px auto 0;display:grid;gap:7px;direction:rtl!important;text-align:right!important}
  .needs-rtl-row{display:flex!important;flex-direction:row!important;direction:rtl!important;justify-content:flex-start!important;align-items:baseline!important;gap:8px!important;text-align:right!important;white-space:normal!important;color:#000!important;font-family:Tahoma,Arial,sans-serif!important;font-size:24px!important;line-height:1.72!important;font-weight:900!important}
  .needs-rtl-num,.needs-rtl-dash{flex:0 0 auto!important;direction:rtl!important;unicode-bidi:isolate!important;display:inline-block!important;color:#000!important;font:900 24px/1 Tahoma,Arial,sans-serif!important}
  .needs-rtl-text{flex:0 1 auto!important;min-width:0!important;direction:rtl!important;unicode-bidi:plaintext!important;text-align:right!important;color:#000!important;font:900 24px/1.72 Tahoma,Arial,sans-serif!important;word-break:normal!important;overflow-wrap:break-word!important}
  .print-attachments{margin:18px 24px 0;border-top:1.5px solid #000;padding-top:10px;break-inside:avoid;page-break-inside:avoid}.print-attachments h2{font-size:16px;text-align:right;margin:0 0 8px;text-decoration:underline}.print-attachments figure{margin:0;display:grid;gap:6px;justify-items:center}.print-attachments figcaption{font-size:13px;font-weight:900}.print-attachments img{max-width:92%;max-height:360px;object-fit:contain;border:1.5px solid #000;padding:5px;background:#fff}

  .official-report-page{font-family:var(--report-font,"Times New Roman",Tahoma,Arial,sans-serif)!important;color:var(--report-text,#000)!important}.rehab-old-template,.follow-old-template,.generic-template,.needs-body,.concern-body,.follow-case p,.needs-patient-table,.concern-patient-table{font-size:var(--report-body-size,18px)!important;font-weight:var(--report-weight,700)!important}.under-title,.concern-template h1,.follow-title{color:var(--report-text,#000)!important;font-size:var(--report-title-size,24px)!important;border-color:var(--report-accent,#0891b2)!important}.under-title{text-decoration-color:var(--report-accent,#0891b2)!important}.needs-box-title{border-color:var(--report-accent,#0891b2)!important;color:var(--report-text,#000)!important}.official-report-date,.concern-date{border-right:5px solid var(--report-accent,#0891b2)!important;padding-right:10px!important}.report-layout-modern{padding-top:72px!important}.report-layout-modern .under-title,.report-layout-modern h1{border-bottom:4px solid var(--report-accent,#0891b2)!important;padding-bottom:8px!important;text-decoration:none!important}.report-layout-modern .needs-patient-table,.report-layout-modern .concern-patient-table{border-color:var(--report-accent,#0891b2)!important;border-radius:16px!important}.report-layout-modern .needs-box-title{background:var(--report-accent,#0891b2)!important;color:#fff!important;border-radius:999px!important;text-decoration:none!important}.report-layout-minimal{padding:74px 70px 58px!important}.report-layout-minimal .needs-patient-table,.report-layout-minimal .concern-patient-table{border-width:1px!important;border-radius:0!important}.report-layout-minimal .official-report-date,.report-layout-minimal .concern-date{border-right:0!important;padding-right:0!important}.report-layout-minimal .needs-box-title{background:#fff!important;border-width:0 0 2px 0!important;text-decoration:none!important}

`;

async function createHost(report:InpatientPrintableReport){
  return createSilentExportFrame(`<style>${styles}</style>${reportMarkup(report)}`,794,1320);
}

export async function downloadInpatientPdf(report:InpatientPrintableReport){
  const host=await createHost(report);
  try{
    const page=host.querySelector('.official-report-page') as HTMLElement;
    const canvas=await captureElementCanvas(page,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
    if(canvas.width<50 || canvas.height<50) throw new Error('empty canvas');
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const pageWidth=210; const imageHeight=canvas.height*pageWidth/canvas.width;
    const image=canvas.toDataURL('image/png');
    pdf.addImage(image,'PNG',0,0,pageWidth,imageHeight,'','FAST');
    pdf.save(`${report.filename}.pdf`);
  }finally{host.remove();cleanupExportArtifacts();}
}

export async function downloadInpatientExcel(report:InpatientPrintableReport){
  const rows:(string|number)[][]=[];
  rows.push([report.title, formatDate(report.date)]);
  report.patientFields.forEach(field=>rows.push([field.label,field.value]));
  report.sections.forEach(section=>{
    if(section.heading)rows.push([section.heading,'']);
    if(section.body)rows.push(['',section.body]);
    section.items?.forEach((item,index)=>rows.push([`${index+1}`,item]));
  });
  report.attachments?.forEach((attachment,index)=>rows.push([`صورة مرفقة ${index+1}`,attachment.label||'صورة مرفقة']));
  if(report.signature)rows.push(['الاعتماد',report.signature]);
  if(report.secondarySignature)rows.push(['إعداد / متابعة',report.secondarySignature]);
  await downloadXlsx(`${report.filename}.xlsx`,['البيان','التفاصيل'],rows,true);
}

export async function downloadInpatientWord(report:InpatientPrintableReport){
  const host=await createHost(report);
  try{
    const page=host.querySelector('.official-report-page') as HTMLElement|null;
    if(!page)throw new Error('تعذر العثور على قالب التقرير');
    await downloadElementsAsDocx(report.filename,[page],'portrait');
  }finally{host.remove();cleanupExportArtifacts();}
}
