import { FormEvent, useMemo, useState } from 'react';
import { Check, FlaskConical, Image, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal } from './ui';
import { useAuth } from '../context/AuthContext';
import { useHospital } from '../context/HospitalContext';
import { useI18n } from '../i18n';
import { useUi } from '../context/UiContext';
import type { DiagnosticService } from '../types';
import { canManageFinancialCatalog } from '../utils/permissions';

type CatalogFilter = 'all' | DiagnosticService['type'];
type TestRow = { test: string; referenceRange: string };

function newTestRow(): TestRow { return { test: '', referenceRange: '' }; }

export function DiagnosticServiceEditor({ service, defaultType='lab', onClose }: { service?: DiagnosticService; defaultType?: DiagnosticService['type']; onClose:()=>void }) {
  const { t, language } = useI18n();
  const { toast } = useUi();
  const { user, can } = useAuth();
  const { addDiagnosticService, updateDiagnosticService } = useHospital();
  const canPrice = canManageFinancialCatalog(user);
  const [type, setType] = useState<DiagnosticService['type']>(service?.type ?? defaultType);
  const [nameAr, setNameAr] = useState(service?.nameAr ?? '');
  const [nameEn, setNameEn] = useState(service?.nameEn ?? '');
  const [category, setCategory] = useState(service?.category ?? '');
  const [price, setPrice] = useState(String(service?.price ?? ''));
  const [tests, setTests] = useState<TestRow[]>(service?.tests?.length ? service.tests.map(row=>({...row})) : [newTestRow()]);
  const [saving, setSaving] = useState(false);
  const canSave = service ? can('diagnostic_catalog.update') || canManageFinancialCatalog(user) : can('diagnostic_catalog.create') || canManageFinancialCatalog(user);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave || saving) return;
    const cleanTests = type === 'lab' ? tests.map(row=>({test:row.test.trim(),referenceRange:row.referenceRange.trim()})).filter(row=>row.test) : [];
    const nextPrice = service && !canPrice ? service.price : Number(price);
    if (!nameAr.trim() || !nameEn.trim() || !category.trim()) { toast(language==='ar'?'أكمل اسم الخدمة والفئة':'Complete the service names and category','warn'); return; }
    if (!Number.isFinite(nextPrice) || nextPrice < 0.01) { toast(language==='ar'?'أدخل سعراً صحيحاً':'Enter a valid price','warn'); return; }
    if (type === 'lab' && !cleanTests.length) { toast(language==='ar'?'أضف بند فحص واحداً على الأقل':'Add at least one test row','warn'); return; }
    setSaving(true);
    try {
      if (service) {
        const payload: Partial<Omit<DiagnosticService,'id'>> = { nameAr:nameAr.trim(), nameEn:nameEn.trim(), category:category.trim(), tests:cleanTests };
        if (canPrice) payload.price=nextPrice;
        await updateDiagnosticService(service.id, payload);
        toast(language==='ar'?'تم تحديث نوع الفحص وحفظ التعديلات':'Diagnostic service updated');
      } else {
        await addDiagnosticService({ type, nameAr:nameAr.trim(), nameEn:nameEn.trim(), category:category.trim(), price:nextPrice, tests:cleanTests });
        toast(t('diagnosticServiceAdded'));
      }
      onClose();
    } catch (reason) {
      toast(reason instanceof Error?reason.message:(language==='ar'?'تعذر حفظ الخدمة':'Could not save service'),'warn');
    } finally { setSaving(false); }
  };

  const setTestCell = (index:number,key:keyof TestRow,value:string) => setTests(rows=>rows.map((row,i)=>i===index?{...row,[key]:value}:row));

  return <Modal title={<><Settings2/>{service ? (language==='ar'?'تعديل الفحص / الأشعة':'Edit diagnostic service') : t('addDiagnosticService')}</>} onClose={onClose} className="diagnostic-service-modal">
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label={t('diagnosticType')}><select value={type} onChange={e=>setType(e.target.value as DiagnosticService['type'])} disabled={Boolean(service)}><option value="lab">{t('laboratory')}</option><option value="radiology">{t('radiology')}</option></select></Field>
        <Field label={t('servicePrice')}><input value={price} onChange={e=>setPrice(e.target.value)} type="number" min="0.01" step="0.01" required readOnly={!canPrice&&Boolean(service)} className={!canPrice&&service?'readonly-input':''}/>{!canPrice&&service&&<small className="form-hint">{language==='ar'?'تعديل السعر يحتاج صلاحية أسعار الفحوصات.':'Price changes require diagnostic pricing permission.'}</small>}</Field>
        <Field label={t('serviceNameAr')}><input value={nameAr} onChange={e=>setNameAr(e.target.value)} required/></Field>
        <Field label={t('serviceNameEn')}><input value={nameEn} onChange={e=>setNameEn(e.target.value)} dir="ltr" required/></Field>
        <Field label={t('category')} span={2}><input value={category} onChange={e=>setCategory(e.target.value)} required placeholder={type==='lab'?'hematology':'xray'} dir="ltr"/></Field>
      </div>
      {type==='lab'&&<div className="diagnostic-test-builder">
        <div className="diagnostic-test-builder-head"><div><b>{language==='ar'?'بنود الفحص الافتراضية':'Default test items'}</b><span>{language==='ar'?'هذه البنود تظهر تلقائياً عند إدخال نتيجة المختبر.':'These rows appear automatically when entering lab results.'}</span></div><Button type="button" className="btn-ghost btn-sm" onClick={()=>setTests(rows=>[...rows,newTestRow()])}><Plus/>{t('addTestRow')}</Button></div>
        <div className="diagnostic-test-table"><div className="diagnostic-test-row head"><span>Test</span><span>Reference Range</span><span/></div>{tests.map((row,index)=><div className="diagnostic-test-row" key={index}><input value={row.test} onChange={e=>setTestCell(index,'test',e.target.value)} dir="ltr" placeholder="CBC / Creatinine ..."/><input value={row.referenceRange} onChange={e=>setTestCell(index,'referenceRange',e.target.value)} dir="ltr" placeholder="70 - 110 mg/dL"/><button type="button" disabled={tests.length===1} onClick={()=>setTests(rows=>rows.filter((_,i)=>i!==index))}><Trash2/></button></div>)}</div>
      </div>}
      <FormActions><Button className="btn-primary" type="submit" disabled={!canSave||saving}><Check/>{saving?(language==='ar'?'جارٍ الحفظ...':'Saving...'):t('save')}</Button><Button className="btn-ghost" type="button" onClick={onClose}>{t('cancel')}</Button></FormActions>
    </form>
  </Modal>;
}

export function DiagnosticCatalogPanel({ typeFilter='all' }: { typeFilter?: CatalogFilter }) {
  const { t, language } = useI18n();
  const { toast } = useUi();
  const { user, can } = useAuth();
  const { diagnosticServices, removeDiagnosticService } = useHospital();
  const [filter, setFilter] = useState<CatalogFilter>(typeFilter);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<DiagnosticService|null>(null);
  const [creating, setCreating] = useState<DiagnosticService['type']|null>(null);
  const canCreate = can('diagnostic_catalog.create') || canManageFinancialCatalog(user);
  const canUpdate = can('diagnostic_catalog.update') || canManageFinancialCatalog(user);
  const canDelete = can('diagnostic_catalog.delete') || canManageFinancialCatalog(user);
  const canPrice = canManageFinancialCatalog(user);
  const rows = useMemo(()=>diagnosticServices.filter(service=>service.active&&(filter==='all'||service.type===filter)).filter(service=>`${service.nameAr} ${service.nameEn} ${service.category}`.toLowerCase().includes(query.toLowerCase())),[diagnosticServices,filter,query]);

  const remove = async (service:DiagnosticService) => {
    if (!canDelete || !confirm(t('confirmRemoveService'))) return;
    try { await removeDiagnosticService(service.id); toast(t('diagnosticServiceRemoved')); }
    catch (reason) { toast(reason instanceof Error?reason.message:(language==='ar'?'تعذر حذف الخدمة':'Could not remove service'),'warn'); }
  };

  return <div className="diagnostic-catalog-manager">
    <div className="diagnostic-catalog-toolbar">
      <div className="chip-row"><button className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>{language==='ar'?'الكل':'All'}</button><button className={`chip ${filter==='lab'?'active':''}`} onClick={()=>setFilter('lab')}><FlaskConical/>{t('laboratory')}</button><button className={`chip ${filter==='radiology'?'active':''}`} onClick={()=>setFilter('radiology')}><Image/>{t('radiology')}</button></div>
      <label className="table-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={language==='ar'?'بحث باسم الفحص أو الفئة...':'Search service or category...'}/></label>
      {canCreate&&<div className="catalog-create-actions"><Button className="btn-ghost btn-sm" onClick={()=>setCreating('lab')}><Plus/><FlaskConical/>{language==='ar'?'فحص جديد':'New lab test'}</Button><Button className="btn-primary btn-sm" onClick={()=>setCreating('radiology')}><Plus/><Image/>{language==='ar'?'أشعة جديدة':'New radiology type'}</Button></div>}
    </div>
    {rows.length?<div className="service-catalog-grid">{rows.map(service=><article className="service-card glass" key={service.id}><div className={`service-type-icon ${service.type}`}>{service.type==='lab'?<FlaskConical/>:<Image/>}</div><div className="service-card-main"><Badge color={service.type==='lab'?'cyan':'violet'}>{t(service.type==='lab'?'laboratory':'radiology')}</Badge><h3>{language==='ar'?service.nameAr:service.nameEn}</h3><p>{service.category} · {service.tests.length} {t('testItems')}</p></div><strong>{service.price.toFixed(2)} ₪{!canPrice&&<small>{language==='ar'?' عرض فقط':' read only'}</small>}</strong><div className="service-card-actions">{canUpdate&&<Button className="btn-ghost btn-sm" onClick={()=>setEditing(service)}><Pencil/>{language==='ar'?'تعديل':'Edit'}</Button>}{canDelete&&<Button className="btn-danger btn-sm" onClick={()=>void remove(service)}><Trash2/>{t('remove')}</Button>}</div></article>)}</div>:<EmptyState title={language==='ar'?'لا توجد خدمات مطابقة':'No matching diagnostic services'} sub={language==='ar'?'أضف فحصاً أو نوع أشعة جديداً من الأعلى.':'Add a lab test or radiology type above.'}/>} 
    {creating&&<DiagnosticServiceEditor defaultType={creating} onClose={()=>setCreating(null)}/>} {editing&&<DiagnosticServiceEditor service={editing} onClose={()=>setEditing(null)}/>} 
  </div>;
}
