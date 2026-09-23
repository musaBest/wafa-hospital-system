import{c}from"./index-DZMbGMHO.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=c("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=c("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=c("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]),i="Others",m=["Amputation","Fracture","Burn","Cerebral Palsy","Neck Pain","Back Pain","Deformity","Bell's Palsy","Arthritis","Neurological Condition",i],k=["Stroke (CVA)","Spinal Cord Injury (SCI)","Head Injury (TBI)","Bed sores","MS","GBS","TM","Coma","Neck femur fracture",i],S="wafaa_pt_diagnoses_custom",I="wafaa_inpatient_diagnoses_custom",o=t=>{try{const a=JSON.parse(window.localStorage.getItem(t)||"[]");return Array.isArray(a)?a.filter(e=>typeof e=="string"&&!!e.trim()):[]}catch{return[]}},d=(t,a)=>{try{window.localStorage.setItem(t,JSON.stringify(a))}catch{}};function u(t,a){const e=a.filter(r=>r!==i),s=o(t).filter(r=>!e.includes(r));return[...e,...s,i]}function M(t,a,e){const s=e.trim();return!s||s===i||u(t,a).some(n=>n.toLowerCase()===s.toLowerCase())?!1:(d(t,[...o(t),s]),!0)}function A(t,a,e,s){const r=s.trim();if(!r||a.includes(e))return!1;const n=o(t),h=n.indexOf(e);return h<0?!1:(n[h]=r,d(t,n),!0)}function D(t,a,e){if(a.includes(e))return!1;const s=o(t);return s.includes(e)?(d(t,s.filter(r=>r!==e)),!0):!1}const _=(t,a)=>!t.includes(a);export{y as C,k as D,p as F,I,i as O,S as P,f as S,M as a,D as b,m as c,u as d,_ as i,A as r};
