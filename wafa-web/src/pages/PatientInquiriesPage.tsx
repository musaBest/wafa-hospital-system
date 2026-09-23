import { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, Search, Tags, UserRoundCheck, Users } from 'lucide-react';
import { Badge, Button, EmptyState, PageHeader, Panel } from '../components/ui';
import { useUi } from '../context/UiContext';
import { hospitalApi } from '../services/hospitalApi.service';
import type { Patient } from '../types';

type InquiryRow = Patient & {
  patientId?: string | null;
  elderlyResidentId?: string | null;
  sourceTags?: string[];
  sourceSummary?: string;
  inquiryRecordType?: 'patient' | 'elderly_resident' | string;
  latestStatus?: string | null;
  lastEntryDate?: string | null;
};

const safeText = (value?: string | null) => (value && String(value).trim() ? value : '—');

export function PatientInquiriesPage() {
  const { toast } = useUi();
  const [patients, setPatients] = useState<InquiryRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try { setPatients(await hospitalApi.patientInquiries() as InquiryRow[]); }
    catch (error) { if (!silent) toast(error instanceof Error ? error.message : 'تعذر تحميل قائمة المرضى', 'warn'); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(true); }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ar');
    if (!needle) return patients;
    return patients.filter(item => [
      item.fullName,
      item.idNumber,
      item.medicalSerial,
      item.phone,
      item.city,
      item.area,
      item.coverageEntity,
      item.sourceSummary,
      item.latestStatus,
      ...(item.sourceTags || []),
    ].filter(Boolean).join(' ').toLocaleLowerCase('ar').includes(needle));
  }, [patients, query]);

  const sourceCounts = useMemo(() => ({
    outpatient: patients.filter(p => p.sourceTags?.includes('عيادات')).length,
    inpatient: patients.filter(p => p.sourceTags?.includes('مبيت')).length,
    elderly: patients.filter(p => p.sourceTags?.includes('مسنين/مسنات')).length,
  }), [patients]);

  return <>
    <PageHeader crumb="الاستعلامات" title="استعلامات المرضى" sub="دليل قراءة شامل لكل من دخل مسار المستشفى: العيادات، المبيت، والمسـنين/المسنات. الواجهة للعرض والاستعلام فقط بدون تعديل أو حذف."
      actions={<Button className="btn-ghost" onClick={() => void refresh()} disabled={loading}><RefreshCw />تحديث</Button>} />
    <Panel className="inquiries-panel">
      <div className="inquiries-toolbar">
        <label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم، الهوية، رقم الملف، الجوال، القسم..." autoFocus /></label>
        <Badge color="violet"><Users />إجمالي الأشخاص {patients.length}</Badge>
        <Badge color="emerald"><Eye />النتائج {rows.length}</Badge>
      </div>
      <div className="inquiries-kpis">
        <span><UserRoundCheck /> مرضى عيادات: <b>{sourceCounts.outpatient}</b></span>
        <span><UserRoundCheck /> مرضى مبيت: <b>{sourceCounts.inpatient}</b></span>
        <span><UserRoundCheck /> مسنين/مسنات: <b>{sourceCounts.elderly}</b></span>
      </div>
      {loading ? <div className="inquiries-loading"><RefreshCw />جارٍ تحميل جميع المرضى...</div> : rows.length ? <div className="table-wrap responsive-table-wrap"><table className="inquiries-table responsive-data-table">
        <thead><tr><th>#</th><th>اسم المريض</th><th>مصدر الملف</th><th>الحالة الحالية</th><th>رقم المريض</th><th>رقم الهوية</th><th>رقم الجوال</th><th>تاريخ الميلاد</th><th>الجنس</th><th>المدينة / العنوان</th><th>جهة التغطية</th><th>آخر دخول / تسجيل</th></tr></thead>
        <tbody>{rows.map((patient, index) => <tr key={patient.id || `${patient.idNumber}-${index}`}>
          <td data-label="#">{index + 1}</td>
          <td data-label="اسم المريض"><b>{safeText(patient.fullName)}</b><small>{patient.inquiryRecordType === 'elderly_resident' ? 'ملف مسنين/مسنات مباشر' : 'ملف مريض موحّد'}</small></td>
          <td data-label="مصدر الملف"><div className="source-tags"><Tags />{(patient.sourceTags?.length ? patient.sourceTags : ['ملف مريض']).map(tag => <span key={tag}>{tag}</span>)}</div></td>
          <td data-label="الحالة الحالية">{safeText(patient.latestStatus)}</td>
          <td data-label="رقم المريض" dir="ltr">{safeText(patient.medicalSerial)}</td>
          <td data-label="رقم الهوية" dir="ltr">{safeText(patient.idNumber)}</td>
          <td data-label="رقم الجوال" dir="ltr">{safeText(patient.phone)}</td>
          <td data-label="تاريخ الميلاد">{safeText(patient.dob)}</td>
          <td data-label="الجنس">{patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : '—'}</td>
          <td data-label="المدينة / العنوان">{[patient.city, patient.area].filter(Boolean).join(' / ') || '—'}</td>
          <td data-label="جهة التغطية">{safeText(patient.coverageEntity)}</td>
          <td data-label="آخر دخول / تسجيل">{patient.lastEntryDate || patient.regDate || '—'}</td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="لا توجد نتائج مطابقة" sub={query ? 'غيّر كلمات البحث لعرض نتائج أخرى.' : 'لا توجد ملفات مرضى مسجلة.'} />}
    </Panel>
  </>;
}
