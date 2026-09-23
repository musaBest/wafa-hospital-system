import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, LoaderCircle, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, UserCog, UserPlus, Users } from 'lucide-react';
import { Badge, Button, EmptyState, Field, FormActions, Modal, PageHeader, Panel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { useUi } from '../context/UiContext';
import { userAccessService, type SaveUserDTO } from '../services/userAccess.service';
import type { AccessPermission, ManagedUser } from '../types';
import { isPrimaryCashier } from '../utils/permissions';

const roleOptions = ['receptionist','cashier','inquiry_clerk','archive_clerk','payment_auditor','financial_collector','financial_auditor','admin','it_head','treasurer','lab_technician','inpatient_manager','rehab_specialist','social_worker','inpatient_pt','outpatient_pt','pt_head','inpatient_finance','moh_user','custom'] as const;
type TemplateRole = typeof roleOptions[number];
const actions = ['view','create','update','delete','print','export','fee'] as const;
const templateKeys: Record<TemplateRole, string[]> = {
  receptionist: ['patients.view','patients.create','patients.update','visits.view','visits.create','visits.update','queue.view','clinics.view','doctors.view'],
  admin: ['dashboard.view','patient_inquiries.view','archive.view','archive.export','patients.view','patients.create','patients.update','patients.delete','visits.view','visits.create','visits.update','queue.view','queue.update','admissions.view','admissions.create','admissions.update','inpatient_rehab.view','inpatient_rehab.update','inpatient_rehab.print','inpatient_rehab.export','inpatient_social.view','inpatient_social.update','inpatient_social.print','inpatient_social.export','inpatient_pt.view','inpatient_pt.update','inpatient_pt.print','inpatient_pt.export','outpatient_pt.view','outpatient_pt.update','outpatient_pt.print','outpatient_pt.export','diagnostics.view','diagnostics.create','diagnostics.update','laboratory.view','laboratory.update','diagnostic_catalog.view','diagnostic_catalog.create','diagnostic_catalog.update','diagnostic_catalog.delete','doctors.view','doctors.create','doctors.update','doctors.delete','clinics.view','clinics.create','clinics.update','clinics.delete','reports.view','reports.print','reports.export','sponsors.manage','settings.view','settings.update','users.view','users.create','users.update','users.delete'],
  cashier: ['patients.create','visits.create','clinics.view','doctors.view'],
  inquiry_clerk: ['patient_inquiries.view'],
  archive_clerk: ['archive.view','archive.export'],
  payment_auditor: ['cashier_payment.view','cashier_payment.update','cashier_payment.export'],
  financial_collector: ['cashier_collection.view','cashier_collection.update','cashier_collection.print','cashier_collection.export'],
  financial_auditor: ['financial_audit.view','financial_audit.update','financial_audit.create','financial_audit.delete','financial_audit.export'],
  it_head: [],
  treasurer: [],
  lab_technician: ['laboratory.view','laboratory.update','diagnostics.view','diagnostics.create','diagnostics.update','diagnostic_catalog.view','diagnostic_catalog.create','diagnostic_catalog.update','diagnostic_catalog.delete','diagnostic_catalog.manage'],
  inpatient_manager: ['dashboard.view','archive.view','archive.export','patients.view','patients.update','visits.view','queue.view','queue.update','admissions.view','admissions.create','admissions.update','inpatient_rehab.view','inpatient_rehab.update','inpatient_rehab.print','inpatient_rehab.export','inpatient_social.view','inpatient_social.update','inpatient_social.print','inpatient_social.export','inpatient_pt.view','inpatient_pt.update','inpatient_pt.print','inpatient_pt.export','reports.view','reports.print','reports.export'],
  rehab_specialist: ['inpatient_rehab.view','inpatient_rehab.update','inpatient_rehab.print','inpatient_rehab.export'],
  social_worker: ['inpatient_social.view','inpatient_social.update','inpatient_social.print','inpatient_social.export'],
  inpatient_pt: ['inpatient_pt.view','inpatient_pt.update','inpatient_pt.print','inpatient_pt.export'],
  outpatient_pt: ['outpatient_pt.view','outpatient_pt.update','outpatient_pt.print','outpatient_pt.export'],
  pt_head: ['outpatient_pt.view','outpatient_pt.update','outpatient_pt.print','outpatient_pt.export','inpatient_pt.view','inpatient_pt.update','inpatient_pt.print','inpatient_pt.export'],
  inpatient_finance: ['inpatient_finance.view','inpatient_finance.update','inpatient_finance.print','inpatient_finance.export'],
  moh_user: ['moh_portal.view','moh_portal.create','moh_portal.update','moh_portal.print','moh_portal.export'],
  custom: [],
};
const isTemplateRole = (value: string): value is TemplateRole => roleOptions.includes(value as TemplateRole);
const departmentGroups = [
  {id:'reception', ar:'الاستقبال والمرضى', en:'Reception & patients', modules:['patients','visits','queue','patient_inquiries','archive']},
  {id:'outpatient', ar:'العيادات والأطباء', en:'Clinics & doctors', modules:['clinics','doctors','doctor_portal']},
  {id:'inpatient_admin', ar:'المبيت · الإدارة', en:'Inpatient · administration', modules:['admissions']},
  {id:'inpatient_rehab', ar:'المبيت · التأهيل الطبي', en:'Inpatient · rehabilitation', modules:['inpatient_rehab']},
  {id:'inpatient_social', ar:'المبيت · الخدمة الاجتماعية', en:'Inpatient · social service', modules:['inpatient_social']},
  {id:'inpatient_pt', ar:'المبيت · العلاج الطبيعي الداخلي', en:'Inpatient · internal PT', modules:['inpatient_pt']},
  {id:'outpatient_pt', ar:'العلاج الطبيعي الخارجي', en:'Outpatient physical therapy', modules:['outpatient_pt']},
  {id:'inpatient_finance', ar:'المبيت · الفرع المالي', en:'Inpatient · finance', modules:['inpatient_finance']},
  {id:'moh', ar:'بوابة وزارة الصحة', en:'Ministry of Health portal', modules:['moh_portal']},
  {id:'diagnostics', ar:'المختبر والتشخيص والأشعة', en:'Lab, diagnostics & radiology', modules:['diagnostics','laboratory','diagnostic_catalog']},
  {id:'billing', ar:'المحاسبة والفواتير', en:'Accounting & billing', modules:['billing','patient_finance','transfers','finance']},
  {id:'cashier_flow', ar:'مسار الكاشير والتحصيل', en:'Cashier collection workflow', modules:['cashier_payment','cashier_collection','financial_audit']},
  {id:'reports', ar:'التقارير', en:'Reports', modules:['reports']},
  {id:'system', ar:'إدارة النظام', en:'System administration', modules:['dashboard','users','settings']},
] as const;


function UserEditor({ user, permissions, onClose, onSaved }: { user?: ManagedUser; permissions: AccessPermission[]; onClose: () => void; onSaved: (user: ManagedUser) => void | Promise<void> }) {
  const { t, language } = useI18n();
  const { user: currentUser } = useAuth();
  const { toast } = useUi();
  const [role, setRole] = useState<string>(user?.role ?? '');
  const initialPermissions = user?.assignedPermissions?.length ? user.assignedPermissions : (user?.permissions ?? []);
  const [selected, setSelected] = useState<string[]>(initialPermissions);
  const [active, setActive] = useState(user?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const actorIsCashier = isPrimaryCashier(currentUser);
  const availableRoleOptions = [...roleOptions];
  const visiblePermissions = useMemo(() => actorIsCashier ? permissions : permissions.filter(permission=>!permission.financial), [permissions, actorIsCashier]);
  const financialAllowed = actorIsCashier;
  const modules = useMemo(() => Array.from(new Set(visiblePermissions.map(permission => permission.module))), [visiblePermissions]);

  const applyRoleTemplate = (nextRole: string) => {
    setRole(nextRole);
    if (nextRole.trim().toLowerCase() === 'cashier') {
      const available = new Set(permissions.map(permission=>permission.key));
      setSelected(templateKeys.cashier.filter(key=>available.has(key)));
      return;
    }
    if (nextRole.trim().toLowerCase() === 'it_head') {
      setSelected(permissions.filter(permission=>!permission.financial).map(permission=>permission.key));
      return;
    }
    if (!isTemplateRole(nextRole)) {
      setSelected(current => current.filter(key => !permissions.find(permission => permission.key === key)?.financial));
      return;
    }
    const allowedKeys = new Set(visiblePermissions.filter(permission => !permission.financial || financialAllowed).map(permission => permission.key));
    const template = templateKeys[nextRole];
    setSelected([...new Set(template.filter(key => allowedKeys.has(key)))]);
  };
  const toggle = (key: string) => {
    const permission = visiblePermissions.find(item => item.key === key);
    if (!permission || (permission.financial && !financialAllowed)) return;
    const moduleKeys = visiblePermissions.filter(item => item.module === permission.module).map(item => item.key);
    const viewKey = visiblePermissions.find(item => item.module === permission.module && item.action === 'view')?.key;
    setSelected(current => {
      if (current.includes(key)) return permission.action === 'view' ? current.filter(item => !moduleKeys.includes(item)) : current.filter(item => item !== key);
      return [...new Set([...current, key, ...(viewKey ? [viewKey] : [])])];
    });
  };
  const toggleModule = (module: string) => {
    const keys = visiblePermissions.filter(permission => permission.module === module && (!permission.financial || financialAllowed)).map(permission => permission.key);
    const allSelected = keys.every(key => selected.includes(key));
    setSelected(current => allSelected ? current.filter(key => !keys.includes(key)) : [...new Set([...current, ...keys])]);
  };
  const toggleDepartmentGroup = (groupModules: readonly string[]) => {
    const keys = visiblePermissions
      .filter(permission => groupModules.includes(permission.module) && (!permission.financial || financialAllowed))
      .map(permission => permission.key);
    if (!keys.length) return;
    const allSelected = keys.every(key => selected.includes(key));
    setSelected(current => allSelected ? current.filter(key => !keys.includes(key)) : [...new Set([...current, ...keys])]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError('');
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') || '');
    const confirmation = String(data.get('password_confirmation') || '');
    if (!user && !password) { setError(t('passwordRequired')); setSaving(false); return; }
    if (password && password !== confirmation) { setError(t('passwordMismatch')); setSaving(false); return; }
    // A non-financial administrator (Eng. Ahmed) does not receive financial permission
    // definitions from /access/permissions. Preserve any already-granted hidden permissions
    // exactly as-is while saving the fields he is allowed to edit. Eng. Mohammed still receives
    // the complete catalog and can change those financial grants normally.
    const hiddenExistingPermissions = user
      ? user.permissions.filter(key => !permissions.some(permission => permission.key === key))
      : [];
    const editablePermissions = selected.filter(key => {
      const permission = permissions.find(item=>item.key===key);
      return Boolean(permission && (financialAllowed || !permission.financial));
    });
    const dto: SaveUserDTO = {
      username: String(data.get('username')).trim(),
      display_name: String(data.get('display_name')).trim(),
      role: role.trim(),
      active,
      permissions: [...new Set([...editablePermissions, ...hiddenExistingPermissions])],
      ...(password ? { password, password_confirmation: confirmation } : {}),
    };
    try {
      const saved = user ? await userAccessService.update(user.id, dto) : await userAccessService.create(dto);
      await onSaved(saved);
      toast(t(user ? 'userUpdated' : 'userCreated'));
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('saveFailed'));
    } finally { setSaving(false); }
  };

  return <Modal title={<><UserCog/>{t(user ? 'editUser' : 'addUser')}</>} onClose={onClose}>
    <form onSubmit={submit} className="access-user-form">
      <div className="form-grid">
        <Field label={t('displayName')} span={2}><input name="display_name" defaultValue={user?.displayName} required/></Field>
        <Field label={t('accountStatus')}><button type="button" className={`access-status-toggle ${active?'active':''}`} onClick={()=>setActive(value=>!value)}><i/>{t(active?'active':'inactive')}</button></Field>
        <Field label={t('username')}><input name="username" defaultValue={user?.username} required autoComplete="off" dir="ltr"/></Field>
        <Field label={t('userType')}><input list="user-type-suggestions" value={role} onChange={event=>applyRoleTemplate(event.target.value)} required placeholder={t('userTypePlaceholder')}/><datalist id="user-type-suggestions">{availableRoleOptions.map(option=><option value={option} key={option}>{t(option)}</option>)}</datalist><small className="form-hint">{t('userTypeHint')}</small></Field>
        <Field label={t(user?'newPasswordOptional':'password')}><input name="password" type="password" autoComplete="new-password" minLength={8}/></Field>
        <Field label={t('confirmPassword')}><input name="password_confirmation" type="password" autoComplete="new-password" minLength={8}/></Field>
      </div>
      <div className="access-note"><ShieldCheck/><div><b>{actorIsCashier?'صلاحيات كل الأقسام والفروع':'صلاحيات غير مالية'}</b><span>{actorIsCashier?'يمكنك إنشاء مستخدم لأي فرع في المستشفى وتحديد صلاحياته بالتفصيل، بما فيها فروع المبيت والمالية عند الحاجة. حساب Eng. Mohammed Moqbil يبقى الحساب المالي المحمي.':'يمكنك إنشاء مستخدمين وتوزيع الصلاحيات غير المالية حسب القسم والفرع. الصلاحيات المالية لا يمكن منحها إلا من حساب أمين الصندوق المحمي.'}</span></div></div>
      <div className="department-permission-section">
        <div className="permission-title"><div><b>{language==='ar'?'اختيار سريع حسب القسم أو الفرع':'Quick access by department'}</b><span>{language==='ar'?'اضغط على القسم لمنح أو إزالة كل صلاحياته المتاحة، وبعدها عدّل التفاصيل من الجدول.':'Select a department to grant/remove its available permissions, then fine-tune below.'}</span></div></div>
        <div className="department-permission-grid">
          {departmentGroups.map(group=>{
            const keys=visiblePermissions.filter(permission=>group.modules.some(module=>module===permission.module)&&(!permission.financial||financialAllowed)).map(permission=>permission.key);
            if(!keys.length)return null;
            const checked=keys.every(key=>selected.includes(key));
            return <button type="button" key={group.id} className={checked?'selected':''} onClick={()=>toggleDepartmentGroup(group.modules)}><span className={`check-box ${checked?'checked':''}`}>{checked&&<Check/>}</span><b>{language==='ar'?group.ar:group.en}</b>{actorIsCashier&&<small>{keys.filter(key=>selected.includes(key)).length}/{keys.length}</small>}</button>;
          })}
        </div>
      </div>
      <div className="permission-matrix-wrap">
        <div className="permission-title"><div><b>{t('pagePermissions')}</b><span>{actorIsCashier?'حدّد القسم أو الفرع ثم امنح العرض/الإضافة/التعديل/الحذف/الطباعة/التصدير حسب وظيفة المستخدم.':'الصلاحيات المالية مخفية وغير قابلة للمنح من هذا الحساب.'}</span></div>{actorIsCashier&&<Badge color="violet">{selected.filter(key=>permissions.some(permission=>permission.key===key)).length}</Badge>}</div>
        <div className="permission-matrix">
          <div className="permission-row permission-head"><span>{t('page')}</span>{actions.map(action=><span key={action}>{t(`permission_${action}`)}</span>)}</div>
          {modules.map(module=>{
            const rows=visiblePermissions.filter(permission=>permission.module===module);
            const keys=rows.map(permission=>permission.key);
            const checked=keys.length>0&&keys.every(key=>selected.includes(key));
            return <div className="permission-row" key={module}>
              <button type="button" className="module-check" onClick={()=>toggleModule(module)}><span className={`check-box ${checked?'checked':''}`}>{checked&&<Check/>}</span><b>{t(`module_${module}`)}</b></button>
              {actions.map(action=>{const permission=rows.find(item=>item.action===action);const locked=Boolean(permission?.financial&&!financialAllowed);return <span className={`permission-cell ${locked?'financial-locked':''}`} key={action}>{permission?<label title={locked?'صلاحية مالية خاصة بأمين الصندوق':(language==='ar'?permission.nameAr:permission.nameEn)}><input type="checkbox" checked={selected.includes(permission.key)} disabled={locked} onChange={()=>toggle(permission.key)}/><i><Check/></i></label>:<em>—</em>}</span>})}
            </div>;
          })}
        </div>
      </div>
      {error&&<p className="form-error">{error}</p>}
      <FormActions><Button className="btn-primary" type="submit" disabled={saving}>{saving?<LoaderCircle className="spin"/>:<Check/>}{t('save')}</Button><Button className="btn-ghost" type="button" onClick={onClose}>{t('cancel')}</Button></FormActions>
    </form>
  </Modal>;
}

export function UsersAccessPage() {
  const { t, language } = useI18n();
  const { user: currentUser, can, refreshSession } = useAuth();
  const { toast } = useUi();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null | 'new'>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [userRows, permissionRows] = await Promise.all([userAccessService.list(), userAccessService.permissions()]);
      setUsers(userRows); setPermissions(permissionRows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('loadFailed')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const remove = async (target: ManagedUser) => {
    if (!confirm(t('confirmRemoveUser'))) return;
    try { await userAccessService.remove(target.id); setUsers(rows=>rows.filter(row=>row.id!==target.id)); toast(t('userRemoved')); }
    catch (reason) { toast(reason instanceof Error ? reason.message : t('saveFailed'),'warn'); }
  };
  const upsert = async (saved: ManagedUser) => {
    // Show the canonical PATCH response immediately, then wait for a fresh database read before
    // closing the editor. This makes Save a verified operation instead of an optimistic UI-only change.
    setUsers(rows => rows.some(row=>row.id===saved.id) ? rows.map(row=>row.id===saved.id?saved:row) : [...rows,saved]);
    const rows = await userAccessService.list();
    setUsers(rows);
    const persisted = rows.find(row=>row.id===saved.id);
    if (!persisted) throw new Error(language==='ar'?'تم الحفظ لكن تعذر التحقق من المستخدم في قاعدة البيانات.':'Saved, but the user could not be verified in the database.');
    if (currentUser?.id === saved.id) await refreshSession();
  };
  const activeCount = users.filter(row=>row.active).length;
  const canSeePermissionCounts = isPrimaryCashier(currentUser);

  return <>
    <PageHeader crumb={t('systemAdmin')} title={t('userAccessTitle')} sub={t('userAccessSub')} actions={can('users.create')?<Button className="btn-primary" onClick={()=>setEditing('new')}><UserPlus/>{t('addUser')}</Button>:undefined}/>
    <div className="access-summary">
      <Panel><Users/><div><b>{users.length}</b><span>{t('registeredUsers')}</span></div></Panel>
      <Panel><ShieldCheck/><div><b>{activeCount}</b><span>{t('activeUsers')}</span></div></Panel>
      {isPrimaryCashier(currentUser)&&<Panel><KeyRound/><div><b>{permissions.length}</b><span>{t('grantablePermissions')}</span></div></Panel>}
    </div>
    <Panel className="access-users-panel">
      <div className="panel-head"><h3><UserCog/>{t('usersAndAccess')}</h3><Button className="btn-ghost btn-sm" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?'spin':''}/>{t('refresh')}</Button></div>
      {loading?<div className="access-loading"><LoaderCircle className="spin"/><span>{t('loadingUsers')}</span></div>:error?<EmptyState title={t('connectionError')} sub={error} action={<Button className="btn-primary" onClick={()=>void load()}>{t('retry')}</Button>}/>:users.length?<div className="table-wrap"><table className="access-table"><thead><tr><th>{t('user')}</th><th>{t('username')}</th><th>{t('userType')}</th><th>{t('accountStatus')}</th>{canSeePermissionCounts&&<th>{t('permissionCount')}</th>}<th>{t('lastLogin')}</th><th>{t('actions')}</th></tr></thead><tbody>{users.map(row=><tr key={row.id}><td><div className="access-user-cell"><span>{row.displayName.charAt(0)}</span><div><b>{row.displayName}</b><small>{row.manageable?t('systemUser'):t('doctorAccount')}</small></div></div></td><td dir="ltr"><code>{row.username}</code></td><td><Badge color={row.role==='it_head'?'violet':row.role==='treasurer'?'emerald':row.role==='admin'?'amber':'cyan'}>{t(row.role)}</Badge></td><td><span className={`status-pill ${row.active?'active':'inactive'}`}><i/>{t(row.active?'active':'inactive')}</span></td>{canSeePermissionCounts&&<td><b>{row.permissions.length}</b>{row.permissionsCustomized&&<small className="permission-customized-tag">مخصص</small>}</td>}<td>{row.lastLoginAt?new Date(row.lastLoginAt).toLocaleString(language==='ar'?'ar-EG':'en-US'):'—'}</td><td><div className="table-actions">{can('users.update')&&row.manageable&&<Button className="btn-ghost btn-sm" onClick={()=>setEditing(row)}><Pencil/>{t('edit')}</Button>}{can('users.delete')&&row.manageable&&(isPrimaryCashier(currentUser)||row.id!==currentUser?.id)&&row.active&&<Button className="btn-danger btn-sm" onClick={()=>void remove(row)}><Trash2/>{t('remove')}</Button>}</div></td></tr>)}</tbody></table></div>:<EmptyState title={t('noUsers')} sub={t('noUsersSub')}/>}</Panel>
    {editing&&<UserEditor user={editing==='new'?undefined:editing} permissions={permissions} onClose={()=>setEditing(null)} onSaved={upsert}/>} 
  </>;
}
