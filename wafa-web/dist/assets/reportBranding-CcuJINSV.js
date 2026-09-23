const o=()=>`${window.location.origin}/wafaa-hospital-logo.png`,i=`
  .wf-head{display:flex;align-items:center;justify-content:space-between;gap:18px;
    padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid #0068a9}
  .wf-head-name{text-align:right;line-height:1.4}
  .wf-head-name b{display:block;font-size:17px;font-weight:800;color:#0b3b57}
  .wf-head-name span{display:block;font-size:10.5px;color:#5b7183}
  .wf-head-logo{width:84px;height:66px;object-fit:contain;flex:none}
  .wf-head-meta{font-size:10.5px;color:#5b7183;text-align:left;line-height:1.6}
  .wf-title{margin:0 0 12px;text-align:center;font-size:15px;font-weight:800;color:#0b3b57}
  .wf-foot{margin-top:16px;padding-top:10px;border-top:1px solid #cbd5e1;
    display:flex;justify-content:space-between;font-size:10px;color:#64748b}
`;function n({title:e,meta:t}={}){const a=new Date().toLocaleString("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});return`
  <header class="wf-head">
    <div class="wf-head-name">
      <b>مستشفى الوفاء</b>
      <span>للتأهيل الطبي والجراحة التخصصية</span>
    </div>
    <div class="wf-head-meta">${t?`${t}<br/>`:""}${a}</div>
    <img class="wf-head-logo" src="${o()}" alt="Wafaa Hospital" />
  </header>
  ${e?`<h1 class="wf-title">${e}</h1>`:""}`}export{n as a,o as l,i as r};
