import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Admission, AdmissionRequest, CivilRegistryRecord, Clinic, DiagnosticService, Doctor, DoctorNote, Finding,
  FollowUpAppointment, HospitalState, Invoice, LabOrder, Patient, QueueItem, CashierWorkflowCase,
  LabResultRow, RadiologyOrder, Sponsor, TransferDetails, Visit, InpatientTransaction, InpatientNote, InpatientReport, PatientEvent, NotificationItem,
} from '../types';
import { hospitalApi } from '../services/hospitalApi.service';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'wafaa_his_react_state_v2';
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const addSevenDays = (date: string) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + 7); return value.toISOString().slice(0, 10); };

const clinicSeed: Clinic[] = [
  {id:'CLN-1',key:'general',code:'GEN',nameAr:'العيادة العامة',nameEn:'General clinic',visitFee:15,kind:'outpatient',active:true},
  {id:'CLN-2',key:'ortho',code:'ORT',nameAr:'جراحة العظام',nameEn:'Orthopedics',visitFee:25,kind:'outpatient',active:true},
  {id:'CLN-3',key:'neuro',code:'NEU',nameAr:'المخ والأعصاب',nameEn:'Neurology',visitFee:30,kind:'outpatient',active:true},
  {id:'CLN-4',key:'dental',code:'DEN',nameAr:'عيادة الأسنان',nameEn:'Dental clinic',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-5',key:'pt',code:'PTH',nameAr:'العلاج الطبيعي',nameEn:'Physical therapy',visitFee:18,kind:'outpatient',active:true},
  {id:'CLN-6',key:'eye',code:'EYE',nameAr:'عيادة العيون',nameEn:'Ophthalmology',visitFee:22,kind:'outpatient',active:true},
  {id:'CLN-7',key:'derma',code:'DRM',nameAr:'الجلدية',nameEn:'Dermatology',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-8',key:'ent',code:'ENT',nameAr:'أنف وأذن وحنجرة',nameEn:'ENT',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-9',key:'peds',code:'PED',nameAr:'طب الأطفال',nameEn:'Pediatrics',visitFee:15,kind:'outpatient',active:true},
  {id:'CLN-10',key:'internal',code:'INT',nameAr:'الباطنة',nameEn:'Internal medicine',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-11',key:'cardio',code:'CAR',nameAr:'القلبية',nameEn:'Cardiology',visitFee:30,kind:'outpatient',active:true},
  {id:'CLN-12',key:'obgyn',code:'OBG',nameAr:'النسائية والتوليد',nameEn:'Obstetrics & gynecology',visitFee:25,kind:'outpatient',active:true},
  {id:'CLN-13',key:'surgery',code:'SUR',nameAr:'الجراحة العامة والمناظير',nameEn:'General surgery & endoscopy',visitFee:30,kind:'outpatient',active:true},
  {id:'CLN-14',key:'rehab',code:'REH',nameAr:'الروماتيزم والتأهيل',nameEn:'Rheumatology & rehabilitation',visitFee:18,kind:'outpatient',active:true},
  {id:'CLN-15',key:'endocrine',code:'END',nameAr:'الغدد والسكري',nameEn:'Endocrinology & diabetes',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-16',key:'urology',code:'URO',nameAr:'جراحة المسالك البولية',nameEn:'Urology',visitFee:25,kind:'outpatient',active:true},
  {id:'CLN-17',key:'psychiatry',code:'PSY',nameAr:'الطب النفسي',nameEn:'Psychiatry',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-18',key:'ultrasound',code:'USG',nameAr:'التصوير التلفزيوني',nameEn:'Ultrasound imaging',visitFee:35,kind:'outpatient',active:true},
  {id:'CLN-19',key:'vascular',code:'VAS',nameAr:'جراحة الأوعية الدموية',nameEn:'Vascular surgery',visitFee:30,kind:'outpatient',active:true},
  {id:'CLN-20',key:'audiology',code:'AUD',nameAr:'السمعيات',nameEn:'Audiology',visitFee:20,kind:'outpatient',active:true},
  {id:'CLN-21',key:'nerve_emg',code:'EMG',nameAr:'تخطيط العصب',nameEn:'Nerve conduction / EMG',visitFee:30,kind:'outpatient',active:true},
  {id:'CLN-INPATIENT',key:'inpatient',code:'INP',nameAr:'قسم المبيت الداخلي',nameEn:'Inpatient Department',visitFee:0,dailyRate:120,kind:'inpatient',active:true},
];

const sponsorSeed: Sponsor[] = [
  { id:'moh', nameAr:'وزارة الصحة', nameEn:'Ministry of Health' },
  { id:'unrwa', nameAr:'وكالة الغوث (الأونروا)', nameEn:'UNRWA' },
  { id:'private', nameAr:'تأمين خاص', nameEn:'Private insurance' },
  { id:'self', nameAr:'مساهمة ذاتية / حالة إنسانية', nameEn:'Self-funded / humanitarian' },
  { id:'charity', nameAr:'جمعيات خيرية', nameEn:'Charitable organizations' },
];

const diagnosticServiceSeed: DiagnosticService[] = [
  {id:'DS-LAB-001',type:'lab',nameAr:'الكيمياء السريرية',nameEn:'Clinical Chemistry',category:'clinicalChemistry',price:45,active:true,tests:[
    {test:'F.B.S',referenceRange:'70 - 110 mg/dL'},{test:'P.P.B.S',referenceRange:'< 140 mg/dL'},{test:'Urea',referenceRange:'10 - 45 mg/dL'},
    {test:'Creatinine',referenceRange:'M 0.6 - 1.2 / F 0.5 - 1.1 mg/dL'},{test:'Uric Acid',referenceRange:'2.5 - 7.0 mg/dL'},
    {test:'Cholesterol',referenceRange:'150 - 250 mg/dL'},{test:'Triglycerides',referenceRange:'< 200 mg/dL'},{test:'H.D.L',referenceRange:'> 40 mg/dL'},
    {test:'L.D.L',referenceRange:'< 130 mg/dL'},{test:'Total Protein',referenceRange:'6 - 8 g/dL'},{test:'Albumin',referenceRange:'3.5 - 5.3 g/dL'},
    {test:'AST (SGOT)',referenceRange:'< 37 U/L'},{test:'ALT (SGPT)',referenceRange:'< 41 U/L'},{test:'Sodium',referenceRange:'135 - 145 mmol/L'},{test:'Potassium',referenceRange:'3.5 - 5.1 mmol/L'},
  ]},
  {id:'DS-LAB-002',type:'lab',nameAr:'صورة دم كاملة',nameEn:'Complete Blood Count',category:'hematology',price:30,active:true,tests:[
    {test:'WBC',referenceRange:'4.0 - 11.0 x10³/µL'},{test:'RBC',referenceRange:'4.2 - 5.9 x10⁶/µL'},{test:'Hemoglobin',referenceRange:'12 - 17 g/dL'},
    {test:'Hematocrit',referenceRange:'36 - 50 %'},{test:'Platelets',referenceRange:'150 - 450 x10³/µL'},{test:'MCV',referenceRange:'80 - 100 fL'},
    {test:'MCH',referenceRange:'27 - 33 pg'},{test:'MCHC',referenceRange:'32 - 36 g/dL'},
  ]},
  {id:'DS-LAB-003',type:'lab',nameAr:'تحاليل الهرمونات',nameEn:'Endocrinology Panel',category:'endocrinology',price:60,active:true,tests:[
    {test:'Free T4',referenceRange:'0.8 - 1.8 ng/dL'},{test:'T.S.H',referenceRange:'0.4 - 4.0 µIU/mL'},{test:'Estradiol',referenceRange:'According to age / sex'},
    {test:'Cortisol',referenceRange:'5 - 25 µg/dL'},{test:'H.G.H',referenceRange:'0 - 10 ng/mL'},{test:'BETA-HCG',referenceRange:'< 5 mIU/mL'},
    {test:'DHEA-S',referenceRange:'According to age / sex'},{test:'C-Peptide',referenceRange:'0.5 - 2.0 ng/mL'},
  ]},
  {id:'DS-LAB-004',type:'lab',nameAr:'زراعة وحساسية',nameEn:'Culture & Sensitivity',category:'microbiology',price:55,active:true,tests:[
    {test:'Specimen',referenceRange:'Urine / Sputum / Pus / Stool / Blood'},{test:'Organism',referenceRange:'No growth'},
    {test:'Culture',referenceRange:'Negative'},{test:'Sensitivity',referenceRange:'Sensitive / Intermediate / Resistant'},
  ]},
  {id:'DS-LAB-005',type:'lab',nameAr:'تحليل البول',nameEn:'Urine Analysis',category:'urineAnalysis',price:20,active:true,tests:[
    {test:'Color',referenceRange:'Yellow'},{test:'Appearance',referenceRange:'Clear'},{test:'pH',referenceRange:'4.5 - 8.0'},{test:'Protein',referenceRange:'Negative'},
    {test:'Glucose',referenceRange:'Negative'},{test:'WBC',referenceRange:'0 - 5 /HPF'},{test:'RBC',referenceRange:'0 - 2 /HPF'},
  ]},
  {id:'DS-RAD-001',type:'radiology',nameAr:'أشعة صدر',nameEn:'Chest X-Ray',category:'xray',price:35,active:true,tests:[]},
  {id:'DS-RAD-002',type:'radiology',nameAr:'ألتراساوند البطن',nameEn:'Abdominal Ultrasound',category:'ultrasound',price:70,active:true,tests:[]},
  {id:'DS-RAD-003',type:'radiology',nameAr:'أشعة مقطعية',nameEn:'CT Scan',category:'ct',price:180,active:true,tests:[]},

];

const mapDiagnosticService = (row: { id:string; type:'lab'|'radiology'; name_ar:string; name_en:string; category:string; price:string|number; active:boolean; tests?:Array<{test:string;reference_range?:string|null}>|null }): DiagnosticService => ({
  id:row.id, type:row.type, nameAr:row.name_ar, nameEn:row.name_en, category:row.category,
  price:Number(row.price||0), active:Boolean(row.active),
  tests:(row.tests||[]).map(item=>({test:item.test,referenceRange:item.reference_range||''})),
});

const emptyState: HospitalState = {
  patients:[], doctors:[], clinics:clinicSeed, sponsors:sponsorSeed, visits:[], queue:[],
  admissions:[], admissionRequests:[], notifications:[], invoices:[], paymentCases:[], diagnosticServices:diagnosticServiceSeed, labs:[], radiology:[], appointments:[], doctorNotes:[],
};

function loadState(): HospitalState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if(!stored) return emptyState;
    const parsed = JSON.parse(stored);
    let clinics: Clinic[] = (parsed.clinics?.length ? parsed.clinics : clinicSeed).map((clinic:Clinic)=>({...clinic,kind:clinic.kind || 'outpatient'}));
    const knownKeys = new Set(clinics.map(clinic=>clinic.key));
    clinics = [...clinics, ...clinicSeed.filter(clinic=>!knownKeys.has(clinic.key))];
    clinics = clinics.map(clinic=>({...clinic,code:clinic.code || clinicSeed.find(seed=>seed.key===clinic.key)?.code || clinic.key.slice(0,3).toUpperCase()}));
    return {
      ...emptyState,
      ...parsed,
      clinics,
      patients:(parsed.patients||[]).map((patient:Patient)=>({...patient,timeline:patient.timeline||[],ledger:patient.ledger||[],findings:patient.findings||[]})),
      queue:(parsed.queue||[]).map((item:QueueItem)=>({...item,priority:item.priority||3,triageNote:item.triageNote||'',paymentReleased:item.paymentReleased ?? true})),
      admissions:(parsed.admissions||[]).map((item:Admission)=>({...item,transactions:item.transactions||[],notes:item.notes||[],reports:item.reports||[],coverageMovements:item.coverageMovements||[]})),
      admissionRequests:parsed.admissionRequests||[],
      notifications:parsed.notifications||[],
      paymentCases:parsed.paymentCases||[],
      diagnosticServices:parsed.diagnosticServices?.length?parsed.diagnosticServices:diagnosticServiceSeed,
    };
  } catch { return emptyState; }
}

type VisitResult = { ok:true; visit:Visit } | { ok:false; reason:'insufficient_balance' | 'missing_doctor' | 'missing_clinic' };
type DiagnosticOrderResult = {ok:true;order:LabOrder|RadiologyOrder}|{ok:false;reason:'insufficient_balance'|'missing_service'|'missing_patient'};

interface HospitalValue extends HospitalState {
  addPatient: (record: CivilRegistryRecord, phone: string) => Patient;
  updatePatient: (patientId:string, patch:Partial<Pick<Patient,'fullName'|'idNumber'|'dob'|'gender'|'phone'|'city'|'area'|'coverageEntity'>>) => void;
  deletePatient: (patientId:string) => void;
  addFinding: (patientId:string, region:string, note:string) => void;
  updatePatientCoverage: (patientId:string, sponsorId:string) => void;
  registerVisit: (value:{patientId:string; clinicId:string; doctorId:string; date:string; notes:string; appointmentId?:string}) => VisitResult;
  moveQueueItem: (id:string, status:QueueItem['status']) => void;
  updateQueueItem: (id:string, patch:Partial<Pick<QueueItem,'status'|'queueNumber'|'priority'|'triageNote'>>) => void;
  reorderQueueItem: (id:string, direction:'up'|'down') => void;
  finishVisit: (visitId:string) => FollowUpAppointment | null;
  bookFollowUp: (appointmentId:string) => VisitResult;
  addDoctorNote: (doctorId:string, patientId:string, text:string) => void;
  requestAdmission: (value:{patientId:string;diagnosis:string;preferredWard?:string;priority:AdmissionRequest['priority'];sourceVisitId?:string;reportRefs?:AdmissionRequest['reportRefs'];requestedBy:string}) => AdmissionRequest;
  resolveAdmissionRequest: (id:string, status:'accepted'|'cancelled', admissionId?:string) => void;
  addAdmission: (value:Omit<Admission,'id'|'status'>) => Admission;
  updateAdmission: (id:string, patch:Partial<Admission>) => void;
  addInpatientTransaction: (admissionId:string, value:Omit<InpatientTransaction,'id'>) => void;
  addInpatientNote: (admissionId:string, value:Omit<InpatientNote,'id'>) => void;
  addInpatientReport: (admissionId:string, value:Omit<InpatientReport,'id'>) => void;
  syncInpatientCharges: () => void;
  discharge: (id:string) => void;
  addInvoice: (value:{patientId:string;service:string;unitPrice:number;coveragePct:number;paymentMethod:'cash'|'app';transferDetails?:TransferDetails}) => Invoice;
  paymentCases: CashierWorkflowCase[];
  refreshWorkflowCases: () => Promise<void>;
  completeWorkflowPayment: (id:string, value:{amount:number;paymentMethod:'cash'|'app';paymentSource:string;senderName?:string;senderPhone?:string;notes?:string}) => Promise<CashierWorkflowCase | null>;
  collectWorkflowCase: (id:string, receiptNumber?:string) => Promise<CashierWorkflowCase | null>;
  updateWorkflowCase: (id:string, patch:Partial<CashierWorkflowCase>) => Promise<CashierWorkflowCase | null>;
  deleteWorkflowCase: (id:string) => Promise<void>;
  addManualWorkflowCase: (value:Partial<CashierWorkflowCase> & {visitId:string;patientId:string;patientName:string;medicalSerial:string;clinicId:string;clinicName:string;clinicCode:string;doctorId:string;doctorName:string;visitDate:string;queueNumber:number;amount:number}) => Promise<CashierWorkflowCase | null>;
  addDoctor: (value:Omit<Doctor,'id'|'active'>) => Promise<Doctor>;
  removeDoctor: (id:string) => Promise<void>;
  addClinic: (value:{nameAr:string;nameEn:string;code?:string;visitFee:number;kind?:'outpatient'|'inpatient'|'mixed';dailyRate?:number}) => Promise<Clinic>;
  removeClinic: (id:string) => Promise<void>;
  updateClinicFee: (id:string, fee:number) => Promise<Clinic>;
  addSponsor: (nameAr:string, nameEn:string) => Sponsor;
  refreshDiagnosticServices: () => Promise<DiagnosticService[]>;
  addDiagnosticService: (value:Omit<DiagnosticService,'id'|'active'>) => Promise<DiagnosticService>;
  updateDiagnosticService: (id:string, patch:Partial<Omit<DiagnosticService,'id'>>) => Promise<DiagnosticService>;
  removeDiagnosticService: (id:string) => Promise<void>;
  orderDiagnostic: (value:{patientId:string;serviceId:string;doctorId?:string}) => DiagnosticOrderResult;
  completeLabOrder: (id:string, resultRows:LabResultRow[], notes:string) => LabOrder | null;
  addLab: (value:Omit<LabOrder,'id'|'status'>) => void;
  addRadiology: (value:Omit<RadiologyOrder,'id'|'status'>) => void;
  updateRadiologyOrder: (id:string, patch:Partial<Pick<RadiologyOrder,'status'|'result'|'completedAt'>>) => void;
  markNotificationRead: (id:string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  pushNotification: (value:Pick<NotificationItem,'title'|'body'|'type'> & Partial<Pick<NotificationItem,'link'|'patientId'>>) => void;
  resetAll: () => void;
  patientName: (id:string) => string;
  doctorName: (id:string) => string;
  clinicName: (id:string, language?:'ar'|'en') => string;
}

const HospitalContext = createContext<HospitalValue | null>(null);

const event = (type:PatientEvent['type'], title:string, description:string, referenceId?:string, status?:string):PatientEvent => ({
  id:makeId('EVT'), type, title, description, timestamp:new Date().toISOString(), referenceId, status,
});
const notice = (title:string, body:string, type:'info'|'success'|'warning'|'critical'='info', link?:string, patientId?:string) => ({
  id:makeId('NTF'), title, body, createdAt:new Date().toISOString(), read:false, type, link, patientId,
});
const stayDays = (from:string,to?:string) => Math.max(1,Math.ceil((new Date((to||today())+'T12:00:00').getTime()-new Date(from+'T12:00:00').getTime())/86400000)+1);

// Hospital-wide 9-digit patient/case number. It is intentionally independent by gender:
// male   => 1 + YYYY + ####, female => 2 + YYYY + ####.
// Every current and future department uses the patient's medicalSerial as the shared case identifier.
const SERIAL_SEQUENCE_KEY = 'wafaa_his_patient_serial_sequences_v1';
const nextMedicalSerial = (patients:Patient[], gender:'male'|'female', year:number) => {
  const prefix = gender === 'male' ? '1' : '2';
  const stem = `${prefix}${year}`;
  const counterKey = `${gender}:${year}`;
  const used = new Set(
    patients
      .map(patient => patient.medicalSerial)
      .filter(serial => new RegExp(`^${stem}\\d{4}$`).test(serial))
      .map(serial => Number(serial.slice(-4)))
      .filter(value => Number.isInteger(value) && value > 0),
  );
  const registeredCount = patients.filter(patient => patient.gender === gender && Number(patient.regDate?.slice(0, 4)) === year).length;
  let counters:Record<string,number> = {};
  try { counters = JSON.parse(localStorage.getItem(SERIAL_SEQUENCE_KEY) || '{}'); } catch { counters = {}; }
  let sequence = Math.max(Number(counters[counterKey] || 0), registeredCount) + 1;
  while (sequence <= 9999 && used.has(sequence)) sequence += 1;
  if (sequence > 9999) throw new Error('تم استنفاد الأرقام التسلسلية لهذه السنة');
  counters[counterKey] = sequence;
  localStorage.setItem(SERIAL_SEQUENCE_KEY, JSON.stringify(counters));
  return `${stem}${String(sequence).padStart(4, '0')}`;
};


export function HospitalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<HospitalState>(loadState);
  const [paymentCases, setPaymentCases] = useState<CashierWorkflowCase[]>([]);
  const hydratedRef = useRef(false);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  // v4.3.46 performance: the old implementation serialized the entire hospital
  // state synchronously after every state change (and once immediately on mount).
  // With real patient/session history this can block the browser main thread.
  // Debounce persistence and skip the redundant first rewrite.
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latestStateRef.current));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, user?.role]);

  useEffect(() => {
    const flush = () => {
      if (!hydratedRef.current) return;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(latestStateRef.current)); } catch { /* storage may be unavailable */ }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const refreshWorkflowCases = useCallback(async () => {
    const allowed = user?.permissions.some(key => ['cashier_payment.view','cashier_collection.view','financial_audit.view'].includes(key));
    if (!allowed) { setPaymentCases([]); return; }
    try { setPaymentCases(await hospitalApi.cashierWorkflowCases()); } catch { /* keep the last successful snapshot */ }
  }, [user?.id, user?.permissions]);

  useEffect(() => {
    void refreshWorkflowCases();
    const allowed = user?.permissions.some(key => ['cashier_payment.view','cashier_collection.view','financial_audit.view'].includes(key));
    if (!allowed) return;
    const timer = window.setInterval(() => { void refreshWorkflowCases(); }, 3000);
    return () => window.clearInterval(timer);
  }, [refreshWorkflowCases, user?.id]);

  const mergeWorkflowCase = useCallback((item:CashierWorkflowCase) => {
    setPaymentCases(previous => [item, ...previous.filter(row => row.id !== item.id)].sort((a,b)=>(b.registeredAt||'').localeCompare(a.registeredAt||'')));
    return item;
  }, []);

  const completeWorkflowPayment = useCallback(async (id:string, value:{amount:number;paymentMethod:'cash'|'app';paymentSource:string;senderName?:string;senderPhone?:string;notes?:string}) => {
    const item = await hospitalApi.completeCashierWorkflowPayment(id, value);
    return mergeWorkflowCase(item);
  }, [mergeWorkflowCase]);

  const collectWorkflowCase = useCallback(async (id:string, receiptNumber?:string) => {
    const item = await hospitalApi.collectCashierWorkflowCase(id, receiptNumber);
    return mergeWorkflowCase(item);
  }, [mergeWorkflowCase]);

  const updateWorkflowCase = useCallback(async (id:string, patch:Partial<CashierWorkflowCase>) => {
    const map:Record<string,unknown> = {};
    const keys: Array<[keyof CashierWorkflowCase,string]> = [
      ['patientName','patient_name'],['medicalSerial','medical_serial'],['idNumber','id_number'],['patientPhone','patient_phone'],['patientDob','patient_dob'],['patientGender','patient_gender'],['patientCity','patient_city'],['patientArea','patient_area'],['coverageEntity','coverage_entity'],['clinicId','clinic_id'],['clinicName','clinic_name'],['clinicCode','clinic_code'],
      ['doctorId','doctor_id'],['doctorName','doctor_name'],['visitDate','visit_date'],['queueNumber','queue_number'],['amount','amount'],['paymentMethod','payment_method'],
      ['paymentSource','payment_source'],['senderName','sender_name'],['senderPhone','sender_phone'],['receiptNumber','receipt_number'],['notes','notes'],['status','status'],['auditedAt','audited_at'],
    ];
    keys.forEach(([from,to]) => { if (patch[from] !== undefined) map[to] = patch[from] as unknown; });
    const item = await hospitalApi.updateCashierWorkflowCase(id, map);
    return mergeWorkflowCase(item);
  }, [mergeWorkflowCase]);

  const deleteWorkflowCase = useCallback(async (id:string) => {
    await hospitalApi.deleteCashierWorkflowCase(id);
    setPaymentCases(previous => previous.filter(item => item.id !== id));
  }, []);

  const addManualWorkflowCase = useCallback(async (value:Partial<CashierWorkflowCase> & {visitId:string;patientId:string;patientName:string;medicalSerial:string;clinicId:string;clinicName:string;clinicCode:string;doctorId:string;doctorName:string;visitDate:string;queueNumber:number;amount:number}) => {
    const stamp = new Date().toISOString();
    const item = await hospitalApi.addManualCashierWorkflowCase({
      id:value.id || makeId('CWF'), visit_id:value.visitId, patient_id:value.patientId, patient_name:value.patientName, medical_serial:value.medicalSerial,
      id_number:value.idNumber || '', patient_phone:value.patientPhone || '', patient_dob:value.patientDob || null, patient_gender:value.patientGender || null, patient_city:value.patientCity || '', patient_area:value.patientArea || '', coverage_entity:value.coverageEntity || '',
      clinic_id:value.clinicId, clinic_name:value.clinicName, clinic_code:value.clinicCode, doctor_id:value.doctorId, doctor_name:value.doctorName,
      visit_date:value.visitDate, queue_number:value.queueNumber, amount:value.amount, payment_method:value.paymentMethod || 'cash', payment_source:value.paymentSource || 'نقدي',
      sender_name:value.senderName || 'نفسه', sender_phone:value.senderPhone || '', receipt_number:value.receiptNumber || '', paid_at:value.paidAt || stamp,
      collected_at:value.collectedAt || stamp, notes:value.notes || '',
    });
    return mergeWorkflowCase(item);
  }, [mergeWorkflowCase]);

  const addPatient = useCallback((record:CivilRegistryRecord, phone:string) => {
    const year = new Date().getFullYear();
    const medicalSerial = nextMedicalSerial(state.patients, record.gender, year);
    const created:Patient = { id:makeId('PAT'), medicalSerial, ...record, phone, regDate:today(), findings:[], walletBalance:0, ledger:[], timeline:[event('note','فتح ملف المريض',`تم إنشاء الملف الطبي وتسجيل المريض في النظام برقم الحالة ${medicalSerial}`)] };
    setState(previous => ({ ...previous, patients:[...previous.patients, created] }));
    return created;
  }, [state.patients]);


  const updatePatient = useCallback((patientId:string, patch:Partial<Pick<Patient,'fullName'|'idNumber'|'dob'|'gender'|'phone'|'city'|'area'|'coverageEntity'>>) => setState(previous => ({
    ...previous,
    patients:previous.patients.map(patient=>patient.id===patientId?{...patient,...patch,timeline:[...(patient.timeline||[]),event('note','تعديل بيانات المريض','تم تحديث بيانات ملف المريض')]}:patient),
  })), []);

  const deletePatient = useCallback((patientId:string) => setState(previous => {
    const visitIds=new Set(previous.visits.filter(v=>v.patientId===patientId).map(v=>v.id));
    const admissionIds=new Set(previous.admissions.filter(a=>a.patientId===patientId).map(a=>a.id));
    return {
      ...previous,
      patients:previous.patients.filter(p=>p.id!==patientId),
      visits:previous.visits.filter(v=>v.patientId!==patientId),
      queue:previous.queue.filter(q=>q.patientId!==patientId && !visitIds.has(q.visitId||'')),
      admissions:previous.admissions.filter(a=>a.patientId!==patientId),
      admissionRequests:previous.admissionRequests.filter(r=>r.patientId!==patientId),
      invoices:previous.invoices.filter(i=>i.patientId!==patientId),
      labs:previous.labs.filter(x=>x.patientId!==patientId),
      radiology:previous.radiology.filter(x=>x.patientId!==patientId),
      appointments:previous.appointments.filter(x=>x.patientId!==patientId),
      doctorNotes:previous.doctorNotes.filter(x=>x.patientId!==patientId),
      notifications:previous.notifications.filter(x=>x.patientId!==patientId),
    };
  }), []);

  const addFinding = useCallback((patientId:string, region:string, note:string) => {
    const finding:Finding = { id:makeId('FND'), region, note, date:today() };
    setState(previous => ({ ...previous, patients:previous.patients.map(patient => patient.id === patientId ? { ...patient, findings:[...patient.findings, finding] } : patient) }));
  }, []);

  const updatePatientCoverage = useCallback((patientId:string, coverageEntity:string) => setState(previous => ({ ...previous, patients:previous.patients.map(patient => patient.id === patientId ? { ...patient, coverageEntity } : patient) })), []);

  const registerVisit = useCallback((value:{patientId:string;clinicId:string;doctorId:string;date:string;notes:string;appointmentId?:string}):VisitResult => {
    const clinic = state.clinics.find(item => item.id === value.clinicId && item.active && item.kind !== 'inpatient');
    if (!clinic) return { ok:false, reason:'missing_clinic' };
    if (!state.doctors.some(item => item.id === value.doctorId && item.active && item.clinics.includes(value.clinicId))) return { ok:false, reason:'missing_doctor' };
    const patient = state.patients.find(item => item.id === value.patientId);
    if (!patient) return { ok:false, reason:'insufficient_balance' };
    const queueNumber = Math.max(0,...state.visits.filter(item => item.doctorId === value.doctorId && item.date === value.date).map(item=>item.queueNumber))+1;
    const visit:Visit = { id:makeId('VIS'), ...value, fee:clinic.visitFee, queueNumber, status:'waiting' };
    const queueItem:QueueItem = { id:makeId('QUE'), visitId:visit.id, patientId:value.patientId, clinicId:value.clinicId, doctorId:value.doctorId, status:'waiting', queueNumber, priority:3, triageNote:'', addedAt:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) };
    const registrationOnly = user?.role === 'cashier';
    const ledger = { id:makeId('LED'), type:'debit' as const, timestamp:new Date().toISOString(), service:`Visit: ${clinic.nameEn}`, amount:clinic.visitFee, method:'wallet', receiptNumber:`VIS-${Date.now()}`, referenceId:visit.id };
    const visitEvent = event('visit','تسجيل زيارة عيادة',registrationOnly ? `${clinic.nameAr} · رقم الدور #${queueNumber} · بانتظار التحصيل المالي` : `${clinic.nameAr} · رقم الدور #${queueNumber} · خُصم ${clinic.visitFee.toFixed(2)} ₪ من رصيد المريض`,visit.id,'waiting');
    setState(previous => ({
      ...previous, visits:[...previous.visits, visit], queue:[...previous.queue, queueItem],
      appointments:value.appointmentId ? previous.appointments.map(item => item.id === value.appointmentId ? { ...item, status:'booked', bookedVisitId:visit.id } : item) : previous.appointments,
      patients:previous.patients.map(item => item.id === value.patientId ? registrationOnly
        ? { ...item, timeline:[...(item.timeline||[]),visitEvent] }
        : { ...item, walletBalance:item.walletBalance - clinic.visitFee, ledger:[...item.ledger, ledger], timeline:[...(item.timeline||[]),visitEvent] } : item),
    }));
    if (registrationOnly) {
      const doctor = state.doctors.find(item => item.id === value.doctorId);
      void hospitalApi.createCashierWorkflowCase({
        id:`CWF-${visit.id}`, visit_id:visit.id, patient_id:patient.id, patient_name:patient.fullName, medical_serial:patient.medicalSerial,
        id_number:patient.idNumber, patient_phone:patient.phone, patient_dob:patient.dob, patient_gender:patient.gender, patient_city:patient.city, patient_area:patient.area, coverage_entity:patient.coverageEntity,
        clinic_id:clinic.id, clinic_name:clinic.nameAr, clinic_code:clinic.code || clinic.key.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4) || 'CLN',
        doctor_id:value.doctorId, doctor_name:doctor?.name || '—', visit_date:value.date, registered_at:new Date().toISOString(), queue_number:queueNumber,
        amount:clinic.visitFee, notes:value.notes,
      }).catch(error => console.error('cashier workflow sync failed', error));
    }
    return { ok:true, visit };
  }, [state]);

  const updateQueueItem = useCallback((id:string, patch:Partial<Pick<QueueItem,'status'|'queueNumber'|'priority'|'triageNote'>>) => setState(previous => {
    const target = previous.queue.find(item=>item.id===id);
    if (!target) return previous;
    let queue = previous.queue.map(item=>item.id===id?{...item,...patch}:item);
    if (patch.queueNumber && patch.queueNumber !== target.queueNumber) {
      queue = queue.map(item=>item.id!==id && item.doctorId===target.doctorId && item.queueNumber===patch.queueNumber ? {...item,queueNumber:target.queueNumber} : item);
    }
    const nextStatus = patch.status ?? target.status;
    const becameCompleted = target.status !== 'completed' && nextStatus === 'completed';
    const visitId = target.visitId;
    const visits = previous.visits.map(visit=>visit.id===visitId?{...visit,status:nextStatus,completedAt:becameCompleted?new Date().toISOString():visit.completedAt}:visit);
    const completionEvent = becameCompleted ? event('queue','اكتملت خدمة المريض',`تم إنهاء الدور #${patch.queueNumber||target.queueNumber} وتسجيل الحالة كمكتملة في ملف المريض`,visitId,'completed') : null;
    return {
      ...previous,
      queue,
      visits,
      patients:completionEvent?previous.patients.map(patient=>patient.id===target.patientId?{...patient,timeline:[...(patient.timeline||[]),completionEvent]}:patient):previous.patients,
      notifications:becameCompleted?[notice('اكتملت حالة في الطابور',`تم إنهاء دور ${previous.patients.find(p=>p.id===target.patientId)?.fullName||'المريض'} #${target.queueNumber}`,'success',`/patients/${target.patientId}`,target.patientId),...previous.notifications]:previous.notifications,
    };
  }), []);

  const moveQueueItem = useCallback((id:string, status:QueueItem['status']) => updateQueueItem(id,{status}), [updateQueueItem]);

  const reorderQueueItem = useCallback((id:string, direction:'up'|'down') => setState(previous => {
    const target=previous.queue.find(item=>item.id===id); if(!target) return previous;
    const scope=previous.queue.filter(item=>item.doctorId===target.doctorId&&item.status===target.status).sort((a,b)=>a.queueNumber-b.queueNumber);
    const index=scope.findIndex(item=>item.id===id); const other=scope[index+(direction==='up'?-1:1)]; if(!other) return previous;
    return {...previous,queue:previous.queue.map(item=>item.id===target.id?{...item,queueNumber:other.queueNumber}:item.id===other.id?{...item,queueNumber:target.queueNumber}:item)};
  }), []);


  const finishVisit = useCallback((visitId:string) => {
    const visit = state.visits.find(item => item.id === visitId);
    if (!visit || visit.status === 'completed') return null;
    const followUpDate = addSevenDays(visit.date);
    const appointment:FollowUpAppointment = { id:makeId('APT'), patientId:visit.patientId, doctorId:visit.doctorId, clinicId:visit.clinicId, sourceVisitId:visit.id, date:followUpDate, status:'scheduled' };
    const doneEvent=event('visit','انتهاء الزيارة','تم إنهاء الزيارة الطبية وتحديد موعد متابعة',visit.id,'completed');
    setState(previous => ({ ...previous, visits:previous.visits.map(item => item.id === visitId ? { ...item, status:'completed', completedAt:new Date().toISOString(), followUpDate } : item), queue:previous.queue.map(item=>item.visitId===visitId?{...item,status:'completed'}:item), appointments:[...previous.appointments, appointment], patients:previous.patients.map(patient=>patient.id===visit.patientId?{...patient,timeline:[...(patient.timeline||[]),doneEvent]}:patient) }));
    return appointment;
  }, [state.visits]);

  const bookFollowUp = useCallback((appointmentId:string):VisitResult => {
    const appointment = state.appointments.find(item => item.id === appointmentId);
    if (!appointment) return { ok:false, reason:'missing_clinic' };
    return registerVisit({ patientId:appointment.patientId, clinicId:appointment.clinicId, doctorId:appointment.doctorId, date:appointment.date, notes:'Follow-up visit', appointmentId });
  }, [state.appointments, registerVisit]);

  const addDoctorNote = useCallback((doctorId:string, patientId:string, text:string) => {
    const note:DoctorNote = { id:makeId('DNT'), doctorId, patientId, text, createdAt:new Date().toISOString() };
    setState(previous => ({ ...previous, doctorNotes:[...previous.doctorNotes, note] }));
  }, []);

  const requestAdmission = useCallback((value:{patientId:string;diagnosis:string;preferredWard?:string;priority:AdmissionRequest['priority'];sourceVisitId?:string;reportRefs?:AdmissionRequest['reportRefs'];requestedBy:string}) => {
    const request:AdmissionRequest={id:makeId('ARQ'),patientId:value.patientId,requestedAt:new Date().toISOString(),requestedBy:value.requestedBy,sourceVisitId:value.sourceVisitId,preferredWard:value.preferredWard,diagnosis:value.diagnosis,priority:value.priority,reportRefs:value.reportRefs||[],status:'pending'};
    const patient=state.patients.find(item=>item.id===value.patientId);
    const transferEvent=event('admission_request','طلب تحويل للمبيت',`${value.diagnosis}${value.reportRefs?.length?` · مرفق ${value.reportRefs.length} تقرير/نتيجة`:''}`,request.id,'pending');
    setState(previous=>({...previous,admissionRequests:[request,...previous.admissionRequests],patients:previous.patients.map(item=>item.id===value.patientId?{...item,timeline:[...(item.timeline||[]),transferEvent]}:item),notifications:[notice('طلب مبيت جديد',`${patient?.fullName||'مريض'} بحاجة إلى مبيت${value.priority==='emergency'?' · طارئ':value.priority==='urgent'?' · عاجل':''}`,value.priority==='emergency'?'critical':'warning','/admissions',value.patientId),...previous.notifications]}));
    return request;
  },[state.patients]);

  const resolveAdmissionRequest = useCallback((id:string,status:'accepted'|'cancelled',admissionId?:string)=>setState(previous=>({...previous,admissionRequests:previous.admissionRequests.map(item=>item.id===id?{...item,status,resolvedAt:new Date().toISOString(),admissionId}:item)})),[]);

  const addAdmission = useCallback((value:Omit<Admission,'id'|'status'>) => {
    const admission:Admission={...value,id:makeId('ADM'),status:'admitted',transactions:[...(value.transactions||[])],notes:value.notes||[],reports:value.reports||[],coverageMovements:value.coverageMovements||[]};
    const dailyPatientShare=Math.max(0,(value.dailyRate||0)*Math.max(0,Math.min(100,value.contributionPct||0))/100);
    const nowIso=new Date().toISOString();
    if(dailyPatientShare>0) admission.transactions=[...(admission.transactions||[]),{id:makeId('IPT'),type:'charge',amount:dailyPatientShare,date:today(),description:'إقامة يومية - اليوم الأول',method:'wallet',receiptNumber:`ADM-${Date.now()}-D1`,category:'daily'}];
    const admissionEvent=event('admission','تم إدخال المريض للمبيت',`${value.ward}${value.room?` · غرفة ${value.room}`:''}${value.bed?` · سرير ${value.bed}`:''} · ${value.diagnosis}`,admission.id,'admitted');
    setState(previous=>{
      const dailyLedger=dailyPatientShare>0?{id:makeId('LED'),type:'debit' as const,timestamp:nowIso,service:`Inpatient: ${value.ward}`,amount:dailyPatientShare,method:'wallet',receiptNumber:`ADM-${Date.now()}-D1`,referenceId:admission.id}:null;
      const patient=previous.patients.find(item=>item.id===value.patientId);
      return {...previous,
        admissions:[admission,...previous.admissions],
        admissionRequests:value.requestId?previous.admissionRequests.map(item=>item.id===value.requestId?{...item,status:'accepted',resolvedAt:nowIso,admissionId:admission.id}:item):previous.admissionRequests,
        patients:previous.patients.map(item=>item.id===value.patientId?{...item,walletBalance:item.walletBalance-dailyPatientShare,ledger:dailyLedger?[...item.ledger,dailyLedger]:item.ledger,timeline:[...(item.timeline||[]),admissionEvent,...(dailyPatientShare>0?[event('finance','خصم رسوم المبيت',`تم خصم ${dailyPatientShare.toFixed(2)} ₪ عن اليوم الأول من المبيت`,admission.id)]:[])]}:item),
        notifications:[notice('تم إدخال مريض للمبيت',`${patient?.fullName||'المريض'} · ${value.ward}`,'success',`/patients/${value.patientId}`,value.patientId),...previous.notifications],
      };
    });
    return admission;
  },[]);

  const updateAdmission = useCallback((id:string, patch:Partial<Admission>) => setState(previous => ({...previous, admissions:previous.admissions.map(item=>item.id===id?{...item,...patch}:item)})), []);

  const addInpatientTransaction = useCallback((admissionId:string, value:Omit<InpatientTransaction,'id'>) => setState(previous => {
    const admission=previous.admissions.find(item=>item.id===admissionId); if(!admission) return previous;
    const tx:InpatientTransaction={...value,id:makeId('IPT'),category:value.category|| (value.type==='payment'?'payment':'service')};
    const delta=value.type==='charge'?-value.amount:value.amount;
    const ledger={id:makeId('LED'),type:value.type==='charge'?'debit' as const:'credit' as const,timestamp:new Date(`${value.date}T12:00:00`).toISOString(),service:`Inpatient: ${value.description}`,amount:value.amount,method:value.method||'cash',receiptNumber:value.receiptNumber||`IPT-${Date.now()}`,referenceId:admissionId};
    const financeEvent=event('finance',value.type==='charge'?'إضافة تكلفة مبيت':'تسجيل دفعة للمبيت',`${value.description} · ${value.amount.toFixed(2)} ₪`,admissionId);
    return {...previous,admissions:previous.admissions.map(item=>item.id===admissionId?{...item,transactions:[...(item.transactions||[]),tx]}:item),patients:previous.patients.map(item=>item.id===admission.patientId?{...item,walletBalance:item.walletBalance+delta,ledger:[...item.ledger,ledger],timeline:[...(item.timeline||[]),financeEvent]}:item)};
  }), []);

  const addInpatientNote = useCallback((admissionId:string, value:Omit<InpatientNote,'id'>) => setState(previous => {
    const admission=previous.admissions.find(item=>item.id===admissionId); if(!admission) return previous;
    const note={...value,id:makeId('IPN')}; const noteEvent=event('note','متابعة مبيت',value.text,admissionId);
    return {...previous,admissions:previous.admissions.map(item=>item.id===admissionId?{...item,notes:[...(item.notes||[]),note]}:item),patients:previous.patients.map(item=>item.id===admission.patientId?{...item,timeline:[...(item.timeline||[]),noteEvent]}:item)};
  }), []);

  const addInpatientReport = useCallback((admissionId:string,value:Omit<InpatientReport,'id'>)=>setState(previous=>{
    const admission=previous.admissions.find(item=>item.id===admissionId); if(!admission)return previous;
    const report:InpatientReport={...value,id:makeId('IPR')}; const reportEvent=event('report','إضافة تقرير مبيت',`${value.title} · ${value.summary}`,admissionId);
    return {...previous,admissions:previous.admissions.map(item=>item.id===admissionId?{...item,reports:[...(item.reports||[]),report]}:item),patients:previous.patients.map(item=>item.id===admission.patientId?{...item,timeline:[...(item.timeline||[]),reportEvent]}:item),notifications:[notice('تقرير مبيت جديد',`${previous.patients.find(p=>p.id===admission.patientId)?.fullName||'المريض'} · ${value.title}`,'info',`/patients/${admission.patientId}`,admission.patientId),...previous.notifications]};
  }),[]);

  const syncInpatientCharges = useCallback(()=>setState(previous=>{
    let patients=previous.patients; let admissions=previous.admissions; let changed=false;
    admissions=admissions.map(admission=>{
      if(admission.status!=='admitted'||!(admission.dailyRate||0))return admission;
      const targetDays=stayDays(admission.admissionDate);
      const dailyAmount=(admission.dailyRate||0)*Math.max(0,Math.min(100,admission.contributionPct||0))/100;
      const existing=(admission.transactions||[]).filter(tx=>tx.category==='daily'||tx.description.startsWith('إقامة يومية')).length;
      const missing=Math.max(0,targetDays-existing); if(!missing||dailyAmount<=0)return admission;
      changed=true;
      const newTx=Array.from({length:missing},(_,i):InpatientTransaction=>({id:makeId('IPT'),type:'charge',amount:dailyAmount,date:today(),description:`إقامة يومية - يوم ${existing+i+1}`,method:'wallet',receiptNumber:`ADM-${admission.id.slice(-6)}-${Date.now()}-${i}`,category:'daily'}));
      patients=patients.map(patient=>patient.id===admission.patientId?{...patient,walletBalance:patient.walletBalance-dailyAmount*missing,ledger:[...patient.ledger,...newTx.map(tx=>({id:makeId('LED'),type:'debit' as const,timestamp:new Date().toISOString(),service:`Inpatient daily stay: ${admission.ward}`,amount:tx.amount,method:'wallet',receiptNumber:tx.receiptNumber||`ADM-${Date.now()}`,referenceId:admission.id}))],timeline:[...(patient.timeline||[]),event('finance','احتساب إقامة يومية',`تم احتساب ${missing} يوم إضافي بقيمة ${(dailyAmount*missing).toFixed(2)} ₪`,admission.id)]}:patient);
      return {...admission,transactions:[...(admission.transactions||[]),...newTx]};
    });
    return changed?{...previous,admissions,patients}:previous;
  }),[]);

  const discharge = useCallback((id:string) => setState(previous => {
    const admission=previous.admissions.find(item=>item.id===id); if(!admission||admission.status==='discharged') return previous;
    const totalDays=stayDays(admission.admissionDate,today()); const dailyAmount=(admission.dailyRate||0)*Math.max(0,Math.min(100,admission.contributionPct||0))/100;
    const existing=(admission.transactions||[]).filter(tx=>tx.category==='daily'||tx.description.startsWith('إقامة يومية')).length; const missing=Math.max(0,totalDays-existing);
    const extraTx=Array.from({length:missing},(_,i):InpatientTransaction=>({id:makeId('IPT'),type:'charge',amount:dailyAmount,date:today(),description:`إقامة يومية - يوم ${existing+i+1}`,method:'wallet',receiptNumber:`ADM-${id.slice(-6)}-OUT-${Date.now()}-${i}`,category:'daily'}));
    const dischargedAt=new Date().toISOString(); const dischargeEvent=event('discharge','تم تخريج المريض',`انتهت إقامة المريض بعد ${totalDays} يوم`,id,'discharged');
    return {...previous,
      admissions:previous.admissions.map(item=>item.id===id?{...item,status:'discharged',dischargedAt,transactions:[...(item.transactions||[]),...extraTx]}:item),
      patients:previous.patients.map(patient=>patient.id===admission.patientId?{...patient,walletBalance:patient.walletBalance-dailyAmount*missing,ledger:[...patient.ledger,...extraTx.map(tx=>({id:makeId('LED'),type:'debit' as const,timestamp:dischargedAt,service:`Inpatient daily stay: ${admission.ward}`,amount:tx.amount,method:'wallet',receiptNumber:tx.receiptNumber||`ADM-${Date.now()}`,referenceId:id}))],timeline:[...(patient.timeline||[]),...(missing?[event('finance','تسوية رسوم المبيت',`تم احتساب ${missing} يوم إضافي بقيمة ${(dailyAmount*missing).toFixed(2)} ₪`,id)]:[]),dischargeEvent]}:patient),
      notifications:[notice('تخريج من المبيت',`${previous.patients.find(p=>p.id===admission.patientId)?.fullName||'المريض'} · ${admission.ward}`,'info',`/patients/${admission.patientId}`,admission.patientId),...previous.notifications],
    };
  }), []);


  const addInvoice = useCallback((value:{patientId:string;service:string;unitPrice:number;coveragePct:number;paymentMethod:'cash'|'app';transferDetails?:TransferDetails}) => {
    const payableAmount = Math.max(0, value.unitPrice * (1 - value.coveragePct / 100));
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(state.invoices.length + 1).padStart(5,'0')}`;
    const invoice:Invoice = { id:makeId('INV'), ...value, payableAmount, date:new Date().toISOString(), receiptNumber };
    const ledger = { id:makeId('LED'), type:'credit' as const, timestamp:invoice.date, service:value.service, amount:payableAmount, method:value.paymentMethod === 'cash' ? 'cash' : value.transferDetails?.source || 'app', receiptNumber, referenceId:invoice.id };
    setState(previous => ({ ...previous, invoices:[...previous.invoices,invoice], patients:previous.patients.map(patient => patient.id === value.patientId ? { ...patient, walletBalance:patient.walletBalance + payableAmount, ledger:[...patient.ledger,ledger] } : patient) }));
    return invoice;
  }, [state.invoices.length]);

  const addDoctor = useCallback(async (value:Omit<Doctor,'id'|'active'>) => {
    const clinicKeys = value.clinics
      .map(id => state.clinics.find(clinic => clinic.id === id)?.key)
      .filter((key): key is string => Boolean(key));
    const created = await hospitalApi.createDoctor({
      staff_id:value.staffId,
      password:value.password,
      name:value.name,
      phone:value.phone || undefined,
      specialty:value.specialty || undefined,
      schedule_text:value.scheduleText || undefined,
      clinic_keys:clinicKeys,
    });
    const doctor:Doctor = {...value,id:created.id,active:true};
    setState(previous => ({...previous,doctors:[...previous.doctors,doctor]}));
    return doctor;
  }, [state.clinics]);
  const removeDoctor = useCallback(async (id:string) => {
    const isApiDoctor = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isApiDoctor) await hospitalApi.removeDoctor(id);
    setState(previous => ({...previous,doctors:previous.doctors.map(item => item.id === id ? {...item,active:false} : item)}));
  }, []);
  const addClinic = useCallback(async (value:{nameAr:string;nameEn:string;code?:string;visitFee:number;kind?:'outpatient'|'inpatient'|'mixed';dailyRate?:number}) => {
    const clinic = await hospitalApi.createClinic({name_ar:value.nameAr,name_en:value.nameEn,code:value.code,visit_fee:value.visitFee,kind:value.kind||'outpatient',daily_rate:value.dailyRate});
    setState(previous => ({...previous,clinics:[...previous.clinics.filter(item=>item.id!==clinic.id),clinic]}));
    return clinic;
  }, []);
  const removeClinic = useCallback(async (id:string) => {
    await hospitalApi.removeClinic(id);
    setState(previous => ({...previous,clinics:previous.clinics.map(item => item.id === id ? {...item,active:false} : item)}));
  }, []);
  const updateClinicFee = useCallback(async (id:string, visitFee:number) => {
    const clinic=await hospitalApi.updateClinicFee(id,visitFee);
    setState(previous => ({...previous,clinics:previous.clinics.map(item => item.id === id ? clinic : item)}));
    return clinic;
  }, []);
  const addSponsor = useCallback((nameAr:string,nameEn:string) => { const sponsor={id:makeId('SPN'),nameAr,nameEn}; setState(previous=>({...previous,sponsors:[...previous.sponsors,sponsor]})); return sponsor; }, []);
  const refreshDiagnosticServices = useCallback(async () => {
    const rows = await hospitalApi.diagnosticServices();
    const services = rows.map(mapDiagnosticService);
    setState(previous=>({...previous,diagnosticServices:services}));
    return services;
  }, []);
  const addDiagnosticService = useCallback(async (value:Omit<DiagnosticService,'id'|'active'>) => {
    const created = await hospitalApi.createDiagnosticService({
      type:value.type,name_ar:value.nameAr,name_en:value.nameEn,category:value.category,price:value.price,
      tests:value.tests.map(item=>({test:item.test,reference_range:item.referenceRange})),
    });
    const service=mapDiagnosticService(created);
    setState(previous=>({...previous,diagnosticServices:[...previous.diagnosticServices.filter(item=>item.id!==service.id),service]}));
    return service;
  }, []);
  const updateDiagnosticService = useCallback(async (id:string, patch:Partial<Omit<DiagnosticService,'id'>>) => {
    const dto:any={};
    if (patch.nameAr!==undefined) dto.name_ar=patch.nameAr;
    if (patch.nameEn!==undefined) dto.name_en=patch.nameEn;
    if (patch.category!==undefined) dto.category=patch.category;
    if (patch.price!==undefined) dto.price=patch.price;
    if (patch.tests!==undefined) dto.tests=patch.tests.map(item=>({test:item.test,reference_range:item.referenceRange}));
    if (patch.active!==undefined) dto.active=patch.active;
    const updated=mapDiagnosticService(await hospitalApi.updateDiagnosticService(id,dto));
    setState(previous=>({...previous,diagnosticServices:previous.diagnosticServices.map(service=>service.id===id?updated:service)}));
    return updated;
  }, []);
  const removeDiagnosticService = useCallback(async (id:string) => {
    await hospitalApi.removeDiagnosticService(id);
    setState(previous=>({...previous,diagnosticServices:previous.diagnosticServices.map(service=>service.id===id?{...service,active:false}:service)}));
  }, []);
  const orderDiagnostic = useCallback((value:{patientId:string;serviceId:string;doctorId?:string}):DiagnosticOrderResult => {
    const service=state.diagnosticServices.find(item=>item.id===value.serviceId&&item.active);if(!service)return {ok:false,reason:'missing_service'};
    const patient=state.patients.find(item=>item.id===value.patientId);if(!patient)return {ok:false,reason:'missing_patient'};
    if(patient.walletBalance<service.price)return {ok:false,reason:'insufficient_balance'};
    const base={patientId:value.patientId,serviceId:service.id,price:service.price,doctorId:value.doctorId||undefined,date:today()};
    const order:LabOrder|RadiologyOrder=service.type==='lab'
      ?{...base,id:makeId('LAB'),serviceName:service.nameAr,category:service.category,status:'processing'}
      :{...base,id:makeId('RAD'),exam:service.nameAr,status:'waiting'};
    const ledger={id:makeId('LED'),type:'debit' as const,timestamp:new Date().toISOString(),service:`Diagnostic: ${service.nameEn}`,amount:service.price,method:'wallet',receiptNumber:`${service.type==='lab'?'LAB':'RAD'}-${Date.now()}`,referenceId:order.id};
    setState(previous=>({...previous,
      labs:service.type==='lab'?[...previous.labs,order as LabOrder]:previous.labs,
      radiology:service.type==='radiology'?[...previous.radiology,order as RadiologyOrder]:previous.radiology,
      patients:previous.patients.map(item=>item.id===value.patientId?{...item,walletBalance:item.walletBalance-service.price,ledger:[...item.ledger,ledger]}:item),
    }));return {ok:true,order};
  },[state.diagnosticServices,state.patients]);
  const completeLabOrder = useCallback((id:string,resultRows:LabResultRow[],notes:string) => { const existing=state.labs.find(item=>item.id===id);if(!existing)return null;const completed:LabOrder={...existing,status:'done',resultRows,notes,completedAt:new Date().toISOString(),reportNumber:existing.reportNumber||`LAB-${new Date().getFullYear()}-${String(state.labs.findIndex(item=>item.id===id)+1).padStart(5,'0')}`};const reportEvent=event('report','اعتماد تقرير مختبر',`${completed.serviceName||completed.category} · ${completed.reportNumber}`,completed.id,'done');setState(previous=>({...previous,labs:previous.labs.map(item=>item.id===id?completed:item),patients:previous.patients.map(patient=>patient.id===completed.patientId?{...patient,timeline:[...(patient.timeline||[]),reportEvent]}:patient),notifications:[notice('نتيجة مختبر جاهزة',`${previous.patients.find(p=>p.id===completed.patientId)?.fullName||'المريض'} · ${completed.serviceName||completed.category}`,'success',`/patients/${completed.patientId}`,completed.patientId),...previous.notifications]}));return completed; },[state.labs]);
  const addLab = useCallback((value:Omit<LabOrder,'id'|'status'>) => setState(previous => ({...previous,labs:[...previous.labs,{...value,id:makeId('LAB'),status:'processing'}]})), []);
  const addRadiology = useCallback((value:Omit<RadiologyOrder,'id'|'status'>) => setState(previous => ({...previous,radiology:[...previous.radiology,{...value,id:makeId('RAD'),status:'waiting'}]})), []);
  const updateRadiologyOrder = useCallback((id:string, patch:Partial<Pick<RadiologyOrder,'status'|'result'|'completedAt'>>) => setState(previous=>({...previous,radiology:previous.radiology.map(order=>order.id===id?{...order,...patch}:order)})), []);
  const markNotificationRead = useCallback((id:string)=>setState(previous=>({...previous,notifications:previous.notifications.map(item=>item.id===id?{...item,read:true}:item)})),[]);
  const markAllNotificationsRead = useCallback(()=>setState(previous=>({...previous,notifications:previous.notifications.map(item=>({...item,read:true}))})),[]);
  const clearNotifications = useCallback(()=>setState(previous=>({...previous,notifications:[]})),[]);
  const pushNotification = useCallback((value:Pick<NotificationItem,'title'|'body'|'type'> & Partial<Pick<NotificationItem,'link'|'patientId'>>) => setState(previous=>({...previous,notifications:[notice(value.title,value.body,value.type,value.link,value.patientId),...previous.notifications]})),[]);
  const resetAll = useCallback(() => setState(emptyState), []);
  const patientName = useCallback((id:string) => state.patients.find(item=>item.id===id)?.fullName || '—',[state.patients]);
  const doctorName = useCallback((id:string) => state.doctors.find(item=>item.id===id)?.name || '—',[state.doctors]);
  const clinicName = useCallback((id:string,language:'ar'|'en'='ar') => { const item=state.clinics.find(clinic=>clinic.id===id); return item ? (language==='ar'?item.nameAr:item.nameEn) : '—'; },[state.clinics]);

  const value = useMemo(() => ({...state,paymentCases,refreshWorkflowCases,completeWorkflowPayment,collectWorkflowCase,updateWorkflowCase,deleteWorkflowCase,addManualWorkflowCase,addPatient,updatePatient,deletePatient,addFinding,updatePatientCoverage,registerVisit,moveQueueItem,updateQueueItem,reorderQueueItem,finishVisit,bookFollowUp,addDoctorNote,requestAdmission,resolveAdmissionRequest,addAdmission,updateAdmission,addInpatientTransaction,addInpatientNote,addInpatientReport,syncInpatientCharges,discharge,addInvoice,addDoctor,removeDoctor,addClinic,removeClinic,updateClinicFee,addSponsor,refreshDiagnosticServices,addDiagnosticService,updateDiagnosticService,removeDiagnosticService,orderDiagnostic,completeLabOrder,addLab,addRadiology,updateRadiologyOrder,markNotificationRead,markAllNotificationsRead,clearNotifications,pushNotification,resetAll,patientName,doctorName,clinicName}), [state,paymentCases,refreshWorkflowCases,completeWorkflowPayment,collectWorkflowCase,updateWorkflowCase,deleteWorkflowCase,addManualWorkflowCase,addPatient,updatePatient,deletePatient,addFinding,updatePatientCoverage,registerVisit,moveQueueItem,updateQueueItem,reorderQueueItem,finishVisit,bookFollowUp,addDoctorNote,requestAdmission,resolveAdmissionRequest,addAdmission,updateAdmission,addInpatientTransaction,addInpatientNote,addInpatientReport,syncInpatientCharges,discharge,addInvoice,addDoctor,removeDoctor,addClinic,removeClinic,updateClinicFee,addSponsor,refreshDiagnosticServices,addDiagnosticService,updateDiagnosticService,removeDiagnosticService,orderDiagnostic,completeLabOrder,addLab,addRadiology,updateRadiologyOrder,markNotificationRead,markAllNotificationsRead,clearNotifications,pushNotification,resetAll,patientName,doctorName,clinicName]);
  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital() { const value=useContext(HospitalContext); if(!value) throw new Error('useHospital must be used inside HospitalProvider'); return value; }
