import { jsPDF } from 'jspdf';
import { captureElementCanvas, cleanupExportArtifacts, createSilentExportFrame, downloadElementsAsDocx, removeExportHosts } from './documentDownload';
import { reportHeadStyles, reportHeader } from './reportBranding';

const escapeHtml=(value:unknown)=>String(value ?? '—')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const safeFilename=(value:string)=>value.replace(/[\\/:*?"<>|]/g,'-').trim()||'document';

export interface SimpleDocumentTable {
  title: string;
  subtitle?: string;
  filename: string;
  columns: Array<{ key: string; label: string; width?: string }>;
  rows: Array<Record<string, unknown>>;
  footer?: string;
}

export function buildSimpleReportHtml(report: SimpleDocumentTable) {
  return `<section class="simple-report-page" dir="rtl">
    ${reportHeader()}<header><h1>${escapeHtml(report.title)}</h1>${report.subtitle?`<p>${escapeHtml(report.subtitle)}</p>`:''}</header>
    <table>${report.columns.map(col=>`<col style="width:${col.width||'auto'}">`).join('')}<thead><tr>${report.columns.map(col=>`<th>${escapeHtml(col.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${report.columns.map(col=>`<td>${escapeHtml(row[col.key])}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${report.columns.length}">لا توجد بيانات</td></tr>`}</tbody></table>
    ${report.footer?`<footer>${escapeHtml(report.footer)}</footer>`:''}
  </section>`;
}

export const simpleReportCss = `
  @page{size:A4 landscape;margin:10mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-shadow:none!important;filter:none!important}
  html,body{margin:0;background:#fff;color:#111;font-family:Tahoma,Arial,"Segoe UI",sans-serif;direction:rtl}
  .simple-report-page{width:1123px;min-height:794px;background:#fff;color:#111;padding:28px;direction:rtl}
  .simple-report-page header{border-bottom:4px solid #111;margin-bottom:14px;padding-bottom:10px;text-align:center}
  .simple-report-page h1{margin:0;font-size:24px;font-weight:900}
  .simple-report-page p{margin:8px 0 0;font-size:13px;font-weight:700;color:#333}
  .simple-report-page table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;direction:rtl}
  .simple-report-page th,.simple-report-page td{border:1.2px solid #111;padding:6px 5px;text-align:center;vertical-align:middle;line-height:1.45;word-break:break-word;overflow-wrap:anywhere}
  .simple-report-page th{background:#d6d6d6;font-size:12px;font-weight:900}
  .simple-report-page footer{margin-top:14px;font-weight:700;text-align:center}
`;

export async function downloadSimplePdf(report: SimpleDocumentTable) {
  removeExportHosts();
  const host=await createSilentExportFrame(`<style>${reportHeadStyles}${simpleReportCss}</style>${buildSimpleReportHtml(report)}`,1123,940);
  try{
    if(document.fonts?.ready)await document.fonts.ready;
    await new Promise(resolve=>window.setTimeout(resolve,80));
    const page=host.querySelector('.simple-report-page') as HTMLElement;
    const canvas=await captureElementCanvas(page,{scale:1.7,useCORS:true,backgroundColor:'#ffffff'});
    const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,297,210,undefined,'FAST');
    pdf.save(`${safeFilename(report.filename)}.pdf`);
  } finally { host.remove(); cleanupExportArtifacts(); }
}

export async function downloadSimpleWord(report: SimpleDocumentTable) {
  const host=await createSilentExportFrame(`<style>${simpleReportCss}</style>${buildSimpleReportHtml(report)}`,1123,940);
  try{
    const page=host.querySelector('.simple-report-page') as HTMLElement|null;
    if(!page)throw new Error('تعذر العثور على قالب التقرير');
    await downloadElementsAsDocx(safeFilename(report.filename),[page],'landscape');
  }finally{host.remove(); cleanupExportArtifacts()}
}
