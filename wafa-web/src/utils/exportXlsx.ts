import { downloadBlob } from './documentDownload';
const escapeXml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const columnName=(index:number)=>{let value='';let n=index+1;while(n){const remainder=(n-1)%26;value=String.fromCharCode(65+remainder)+value;n=Math.floor((n-1)/26)}return value};

/** Creates a dependency-light, standards-compliant XLSX workbook with one sheet. */
export async function downloadXlsx(filename:string,headers:string[],rows:(string|number)[][],rtl:boolean){
  const {strToU8,zipSync}=await import('fflate');
  const allRows=[headers,...rows];
  const sheetRows=allRows.map((row,rowIndex)=>`<row r="${rowIndex+1}">${row.map((cell,columnIndex)=>{const ref=`${columnName(columnIndex)}${rowIndex+1}`;return typeof cell==='number'?`<c r="${ref}"><v>${cell}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`}).join('')}</row>`).join('');
  const files:Record<string,Uint8Array>={
    '[Content_Types].xml':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Patients" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="${rtl?1:0}"/></sheetViews><sheetData>${sheetRows}</sheetData></worksheet>`),
  };
  const blob=new Blob([zipSync(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  downloadBlob(blob,filename);
}
