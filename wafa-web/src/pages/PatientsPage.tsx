import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Building2,
  Check,
  CircleDollarSign,
  DatabaseZap,
  Download,
  FileText,
  FlaskConical,
  ScanLine,
  MapPinned,
  Plus,
  Pencil,
  Trash2,
  Clock3,
  Search,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FormActions,
  Modal,
  PageHeader,
  Panel,
} from "../components/ui";
import { useHospital } from "../context/HospitalContext";
import { useI18n } from "../i18n";
import { useUi } from "../context/UiContext";
import { fetchCivilRegistry } from "../services/civilRegistry.service";
import type { CivilRegistryRecord, FollowUpAppointment } from "../types";
import { useAuth } from "../context/AuthContext";
import { canRegisterVisits, canViewPatientFinance } from "../utils/permissions";
import { downloadLabReport } from "../utils/labReportPdf";

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const appointmentComputed = (item: FollowUpAppointment) => item.computedStatus || (item.status === 'scheduled' && item.date < today() ? 'auto_closed' : item.status);
const appointmentLabel = (item: FollowUpAppointment) => item.statusLabel || (appointmentComputed(item) === 'auto_closed' ? 'تم إنهاء الحالة تلقائياً' : item.status === 'scheduled' ? 'مراجعة مجدولة' : item.status === 'booked' ? 'تم تسجيل زيارة المراجعة' : item.status === 'completed' ? 'مكتملة' : 'ملغية');

function PatientAvatar({ name }: { name: string }) {
  const hue = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="patient-avatar"
      style={{
        background: `linear-gradient(135deg,hsl(${hue} 78% 55%),hsl(${(hue + 55) % 360} 72% 44%))`,
      }}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

function PatientModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { addPatient } = useHospital();
  const { toast } = useUi();
  const [identity, setIdentity] = useState("");
  const [phone, setPhone] = useState("");
  const [record, setRecord] = useState<CivilRegistryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const lookup = async () => {
    if (!identity.trim() || !phone.trim()) {
      toast(t("identityPhoneRequired"), "warn");
      return;
    }
    setLoading(true);
    try {
      setRecord(await fetchCivilRegistry(identity.trim()));
      toast(t("registryFetched"));
    } catch {
      toast(t("registryFailed"), "warn");
    } finally {
      setLoading(false);
    }
  };
  const save = () => {
    if (!record) return;
    addPatient(record, phone.trim());
    toast(t("savedPatient"));
    onClose();
  };
  return (
    <Modal
      title={
        <>
          <Users />
          {t("newPatient")}
        </>
      }
      onClose={onClose}
    >
      <div className="registry-banner">
        <DatabaseZap />
        <div>
          <b>{t("civilRegistryIntegration")}</b>
          <span>{t("civilRegistryPlaceholder")}</span>
        </div>
        <Badge color="violet">API READY</Badge>
      </div>
      <div className="form-grid compact-form">
        <Field label={t("nameOrId")} span={2}>
          <input
            value={identity}
            onChange={(e) => {
              setIdentity(e.target.value);
              setRecord(null);
            }}
            placeholder={t("nameOrIdHint")}
          />
        </Field>
        <Field label={t("phone")}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
          />
        </Field>
      </div>
      <FormActions>
        <Button className="btn-primary" onClick={lookup} disabled={loading}>
          <DatabaseZap />
          {loading ? t("fetching") : t("fetchRegistry")}
        </Button>
        <Button className="btn-ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </FormActions>
      {record && (
        <div className="registry-result glass">
          <div className="verified-head">
            <BadgeCheck />
            <b>{t("verifiedDemographics")}</b>
          </div>
          <div className="registry-data">
            <span>
              {t("fullName")}
              <b>{record.fullName}</b>
            </span>
            <span>
              {t("idNumber")}
              <b>{record.idNumber}</b>
            </span>
            <span>
              {t("dob")}
              <b>{record.dob}</b>
            </span>
            <span>
              {t("gender")}
              <b>{t(record.gender)}</b>
            </span>
            <span>
              {t("city")}
              <b>{t(record.city)}</b>
            </span>
            <span>
              {t("coverage")}
              <b>{t(record.coverageEntity)}</b>
            </span>
          </div>
          <Button className="btn-primary" onClick={save}>
            <Check />
            {t("confirmRegistration")}
          </Button>
        </div>
      )}
    </Modal>
  );
}


function EditPatientModal({patientId,onClose}:{patientId:string;onClose:()=>void}){
  const {patients,sponsors,updatePatient}=useHospital();const {toast}=useUi();
  const patient=patients.find(p=>p.id===patientId);
  const [form,setForm]=useState(()=>patient?{fullName:patient.fullName,idNumber:patient.idNumber,dob:patient.dob,gender:patient.gender,phone:patient.phone,city:patient.city,area:patient.area,coverageEntity:patient.coverageEntity}:{fullName:'',idNumber:'',dob:'',gender:'male' as const,phone:'',city:'',area:'',coverageEntity:''});
  if(!patient)return null;
  const save=()=>{if(!form.fullName.trim()||!form.idNumber.trim()){toast('الاسم ورقم الهوية مطلوبان','warn');return}if(patients.some(p=>p.id!==patient.id&&p.idNumber===form.idNumber.trim())){toast('رقم الهوية مستخدم لمريض آخر','warn');return}updatePatient(patient.id,{...form,fullName:form.fullName.trim(),idNumber:form.idNumber.trim(),phone:form.phone.trim(),city:form.city.trim(),area:form.area.trim()});toast('تم تعديل بيانات المريض');onClose()};
  return <Modal title={<><Pencil/>تعديل بيانات المريض</>} onClose={onClose} className="patient-edit-modal"><div className="form-grid"><Field label="الاسم الرباعي" span={2}><input value={form.fullName} onChange={e=>setForm(v=>({...v,fullName:e.target.value}))}/></Field><Field label="رقم الهوية"><input dir="ltr" value={form.idNumber} onChange={e=>setForm(v=>({...v,idNumber:e.target.value}))}/></Field><Field label="تاريخ الميلاد"><input type="date" value={form.dob} onChange={e=>setForm(v=>({...v,dob:e.target.value}))}/></Field><Field label="الجنس"><select value={form.gender} onChange={e=>setForm(v=>({...v,gender:e.target.value as 'male'|'female'}))}><option value="male">ذكر</option><option value="female">أنثى</option></select></Field><Field label="رقم الهاتف"><input dir="ltr" value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></Field><Field label="المدينة"><input value={form.city} onChange={e=>setForm(v=>({...v,city:e.target.value}))}/></Field><Field label="المنطقة / العنوان"><input value={form.area} onChange={e=>setForm(v=>({...v,area:e.target.value}))}/></Field><Field label="جهة التغطية"><select value={form.coverageEntity} onChange={e=>setForm(v=>({...v,coverageEntity:e.target.value}))}>{sponsors.map(s=><option key={s.id} value={s.id}>{s.nameAr}</option>)}</select></Field></div><FormActions><Button className="btn-primary" onClick={save}><Check/>حفظ التعديلات</Button><Button className="btn-ghost" onClick={onClose}>إلغاء</Button></FormActions></Modal>
}

function DeletePatientModal({patientId,onClose,onDeleted}:{patientId:string;onClose:()=>void;onDeleted?:()=>void}){
  const {patients,admissions,deletePatient}=useHospital();const {toast}=useUi();const patient=patients.find(p=>p.id===patientId);const active=admissions.some(a=>a.patientId===patientId&&a.status==='admitted');const [confirmed,setConfirmed]=useState(false);if(!patient)return null;const remove=()=>{if(!confirmed){toast('أكد أنك قرأت تحذير الحذف','warn');return}deletePatient(patient.id);toast('تم حذف المريض من واجهة المستخدم');onClose();onDeleted?.()};return <Modal title={<><Trash2/>حذف المريض</>} onClose={onClose} className="patient-delete-modal"><div className="delete-warning"><Trash2/><div><b>إخفاء ملف المريض من شاشة المستخدم</b><p>سيختفي ملف <strong>{patient.fullName}</strong> من القوائم أمام المستخدم، مع بقاء المرجع محفوظاً في النظام الخاص بمهندس محمد.</p>{active&&<span>تنبيه: للمريض حالة مبيت نشطة حالياً.</span>}</div></div><label className="delete-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>انت على وشك حذف هذا الأمر، هل أنت متأكد من الحذف؟</span></label><FormActions><Button className="btn-danger" onClick={remove} disabled={!confirmed}><Trash2/>حذف المريض</Button><Button className="btn-ghost" onClick={onClose}>إلغاء</Button></FormActions></Modal>}

export function PatientsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { patients } = useHospital();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [editId,setEditId]=useState(''); const [deleteId,setDeleteId]=useState('');
  const [modal, setModal] = useState(
    new URLSearchParams(location.search).get("new") === "1",
  );
  const filtered = patients.filter((p) =>
    `${p.fullName} ${p.idNumber} ${p.medicalSerial}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const canRegister = user?.permissions.includes('patients.create') ?? false;
  const canEdit = user?.permissions.includes('patients.update') ?? false;
  const canDelete = user?.permissions.includes('patients.delete') ?? false;
  const canViewFinance = canViewPatientFinance(user);
  return (
    <>
      <PageHeader
        crumb={t("medicalSecretary")}
        title={t("patientRegistry")}
        sub={
          <>
            {t("totalCount")}: <b>{patients.length}</b>
          </>
        }
        actions={
          canRegister ? (
            <Button className="btn-primary" onClick={() => setModal(true)}>
              <Plus />
              {t("newPatient")}
            </Button>
          ) : undefined
        }
      />
      <Panel>
        <div className="panel-head">
          <h3>
            <Users />
            {t("patientList")}
          </h3>
          <label className="table-search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPatient")}
            />
          </label>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("medicalSerial")}</th>
                  <th>{t("fullName")}</th>
                  <th>{t("idNumber")}</th>
                  <th>{t("gender")}</th>
                  <th>{t("phone")}</th>
                  {canViewFinance && <th>{t("walletBalance")}</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .reverse()
                  .map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <Badge color="violet">{patient.medicalSerial}</Badge>
                      </td>
                      <td>
                        <div className="patient-cell">
                          <PatientAvatar name={patient.fullName} />
                          <b>{patient.fullName}</b>
                        </div>
                      </td>
                      <td>{patient.idNumber}</td>
                      <td>
                        <Badge
                          color={patient.gender === "male" ? "cyan" : "coral"}
                        >
                          {t(patient.gender)}
                        </Badge>
                      </td>
                      <td dir="ltr">{patient.phone}</td>
                      {canViewFinance && (
                        <td>
                          <b
                            className={patient.walletBalance > 0 ? "green" : ""}
                          >
                            {patient.walletBalance.toFixed(2)} ₪
                          </b>
                        </td>
                      )}
                      <td><div className="patient-row-actions">
                        <Button className="btn-ghost btn-sm" onClick={() => navigate(`/patients/${patient.id}`)}>{t("viewFile")}<ArrowLeft className="rtl-arrow" /><ArrowRight className="ltr-arrow" /></Button>
                        {canEdit&&<button type="button" className="icon-btn patient-action-icon" title="تعديل" onClick={()=>setEditId(patient.id)}><Pencil/></button>}
                        {canDelete&&<button type="button" className="icon-btn patient-action-icon danger" title="حذف" onClick={()=>setDeleteId(patient.id)}><Trash2/></button>}
                      </div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t("noPatients")}
            sub={t("noPatientsSub")}
            action={
              canRegister ? (
                <Button
                  className="btn-primary btn-sm"
                  onClick={() => setModal(true)}
                >
                  <Plus />
                  {t("newPatient")}
                </Button>
              ) : undefined
            }
          />
        )}
      </Panel>
      {modal && canRegister && <PatientModal onClose={() => setModal(false)} />}
      {editId&&canEdit&&<EditPatientModal patientId={editId} onClose={()=>setEditId('')}/>}
      {deleteId&&canDelete&&<DeletePatientModal patientId={deleteId} onClose={()=>setDeleteId('')}/>}
    </>
  );
}

function VisitModal({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const financialVisible = canViewPatientFinance(user);
  const { patients, doctors, clinics, registerVisit } = useHospital();
  const { toast } = useUi();
  const visitClinics = useMemo(
    () => clinics.filter((c) => c.active && c.kind !== "inpatient"),
    [clinics],
  );
  const [clinicId, setClinicId] = useState(visitClinics[0]?.id || "");
  const [doctorId, setDoctorId] = useState("");
  const clinic = visitClinics.find((c) => c.id === clinicId);
  const patient = patients.find((p) => p.id === patientId);
  const eligibleDoctors = useMemo(
    () => doctors.filter((d) => d.active && d.clinics.includes(clinicId)),
    [doctors, clinicId],
  );
  useEffect(() => {
    if (!clinicId && visitClinics.length) setClinicId(visitClinics[0].id);
  }, [clinicId, visitClinics]);
  useEffect(() => {
    if (!eligibleDoctors.some((doctor) => doctor.id === doctorId)) {
      setDoctorId(eligibleDoctors[0]?.id || "");
    }
  }, [eligibleDoctors, doctorId]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const result = registerVisit({
      patientId,
      clinicId,
      doctorId: doctorId || String(d.get("doctor") || ""),
      date: String(d.get("date") || today()),
      notes: String(d.get("notes") || ""),
    });
    if (!result.ok) {
      toast(
        result.reason === "insufficient_balance"
          ? t("insufficientWallet")
          : t("selectDoctorClinic"),
        "warn",
      );
      return;
    }
    toast(`${t("visitRegistered")} #${result.visit.queueNumber}`);
    onClose();
  };
  return (
    <Modal
      title={
        <>
          <Building2 />
          {t("registerVisit")}
        </>
      }
      onClose={onClose}
    >
      {financialVisible && <div className="balance-check glass">
        <WalletCards />
        <span>
          {t("availableBalance")}
          <b>{patient?.walletBalance.toFixed(2)} ₪</b>
        </span>
        <span>
          {t("visitFee")}
          <b>{clinic?.visitFee.toFixed(2) || "0.00"} ₪</b>
        </span>
      </div>}
      <form onSubmit={submit}>
        {!visitClinics.length && (
          <div className="visit-modal-alert">
            {language === "ar" ? "لا توجد عيادات خارجية فعالة حالياً. فعّل عيادة من شاشة العيادات أولاً." : "There are no active outpatient clinics. Activate a clinic first."}
          </div>
        )}
        <div className="form-grid">
          <Field label={t("clinic")} span={2}>
            <select
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
              required
            >
              <option value="">— {language === "ar" ? "اختر العيادة" : "Select clinic"} —</option>
              {visitClinics.map((c) => (
                <option value={c.id} key={c.id}>
                  {language === "ar" ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("doctor")}>
            <select name="doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
              <option value="">— {language === "ar" ? "اختر الطبيب" : "Select doctor"} —</option>
              {eligibleDoctors.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          {clinicId && !eligibleDoctors.length && (
            <div className="visit-modal-alert field-span3">
              {language === "ar" ? "لا يوجد طبيب فعّال مربوط بهذه العيادة. اربط طبيباً بالعيادة من شاشة الأطباء." : "No active doctor is assigned to this clinic."}
            </div>
          )}
          {financialVisible && <Field label={t("visitFee")}>
            <input
              value={clinic?.visitFee || 0}
              readOnly
              className="readonly-input"
            />
          </Field>}
          <Field label={t("date")}>
            <input name="date" type="date" defaultValue={today()} />
          </Field>
          <Field label={t("notes")} span={3}>
            <textarea name="notes" />
          </Field>
        </div>
        {financialVisible && <p className="form-hint">{t("cashierFeeHint")}</p>}
        <FormActions>
          <Button className="btn-primary" type="submit" disabled={!clinicId || !doctorId || !visitClinics.length}>
            <Check />
            {t("saveVisit")}
          </Button>
          <Button className="btn-ghost" type="button" onClick={onClose}>
            {t("cancel")}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}


function TransferToInpatientModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { patients, visits, clinics, labs, radiology, requestAdmission, clinicName } = useHospital();
  const { language } = useI18n();
  const { toast } = useUi();
  const patient = patients.find(item => item.id === patientId);
  const inpatientDepartments = clinics.filter(item => item.active && (item.kind === 'inpatient' || item.kind === 'mixed'));
  const patientVisits = visits.filter(item => item.patientId === patientId).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const availableReports = [
    ...labs.filter(item=>item.patientId===patientId && item.status==='done').map(item=>({id:item.id,kind:'lab' as const,title:item.serviceName||item.category,date:item.completedAt?.slice(0,10)||item.date})),
    ...radiology.filter(item=>item.patientId===patientId && item.status==='done').map(item=>({id:item.id,kind:'radiology' as const,title:item.exam,date:item.completedAt?.slice(0,10)||item.date})),
  ];
  const [selectedReports,setSelectedReports]=useState<string[]>(availableReports.map(item=>item.id));
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    requestAdmission({
      patientId,
      diagnosis:String(data.get('diagnosis')),
      preferredWard:String(data.get('ward')||''),
      priority:String(data.get('priority')) as 'routine'|'urgent'|'emergency',
      sourceVisitId:String(data.get('sourceVisit')||'')||undefined,
      reportRefs:availableReports.filter(item=>selectedReports.includes(item.id)),
      requestedBy:user?.displayName||'المستخدم',
    });
    toast('تم إرسال طلب المبيت وتسجيله مباشرة في ملف المريض');
    onClose();
  };
  return <Modal title={<><BedDouble/>تحويل المريض إلى المبيت</>} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="registry-banner inpatient-transfer-banner"><BedDouble/><div><b>{patient?.fullName}</b><span>سيظهر طلب التحويل فوراً لدى مسؤول المبيت وفي ملف المريض والإشعارات.</span></div></div>
      <div className="form-grid">
        <Field label="قسم المبيت المقترح" span={2}><select name="ward"><option value="">— يحدده مسؤول المبيت —</option>{inpatientDepartments.map(item=><option key={item.id} value={item.nameAr}>{language==='ar'?item.nameAr:item.nameEn}</option>)}</select></Field>
        <Field label="الأولوية"><select name="priority" defaultValue="urgent"><option value="routine">عادي</option><option value="urgent">عاجل</option><option value="emergency">طارئ</option></select></Field>
        <Field label="الزيارة المرتبطة" span={3}><select name="sourceVisit"><option value="">بدون زيارة محددة</option>{patientVisits.map(visit=><option key={visit.id} value={visit.id}>#{visit.queueNumber} · {visit.date} · {clinicName(visit.clinicId,language)}</option>)}</select></Field>
        <Field label="سبب / تشخيص التحويل" span={3}><textarea name="diagnosis" required placeholder="اكتب سبب الحاجة للمبيت والحالة السريرية..."/></Field>
      </div>
      <div className="transfer-report-picker">
        <b><FileText/>التقارير والنتائج المرسلة مع طلب المبيت</b>
        {availableReports.length ? <div className="checkbox-grid">{availableReports.map(report=><label key={report.id}><input type="checkbox" checked={selectedReports.includes(report.id)} onChange={()=>setSelectedReports(current=>current.includes(report.id)?current.filter(id=>id!==report.id):[...current,report.id])}/><span>{report.kind==='lab'?'مختبر':'أشعة'} · {report.title} · {report.date}</span></label>)}</div> : <p className="form-hint">لا توجد نتائج مكتملة حالياً. يمكن إرسال الطلب بدون مرفقات وإضافة تقارير المبيت لاحقاً.</p>}
      </div>
      <FormActions><Button className="btn-primary" type="submit"><Check/>إرسال للمبيت</Button><Button className="btn-ghost" type="button" onClick={onClose}>إلغاء</Button></FormActions>
    </form>
  </Modal>;
}

export function PatientProfilePage() {
  const { id = "" } = useParams();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    patients,
    sponsors,
    appointments,
    visits,
    labs,
    radiology,
    admissions,
    admissionRequests,
    diagnosticServices,
    clinicName,
    doctorName,
    updatePatientCoverage,
  } = useHospital();
  const [visitOpen, setVisitOpen] = useState(false);
  const [editOpen,setEditOpen]=useState(false); const [deleteOpen,setDeleteOpen]=useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const patient = patients.find((p) => p.id === id);
  if (!patient)
    return (
      <Panel>
        <EmptyState title={t("noPatients")} sub={t("noPatientsSub")} />
      </Panel>
    );
  const patientAppointments = appointments
    .filter((a) => a.patientId === id)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const patientVisits = visits
    .filter((v) => v.patientId === id)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const canViewFinance = canViewPatientFinance(user);
  const canRegisterVisit = canRegisterVisits(user);
  const patientLabs = labs.filter((item) => item.patientId === id).slice().reverse();
  const patientRadiology = radiology.filter((item) => item.patientId === id).slice().reverse();
  const patientAdmissions = admissions.filter((item) => item.patientId === id).slice().sort((a,b)=>b.admissionDate.localeCompare(a.admissionDate));
  const patientAdmissionRequests = admissionRequests.filter(item=>item.patientId===id).slice().sort((a,b)=>b.requestedAt.localeCompare(a.requestedAt));
  const patientTimeline = (patient.timeline||[]).slice().sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  const canTransferToInpatient = user?.permissions.includes('admissions.create') ?? false;
  const canEditPatient = user?.permissions.includes('patients.update') ?? false;
  const canDeletePatient = user?.permissions.includes('patients.delete') ?? false;
  const hasActiveAdmission = patientAdmissions.some(item=>item.status==='admitted');
  const hasPendingAdmissionRequest = patientAdmissionRequests.some(item=>item.status==='pending');
  const downloadResult = (order: (typeof labs)[number]) => {
    void downloadLabReport(order, patient, order.doctorId ? doctorName(order.doctorId) : t("notSpecified"), language);
  };
  return (
    <>
      <PageHeader
        crumb={`${t("patients")} / ${t("patientFile")}`}
        title={patient.fullName}
        sub={`${t("medicalSerial")}: ${patient.medicalSerial}`}
        actions={
          <>
            <Button className="btn-ghost" onClick={() => navigate("/patients")}>
              <ArrowRight className="rtl-arrow" />
              <ArrowLeft className="ltr-arrow" />
              {t("backToList")}
            </Button>
            {canEditPatient&&<Button className="btn-ghost" onClick={()=>setEditOpen(true)}><Pencil/>تعديل المريض</Button>}
            {canDeletePatient&&<Button className="btn-ghost patient-delete-action" onClick={()=>setDeleteOpen(true)}><Trash2/>حذف</Button>}
            {canTransferToInpatient && !hasActiveAdmission && !hasPendingAdmissionRequest && (
              <Button className="btn-ghost" onClick={() => setTransferOpen(true)}>
                <BedDouble />
                تحويل للمبيت
              </Button>
            )}
            {canRegisterVisit && (
              <Button
                className="btn-primary"
                onClick={() => setVisitOpen(true)}
              >
                <Plus />
                {t("registerVisit")}
              </Button>
            )}
          </>
        }
      />
      <div className="profile-hero glass">
        <PatientAvatar name={patient.fullName} />
        <div>
          <h2>{patient.fullName}</h2>
          <span>
            {patient.idNumber} · {t(patient.gender)} · {patient.phone}
          </span>
        </div>
        <Badge color="violet">{patient.medicalSerial}</Badge>
      </div>
      <div className="profile-grid">
        <Panel>
          <div className="panel-head">
            <h3>
              <UserRound />
              {t("demographics")}
            </h3>
          </div>
          <div className="detail-grid">
            <span>
              {t("dob")}
              <b>{patient.dob}</b>
            </span>
            <span>
              {t("city")}
              <b>{t(patient.city)}</b>
            </span>
            <span>
              {t("area")}
              <b>{patient.area}</b>
            </span>
            <span className="coverage-editor">
              {t("coverage")}
              <select
                value={patient.coverageEntity}
                disabled={!canRegisterVisit}
                onChange={(e) =>
                  updatePatientCoverage(patient.id, e.target.value)
                }
              >
                {sponsors.map((s) => (
                  <option value={s.id} key={s.id}>
                    {language === "ar" ? s.nameAr : s.nameEn}
                  </option>
                ))}
              </select>
            </span>
            <span>
              {t("registrationDate")}
              <b>{patient.regDate}</b>
            </span>
            <span>
              {t("medicalSerial")}
              <b>{patient.medicalSerial}</b>
            </span>
          </div>
        </Panel>
        {canViewFinance && (
          <Panel className="wallet-panel">
            <div className="wallet-head">
              <span>
                <WalletCards />
                {t("patientWallet")}
              </span>
              <b>
                {patient.walletBalance.toFixed(2)} <small>₪</small>
              </b>
            </div>
            <p>{t("walletRule")}</p>
          </Panel>
        )}
      </div>
      <div className="two-col">
        {canViewFinance && (
          <Panel>
            <div className="panel-head">
              <h3>
                <CircleDollarSign />
                {t("financialLedger")}
              </h3>
              <span>
                {patient.ledger.length} {t("transactions")}
              </span>
            </div>
            {patient.ledger.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("timestamp")}</th>
                      <th>{t("service")}</th>
                      <th>{t("transactionType")}</th>
                      <th>{t("amount")}</th>
                      <th>{t("method")}</th>
                      <th>{t("receipt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.ledger
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            {new Date(entry.timestamp).toLocaleString(
                              language === "ar" ? "ar-EG" : "en-US",
                            )}
                          </td>
                          <td>
                            <b>{entry.service}</b>
                          </td>
                          <td>
                            <Badge
                              color={
                                entry.type === "credit" ? "emerald" : "coral"
                              }
                            >
                              {t(entry.type)}
                            </Badge>
                          </td>
                          <td
                            className={
                              entry.type === "credit" ? "green" : "red"
                            }
                          >
                            {entry.type === "credit" ? "+" : "-"}
                            {entry.amount.toFixed(2)} ₪
                          </td>
                          <td>{t(entry.method)}</td>
                          <td>{entry.receiptNumber}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t("noTransactions")}
                sub={t("noTransactionsSub")}
              />
            )}
          </Panel>
        )}
        <Panel>
          <div className="panel-head">
            <h3>
              <MapPinned />
              {t("followUpAppointments")}
            </h3>
          </div>
          {patientAppointments.length ? (
            <div className="appointment-list">
              {patientAppointments.map((item) => (
                <article className="glass" key={item.id}>
                  <div>
                    <b>{item.date}</b>
                    <span>
                      {clinicName(item.clinicId, language)} ·{" "}
                      {doctorName(item.doctorId)}
                    </span>
                  </div>
                  <Badge
                    color={appointmentComputed(item) === "auto_closed" ? "coral" : item.status === "scheduled" ? "amber" : "emerald"}
                  >
                    {appointmentLabel(item)}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("noAppointments")}
              sub={t("noAppointmentsSub")}
            />
          )}
          <div className="panel-head section-gap">
            <h3>
              <Building2 />
              {t("visitHistory")}
            </h3>
          </div>
          <div className="mini-list">
            {patientVisits.slice(0, 5).map((v) => (
              <div key={v.id}>
                <span>
                  #{v.queueNumber} · {clinicName(v.clinicId, language)} · {v.status==='completed'?'تمت الزيارة':v.status==='exam'?'قيد الفحص':'بالانتظار'}
                </span>
                <b>{v.date}</b>
                {v.diagnosis && <small className="table-sub">التشخيص: {v.diagnosis}</small>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel className="patient-admission-requests">
        <div className="panel-head"><h3><BedDouble />طلبات التحويل للمبيت</h3><span>{patientAdmissionRequests.length}</span></div>
        {patientAdmissionRequests.length ? <div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>سبب التحويل</th><th>القسم المقترح</th><th>المرفقات</th><th>الحالة</th></tr></thead><tbody>{patientAdmissionRequests.map(request=><tr key={request.id}><td>{new Date(request.requestedAt).toLocaleString('ar-EG')}</td><td><b>{request.diagnosis}</b><small className="table-sub">بواسطة {request.requestedBy}</small></td><td>{request.preferredWard||'يحدده مسؤول المبيت'}</td><td>{request.reportRefs.length?request.reportRefs.map(report=>report.title).join('، '):'—'}</td><td><Badge color={request.status==='accepted'?'emerald':request.status==='cancelled'?'coral':'amber'}>{request.status==='accepted'?'تم الإدخال':request.status==='cancelled'?'ملغي':'بانتظار مسؤول المبيت'}</Badge></td></tr>)}</tbody></table></div> : <EmptyState title="لا توجد طلبات تحويل" sub="عند إرسال المريض للمبيت يظهر الطلب هنا مع التقارير المرفقة."/>}
      </Panel>
      <Panel className="patient-inpatient-file">
        <div className="panel-head"><h3><Building2 />ملف المبيت الداخلي</h3><span>{patientAdmissions.length} حالة</span></div>
        {patientAdmissions.length ? <div className="table-wrap"><table><thead><tr><th>القسم / الغرفة</th><th>الدخول</th><th>الخروج</th><th>التشخيص</th>{canViewFinance&&<><th>التكلفة</th><th>المدفوع</th><th>المتبقي</th></>}<th>الحالة</th></tr></thead><tbody>{patientAdmissions.map(a=>{const tx=a.transactions||[];const end=a.dischargedAt?.slice(0,10)||today();const dayCount=Math.max(1,Math.ceil((new Date(end+'T12:00:00').getTime()-new Date(a.admissionDate+'T12:00:00').getTime())/86400000)+1);const recordedCharges=tx.filter(x=>x.type==='charge').reduce((sum,x)=>sum+x.amount,0);const hasDaily=tx.some(x=>x.category==='daily'||x.description.startsWith('إقامة يومية'));const charges=recordedCharges+(!hasDaily?(a.dailyRate||0)*dayCount*(a.contributionPct||0)/100:0);const paid=tx.filter(x=>x.type==='payment').reduce((sum,x)=>sum+x.amount,0);return <tr key={a.id}><td><b>{a.ward}</b><small className="table-sub">غرفة {a.room||'—'} · سرير {a.bed||'—'} · المسؤول {a.responsiblePerson||'—'}</small></td><td>{a.admissionDate}</td><td>{a.dischargedAt?.slice(0,10)||'حتى الآن'}</td><td>{a.diagnosis||'—'}</td>{canViewFinance&&<><td>{charges.toFixed(2)} ₪</td><td className="green">{paid.toFixed(2)} ₪</td><td><b>{Math.max(0,charges-paid).toFixed(2)} ₪</b></td></>}<td><Badge color={a.status==='admitted'?'emerald':'coral'}>{a.status==='admitted'?'مقيم':'خرج'}</Badge></td></tr>})}</tbody></table></div> : <EmptyState title="لا يوجد سجل مبيت" sub="تظهر هنا جميع حالات المبيت والتقارير والمتابعات المرتبطة بهذا المريض." />}
        {patientAdmissions.some(a=>(a.notes||[]).length>0) && <div className="patient-inpatient-notes"><h4>متابعات المبيت</h4>{patientAdmissions.flatMap(a=>(a.notes||[]).map(n=>({...n,admissionDate:a.admissionDate}))).sort((a,b)=>b.date.localeCompare(a.date)).map(n=><article key={n.id}><b>{n.category==='clinical'?'سريري':n.category==='administrative'?'إداري':'تسليم واستلام'}</b><span>{n.text}</span><small>{new Date(n.date).toLocaleString('ar-EG')} · {n.author}</small></article>)}</div>}
        {patientAdmissions.some(a=>(a.reports||[]).length>0) && <div className="patient-inpatient-notes"><h4>تقارير المبيت المرسلة للملف</h4>{patientAdmissions.flatMap(a=>(a.reports||[])).sort((a,b)=>b.date.localeCompare(a.date)).map(report=><article key={report.id}><b><FileText/>{report.title}</b><span>{report.summary}</span><small>{new Date(report.date).toLocaleString('ar-EG')} · {report.author}</small></article>)}</div>}
      </Panel>
      <Panel className="patient-timeline-panel">
        <div className="panel-head"><h3><Clock3 />السجل الزمني الكامل للمريض</h3><span>{patientTimeline.length}</span></div>
        {patientTimeline.length ? <div className="patient-timeline">{patientTimeline.map(item=><article key={item.id}><i/><div><b>{item.title}</b><span>{item.description}</span><small>{new Date(item.timestamp).toLocaleString(language==='ar'?'ar-EG':'en-US')}{item.status?` · ${item.status}`:''}</small></div></article>)}</div> : <EmptyState title="لا توجد أحداث بعد" sub="ستظهر هنا الزيارات والطابور والمبيت والتقارير والحركات المرتبطة بالمريض."/>}
      </Panel>
      <div className="patient-diagnostics-grid">
        <Panel>
          <div className="panel-head"><h3><FlaskConical />{t("labResultsAndReports")}</h3><span>{patientLabs.length}</span></div>
          {patientLabs.length ? <div className="table-wrap"><table><thead><tr><th>{t("diagnosticService")}</th><th>{t("requestingDoctor")}</th><th>{t("date")}</th><th>{t("status")}</th><th /></tr></thead><tbody>{patientLabs.map(order => {
            const service = diagnosticServices.find(item => item.id === order.serviceId);
            return <tr key={order.id}><td><b>{language === "ar" ? service?.nameAr || order.serviceName : service?.nameEn || order.serviceName}</b></td><td>{order.doctorId ? doctorName(order.doctorId) : t("notSpecified")}</td><td>{order.completedAt ? new Date(order.completedAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US") : order.date}</td><td><Badge color={order.status === "done" ? "emerald" : "amber"}>{t(order.status)}</Badge></td><td>{order.status === "done" && order.resultRows?.length ? <Button className="btn-ghost btn-sm" onClick={() => downloadResult(order)}><Download />{t("downloadPdf")}</Button> : null}</td></tr>;
          })}</tbody></table></div> : <EmptyState title={t("noLabReports")} sub={t("noLabReportsSub")} />}
        </Panel>
        <Panel>
          <div className="panel-head"><h3><ScanLine />{t("radiologyFiles")}</h3><span>{patientRadiology.length}</span></div>
          {patientRadiology.length ? <div className="table-wrap"><table><thead><tr><th>{t("examType")}</th><th>{t("requestingDoctor")}</th><th>{t("date")}</th><th>{t("status")}</th></tr></thead><tbody>{patientRadiology.map(order => <tr key={order.id}><td><b>{order.exam}</b></td><td>{order.doctorId ? doctorName(order.doctorId) : t("notSpecified")}</td><td>{order.date}</td><td><Badge color={order.status === "done" ? "emerald" : "amber"}>{t(order.status)}</Badge></td></tr>)}</tbody></table></div> : <EmptyState title={t("noRadiologyFiles")} sub={t("noRadiologyFilesSub")} />}
        </Panel>
      </div>
      {visitOpen && canRegisterVisit && (
        <VisitModal
          patientId={patient.id}
          onClose={() => setVisitOpen(false)}
        />
      )}
      {transferOpen && canTransferToInpatient && <TransferToInpatientModal patientId={patient.id} onClose={()=>setTransferOpen(false)}/>}
          {editOpen&&canEditPatient&&<EditPatientModal patientId={patient.id} onClose={()=>setEditOpen(false)}/>}
      {deleteOpen&&canDeletePatient&&<DeletePatientModal patientId={patient.id} onClose={()=>setDeleteOpen(false)} onDeleted={()=>navigate('/patients')}/>}
</>
  );
}
