import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  Activity, CalendarDays, Check, ClipboardList, Clock3, Download, FileSpreadsheet,
  FileText, FileType2, Filter, HeartPulse, History, ListChecks, Plus, RefreshCw, Search, Sparkles,
  Stethoscope, UserCheck, UsersRound,
} from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, Panel } from '../components/ui';
import { useHospital } from '../context/HospitalContext';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import type { Admission, InpatientReport, InpatientReportFieldKey, Patient } from '../types';
import {
  downloadInpatientExcel, downloadInpatientPdf, downloadInpatientWord,
  type InpatientPrintableReport, type PrintableField,
} from '../utils/inpatientReportExport';
import {
  downloadFinancialExcel, downloadFinancialPdf, downloadFinancialWord,
  type FinancialReportColumn, type FinancialReportRow, type InpatientFinancialReport,
} from '../utils/inpatientFinancialExport';

const today=()=>new Date().toISOString().slice(0,10);
const NEEDS_STORAGE='wafaa_rehab_custom_needs_v1';
const DEFAULT_NEEDS=[
  'سرير طبي ذو جوانب','فرشة هوائية للسرير مع ماتور','وسادة هوائية','كرسي متحرك',
  'كرسي ذو ظهر مائل','كرسي كهربائي','كرسي حمام متحرك','مشاية - ووكر','عكاز',
  'حفاضات','K-Y gel','أكياس بول','قسطرة بولية فولي','قسطرة بولية نيلاتون','قسطرة خارجية / كوندوم',
  'شاش معقم','بوفيدين','محلول ملحي','لاصق جروح ميكروبور','أمبواج','جهاز قياس ضغط',
  'سرنجات تغذية 50 مل','أنبوب تغذية','جهاز شفط بلغم','أنابيب شفط بلغم','جهاز تبخيرة','أسطوانة أكسجين',
  'مولد أكسجين','ميزان حرارة','ماسكات وجه','قفازات نايلون','قفازات طبية','مولد كهربائي','جهاز فحص سكر',
];

const NEED_BRANCH_OPTIONS:Record<string,string[]>={
  'كرسي متحرك':['مقاس 40','مقاس 42','مقاس 45','مقاس 48','مقاس 50','مقاس 52'],
  'كرسي متحرك عادي':['مقاس 40','مقاس 42','مقاس 45','مقاس 48','مقاس 50','مقاس 52'],
  'كرسي ذو ظهر مائل':['مقاس 40','مقاس 42','مقاس 45','مقاس 48','مقاس 50','مقاس 52'],
  'كرسي متحرك ذو ظهر مائل':['مقاس 40','مقاس 42','مقاس 45','مقاس 48','مقاس 50','مقاس 52'],
  'كرسي كهربائي':['تحكم أيمن','تحكم أيسر'],
  'كرسي كهربائي متحرك':['تحكم أيمن','تحكم أيسر'],
  'عكاز':['إبط','كوع','ذو ثلاث نقاط'],
  'أكياس بول':['عدد 30 شهرياً','عدد 60 شهرياً'],
  'حفاضات':['عدد 60 شهرياً','عدد 90 شهرياً'],
  'حفاضة':['عدد 60 شهرياً','عدد 90 شهرياً'],
  'حفاضات مقاس كبير':['عدد 60 شهرياً','عدد 90 شهرياً'],
  'قسطرة بولية فولي':['مقاس FR 16','مقاس FR 18','مقاس FR 20','مقاس FR 22','مقاس FR 24'],
  'قسطرة بولية نيلاتون':['مقاس 8','مقاس 10','مقاس 12'],
  'شاش معقم':['كيلو 1','كيلو 2','كيلو 3','كيلو 4','كيلو 5'],
  'أنبوب تغذية':['مقاس 14 ملم','مقاس 16 ملم'],
  'انبوب تغذية':['مقاس 14 ملم','مقاس 16 ملم'],
};

const needBranchOptions=(need:string)=>NEED_BRANCH_OPTIONS[need]||[];
const formatNeedDisplay=(need:string,branch?:string)=>branch?`${need} - ${branch}`:need;
const safeParseNeedsBases=(value:string|undefined,fallback:string[])=>{try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?parsed.filter(item=>typeof item==='string'):fallback}catch{return fallback}};
const safeParseNeedBranches=(value:string|undefined)=>{try{const parsed=JSON.parse(value||'{}');return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,string>:{} }catch{return {}}};

const FIELD_OPTIONS:Array<{key:InpatientReportFieldKey;label:string}>=[
  {key:'name',label:'الاسم الرباعي'},{key:'age',label:'العمر'},{key:'gender',label:'الجنس'},
  {key:'nationalId',label:'رقم الهوية'},{key:'dob',label:'تاريخ الميلاد'},{key:'medicalSerial',label:'رقم الملف'},
  {key:'address',label:'العنوان'},{key:'maritalStatus',label:'الحالة الاجتماعية'},{key:'coverage',label:'جهة التغطية'},
  {key:'ward',label:'قسم المبيت'},{key:'admissionDate',label:'تاريخ الدخول'},{key:'diagnosis',label:'التشخيص'},
  {key:'referralHospital',label:'المشفى المحوِّل'},{key:'phone',label:'رقم الهاتف'},{key:'city',label:'المدينة / المنطقة'},
];
const DEFAULT_FIELDS:InpatientReportFieldKey[]=['name','age','gender','nationalId','dob','address','admissionDate'];

type RenewalFieldKey = 'seq' | 'name' | 'fatherName' | 'grandName' | 'familyName' | 'patientContributionPct' | 'nationalId' | 'referralNo' | 'admissionDate' | 'referralEndDate' | 'dischargeDate' | 'stayDays' | 'notes' | 'gender' | 'age' | 'ward' | 'coverage' | 'diagnosis' | 'medicalSerial';
const RENEWAL_FIELD_OPTIONS:Array<{key:RenewalFieldKey;label:string}>=[
  {key:'seq',label:'الرقم'},{key:'name',label:'الاسم'},{key:'fatherName',label:'الأب'},{key:'grandName',label:'الجد'},{key:'familyName',label:'العائلة'},
  {key:'patientContributionPct',label:'مساهمة المريض'},{key:'nationalId',label:'رقم الهوية'},{key:'referralNo',label:'رقم التحويلة'},
  {key:'admissionDate',label:'تاريخ الدخول'},{key:'referralEndDate',label:'انتهاء التحويلة'},{key:'dischargeDate',label:'تاريخ الخروج'},
  {key:'stayDays',label:'مدة مكوث'},{key:'notes',label:'ملاحظات'},{key:'gender',label:'الجنس'},{key:'age',label:'العمر'},
  {key:'ward',label:'القسم'},{key:'coverage',label:'جهة التغطية'},{key:'diagnosis',label:'التشخيص'},{key:'medicalSerial',label:'رقم الملف'},
];
const DEFAULT_RENEWAL_FIELDS:RenewalFieldKey[]=['seq','name','fatherName','grandName','familyName','patientContributionPct','nationalId','referralNo','admissionDate','referralEndDate','dischargeDate','stayDays','notes'];
const REFERRAL_COLOR_STORAGE='wafaa_rehab_referral_column_color_v1';
const REFERRAL_COLOR_PRESETS=['#fff200','#ffd966','#c6efce','#b7dee8','#f4cccc','#d9d2e9'];
const safeReferralColor=(value:string)=>/^#[0-9a-fA-F]{6}$/.test(value)?value:'#fff200';
const referralTextColor=(hex:string)=>{
  const value=safeReferralColor(hex).replace('#','');
  const r=parseInt(value.slice(0,2),16); const g=parseInt(value.slice(2,4),16); const b=parseInt(value.slice(4,6),16);
  const brightness=(r*299+g*587+b*114)/1000;
  return brightness<135?'#ffffff':'#000000';
};


function loadNeeds(){
  try{const custom=JSON.parse(localStorage.getItem(NEEDS_STORAGE)||'[]');return Array.from(new Set([...DEFAULT_NEEDS,...(Array.isArray(custom)?custom:[])])) as string[]}
  catch{return DEFAULT_NEEDS}
}
function ageFromDob(dob:string){const birth=new Date(`${dob}T12:00:00`);const now=new Date();let age=now.getFullYear()-birth.getFullYear();if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;return Math.max(0,age)}

function patientFieldValue(key:InpatientReportFieldKey,patient:Patient,admission:Admission,coverage:string){
  const values:Record<InpatientReportFieldKey,string>={
    name:patient.fullName,age:`${ageFromDob(patient.dob)} سنة`,gender:patient.gender==='male'?'ذكر':'أنثى',nationalId:patient.idNumber,
    dob:patient.dob,medicalSerial:patient.medicalSerial,address:admission.address||`${patient.city||''}${patient.area?` - ${patient.area}`:''}`||'—',
    coverage,ward:admission.ward,admissionDate:admission.admissionDate,diagnosis:admission.diagnosis,referralHospital:admission.referralHospital||'—',
    maritalStatus:admission.maritalStatus||'—',phone:patient.phone||'—',city:[patient.city,patient.area].filter(Boolean).join(' - ')||'—',
  };
  return values[key]||'—';
}

export function ReportExportModal({title,date,patient,admission,coverage,sections,signature,secondarySignature,attachments,onClose}:{
  title:string;date:string;patient:Patient;admission:Admission;coverage:string;
  sections:InpatientPrintableReport['sections'];signature?:string;secondarySignature?:string;attachments?:InpatientPrintableReport['attachments'];onClose:()=>void;
}){
  const {toast}=useUi(); const {user}=useAuth();
  const [fields,setFields]=useState<InpatientReportFieldKey[]>(DEFAULT_FIELDS);
  const [format,setFormat]=useState<'pdf'|'excel'|'word'>('pdf'); const [working,setWorking]=useState(false);
  const [accentColor,setAccentColor]=useState('#0891b2');
  const [textColor,setTextColor]=useState('#111827');
  const [fontFamily,setFontFamily]=useState('Tahoma');
  const [titleFontSize,setTitleFontSize]=useState(24);
  const [bodyFontSize,setBodyFontSize]=useState(18);
  const [fontWeight,setFontWeight]=useState<'normal'|'bold'|'heavy'>('bold');
  const [layoutStyle,setLayoutStyle]=useState<'classic'|'modern'|'minimal'>('classic');
  const canExport=user?.permissions.some(permission=>['reports.export','reports.print','inpatient_rehab.export','inpatient_rehab.print','inpatient_social.export','inpatient_social.print'].includes(permission))??false;
  const toggle=(key:InpatientReportFieldKey)=>setFields(current=>current.includes(key)?current.filter(x=>x!==key):[...current,key]);
  const printableFields:PrintableField[]=FIELD_OPTIONS.filter(item=>fields.includes(item.key)).map(item=>({label:item.label,value:patientFieldValue(item.key,patient,admission,coverage)}));
  const report:InpatientPrintableReport={title,date,patientFields:printableFields,sections,signature,secondarySignature,attachments,style:{accentColor,textColor,fontFamily,titleFontSize,bodyFontSize,fontWeight,layoutStyle},filename:`wafaa-rehab-${title==='لمن يهمه الأمر'?'letter':title.includes('احتياجات')?'needs':title.includes('متابعة')?'followup':title.includes('دخول')?'admission-permit':'report'}-${patient.idNumber}-${date}`};
  const generate=async()=>{
    if(!canExport){toast('لا توجد صلاحية لتصدير التقارير','warn');return} if(!fields.length){toast('اختر معلومة واحدة على الأقل لتظهر في التقرير','warn');return}
    const selectedFormat=format; const printableReport=report;
    setWorking(true);
    try{
      if(selectedFormat==='pdf')await downloadInpatientPdf(printableReport);
      else if(selectedFormat==='excel')await downloadInpatientExcel(printableReport);
      else await downloadInpatientWord(printableReport);
      toast(`تم إنشاء التقرير بصيغة ${selectedFormat==='pdf'?'PDF':selectedFormat==='excel'?'Excel':'Word'}`);
    }catch{toast('تعذر إنشاء الملف، حاول مرة أخرى','warn')}
    finally{setWorking(false)}
  };
  return <Modal title={<><Download/>إعداد وتصدير التقرير</>} onClose={onClose} className="rehab-export-modal">
    <div className="rehab-export-intro"><Sparkles/><div><b>تحكم كامل بمحتوى التقرير</b><span>حدد بيانات المريض التي تريد ظهورها، ثم اختر صيغة الملف.{attachments?.length?' سيتم إدراج الصورة المرفقة داخل التقرير.':''}</span></div></div>
    <div className="rehab-export-layout">
      <section><h4>البيانات التي ستظهر</h4><div className="rehab-field-checks">{FIELD_OPTIONS.map(item=><label key={item.key} className={fields.includes(item.key)?'selected':''}><input type="checkbox" checked={fields.includes(item.key)} onChange={()=>toggle(item.key)}/><span>{item.label}</span><Check/></label>)}</div></section>
      <section><h4>صيغة التقرير</h4><div className="rehab-format-grid">
        <button type="button" className={format==='pdf'?'active':''} onClick={()=>setFormat('pdf')}><FileText/><b>PDF</b><span>جاهز للطباعة والأرشفة</span></button>
        <button type="button" className={format==='excel'?'active':''} onClick={()=>setFormat('excel')}><FileSpreadsheet/><b>Excel</b><span>بيانات منظمة وقابلة للفرز</span></button>
        <button type="button" className={format==='word'?'active':''} onClick={()=>setFormat('word')}><FileType2/><b>Word</b><span>DOCX مطابق للقالب</span></button>
      </div>
      <div className="rehab-report-style-box"><h4>تنسيق التقرير</h4>
        <div className="rehab-style-grid">
          <label><span>لون العنوان والخط</span><input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)}/></label>
          <label><span>لون النص</span><input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label>
          <label><span>نوع الخط</span><select value={fontFamily} onChange={e=>setFontFamily(e.target.value)}><option value="Tahoma">Tahoma</option><option value="Arial">Arial</option><option value="Times New Roman">Times New Roman</option><option value="Segoe UI">Segoe UI</option><option value="Courier New">Courier New</option></select></label>
          <label><span>ستايل القالب</span><select value={layoutStyle} onChange={e=>setLayoutStyle(e.target.value as 'classic'|'modern'|'minimal')}><option value="classic">رسمي كلاسيكي</option><option value="modern">حديث بخط واضح</option><option value="minimal">بسيط أبيض</option></select></label>
          <label><span>حجم العنوان {titleFontSize}px</span><input type="range" min="18" max="36" value={titleFontSize} onChange={e=>setTitleFontSize(Number(e.target.value))}/></label>
          <label><span>حجم النص {bodyFontSize}px</span><input type="range" min="12" max="26" value={bodyFontSize} onChange={e=>setBodyFontSize(Number(e.target.value))}/></label>
          <label><span>سماكة الخط</span><select value={fontWeight} onChange={e=>setFontWeight(e.target.value as 'normal'|'bold'|'heavy')}><option value="normal">عادي</option><option value="bold">عريض</option><option value="heavy">ثقيل</option></select></label>
        </div>
      </div></section>
    </div>
    <div className="rehab-letterhead-preview" style={{color:textColor,fontFamily}}><img src="/wafaa-hospital-logo.png"/><div><span>معاينة الترويسة</span><b style={{fontSize:titleFontSize>28?14:12}}>{title}</b><small>{date} · {layoutStyle==='classic'?'قالب رسمي':layoutStyle==='modern'?'قالب حديث':'قالب بسيط'}</small></div><i style={{background:accentColor}}/></div>
    <FormActions><Button className="btn-primary" type="button" onClick={generate} disabled={working||!canExport}><Download/>{working?'جارٍ إنشاء الملف...':'إنشاء الملف الآن'}</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
  </Modal>;
}

function AdmissionPicker({value,onChange}:{value:string;onChange:(id:string)=>void}){
  const {admissions,patients}=useHospital(); const [q,setQ]=useState('');
  const options=admissions.filter(a=>{const p=patients.find(x=>x.id===a.patientId);return !q||`${p?.fullName||''} ${p?.idNumber||''} ${p?.medicalSerial||''}`.toLowerCase().includes(q.toLowerCase())});
  return <div className="rehab-case-picker glass">
    <div><UsersRound/><span><b>الحالة الحالية</b><small>اختر حالة مبيت لفتح ملف التأهيل الطبي الخاص بها</small></span></div>
    <label><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم أو الهوية..."/></label>
    <select value={value} onChange={e=>onChange(e.target.value)}>{options.map(a=>{const p=patients.find(x=>x.id===a.patientId);return <option key={a.id} value={a.id}>{p?.fullName||'مريض'} — {p?.idNumber||'—'} — {a.status==='admitted'?'مقيم':'مخرج'}</option>})}</select>
  </div>
}

function ReportHistory({admission}:{admission:Admission}){
  const reports=(admission.reports||[]).filter(r=>r.type.startsWith('rehab_')).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const [opened,setOpened]=useState<InpatientReport|null>(null);
  return <><Panel className="rehab-history-panel"><div className="panel-head"><h3><History/>سجل تقارير التأهيل</h3><Badge color="violet">{reports.length}</Badge></div>{reports.length?<div className="rehab-history-list">{reports.map(r=><button type="button" key={r.id} className="rehab-history-item" onClick={()=>setOpened(r)}><span className={`rehab-report-dot ${r.type}`}/><div><b>{r.title}</b><p>{r.summary}</p><small>{r.date} · {r.author}</small></div><em>فتح الملف</em></button>)}</div>:<EmptyState title="لا توجد تقارير محفوظة" sub="عند حفظ تقرير لمن يهمه الأمر أو الاحتياجات أو المتابعة سيظهر هنا."/>}</Panel>{opened&&<Modal title={<><ClipboardList/>{opened.title}</>} onClose={()=>setOpened(null)} className="rehab-saved-report-modal"><div className="rehab-saved-head"><div><b>{opened.title}</b><span>{opened.date} · {opened.author}</span></div><Badge color="emerald">محفوظ</Badge></div>{opened.type==='rehab_needs'?<><h4 className="rehab-saved-needs-title">الاحتياجات المحددة للمريض</h4><div className="rehab-saved-needs">{(opened.needs||[]).map(item=><span key={item}><Check/>{item}</span>)}</div>{opened.metadata&&<div className="rehab-saved-meta"><span><small>الحالة الوظيفية</small><b>{opened.metadata.functional||'—'}</b></span><span><small>أمراض أخرى</small><b>{opened.metadata.otherDiseases||'—'}</b></span><span><small>الطبيب</small><b>{opened.metadata.doctor||'—'}</b></span><span><small>العلاج الطبيعي</small><b>{opened.metadata.pt||'—'}</b></span></div>}</>:<div className="rehab-saved-content">{opened.content||opened.summary}</div>}{opened.note&&<div className="rehab-saved-note"><b>ملاحظة</b><p>{opened.note}</p></div>}<FormActions><Button className="btn-primary" onClick={()=>setOpened(null)}><Check/>إغلاق</Button></FormActions></Modal>}</>
}

function ConcernReport({admission,patient,coverage}:{admission:Admission;patient:Patient;coverage:string}){
  const {addInpatientReport}=useHospital(); const {user}=useAuth(); const {toast}=useUi();
  const [date,setDate]=useState(today()); const [director,setDirector]=useState('المدير الطبي');
  const [body,setBody]=useState(`المريض المذكور أعلاه يعاني من ${admission.diagnosis}.\nالمريض بحاجة إلى متابعة وتأهيل طبي حسب الخطة العلاجية المعتمدة وحالته الوظيفية.`);
  const [note,setNote]=useState('أُعطي هذا التقرير بناءً على طلب الأهل.'); const [exporting,setExporting]=useState(false);
  const sections:InpatientPrintableReport['sections']=[{body},{body:note}];
  const save=()=>{if(!body.trim()){toast('اكتب نص التقرير أولاً','warn');return}addInpatientReport(admission.id,{date,type:'rehab_letter',title:'لمن يهمه الأمر',summary:body.trim().slice(0,160),content:body.trim(),note:note.trim(),author:user?.displayName||'مستخدم النظام',metadata:{director}});toast('تم حفظ تقرير لمن يهمه الأمر في ملف التأهيل')};
  return <div className="rehab-editor-grid">
    <Panel className="rehab-editor-panel"><div className="panel-head"><h3><FileText/>لمن يهمه الأمر</h3><Badge color="cyan">تقرير طبي</Badge></div>
      <div className="form-grid rehab-form-grid"><Field label="تاريخ التقرير"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="جهة الاعتماد / المدير الطبي"><input value={director} onChange={e=>setDirector(e.target.value)} placeholder="اسم المدير الطبي"/></Field></div>
      <Field label="نص التقرير"><textarea className="rehab-report-text" value={body} onChange={e=>setBody(e.target.value)} placeholder="اكتب النص الطبي للتقرير..."/></Field>
      <Field label="الملاحظة الختامية"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="مثال: أعطي هذا التقرير بناءً على طلب الأهل"/></Field>
      <div className="rehab-smart-note"><HeartPulse/><span>تم تجهيز النص الابتدائي من تشخيص حالة المبيت، ويمكنك تعديله بالكامل قبل الحفظ أو التصدير.</span></div>
      <FormActions><Button className="btn-primary" type="button" onClick={()=>setExporting(true)}><Download/>إنشاء التقرير</Button><Button className="btn-ghost" type="button" onClick={save}><Check/>حفظ في ملف التأهيل</Button></FormActions>
    </Panel>
    <ReportHistory admission={admission}/>
    {exporting&&<ReportExportModal title="لمن يهمه الأمر" date={date} patient={patient} admission={admission} coverage={coverage} sections={sections} signature={director} onClose={()=>setExporting(false)}/>} 
  </div>;
}

function NeedsReport({admission,patient,coverage}:{admission:Admission;patient:Patient;coverage:string}){
  const {addInpatientReport}=useHospital(); const {user}=useAuth(); const {toast}=useUi();
  const latest=(admission.reports||[]).filter(r=>r.type==='rehab_needs').slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
  const latestNeedBases=safeParseNeedsBases(latest?.metadata?.needsBases,latest?.needs||[]);
  const [date,setDate]=useState(latest?.date||today()); const [needs,setNeeds]=useState<string[]>(loadNeeds); const [selected,setSelected]=useState<string[]>(latestNeedBases); const [custom,setCustom]=useState('');
  const [needBranches,setNeedBranches]=useState<Record<string,string>>(safeParseNeedBranches(latest?.metadata?.needsBranches));
  const [otherDiseases,setOtherDiseases]=useState(latest?.metadata?.otherDiseases||''); const [functional,setFunctional]=useState(latest?.metadata?.functional||''); const [note,setNote]=useState(latest?.note||'');
  const [doctor,setDoctor]=useState(latest?.metadata?.doctor||''); const [pt,setPt]=useState(latest?.metadata?.pt||''); const [ot,setOt]=useState(latest?.metadata?.ot||''); const [director,setDirector]=useState(latest?.metadata?.director||'المدير الطبي'); const [exporting,setExporting]=useState(false);
  const selectedDisplay=selected.map(item=>formatNeedDisplay(item,needBranches[item]));
  const toggle=(item:string)=>setSelected(current=>{
    if(current.includes(item)){
      setNeedBranches(branches=>{const next={...branches};delete next[item];return next});
      return current.filter(x=>x!==item);
    }
    return [...current,item];
  });
  const addNeed=()=>{const name=custom.trim();if(!name)return;const next=Array.from(new Set([...needs,name]));setNeeds(next);setSelected(current=>Array.from(new Set([...current,name])));localStorage.setItem(NEEDS_STORAGE,JSON.stringify(next.filter(x=>!DEFAULT_NEEDS.includes(x))));setCustom('');toast(`تمت إضافة الاحتياج: ${name}`)};
  const setBranch=(need:string,value:string)=>setNeedBranches(current=>value?{...current,[need]:value}:{...current,[need]:''});
  const branchedSelected=selected.filter(item=>needBranchOptions(item).length>0);
  const sections:InpatientPrintableReport['sections']=[
    {heading:'التشخيص',body:admission.diagnosis},{heading:'أمراض أخرى',body:otherDiseases||'—'},{heading:'الحالة الوظيفية',body:functional||'—'},
    {heading:'الاحتياجات',items:selectedDisplay},{heading:'ملاحظة',body:note||'—'},
  ];
  const save=()=>{if(!selected.length){toast('اختر احتياجاً واحداً على الأقل','warn');return}addInpatientReport(admission.id,{date,type:'rehab_needs',title:'تقرير احتياجات',summary:`${selectedDisplay.length} احتياج: ${selectedDisplay.slice(0,3).join('، ')}`,needs:selectedDisplay,author:user?.displayName||'مستخدم النظام',note,metadata:{otherDiseases,functional,doctor,pt,ot,director,needsBases:JSON.stringify(selected),needsBranches:JSON.stringify(needBranches)}});toast('تم حفظ تقرير الاحتياجات')};
  return <div className="rehab-editor-grid">
    <Panel className="rehab-editor-panel needs"><div className="panel-head"><h3><ListChecks/>تقرير الاحتياجات</h3><Badge color="emerald">{selected.length} محدد</Badge></div>
      <div className="form-grid rehab-form-grid"><Field label="تاريخ التقرير"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="الحالة الوظيفية"><input value={functional} onChange={e=>setFunctional(e.target.value)} placeholder="مثال: معتمد كلياً على الآخرين"/></Field><Field label="أمراض أخرى" span={2}><input value={otherDiseases} onChange={e=>setOtherDiseases(e.target.value)} placeholder="الأمراض المصاحبة إن وجدت"/></Field></div>
      <div className="rehab-needs-head"><div><b>الاحتياج المطلوب</b><span>القائمة مبنية على نموذج النظام القديم، ويمكن إضافة أي احتياج جديد.</span></div><label><input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addNeed()}}} placeholder="إضافة احتياج جديد..."/><button type="button" onClick={addNeed}><Plus/>إضافة</button></label></div>
      <div className="rehab-needs-grid">{needs.map(item=><label key={item} className={selected.includes(item)?'selected':''}><input type="checkbox" checked={selected.includes(item)} onChange={()=>toggle(item)}/><span>{item}</span><Check/></label>)}</div>
      <div className="selected-needs-live-panel"><div><b>الاحتياجات المختارة الآن</b><span>تتحدث هذه الشاشة تلقائياً بمجرد اختيار أو إزالة أي احتياج.</span></div>{selectedDisplay.length?<ul>{selectedDisplay.map((item,index)=><li key={`${item}-${index}`}><em>{index+1}</em><span>{item}</span></li>)}</ul>:<p>لم يتم اختيار أي احتياج بعد.</p>}</div>
      {branchedSelected.length>0&&<div className="needs-branches-panel"><h4>تحديد الفروع / المقاسات المطلوبة</h4><div className="needs-branches-grid">{branchedSelected.map(item=><label key={item}><span>{item}</span><select value={needBranches[item]||''} onChange={e=>setBranch(item,e.target.value)}><option value="">اختر النوع أو المقاس...</option>{needBranchOptions(item).map(option=><option key={option} value={option}>{option}</option>)}</select></label>)}</div></div>}
      <div className="form-grid rehab-team-grid"><Field label="الطبيب / الحكيم"><input value={doctor} onChange={e=>setDoctor(e.target.value)} placeholder="اسم الطبيب"/></Field><Field label="أخصائي العلاج الطبيعي"><input value={pt} onChange={e=>setPt(e.target.value)} placeholder="الاسم"/></Field><Field label="أخصائي العلاج الوظيفي"><input value={ot} onChange={e=>setOt(e.target.value)} placeholder="الاسم"/></Field><Field label="المدير الطبي"><input value={director} onChange={e=>setDirector(e.target.value)} placeholder="اسم المدير الطبي"/></Field></div>
      <Field label="ملاحظة"><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="أي ملاحظات مرتبطة بالاحتياجات أو التوصيات..."/></Field>
      <FormActions><Button className="btn-primary" type="button" onClick={()=>{if(!selected.length){toast('اختر احتياجاً واحداً على الأقل','warn');return}setExporting(true)}}><Download/>إنشاء التقرير</Button><Button className="btn-ghost" type="button" onClick={save}><Check/>حفظ في ملف التأهيل</Button></FormActions>
    </Panel>
    <ReportHistory admission={admission}/>
    {exporting&&<ReportExportModal title="تقرير احتياجات" date={date} patient={patient} admission={admission} coverage={coverage} sections={sections} signature={director} secondarySignature={[doctor,pt,ot].filter(Boolean).join(' · ')} onClose={()=>setExporting(false)}/>} 
  </div>;
}


const slashDate=(value?:string|number)=>{const text=String(value||'').slice(0,10);if(!text)return '—';const parts=text.split('-');return parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:text.replace(/-/g,'/')};
const isoDate=(value?:string)=>String(value||'').slice(0,10);
const stayDays=(from:string,to?:string)=>Math.max(1,Math.floor((new Date(`${to||today()}T12:00:00`).getTime()-new Date(`${from}T12:00:00`).getTime())/86400000)+1);
const personParts=(fullName:string)=>{const parts=fullName.trim().split(/\s+/).filter(Boolean);return {name:parts[0]||'—',fatherName:parts[1]||'—',grandName:parts[2]||'—',familyName:parts.slice(3).join(' ')||parts[3]||'—'}};
const latestCoverageEnd=(admission:Admission)=>[...(admission.coverageMovements||[])].filter(m=>m.coverageEnd).sort((a,b)=>String(b.coverageEnd).localeCompare(String(a.coverageEnd)))[0]?.coverageEnd;
const renewalEndDate=(admission:Admission)=>admission.rehabReferralEndDate||latestCoverageEnd(admission)||admission.expectedDischargeDate||'';
const renewalNotes=(admission:Admission)=>admission.rehabRenewalNotes || (admission.status==='discharged'?'خروج':'متابعة');

function RenewalExportModal({report,onClose}:{report:InpatientFinancialReport;onClose:()=>void}){
  const {toast}=useUi(); const {user}=useAuth(); const [format,setFormat]=useState<'pdf'|'excel'|'word'>('pdf'); const [working,setWorking]=useState(false);
  const canExport=user?.permissions.some(permission=>['reports.export','reports.print','inpatient_rehab.export','inpatient_rehab.print'].includes(permission))??false;
  const run=async()=>{if(!canExport){toast('لا توجد صلاحية لتصدير التقارير','warn');return}const chosen=format;setWorking(true);try{if(chosen==='pdf')await downloadFinancialPdf(report);else if(chosen==='excel')await downloadFinancialExcel(report);else await downloadFinancialWord(report);toast(`تم إنشاء كشف التجديدات بصيغة ${chosen==='pdf'?'PDF':chosen==='excel'?'Excel':'Word'}`)}catch{toast('تعذر إنشاء التقرير، حاول مرة أخرى','warn')}finally{setWorking(false)}};
  return <Modal title={<><Download/>تصدير كشف التجديدات</>} onClose={onClose} className="rehab-export-modal">
    <div className="rehab-export-intro"><Sparkles/><div><b>قالب لجنة التأهيل الرسمي</b><span>التقرير سيخرج بنفس معاينة الجدول: رقم التحويلة باللون المختار، الدخول أزرق، انتهاء التحويلة أخضر، ومدة المكوث أحمر.</span></div></div>
    <section><h4>صيغة التقرير</h4><div className="rehab-format-grid">
      <button type="button" className={format==='pdf'?'active':''} onClick={()=>setFormat('pdf')}><FileText/><b>PDF</b><span>جاهز للطباعة</span></button>
      <button type="button" className={format==='excel'?'active':''} onClick={()=>setFormat('excel')}><FileSpreadsheet/><b>Excel</b><span>جدول قابل للفرز</span></button>
      <button type="button" className={format==='word'?'active':''} onClick={()=>setFormat('word')}><FileType2/><b>Word</b><span>DOCX مطابق للقالب</span></button>
    </div></section>
    <FormActions><Button className="btn-primary" type="button" onClick={run} disabled={working||!canExport}><Download/>{working?'جارٍ إنشاء التقرير...':'إنشاء التقرير'}</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
  </Modal>
}

const RENEWAL_PREVIEW_COL_WEIGHTS:Record<string,number>={seq:4.4,name:8.5,fatherName:7.3,grandName:7.3,familyName:9.2,patientContributionPct:8.4,nationalId:10.6,referralNo:7.7,admissionDate:9.3,referralEndDate:9.5,dischargeDate:9.2,stayDays:7.4,notes:9.5,gender:6.5,age:5.5,ward:6.8,coverage:10.5,diagnosis:13.2,medicalSerial:8.4};
const renewalPreviewWidth=(columns:FinancialReportColumn[],key:string)=>{
  const total=columns.reduce((sum,col)=>sum+(RENEWAL_PREVIEW_COL_WEIGHTS[col.key]||8),0)||1;
  return `${(((RENEWAL_PREVIEW_COL_WEIGHTS[key]||8)/total)*100).toFixed(4)}%`;
};

function RenewalReportPreview({report}:{report:InpatientFinancialReport}){
  const referralColor=safeReferralColor(report.theme?.referralNoColor||'#fff200');
  const referralColorStyle:CSSProperties={'--referral-no-color':referralColor,'--referral-no-text-color':referralTextColor(referralColor)} as CSSProperties;
  const referralCellStyle:CSSProperties={backgroundColor:referralColor,color:referralTextColor(referralColor)};
  const cell=(key:string,value:string|number)=>{
    if(key==='admissionDate')return <span className="date-in">{value}</span>;
    if(key==='referralEndDate')return <span className="date-end">{value}</span>;
    if(key==='stayDays')return <span className="stay-days">{value}</span>;
    if(['seq','nationalId','medicalSerial','patientContributionPct','referralNo','age'].includes(key))return <span className="num">{value}</span>;
    return value;
  };
  return <div className="renewal-preview-stage"><div className="renewal-preview-page" dir="rtl" style={referralColorStyle}>
    <h3><span>{report.title}</span></h3>
    <table>
      <colgroup>{report.columns.map(col=><col key={col.key} style={{width:renewalPreviewWidth(report.columns,col.key)}}/>)}</colgroup>
      <thead><tr>{report.columns.map(col=><th key={col.key} className={col.key==='referralNo'?'referral-no':''} style={col.key==='referralNo'?referralCellStyle:undefined}>{col.label}</th>)}</tr></thead>
      <tbody>{report.rows.length?report.rows.map((row,index)=><tr key={index}>{report.columns.map(col=><td key={col.key} className={col.key==='referralNo'?'referral-no':''} style={col.key==='referralNo'?referralCellStyle:undefined}>{cell(col.key,row[col.key]??'—')}</td>)}</tr>):<tr><td colSpan={Math.max(1,report.columns.length)}>لا توجد حالات مطابقة للمحددات</td></tr>}</tbody>
    </table>
  </div></div>
}

function RenewalDisclosureScreen(){
  const {admissions,patients,sponsors,updateAdmission}=useHospital(); const {toast}=useUi();
  const [query,setQuery]=useState(''); const [gender,setGender]=useState<'all'|'male'|'female'>('all'); const [ward,setWard]=useState<'all'|'male'|'female'>('all'); const [status,setStatus]=useState<'all'|'admitted'|'discharged'>('all');
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [activeToday,setActiveToday]=useState(false); const [year,setYear]=useState(String(new Date().getFullYear()));
  const [fields,setFields]=useState<RenewalFieldKey[]>(DEFAULT_RENEWAL_FIELDS); const [customLabel,setCustomLabel]=useState(''); const [customValue,setCustomValue]=useState(''); const [customFilters,setCustomFilters]=useState<Array<{id:string;label:string;value:string}>>([]); const [referralColumnColor,setReferralColumnColor]=useState(()=>safeReferralColor(localStorage.getItem(REFERRAL_COLOR_STORAGE)||'#fff200')); const [exporting,setExporting]=useState(false);
  useEffect(()=>{localStorage.setItem(REFERRAL_COLOR_STORAGE, referralColumnColor)},[referralColumnColor]);
  const toggleField=(key:RenewalFieldKey)=>setFields(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
  const addCustomFilter=()=>{const label=customLabel.trim();const value=customValue.trim();if(!label||!value){toast('اكتب اسم المحدد وقيمته','warn');return}setCustomFilters(v=>[...v,{id:`custom-${Date.now()}`,label,value}]);setCustomLabel('');setCustomValue('')};
  const setAdmissionMeta=(id:string,patch:Partial<Admission>)=>updateAdmission(id,patch);
  const filtered=useMemo(()=>admissions.filter(admission=>{
    const patient=patients.find(p=>p.id===admission.patientId); if(!patient)return false;
    const haystack=`${patient.fullName} ${patient.idNumber} ${patient.medicalSerial} ${patient.city} ${patient.area} ${admission.diagnosis} ${admission.ward} ${admission.coverageEntity} ${admission.referralHospital||''} ${admission.rehabRenewalNo||''} ${admission.rehabRenewalNotes||''}`.toLowerCase();
    const q=query.trim().toLowerCase(); if(q&&!haystack.includes(q))return false;
    if(gender!=='all'&&patient.gender!==gender)return false; if(ward!=='all'&&admission.wardType!==ward)return false; if(status!=='all'&&admission.status!==status)return false;
    if(from&&admission.admissionDate<from)return false; if(to&&admission.admissionDate>to)return false;
    if(activeToday){const end=isoDate(admission.dischargedAt)||today(); if(!(admission.admissionDate<=today()&&end>=today()))return false;}
    return customFilters.every(item=>haystack.includes(item.value.toLowerCase()));
  }).sort((a,b)=>a.admissionDate.localeCompare(b.admissionDate)),[admissions,patients,query,gender,ward,status,from,to,activeToday,customFilters]);
  const columns:FinancialReportColumn[]=RENEWAL_FIELD_OPTIONS.filter(item=>fields.includes(item.key)).map(item=>({key:item.key,label:item.label}));
  const rows:FinancialReportRow[]=filtered.map((admission,index)=>{const patient=patients.find(p=>p.id===admission.patientId)!;const name=personParts(patient.fullName);const sponsor=sponsors.find(s=>s.id===admission.coverageEntity)?.nameAr||admission.coverageEntity||'—';const end=isoDate(admission.dischargedAt);return {seq:index+1,...name,patientContributionPct:`${admission.contributionPct??0}%`,nationalId:patient.idNumber,referralNo:admission.rehabRenewalNo||'0',admissionDate:slashDate(admission.admissionDate),referralEndDate:slashDate(renewalEndDate(admission)),dischargeDate:end?slashDate(end):'—',stayDays:stayDays(admission.admissionDate,end||today()),notes:renewalNotes(admission),gender:patient.gender==='male'?'ذكر':'أنثى',age:ageFromDob(patient.dob),ward:admission.wardType==='female'?'نساء':'رجال',coverage:sponsor,diagnosis:admission.diagnosis,medicalSerial:patient.medicalSerial}});
  const report:InpatientFinancialReport={title:`كشف حالات لجنة التأهيل لعام ${year||new Date().getFullYear()}`,dateFrom:from?slashDate(from):'—',dateTo:to?slashDate(to):'—',reportDate:slashDate(today()),columns,rows,summary:[{label:'عدد الحالات',value:rows.length}],patientInfo:customFilters.map(item=>({label:`custom:${item.label}`,value:item.value})),filename:`rehab-renewals-${year||new Date().getFullYear()}-${today()}`,template:'rehabRenewalListing',theme:{referralNoColor:referralColumnColor}};
  return <div className="rehab-renewal-layout">
    <Panel className="rehab-renewal-builder"><div className="panel-head"><h3><RefreshCw/>كشف التجديدات للمبيت</h3><Badge color="cyan">{rows.length} حالة</Badge></div>
      <div className="rehab-renewal-note"><Filter/><span>ابحث بالهوية أو الاسم، ثم حدد الأعمدة والفلاتر. رقم التحويلة ونهاية التحويلة والملاحظة قابلة للتعديل من الجدول وتحفظ مباشرة على حالة المبيت.</span></div>
      <div className="form-grid rehab-form-grid"><Field label="بحث بالاسم أو رقم الهوية" span={2}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="مثال: محمد، 407...، رقم الملف"/></Field><Field label="سنة التقرير"><input dir="ltr" value={year} onChange={e=>setYear(e.target.value.replace(/\D/g,'').slice(0,4))}/></Field><Field label="نشط اليوم"><select value={activeToday?'yes':'no'} onChange={e=>setActiveToday(e.target.value==='yes')}><option value="no">كل الحالات</option><option value="yes">الموجودون اليوم فقط</option></select></Field><Field label="من تاريخ دخول"><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field><Field label="إلى تاريخ دخول"><input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></Field><Field label="الجنس"><select value={gender} onChange={e=>setGender(e.target.value as typeof gender)}><option value="all">الجميع</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field><Field label="القسم"><select value={ward} onChange={e=>setWard(e.target.value as typeof ward)}><option value="all">كل الأقسام</option><option value="male">رجال</option><option value="female">نساء</option></select></Field><Field label="الحالة"><select value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="all">الكل</option><option value="admitted">مقيم</option><option value="discharged">خروج</option></select></Field></div>
      <div className="rehab-renewal-custom-filter"><input value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="اسم محدد جديد مثل جهة تغطية"/><input value={customValue} onChange={e=>setCustomValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustomFilter()}}} placeholder="القيمة المطلوب البحث عنها"/><button type="button" onClick={addCustomFilter}><Plus/>إضافة محدد</button></div>
      {customFilters.length>0&&<div className="rehab-renewal-filter-tags">{customFilters.map(item=><button type="button" key={item.id} onClick={()=>setCustomFilters(v=>v.filter(x=>x.id!==item.id))}>{item.label}: {item.value} ×</button>)}</div>}
      <div className="finance-report-section"><div className="finance-report-section-head"><div><b>البيانات التي تظهر في الكشف</b><span>القالب الافتراضي مطابق للصورة، ويمكن إضافة/إخفاء أي عمود حسب الحاجة.</span></div><button type="button" onClick={()=>setFields(fields.length===RENEWAL_FIELD_OPTIONS.length?DEFAULT_RENEWAL_FIELDS:RENEWAL_FIELD_OPTIONS.map(item=>item.key))}>{fields.length===RENEWAL_FIELD_OPTIONS.length?'القالب الافتراضي':'تحديد الكل'}</button></div><div className="finance-check-grid">{RENEWAL_FIELD_OPTIONS.map(item=><label key={item.key} className={fields.includes(item.key)?'selected':''}><input type="checkbox" checked={fields.includes(item.key)} onChange={()=>toggleField(item.key)}/><span>{item.label}</span><Check/></label>)}</div></div>
      <div className="renewal-color-control"><div><b>لون عمود رقم التحويلة في التقرير</b><span>اللون المختار يطبّق على العمود كاملًا في المعاينة والطباعة والتصدير.</span></div><label><input type="color" value={referralColumnColor} onChange={e=>setReferralColumnColor(safeReferralColor(e.target.value))}/><input dir="ltr" value={referralColumnColor} onChange={e=>setReferralColumnColor(safeReferralColor(e.target.value))}/></label><div className="renewal-color-presets">{REFERRAL_COLOR_PRESETS.map(color=><button type="button" key={color} aria-label={color} className={referralColumnColor.toLowerCase()===color.toLowerCase()?'active':''} style={{backgroundColor:color}} onClick={()=>setReferralColumnColor(color)}/>)}</div></div>
      <div className="rehab-renewal-edit-table"><div className="head"><span>المريض</span><span>رقم التحويلة</span><span>انتهاء التحويلة</span><span>ملاحظات</span></div>{filtered.slice(0,40).map(admission=>{const patient=patients.find(p=>p.id===admission.patientId);return <div className="row" key={admission.id}><b>{patient?.fullName||'—'}<small>{patient?.idNumber||'—'}</small></b><input className="referral-no-entry" dir="ltr" style={{backgroundColor:referralColumnColor,color:referralTextColor(referralColumnColor)}} value={admission.rehabRenewalNo||'0'} onChange={e=>setAdmissionMeta(admission.id,{rehabRenewalNo:e.target.value} as Partial<Admission>)}/><input type="date" value={renewalEndDate(admission)} onChange={e=>setAdmissionMeta(admission.id,{rehabReferralEndDate:e.target.value} as Partial<Admission>)}/><input value={renewalNotes(admission)} onChange={e=>setAdmissionMeta(admission.id,{rehabRenewalNotes:e.target.value} as Partial<Admission>)}/></div>})}</div>
      <FormActions><Button className="btn-primary" type="button" onClick={()=>{if(!fields.length){toast('اختر عموداً واحداً على الأقل','warn');return}setExporting(true)}}><Download/>تصدير كشف التجديدات</Button></FormActions>
    </Panel>
    <Panel className="rehab-renewal-preview-panel"><div className="panel-head"><h3><FileSpreadsheet/>معاينة الكشف الرسمي</h3><Badge color="cyan">A4</Badge></div><RenewalReportPreview report={report}/></Panel>
    {exporting&&<RenewalExportModal report={report} onClose={()=>setExporting(false)}/>} 
  </div>
}


function FollowUpScreen(){
  const {admissions,patients,sponsors,addInpatientReport}=useHospital(); const {user}=useAuth(); const {toast}=useUi();
  const [date,setDate]=useState(today()); const [selectedId,setSelectedId]=useState(''); const [note,setNote]=useState(''); const [search,setSearch]=useState(''); const [exporting,setExporting]=useState(false);
  const cases=useMemo(()=>admissions.filter(a=>{
    const discharge=a.dischargedAt?.slice(0,10); const onDate=a.admissionDate<=date&&(!discharge||discharge>=date); const p=patients.find(x=>x.id===a.patientId);
    return onDate&&(!search||`${p?.fullName||''} ${p?.idNumber||''} ${a.diagnosis}`.toLowerCase().includes(search.toLowerCase()));
  }).sort((a,b)=>b.admissionDate.localeCompare(a.admissionDate)),[admissions,patients,date,search]);
  useEffect(()=>{if(selectedId&&!cases.some(a=>a.id===selectedId))setSelectedId('')},[cases,selectedId]);
  const selected=admissions.find(a=>a.id===selectedId); const patient=selected?patients.find(p=>p.id===selected.patientId):undefined;
  const dayFollowups=selected?(selected.reports||[]).filter(r=>r.type==='rehab_followup'&&r.date===date):[];
  const coverage=selected?(sponsors.find(s=>s.id===selected.coverageEntity)?.nameAr||selected.coverageEntity||'—'):'—';
  const save=(e:FormEvent)=>{e.preventDefault();if(!selected||!note.trim()){toast('اختر حالة واكتب تفاصيل المتابعة','warn');return}addInpatientReport(selected.id,{date,type:'rehab_followup',title:'متابعة حالة تأهيل',summary:note.trim(),content:note.trim(),author:user?.displayName||'مستخدم النظام'});toast('تم حفظ متابعة التأهيل');setNote('')};
  return <div className="rehab-followup-layout">
    <Panel className="rehab-followup-cases"><div className="panel-head"><h3><CalendarDays/>الحالات حسب التاريخ</h3><Badge color="cyan">{cases.length}</Badge></div>
      <div className="rehab-date-toolbar"><label><CalendarDays/><input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/></label><Button className="btn-ghost btn-sm" type="button" onClick={()=>setDate(today())}><Clock3/>اليوم</Button><label className="rehab-follow-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..."/></label></div>
      {cases.length?<div className="rehab-follow-case-list">{cases.map(a=>{const p=patients.find(x=>x.id===a.patientId);const followups=(a.reports||[]).filter(r=>r.type==='rehab_followup'&&r.date===date).length;return <button type="button" key={a.id} className={selectedId===a.id?'active':''} onClick={()=>setSelectedId(a.id)}><div className="patient-avatar">{p?.fullName?.charAt(0)||'?'}</div><span><b>{p?.fullName||'—'}</b><small>{p?.idNumber||'—'} · {a.ward}</small><em>{a.diagnosis}</em></span>{followups>0&&<Badge color="emerald">{followups} متابعة</Badge>}</button>})}</div>:<EmptyState title="لا توجد حالات في هذا التاريخ" sub="اختر تاريخاً آخر للوصول إلى الحالات التي كانت موجودة في ذلك اليوم."/>}
    </Panel>
    <Panel className="rehab-followup-editor"><div className="panel-head"><h3><Activity/>تسجيل متابعة</h3>{patient&&<Badge color="violet">{patient.medicalSerial}</Badge>}</div>
      {selected&&patient?<form onSubmit={save}><div className="rehab-selected-case"><UserCheck/><div><b>{patient.fullName}</b><span>{date} · {selected.ward}</span><small>{selected.diagnosis}</small></div></div><Field label="تفاصيل متابعة التأهيل"><textarea className="rehab-follow-text" value={note} onChange={e=>setNote(e.target.value)} placeholder="اكتب التطورات، الملاحظات، خطة المتابعة أو التوصيات لهذا اليوم..."/></Field><FormActions><Button className="btn-primary" type="submit"><Check/>حفظ المتابعة</Button><Button className="btn-ghost" type="button" onClick={()=>{if(!dayFollowups.length&&!note.trim()){toast('لا توجد متابعة لتصديرها في هذا التاريخ','warn');return}setExporting(true)}}><Download/>إنشاء تقرير متابعة</Button></FormActions><div className="rehab-day-followups">{dayFollowups.slice().reverse().map(r=><article key={r.id}><b>{r.author}</b><p>{r.summary}</p><small>{r.date}</small></article>)}</div>{exporting&&<ReportExportModal title="تقرير متابعة التأهيل" date={date} patient={patient} admission={selected} coverage={coverage} sections={[{heading:'التشخيص',body:selected.diagnosis},{heading:'متابعة الحالة',body:[...dayFollowups.map(r=>r.summary),...(note.trim()?[note.trim()]:[])].join('\n\n')}]} signature={user?.displayName||'فريق التأهيل'} onClose={()=>setExporting(false)}/>}</form>:<EmptyState title="اختر حالة من القائمة" sub="ستظهر هنا شاشة المتابعة الخاصة بالمريض والتاريخ المحدد."/>}
    </Panel>
  </div>;
}

export function InpatientRehabFile(){
  const {admissions,patients,sponsors}=useHospital();
  const [section,setSection]=useState<'concern'|'needs'|'followup'|'renewals'>('concern');
  const [admissionId,setAdmissionId]=useState(admissions[0]?.id||'');
  const admission=admissions.find(a=>a.id===admissionId)||admissions[0]; const patient=admission?patients.find(p=>p.id===admission.patientId):undefined;
  const coverage=admission?(sponsors.find(s=>s.id===admission.coverageEntity)?.nameAr||admission.coverageEntity||'—'):'—';
  if(!admission||!patient)return <Panel><EmptyState title="لا يوجد ملف مبيت لفتح التأهيل" sub="سجّل حالة مبيت أولاً، وبعدها سيظهر ملف التأهيل الطبي الخاص بها هنا."/></Panel>;
  return <div className="rehab-file-shell">
    <section className="rehab-hero glass-strong"><div><span><Sparkles/>ملف التأهيل الطبي</span><h2>التقارير والمتابعة<br/><em>في ملف واحد منظم.</em></h2><p>واجهة مستقلة داخل المبيت لإدارة التقارير الطبية، الاحتياجات، والمتابعات اليومية مع ترويسة رسمية وتصدير PDF / Excel / Word.</p></div><div className="rehab-hero-mark"><HeartPulse/><b>{admissions.length}</b><span>ملف مبيت متاح</span></div></section>
    <AdmissionPicker value={admission.id} onChange={setAdmissionId}/>
    <div className="rehab-section-tabs">
      <button className={section==='concern'?'active':''} onClick={()=>setSection('concern')}><FileText/><span><b>لمن يهمه الأمر</b><small>تقرير طبي رسمي</small></span></button>
      <button className={section==='needs'?'active':''} onClick={()=>setSection('needs')}><ClipboardList/><span><b>تقارير الاحتياجات</b><small>احتياجات وتأهيل</small></span></button>
      <button className={section==='followup'?'active':''} onClick={()=>setSection('followup')}><Activity/><span><b>متابعة حالات التأهيل</b><small>الوصول حسب التاريخ</small></span></button>
      <button className={section==='renewals'?'active':''} onClick={()=>setSection('renewals')}><RefreshCw/><span><b>كشف التجديدات</b><small>لجنة التأهيل والمبيت</small></span></button>
    </div>
    {section==='concern'&&<ConcernReport key={`concern-${admission.id}`} admission={admission} patient={patient} coverage={coverage}/>} 
    {section==='needs'&&<NeedsReport key={`needs-${admission.id}`} admission={admission} patient={patient} coverage={coverage}/>} 
    {section==='followup'&&<FollowUpScreen/>}
    {section==='renewals'&&<RenewalDisclosureScreen/>}
  </div>;
}
