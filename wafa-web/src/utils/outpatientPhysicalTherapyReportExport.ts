import { jsPDF } from 'jspdf';
import { captureElementCanvas, cleanupExportArtifacts, createSilentExportFrame, downloadBlob, downloadElementsAsDocx } from './documentDownload';
import { reportHeadStyles, reportHeader } from './reportBranding';

export interface OutpatientPtReportExportRow {
  seq:number;
  patientNumber:string;
  patientName:string;
  sessions:number;
  city:string;
  birthDate:string;
  sessionsPeriod:string;
  admissionDate:string;
  sessionFee:string|number;
}

export interface OutpatientPtReportExportData {
  title:string;
  dateFrom:string;
  dateTo:string;
  department:string;
  totalSessions:number;
  rows:OutpatientPtReportExportRow[];
  filename:string;
}

const columns=[
  {key:'seq',label:'م.',width:6},
  {key:'patientNumber',label:'رقم المريض',width:10},
  {key:'patientName',label:'اسم المريض',width:17},
  {key:'sessions',label:'عدد الجلسات',width:9},
  {key:'city',label:'المدينة',width:8},
  {key:'birthDate',label:'ت. ميلاد',width:10},
  {key:'sessionsPeriod',label:'فترة الجلسات',width:22},
  {key:'admissionDate',label:'تاريخ الدخول',width:10},
  {key:'sessionFee',label:'ثمن الجلسة',width:8},
] as const;

type ColumnKey=(typeof columns)[number]['key'];

const escapeHtml=(value:string|number|undefined)=>String(value??'—')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const escapeXml=(value:string|number|undefined)=>String(value??'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const safeFilename=(value:string)=>value.replace(/[\\/:*?"<>|]/g,'-').trim()||'outpatient-physical-therapy-report';

const cellValue=(row:OutpatientPtReportExportRow,key:ColumnKey)=>row[key];

const reportStyles=`
  ${reportHeadStyles}
  @page{size:A4 landscape;margin:9mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Tahoma,Arial,"Segoe UI",sans-serif}
  .opt-report-page{width:1123px;min-height:794px;background:#fff;padding:35px 27px 26px;direction:rtl;color:#000;overflow:hidden}
  .opt-report-graybar{height:84px;background:#c9c7ca;margin:0 36px 22px}
  .opt-report-table{width:100%;border-collapse:separate;border-spacing:0 10px;table-layout:fixed;font-size:13px;direction:rtl;color:#000}
  .opt-report-table th{border:2px solid #111;padding:8px 4px;text-align:center;font-weight:900;background:#fff;white-space:normal;line-height:1.25;text-decoration:underline}
  .opt-report-table td{border-top:1.6px solid #111;border-bottom:1.6px solid #111;border-right:1.6px solid #111;padding:8px 4px;text-align:center;font-weight:700;background:#fff;white-space:normal;overflow-wrap:anywhere;word-break:normal;line-height:1.35;vertical-align:middle}
  .opt-report-table td:last-child{border-left:1.6px solid #111}
  .opt-report-table .ltr{direction:ltr;unicode-bidi:plaintext}
  .opt-report-empty{height:52px}
`;

const wordReportStyles=`
  ${reportStyles}
  @page Section1{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:25pt 25pt 25pt 25pt}
  body{direction:rtl}
  .word-section{page:Section1}
  .opt-report-page{width:100%;min-height:0;padding:24pt 18pt 18pt;overflow:visible}
  .opt-report-graybar{height:54pt;margin:0 22pt 16pt;background:#c9c7ca}
  .opt-report-table{width:100%;border-collapse:collapse!important;border-spacing:0!important;table-layout:fixed;mso-table-layout-alt:fixed;border:1.5pt solid #000!important}
  .opt-report-table th,.opt-report-table td{border:1.2pt solid #000!important;padding:6pt 3pt!important;vertical-align:middle!important;mso-border-alt:solid #000 1.2pt;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word}
  .opt-report-table tr{page-break-inside:avoid}
`;

function colgroup(){return `<colgroup>${columns.map(col=>`<col style="width:${col.width}%">`).join('')}</colgroup>`}
function headerMarkup(){return `<thead><tr>${columns.map(col=>`<th>${escapeHtml(col.label)}</th>`).join('')}</tr></thead>`}
function bodyMarkup(rows:OutpatientPtReportExportRow[]){
  if(!rows.length)return `<tbody><tr><td class="opt-report-empty" colspan="${columns.length}">لا توجد بيانات ضمن الفترة المحددة</td></tr></tbody>`;
  return `<tbody>${rows.map(row=>`<tr>${columns.map(col=>`<td${['seq','patientNumber','sessions','sessionFee'].includes(col.key)?' class="ltr"':''}>${escapeHtml(cellValue(row,col.key))}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
function pageMarkup(_report:OutpatientPtReportExportData,rows:OutpatientPtReportExportRow[],_pageNo:number,_totalPages:number){
  return `<div class="opt-report-page" dir="rtl">
    ${reportHeader()}
    <table class="opt-report-table">${colgroup()}${headerMarkup()}${bodyMarkup(rows)}</table>
  </div>`;
}
function wordPageMarkup(report:OutpatientPtReportExportData,rows:OutpatientPtReportExportRow[],pageNo:number,totalPages:number){
  return `<div class="word-section">${pageMarkup(report,rows,pageNo,totalPages).replace('<table class="opt-report-table">','<table class="opt-report-table" border="1" cellspacing="0" cellpadding="0">')}</div>`;
}

const ROWS_PER_PAGE=10;
const chunks=<T,>(items:T[],size:number)=>items.length?Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,(index+1)*size)):[[]];

async function createRenderedPage(report:OutpatientPtReportExportData,rows:OutpatientPtReportExportRow[],pageNo:number,totalPages:number){
  return createSilentExportFrame(`<style>${reportStyles}</style>${pageMarkup(report,rows,pageNo,totalPages)}`,1123,960,false);
}

export async function downloadOutpatientPtPdf(report:OutpatientPtReportExportData){
  cleanupExportArtifacts();
  try{
    const pages=chunks(report.rows,ROWS_PER_PAGE);
    const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    for(let index=0;index<pages.length;index++){
      const host=await createRenderedPage(report,pages[index],index+1,pages.length);
      try{
        const page=host.querySelector('.opt-report-page') as HTMLElement;
        const canvas=await captureElementCanvas(page,{scale:1.9,useCORS:true,backgroundColor:'#ffffff'});
        if(index>0)pdf.addPage('a4','landscape');
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,297,210,undefined,'FAST');
      }finally{host.remove();cleanupExportArtifacts()}
    }
    pdf.save(`${safeFilename(report.filename)}.pdf`);
  }finally{cleanupExportArtifacts()}
}

export async function downloadOutpatientPtWord(report:OutpatientPtReportExportData){
  cleanupExportArtifacts();
  const pages=chunks(report.rows,ROWS_PER_PAGE);
  const hosts:HTMLElement[]=[];
  try{
    const elements:HTMLElement[]=[];
    for(let index=0;index<pages.length;index++){
      const host=await createRenderedPage(report,pages[index],index+1,pages.length);
      hosts.push(host);
      const page=host.querySelector('.opt-report-page') as HTMLElement|null;
      if(!page)throw new Error('تعذر العثور على قالب التقرير');
      elements.push(page);
    }
    await downloadElementsAsDocx(safeFilename(report.filename),elements,'landscape');
  }finally{hosts.forEach(host=>host.remove());cleanupExportArtifacts()}
}

const columnName=(index:number)=>{let value='';let n=index+1;while(n){const remainder=(n-1)%26;value=String.fromCharCode(65+remainder)+value;n=Math.floor((n-1)/26)}return value};
const xlsxCell=(ref:string,value:string|number,style:number)=>typeof value==='number'
  ?`<c r="${ref}" s="${style}"><v>${value}</v></c>`
  :`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;

export async function downloadOutpatientPtExcel(report:OutpatientPtReportExportData){
  const {strToU8,zipSync}=await import('fflate');
  const sheetRows:string[]=[];
  sheetRows.push(`<row r="1" ht="30" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t></t></is></c></row>`);
  sheetRows.push(`<row r="2" ht="30" customHeight="1"><c r="A2" s="1" t="inlineStr"><is><t></t></is></c></row>`);
  sheetRows.push(`<row r="3" ht="16" customHeight="1"><c r="A3" s="0" t="inlineStr"><is><t></t></is></c></row>`);
  sheetRows.push(`<row r="4" ht="32" customHeight="1">${columns.map((col,index)=>xlsxCell(`${columnName(index)}4`,col.label,4)).join('')}</row>`);
  if(report.rows.length){
    report.rows.forEach((row,rowIndex)=>{
      const r=rowIndex+5;
      sheetRows.push(`<row r="${r}" ht="34" customHeight="1">${columns.map((col,index)=>xlsxCell(`${columnName(index)}${r}`,cellValue(row,col.key),5)).join('')}</row>`);
    });
  }else{
    sheetRows.push(`<row r="5" ht="34" customHeight="1">${xlsxCell('A5','لا توجد بيانات ضمن الفترة المحددة',5)}</row>`);
  }
  const cols=[8,15,25,13,13,15,32,17,14].map((width,index)=>`<col min="${index+1}" max="${index+1}" width="${width}" customWidth="1"/>`).join('');
  const mergeCells=[`<mergeCell ref="A1:I2"/>`,...(report.rows.length?[]:[`<mergeCell ref="A5:I5"/>`])].join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${sheetRows.join('')}</sheetData><mergeCells count="${report.rows.length?1:2}">${mergeCells}</mergeCells><pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0" footer="0"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/><printOptions horizontalCentered="1"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="15"/><name val="Arial"/></font><font><b/><u/><sz val="12"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC9C7CA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files:Record<string,Uint8Array>={
    '[Content_Types].xml':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView rightToLeft="1"/></bookViews><sheets><sheet name="تقرير العلاج الطبيعي" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml':strToU8(styles),
    'xl/worksheets/sheet1.xml':strToU8(sheet),
  };
  const blob=new Blob([zipSync(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  downloadBlob(blob,`${safeFilename(report.filename)}.xlsx`);
}
