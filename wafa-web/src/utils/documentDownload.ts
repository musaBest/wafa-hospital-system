import html2canvas from 'html2canvas';

export type DocumentOrientation = 'portrait' | 'landscape';

const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PX_CAPTURE_SCALE=2;
const MM_TO_EMU=36000;

type CanvasOptions = NonNullable<Parameters<typeof html2canvas>[1]>;

function ensureSilentExportStyle(){
  if(document.getElementById('wafa-silent-export-style')) return;
  const style=document.createElement('style');
  style.id='wafa-silent-export-style';
  style.textContent=`
    /* Keep html2canvas clones fully renderable, but move them far outside the viewport.
       Hiding the clone with opacity/visibility breaks canvas capture in Chrome. */
    .html2canvas-container{position:fixed!important;left:-1000000px!important;top:0!important;right:auto!important;bottom:auto!important;z-index:-2147483000!important;opacity:1!important;visibility:visible!important;pointer-events:none!important;overflow:visible!important;background:#fff!important;max-width:none!important;max-height:none!important;}
    .export-capture-frame{position:fixed!important;left:-1000000px!important;top:0!important;right:auto!important;bottom:auto!important;border:0!important;background:#fff!important;opacity:1!important;visibility:visible!important;pointer-events:none!important;z-index:-2147483000!important;overflow:visible!important;}
    .export-capture-host,.export-hidden-host,[data-wafa-export-host='true']{pointer-events:none!important;}
  `;
  document.head.appendChild(style);
}

function neutralizeHtml2CanvasContainers(doc:Document=document){
  try{
    doc.querySelectorAll('.html2canvas-container').forEach(node=>{
      const el=node as HTMLElement;
      el.setAttribute('aria-hidden','true');
      el.style.setProperty('position','fixed','important');
      el.style.setProperty('left','-1000000px','important');
      el.style.setProperty('top','0','important');
      el.style.setProperty('z-index','-2147483000','important');
      el.style.setProperty('opacity','1','important');
      el.style.setProperty('visibility','visible','important');
      el.style.setProperty('pointer-events','none','important');
      el.style.setProperty('overflow','visible','important');
      el.style.setProperty('background','#fff','important');
      el.style.setProperty('max-width','none','important');
      el.style.setProperty('max-height','none','important');
    });
  }catch{/* ignored */}
}

function observeSilentCanvas(doc:Document=document){
  neutralizeHtml2CanvasContainers(doc);
  const observer=new MutationObserver(()=>neutralizeHtml2CanvasContainers(doc));
  try{observer.observe(doc.documentElement,{childList:true,subtree:true});}catch{/* ignored */}
  return ()=>{try{observer.disconnect()}catch{/* ignored */} neutralizeHtml2CanvasContainers(doc);};
}

export async function captureElementCanvas(element:HTMLElement, options:CanvasOptions={}){
  ensureSilentExportStyle();
  const doc=element.ownerDocument || document;
  const stop=observeSilentCanvas(doc);
  const stopMain=doc===document?undefined:observeSilentCanvas(document);
  try{
    return await html2canvas(element,{logging:false,removeContainer:true,...options});
  }finally{
    stop();
    stopMain?.();
    window.setTimeout(()=>{
      neutralizeHtml2CanvasContainers(doc);
      if(doc!==document) neutralizeHtml2CanvasContainers(document);
      try{doc.querySelectorAll('.html2canvas-container').forEach(node=>node.remove())}catch{/* ignored */}
      try{document.querySelectorAll('.html2canvas-container').forEach(node=>node.remove())}catch{/* ignored */}
    },30);
  }
}

export async function createSilentExportFrame(innerHtml:string,width=794,height=1400,cleanupFirst=true){
  if(cleanupFirst) cleanupExportArtifacts();
  ensureSilentExportStyle();
  const frame=document.createElement('iframe');
  frame.className='export-capture-frame export-clean-frame';
  frame.setAttribute('aria-hidden','true');
  frame.tabIndex=-1;
  frame.style.cssText=`position:fixed!important;left:-1000000px!important;top:0!important;width:${width}px!important;min-width:${width}px!important;height:${height}px!important;min-height:${height}px!important;border:0!important;background:#fff!important;opacity:1!important;visibility:visible!important;pointer-events:none!important;z-index:-2147483000!important;overflow:visible!important;`;
  document.body.appendChild(frame);
  const doc=frame.contentDocument;
  if(!doc){frame.remove();throw new Error('تعذر تجهيز بيئة التصدير الصامت')}
  doc.open();
  doc.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><base href="${document.baseURI}"><style>html,body{margin:0;padding:0;background:#fff;color:#000;overflow:visible}body{width:max-content;min-width:0}</style></head><body><main id="wafa-silent-export-root">${innerHtml}</main></body></html>`);
  doc.close();
  await new Promise<void>(resolve=>{
    const finish=()=>window.setTimeout(resolve,50);
    if(doc.readyState==='complete') finish();
    else frame.addEventListener('load',finish,{once:true});
  });
  const root=doc.getElementById('wafa-silent-export-root') as HTMLElement|null;
  if(!root){frame.remove();throw new Error('تعذر تجهيز قالب التقرير')}
  try{await ((doc as Document & {fonts?: FontFaceSet}).fonts?.ready || Promise.resolve())}catch{/* ignored */}
  const images=Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve();})));
  await new Promise(resolve=>window.setTimeout(resolve,90));
  return root;
}


const pageSize=(orientation:DocumentOrientation)=>orientation==='landscape'
  ? {widthMm:297,heightMm:210,widthTwips:16838,heightTwips:11906,orient:' w:orient="landscape"'}
  : {widthMm:210,heightMm:297,widthTwips:11906,heightTwips:16838,orient:''};

export const safeDownloadFilename=(value:string,fallback='document')=>value.replace(/[\\/:*?"<>|]/g,'-').trim()||fallback;

export function cleanupExportArtifacts(){
  document.querySelectorAll('.export-capture-host,.export-hidden-host,.export-capture-frame,.export-clean-frame,[data-wafa-export-host="true"],.html2canvas-container').forEach(node=>{ try{ node.remove(); }catch{/* ignored */} });
  document.body.classList.remove('exporting-document');
  document.documentElement.classList.remove('exporting-document');
}

export function downloadBlob(blob:Blob,filename:string){
  cleanupExportArtifacts();
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.style.display='none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(()=>{
    link.remove();
    URL.revokeObjectURL(url);
  },1800);
}

const canvasToPng=async(canvas:HTMLCanvasElement)=>{
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('تعذر تجهيز صورة صفحة Word')),'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
};

async function renderElementPages(element:HTMLElement,orientation:DocumentOrientation){
  const canvas=await captureElementCanvas(element,{scale:PX_CAPTURE_SCALE,useCORS:true,backgroundColor:'#ffffff'});
  if(canvas.width<50||canvas.height<50)throw new Error('تعذر التقاط قالب التقرير');
  const size=pageSize(orientation);
  const maxSliceHeight=Math.max(1,Math.round(canvas.width*(size.heightMm/size.widthMm)));
  const result:Array<{bytes:Uint8Array;width:number;height:number}>=[];
  for(let top=0;top<canvas.height;top+=maxSliceHeight){
    const sliceHeight=Math.min(maxSliceHeight,canvas.height-top);
    const pageCanvas=document.createElement('canvas');
    pageCanvas.width=canvas.width;
    pageCanvas.height=sliceHeight;
    const context=pageCanvas.getContext('2d');
    if(!context)throw new Error('تعذر تجهيز صفحة Word');
    context.fillStyle='#ffffff';
    context.fillRect(0,0,pageCanvas.width,pageCanvas.height);
    context.drawImage(canvas,0,top,canvas.width,sliceHeight,0,0,canvas.width,sliceHeight);
    result.push({bytes:await canvasToPng(pageCanvas),width:pageCanvas.width,height:pageCanvas.height});
  }
  return result;
}

const imageParagraph=(rid:string,id:number,cx:number,cy:number,pageBreak:boolean)=>`<w:p>
  <w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>
  <w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>
    <wp:docPr id="${id}" name="Report page ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="page-${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>
    </a:graphicData></a:graphic>
  </wp:inline></w:drawing></w:r>${pageBreak?'<w:r><w:br w:type="page"/></w:r>':''}
</w:p>`;

export async function downloadElementsAsDocx(filename:string,elements:HTMLElement[],orientation:DocumentOrientation){
  if(!elements.length)throw new Error('تعذر العثور على قالب التقرير');
  if(document.fonts?.ready)await document.fonts.ready;
  await new Promise(resolve=>window.setTimeout(resolve,120));
  const rendered=[] as Array<{bytes:Uint8Array;width:number;height:number}>;
  for(const element of elements)rendered.push(...await renderElementPages(element,orientation));
  if(!rendered.length)throw new Error('تعذر تجهيز صفحات Word');

  const size=pageSize(orientation);
  // Keep a hairline safety margin so Word never creates a trailing blank page.
  const maxWidthEmu=Math.round(size.widthMm*MM_TO_EMU*0.996);
  const maxHeightEmu=Math.round(size.heightMm*MM_TO_EMU*0.996);
  const rels:string[]=[];
  const paragraphs:string[]=[];
  const files:Record<string,Uint8Array>={};
  const {strToU8,zipSync}=await import('fflate');

  rendered.forEach((page,index)=>{
    const rid=`rId${index+1}`;
    const pageRatio=page.height/page.width;
    let cx=maxWidthEmu;
    let cy=Math.round(cx*pageRatio);
    if(cy>maxHeightEmu){cy=maxHeightEmu;cx=Math.round(cy/pageRatio)}
    rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page-${index+1}.png"/>`);
    paragraphs.push(imageParagraph(rid,index+1,cx,cy,index<rendered.length-1));
    files[`word/media/page-${index+1}.png`]=page.bytes;
  });

  const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="${size.widthTwips}" w:h="${size.heightTwips}"${size.orient}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  files['[Content_Types].xml']=strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  files['_rels/.rels']=strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  files['word/document.xml']=strToU8(documentXml);
  files['word/_rels/document.xml.rels']=strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
  const blob=new Blob([zipSync(files,{level:6})],{type:DOCX_MIME});
  downloadBlob(blob,`${safeDownloadFilename(filename)}.docx`);
}

export function removeExportHosts(){
  cleanupExportArtifacts();
}

export const offscreenCaptureStyle=(width:number,height?:number)=>`position:fixed!important;left:-100000px!important;right:auto!important;top:-100000px!important;width:${width}px!important;min-width:${width}px!important;${height?`height:${height}px!important;min-height:${height}px!important;`:'height:auto!important;min-height:0!important;'}max-width:none!important;max-height:none!important;background:#fff!important;color:#000!important;pointer-events:none!important;z-index:-2147483000!important;opacity:1!important;visibility:visible!important;overflow:visible!important;transform:none!important;filter:none!important;text-shadow:none!important;box-shadow:none!important;contain:none!important;`;
