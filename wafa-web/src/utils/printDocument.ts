export async function printHtmlDocument(title:string, bodyHtml:string, css=''){
  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.tabIndex=-1;
  frame.style.cssText='position:fixed;left:-12000px;top:0;width:900px;height:1200px;border:0;background:#fff;pointer-events:none;z-index:-10000;opacity:1;visibility:visible;';
  document.body.appendChild(frame);
  const doc=frame.contentDocument;
  if(!doc){frame.remove();throw new Error('تعذر تجهيز نافذة الطباعة')}
  doc.open();
  doc.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>html,body{margin:0;background:#fff;color:#000;font-family:Tahoma,"Segoe UI",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{box-sizing:border-box;text-shadow:none!important;filter:none!important}${css}</style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  await new Promise<void>(resolve=>{
    const finish=()=>window.setTimeout(resolve,100);
    if(frame.contentWindow?.document.readyState==='complete')finish();
    else frame.addEventListener('load',finish,{once:true});
  });
  const images=Array.from(frame.contentDocument?.images||[]);
  await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve()})));
  const win=frame.contentWindow;
  if(!win){frame.remove();throw new Error('تعذر فتح الطباعة')}
  const cleanup=()=>{try{frame.remove()}catch{/* already removed */}};
  try{
    win.addEventListener?.('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
  }finally{
    window.setTimeout(cleanup,1200);
    window.setTimeout(cleanup,4000);
  }
}

export async function printCurrentView(title='Wafaa Hospital Report', selector='.content'){
  const node=document.querySelector(selector) as HTMLElement|null;
  if(!node) throw new Error('تعذر العثور على محتوى التقرير');
  let css='';
  for(const sheet of Array.from(document.styleSheets)){
    try{css+=Array.from(sheet.cssRules).map(rule=>rule.cssText).join('\n')}catch{/* cross-origin stylesheet */}
  }
  await printHtmlDocument(title,`<main class="print-current-view">${node.outerHTML}</main>`,`${css}\n:root{--ink:#111;--ink-soft:#222;--muted:#555;--solid:#fff;--surface:#fff;--surface-strong:#fff;--input:#fff;--border:#bbb;--border-strong:#888;--shadow:none;--lift:none}@page{size:auto;margin:10mm}.dock,.topbar,.toast-stack,.modal-back,.cmdk-back{display:none!important}.workspace{margin:0!important}.content{width:100%!important;max-width:none!important;padding:0!important}.print-current-view{background:#fff;color:#111}.glass,.glass-strong,.panel{box-shadow:none!important;backdrop-filter:none!important}`);
}
