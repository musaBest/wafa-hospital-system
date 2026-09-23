import { useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, CalendarClock, Database, Eye, FileText, Filter, RefreshCw, Search, Trash2, UserRound } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, PageHeader, Panel } from '../components/ui';
import { engineerService } from '../services/engineer.service';
import type { DeletedItemRecord } from '../types';
import { useUi } from '../context/UiContext';

const typeLabel=(type:string)=>({patient:'ملف مريض',doctor:'طبيب',clinic:'قسم / عيادة',diagnostic_service:'خدمة تشخيص',sponsor:'جهة تغطية',user:'مستخدم',invoice:'فاتورة',visit:'زيارة',admission:'حالة مبيت',admission_request:'طلب مبيت',lab_order:'طلب مختبر',radiology_order:'طلب أشعة',queue_item:'طابور وفرز',outpatient_pt_case:'حالة علاج طبيعي خارجي',outpatient_pt_session:'جلسة علاج طبيعي',outpatient_pt_waitlist:'قائمة انتظار علاج طبيعي'} as Record<string,string>)[type] || type;
const arDateTime=(value?:string)=>value?new Date(value).toLocaleString('ar-EG',{hour12:true,hour:'numeric',minute:'2-digit',second:'2-digit',year:'numeric',month:'2-digit',day:'2-digit'}):'—';
const pretty=(value:unknown): string => {
  if(value===null||value===undefined||value==='') return '—';
  if(Array.isArray(value)) return value.length ? value.map(v=>typeof v==='object'?pretty(v):String(v)).join('، ') : '—';
  if(typeof value==='object'){
    const obj=value as Record<string,unknown>;
    const parts=Object.entries(obj).filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>`${k}: ${typeof v==='object'?pretty(v):String(v)}`);
    return parts.length?parts.join(' | '):'—';
  }
  return String(value);
};
const importantPayload=(item:DeletedItemRecord)=>{
  const payload=item.payload||{};
  const keys=['medical_serial','staff_id','username','receipt_number','name_ar','name_en','service','exam','category','ptNumber','sessionNumber','fullName','full_name','id_number','requestedDate','queueNumber','diagnosis','status','patientGroup','phone','city','area'];
  return keys.map(key=>[key,payload[key]] as const).filter(([,value])=>value!==undefined&&value!==null&&value!=='');
};

type TrashFilter='all'|'patient'|'doctor'|'clinic'|'diagnostic_service'|'sponsor'|'user'|'admission'|'invoice'|'visit'|'pt_all'|'outpatient_pt_case'|'outpatient_pt_session'|'outpatient_pt_waitlist';

export function TrashBinPage(){
  const { toast } = useUi();
  const [type,setType]=useState<TrashFilter>('all');
  const [search,setSearch]=useState('');
  const [allItems,setAllItems]=useState<DeletedItemRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [details,setDetails]=useState<DeletedItemRecord|null>(null);
  const load=async()=>{setLoading(true);try{setAllItems(await engineerService.trash({type:'all',search:''}))}catch(error){toast(error instanceof Error?error.message:'تعذر تحميل سلة المحذوفات','warn')}finally{setLoading(false)}};
  useEffect(()=>{void load()},[]);
  const items=useMemo(()=>{const q=search.trim().toLowerCase();return allItems.filter(item=>((type==='all')||(type==='pt_all'&&(item.entityType==='outpatient_pt_case'||item.entityType==='outpatient_pt_session'))||(type==='doctor'&&['doctor','user'].includes(item.entityType))||(type==='clinic'&&['clinic','sponsor','diagnostic_service'].includes(item.entityType))||(type==='admission'&&['admission','admission_request'].includes(item.entityType))||(type==='invoice'&&['invoice','visit'].includes(item.entityType))||item.entityType===type)&&(!q||`${item.entityLabel||''} ${item.entityId||''} ${item.deletedBy||''} ${pretty(item.payload)} ${pretty(item.metadata)}`.toLowerCase().includes(q)));},[allItems,type,search]);
  const counts=useMemo(()=>({
    all:allItems.length,
    patients:allItems.filter(i=>i.entityType==='patient').length,
    staff:allItems.filter(i=>['doctor','user'].includes(i.entityType)).length,
    admin:allItems.filter(i=>['clinic','sponsor','diagnostic_service'].includes(i.entityType)).length,
    inpatient:allItems.filter(i=>['admission','admission_request'].includes(i.entityType)).length,
    finance:allItems.filter(i=>['invoice','visit'].includes(i.entityType)).length,
    pt:allItems.filter(i=>i.entityType==='outpatient_pt_case'||i.entityType==='outpatient_pt_session').length,
    wait:allItems.filter(i=>i.entityType==='outpatient_pt_waitlist').length,
  }),[allItems]);
  const restore=async(item:DeletedItemRecord)=>{
    if(!confirm(`انت على وشك استعادة هذا العنصر وإرجاعه إلى مكانه السابق: ${item.entityLabel || typeLabel(item.entityType)}. هل أنت متأكد؟`))return;
    try{await engineerService.restoreTrash(item.id);toast('تمت استعادة العنصر وإرجاعه إلى مكانه السابق');setDetails(null);await load()}catch(error){toast(error instanceof Error?error.message:'تعذر الاستعادة','warn')}
  };
  const card=(label:string,count:number,next:TrashFilter,Icon:any)=><button type="button" className={`engineer-trash-card panel glass ${type===next?'active':''}`} onClick={()=>setType(next)}><span>{label}</span><b>{count}</b><Icon/><small>اضغط للفلترة</small></button>;
  return <div className="engineer-trash-page" dir="rtl">
    <PageHeader crumb="مهندس محمد" title="سلة المحذوفات الخاصة" sub="واجهة مرجعية سرية: الحذف يختفي عن المستخدمين فقط، ويبقى هنا للاستعراض أو الاستعادة إلى مكانه السابق." actions={<Button className="btn-ghost" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?'spin':''}/>تحديث</Button>}/>
    <div className="engineer-summary-grid engineer-trash-summary">
      {card('إجمالي العناصر',counts.all,'all',Trash2)}
      {card('ملفات مرضى',counts.patients,'patient',UserRound)}
      {card('أطباء ومستخدمون',counts.staff,'doctor',UserRound)}
      {card('أقسام وخدمات',counts.admin,'clinic',Database)}
      {card('مبيت',counts.inpatient,'admission',FileText)}
      {card('زيارات وفواتير',counts.finance,'invoice',FileText)}
      {card('علاج طبيعي',counts.pt,'pt_all',FileText)}
      {card('قائمة انتظار',counts.wait,'outpatient_pt_waitlist',CalendarClock)}
    </div>
    <Panel className="engineer-filter-panel"><div className="form-grid"><Field label="نوع العنصر"><select value={type} onChange={e=>setType(e.target.value as TrashFilter)}><option value="all">الكل</option><option value="patient">ملفات المرضى</option><option value="doctor">الأطباء والمستخدمون</option><option value="clinic">الأقسام وجهات التغطية والخدمات</option><option value="admission">المبيت وطلبات المبيت</option><option value="invoice">الزيارات والفواتير</option><option value="pt_all">العلاج الطبيعي كامل</option><option value="outpatient_pt_case">حالات العلاج الطبيعي الخارجي</option><option value="outpatient_pt_session">جلسات العلاج الطبيعي</option><option value="outpatient_pt_waitlist">قائمة الانتظار</option></select></Field><Field label="بحث"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم، رقم ملف، رقم هوية، تشخيص..."/></Field></div><FormActions><Button className="btn-primary" onClick={()=>void load()}><Search/>بحث</Button><Button className="btn-ghost" onClick={()=>{setType('all');setSearch('');setTimeout(()=>void load(),0)}}><Filter/>إظهار الكل</Button></FormActions></Panel>
    <Panel>
      <div className="panel-head"><h3><Trash2/>العناصر المحذوفة</h3><Badge color="amber">{items.length}</Badge></div>
      {items.length?<div className="table-wrap engineer-table engineer-trash-table"><table><thead><tr><th>النوع</th><th>العنصر</th><th>من حذف</th><th>اليوم</th><th>التاريخ والوقت</th><th>أهم التفاصيل</th><th>الإجراء</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><Badge color="coral">{typeLabel(item.entityType)}</Badge></td><td><b>{item.entityLabel||'—'}</b><small dir="ltr">{item.entityId||'—'}</small></td><td>{item.deletedBy}</td><td>{item.day||'—'}</td><td>{arDateTime(item.deletedAt)}</td><td className="engineer-details-cell">{importantPayload(item).length?importantPayload(item).map(([k,v])=><span className="trash-detail-chip" key={k}><em>{k}</em>{pretty(v)}</span>):pretty(item.payload)}</td><td><div className="trash-actions"><Button className="btn-ghost btn-sm" onClick={()=>setDetails(item)}><Eye/>تفاصيل</Button><Button className="btn-primary btn-sm" onClick={()=>void restore(item)}><ArchiveRestore/>استعادة</Button></div></td></tr>)}</tbody></table></div>:<EmptyState title="السلة فارغة" sub="العناصر التي تُحذف من المستخدمين ستظهر هنا كمرجع خاص وبشكل قابل للاستعادة."/>}
    </Panel>
    {details&&<Modal title={<><Database/>تفاصيل العنصر المحذوف</>} onClose={()=>setDetails(null)} className="trash-detail-modal">
      <div className="trash-detail-view">
        <section><b>بيانات الحذف</b><div><span>النوع</span><strong>{typeLabel(details.entityType)}</strong></div><div><span>العنصر</span><strong>{details.entityLabel||'—'}</strong></div><div><span>حذفه</span><strong>{details.deletedBy}</strong></div><div><span>وقت الحذف</span><strong>{details.day} · {arDateTime(details.deletedAt)}</strong></div></section>
        <section><b>البيانات المرجعية الكاملة</b><pre dir="rtl">{JSON.stringify(details.payload||{},null,2)}</pre></section>
        <section><b>ملاحظات النظام</b><pre dir="rtl">{JSON.stringify(details.metadata||{},null,2)}</pre></section>
      </div>
      <FormActions><Button className="btn-primary" onClick={()=>void restore(details)}><ArchiveRestore/>استعادة إلى مكانه السابق</Button><Button className="btn-ghost" onClick={()=>setDetails(null)}>إغلاق</Button></FormActions>
    </Modal>}
  </div>;
}
