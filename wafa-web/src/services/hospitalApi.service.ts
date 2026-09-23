import { apiRequest } from './apiClient';
import type { CreateInvoiceDTO, InvoiceResource, PatientResource, RegisterPatientDTO, RegisterVisitDTO, VisitResource } from '../dto/api.dto';
import type { CashierWorkflowCase, Clinic, DischargedArchiveRecord, Doctor, FollowUpAppointment, OperationCase, OperationLookupRecord, Patient, QueueItem, Visit } from '../types';



export interface CreateOperationCaseDTO {
  registry_data: {
    fullName: string;
    idNumber: string;
    dob: string;
    gender: 'male' | 'female';
    city?: string;
    area?: string;
    coverageEntity?: string;
  };
  phone: string;
  address?: string;
  marital_status?: string;
  diagnosis?: string;
  doctor_name?: string;
  admission_date: string;
  admission_time?: string;
  discharge_date?: string;
  stay_days?: number | null;
  referral_entity: string;
  department?: string;
  case_number?: string;
  insurance_number?: string;
  conversion_duration?: string;
  conversion_reason?: string;
}

export interface CreateDoctorDTO {
  staff_id: string;
  password: string;
  name: string;
  phone?: string;
  specialty?: string;
  schedule_text?: string;
  clinic_keys: string[];
}

export interface DoctorCreateResource {
  id: string;
  staffId: string;
  name: string;
  phone?: string;
  specialty?: string;
  scheduleText?: string;
  clinics: string[];
  active: boolean;
  credentials: { username: string; temporaryPassword: string };
}


export interface DiagnosticServiceApiResource {
  id: string;
  type: 'lab' | 'radiology';
  name_ar: string;
  name_en: string;
  category: string;
  price: string | number;
  tests?: Array<{ test: string; reference_range?: string | null }> | null;
  active: boolean;
}

export interface SaveDiagnosticServiceDTO {
  type?: 'lab' | 'radiology';
  name_ar?: string;
  name_en?: string;
  category?: string;
  price?: number;
  tests?: Array<{ test: string; reference_range?: string }>;
  active?: boolean;
}



export interface DoctorQueueResource extends QueueItem {
  patient: { id:string; fullName:string; medicalSerial:string; idNumber?:string; phone?:string };
  clinic?: { id?:string; nameAr?:string; nameEn?:string; code?:string };
  visit: Visit;
  payment?: { confirmed:boolean; workflowStatus?:string; amount?:number; receiptNumber?:string|null; paymentSource?:string|null; collectedAt?:string|null };
}

export interface DoctorVisitResource extends Visit {
  patient?: { id:string; fullName:string; medicalSerial:string; idNumber?:string; phone?:string };
  clinic?: { id?:string; nameAr?:string; nameEn?:string; code?:string };
}

export interface DoctorFollowUpResource extends FollowUpAppointment {
  patient?: { id:string; fullName:string; medicalSerial:string; idNumber?:string; phone?:string };
  clinic?: { id?:string; nameAr?:string; nameEn?:string; code?:string };
}

export interface FinishVisitDTO {
  diagnosis: string;
  followUpMode?: 'week' | 'custom' | 'none';
  followUpDate?: string;
  followUpNotes?: string;
}

export interface CreateCashierWorkflowDTO {
  id: string;
  visit_id: string;
  patient_id: string;
  patient_name: string;
  medical_serial: string;
  id_number?: string;
  patient_phone?: string;
  patient_dob?: string | null;
  patient_gender?: 'male' | 'female' | null;
  patient_city?: string;
  patient_area?: string;
  coverage_entity?: string;
  clinic_id: string;
  clinic_name: string;
  clinic_code?: string;
  doctor_id: string;
  doctor_name: string;
  visit_date: string;
  registered_at?: string;
  queue_number: number;
  amount: number;
  notes?: string;
}


export interface CreateClinicDTO {
  name_ar: string;
  name_en: string;
  code?: string;
  visit_fee?: number;
  kind?: 'outpatient' | 'inpatient' | 'mixed';
  daily_rate?: number;
}

export interface WorkflowPaymentDTO {
  amount: number;
  paymentMethod: 'cash' | 'app';
  paymentSource: string;
  senderName?: string;
  senderPhone?: string;
  notes?: string;
}


export const DENTAL_SERVICE_OPTIONS = [
  'Diagnosis',
  'Scaling and polishing',
  'R.C.T',
  'R.C.T biocramic',
  'R.C.T MTA',
  'Pulpotomy',
  'Pulpoctomy',
  'Primary tooth Extraction',
  'Permanent tooth Extraction',
  'Surgical Extraction',
  'Compsite filling',
  'Amalgam filling',
  'G.I.C',
  'Porcelain crown',
  'Zirconia crown',
  'X-ray',
  'Cemenation',
  'Temporary cemenation',
  'Temporary filing',
  'Other',
] as const;

export type DentalServiceName = typeof DENTAL_SERVICE_OPTIONS[number];

export interface UpdateDoctorDTO {
  name?: string;
  phone?: string;
  specialty?: string;
  schedule_text?: string;
  active?: boolean;
  password?: string;
  clinic_ids?: string[];
}

export interface DentalPatientSummary {
  id: string;
  fullName: string;
  medicalSerial: string;
  idNumber?: string;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female';
  city?: string;
  area?: string;
  coverageEntity?: string;
}

export interface DentalLookupResult {
  source: 'patient_file' | 'civil_registry' | 'not_found';
  patient?: PatientResource | null;
  registry?: (DentalPatientSummary & { phone?: string }) | null;
}

export interface DentalVisitResource {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  visitId?: string | null;
  serviceName: DentalServiceName;
  otherService?: string | null;
  serviceLabel: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
  visitDate: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt?: string;
  patient?: DentalPatientSummary | null;
  doctor?: { id: string; name: string; staffId?: string } | null;
  clinic?: { id: string; nameAr: string; code?: string } | null;
  queueNumber?: number | null;
}

export interface DentalWaitlistResource {
  id: string;
  patientId?: string | null;
  fullName: string;
  medicalSerial?: string | null;
  idNumber?: string | null;
  phone?: string | null;
  requestedDate: string;
  appointmentTime: string;
  serviceName: DentalServiceName;
  otherService?: string | null;
  serviceLabel: string;
  doctorId?: string | null;
  doctor?: { id: string; name: string; staffId?: string } | null;
  status: 'waiting' | 'scheduled' | 'served' | 'cancelled';
  notes?: string;
  createdAt?: string;
  patient?: DentalPatientSummary | null;
}

export interface SaveDentalVisitDTO {
  patient_id: string;
  doctor_id: string;
  service_name: DentalServiceName;
  other_service?: string;
  visit_date: string;
  total_amount: number;
  paid_amount: number;
  notes?: string;
}


export type ElderlyResidentStatus = 'active' | 'temporary_leave' | 'final_exit' | 'deceased';
export type ElderlyGender = 'male' | 'female';
export type ElderlyHousingType = 'owned' | 'rented';
export type ElderlyEmploymentStatus = 'working' | 'not_working';

export interface ElderlyLookupRecord {
  patientId?: string | null;
  fullName: string;
  medicalSerial?: string | null;
  idNumber: string;
  dob?: string | null;
  gender?: ElderlyGender | null;
  city?: string | null;
  area?: string | null;
  maritalStatus?: string | null;
  currentAddress: string;
}

export interface ElderlyLookupResult {
  source: 'patient_file' | 'civil_registry' | 'not_found';
  record?: ElderlyLookupRecord | null;
  fixedAddress: string;
}

export interface ElderlyResidentResource {
  id: string;
  patientId?: string | null;
  fullName: string;
  medicalSerial?: string | null;
  idNumber: string;
  dob?: string | null;
  age?: number | null;
  gender?: ElderlyGender | null;
  maritalStatus?: string | null;
  currentAddress: string;
  originalTown?: string | null;
  housingType?: ElderlyHousingType | null;
  admissionDate: string;
  receivesAssistance: boolean;
  assistanceType?: string | null;
  assistanceDetails?: string | null;
  disabilities: string[];
  customDisability?: string | null;
  isDeceased: boolean;
  exitDate?: string | null;
  healthStatusDetails?: string | null;
  employmentStatus: ElderlyEmploymentStatus;
  workType?: string | null;
  medications: string[];
  assistiveTools: string[];
  belongings?: string | null;
  status: ElderlyResidentStatus;
  statusLabel: string;
  finalExitDate?: string | null;
  temporaryLeaveFrom?: string | null;
  temporaryLeaveTo?: string | null;
  temporaryLeaveReason?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveElderlyResidentDTO {
  patient_id?: string | null;
  full_name: string;
  medical_serial?: string | null;
  id_number: string;
  dob?: string | null;
  gender?: ElderlyGender | null;
  marital_status?: string;
  original_town?: string;
  housing_type?: ElderlyHousingType | '';
  admission_date: string;
  receives_assistance?: boolean;
  assistance_type?: string;
  assistance_details?: string;
  disabilities?: string[];
  custom_disability?: string;
  is_deceased?: boolean;
  exit_date?: string;
  health_status_details?: string;
  employment_status?: ElderlyEmploymentStatus;
  work_type?: string;
  medications?: string[];
  assistive_tools?: string[];
  belongings?: string;
  notes?: string;
}

export interface SaveElderlyStatusDTO {
  status: ElderlyResidentStatus;
  final_exit_date?: string;
  temporary_leave_from?: string;
  temporary_leave_to?: string;
  temporary_leave_reason?: string;
  exit_date?: string;
  notes?: string;
}

export interface SaveDentalWaitlistDTO {
  patient_id: string;
  requested_date: string;
  appointment_time: string;
  service_name: DentalServiceName;
  other_service?: string;
  doctor_id?: string;
  notes?: string;
}

const queryString = (params: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && String(value).trim() !== '') sp.set(key, String(value)); });
  const text = sp.toString();
  return text ? `?${text}` : '';
};

/** Laravel REST contract. */
export const hospitalApi = {
  patientSearch: (search:string) => apiRequest<Patient[]>(`/registration/patients?search=${encodeURIComponent(search)}`,{cache:'no-store'}),
  operationCases: (search='', from='', to='') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const suffix = params.toString();
    return apiRequest<OperationCase[]>(`/operations/cases${suffix ? `?${suffix}` : ''}`, { cache: 'no-store' });
  },
  operationLookup: (identity:string) => apiRequest<OperationLookupRecord>(`/operations/lookup?identity=${encodeURIComponent(identity)}`, { cache: 'no-store' }),
  createOperationCase: (dto:CreateOperationCaseDTO) => apiRequest<OperationCase>('/operations/cases', { method: 'POST', body: JSON.stringify(dto) }),
  patientInquiries: (search='') => apiRequest<Patient[]>(`/patient-inquiries${search ? `?search=${encodeURIComponent(search)}` : ''}`,{cache:'no-store'}),
  dischargedArchive: (search='', from='', to='') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const suffix = params.toString();
    return apiRequest<DischargedArchiveRecord[]>(`/archive/discharged${suffix ? `?${suffix}` : ''}`, { cache: 'no-store' });
  },
  clinics: () => apiRequest<Clinic[]>('/clinics',{cache:'no-store'}),
  createClinic: (dto:CreateClinicDTO) => apiRequest<Clinic>('/clinics',{method:'POST',body:JSON.stringify(dto)}),
  removeClinic: (id:string) => apiRequest(`/clinics/${id}`,{method:'DELETE'}),
  updateClinicFee: (id:string, visitFee:number) => apiRequest<Clinic>(`/clinics/${id}/fee`,{method:'PATCH',body:JSON.stringify({visit_fee:visitFee})}),
  doctors: () => apiRequest<Doctor[]>('/doctors',{cache:'no-store'}),
  registerPatient: (dto:RegisterPatientDTO) => apiRequest<PatientResource>('/patients',{method:'POST',body:JSON.stringify(dto)}),
  registerVisit: (dto:RegisterVisitDTO) => apiRequest<VisitResource>('/visits',{method:'POST',body:JSON.stringify(dto)}),
  registrationVisits: () => apiRequest<CashierWorkflowCase[]>('/registration/visits',{cache:'no-store'}),
  createInvoice: (dto:CreateInvoiceDTO) => apiRequest<InvoiceResource>('/invoices',{method:'POST',body:JSON.stringify(dto)}),
  createDoctor: (dto:CreateDoctorDTO) => apiRequest<DoctorCreateResource>('/doctors',{method:'POST',body:JSON.stringify(dto)}),
  removeDoctor: (doctorId:string) => apiRequest(`/doctors/${doctorId}`,{method:'DELETE'}),
  doctorTodayQueue: () => apiRequest<DoctorQueueResource[]>('/doctor/queue/today',{cache:'no-store'}),
  doctorPastVisits: (date='') => apiRequest<DoctorVisitResource[]>(`/doctor/visits/past${date ? `?date=${encodeURIComponent(date)}` : ''}`,{cache:'no-store'}),
  doctorFollowUps: (date='') => apiRequest<DoctorFollowUpResource[]>(`/doctor/follow-ups${date ? `?date=${encodeURIComponent(date)}` : ''}`,{cache:'no-store'}),
  dueFollowUps: (patientId='') => apiRequest<DoctorFollowUpResource[]>(`/follow-ups/due${patientId ? `?patient_id=${encodeURIComponent(patientId)}` : ''}`,{cache:'no-store'}),
  updateQueueItem: (id:string, patch:Record<string,unknown>) => apiRequest<QueueItem>(`/doctor/queue/${id}`,{method:'PATCH',body:JSON.stringify(patch)}),
  finishVisit: (visitId:string, dto:FinishVisitDTO) => apiRequest<Visit>(`/visits/${visitId}/finish`,{method:'POST',body:JSON.stringify({diagnosis:dto.diagnosis,follow_up_mode:dto.followUpMode||'week',follow_up_date:dto.followUpDate||'',follow_up_notes:dto.followUpNotes||''})}),
  diagnosticServices: () => apiRequest<DiagnosticServiceApiResource[]>('/diagnostics/services',{cache:'no-store'}),
  createDiagnosticService: (dto:SaveDiagnosticServiceDTO) => apiRequest<DiagnosticServiceApiResource>('/diagnostics/services',{method:'POST',body:JSON.stringify(dto)}),
  updateDiagnosticService: (id:string,dto:SaveDiagnosticServiceDTO) => apiRequest<DiagnosticServiceApiResource>(`/diagnostics/services/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  removeDiagnosticService: (id:string) => apiRequest(`/diagnostics/services/${id}`,{method:'DELETE'}),
  cashierWorkflowCases: () => apiRequest<CashierWorkflowCase[]>('/cashier-workflow',{cache:'no-store'}),
  createCashierWorkflowCase: (dto:CreateCashierWorkflowDTO) => apiRequest<CashierWorkflowCase>('/cashier-workflow',{method:'POST',body:JSON.stringify(dto)}),
  completeCashierWorkflowPayment: (id:string,dto:WorkflowPaymentDTO) => apiRequest<CashierWorkflowCase>(`/cashier-workflow/${id}/payment`,{method:'POST',body:JSON.stringify({amount:dto.amount,payment_method:dto.paymentMethod,payment_source:dto.paymentSource,sender_name:dto.senderName||'',sender_phone:dto.senderPhone||'',notes:dto.notes||''})}),
  collectCashierWorkflowCase: (id:string,receiptNumber?:string) => apiRequest<CashierWorkflowCase>(`/cashier-workflow/${id}/collect`,{method:'POST',body:JSON.stringify({receipt_number:receiptNumber||''})}),
  updateCashierWorkflowCase: (id:string,patch:Record<string,unknown>) => apiRequest<CashierWorkflowCase>(`/cashier-workflow/${id}`,{method:'PATCH',body:JSON.stringify(patch)}),
  deleteCashierWorkflowCase: (id:string) => apiRequest(`/cashier-workflow/${id}`,{method:'DELETE'}),
  addManualCashierWorkflowCase: (dto:Record<string,unknown>) => apiRequest<CashierWorkflowCase>('/cashier-workflow/manual',{method:'POST',body:JSON.stringify(dto)}),

  elderlyDisabilities: () => apiRequest<string[]>('/elderly-care/disabilities',{cache:'no-store'}),
  elderlyLookup: (identity:string) => apiRequest<ElderlyLookupResult>(`/elderly-care/lookup${queryString({identity})}`,{cache:'no-store'}),
  elderlyResidents: (params:Record<string,string>={}) => apiRequest<ElderlyResidentResource[]>(`/elderly-care/residents${queryString(params)}`,{cache:'no-store'}),
  createElderlyResident: (dto:SaveElderlyResidentDTO) => apiRequest<ElderlyResidentResource>('/elderly-care/residents',{method:'POST',body:JSON.stringify(dto)}),
  updateElderlyResident: (id:string,dto:Partial<SaveElderlyResidentDTO>) => apiRequest<ElderlyResidentResource>(`/elderly-care/residents/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  updateElderlyStatus: (id:string,dto:SaveElderlyStatusDTO) => apiRequest<ElderlyResidentResource>(`/elderly-care/residents/${id}/status`,{method:'PATCH',body:JSON.stringify(dto)}),
  dentalServices: () => apiRequest<DentalServiceName[]>('/dental/services',{cache:'no-store'}),
  dentalPatientLookup: (identity:string, phone='') => apiRequest<DentalLookupResult>(`/dental/patient-lookup${queryString({identity, phone})}`,{cache:'no-store'}),
  dentalVisits: (params:Record<string,string>={}) => apiRequest<DentalVisitResource[]>(`/dental/visits${queryString(params)}`,{cache:'no-store'}),
  createDentalVisit: (dto:SaveDentalVisitDTO) => apiRequest<DentalVisitResource>('/dental/visits',{method:'POST',body:JSON.stringify(dto)}),
  updateDentalVisit: (id:string, dto:Partial<SaveDentalVisitDTO>&{status?:'active'|'completed'|'cancelled'}) => apiRequest<DentalVisitResource>(`/dental/visits/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  deleteDentalVisit: (id:string) => apiRequest(`/dental/visits/${id}`,{method:'DELETE'}),
  dentalWaitlist: (params:Record<string,string>={}) => apiRequest<DentalWaitlistResource[]>(`/dental/waitlist${queryString(params)}`,{cache:'no-store'}),
  createDentalWaitlist: (dto:SaveDentalWaitlistDTO) => apiRequest<DentalWaitlistResource>('/dental/waitlist',{method:'POST',body:JSON.stringify(dto)}),
  updateDentalWaitlist: (id:string, dto:Partial<SaveDentalWaitlistDTO>&{status?:DentalWaitlistResource['status']}) => apiRequest<DentalWaitlistResource>(`/dental/waitlist/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  deleteDentalWaitlist: (id:string) => apiRequest(`/dental/waitlist/${id}`,{method:'DELETE'}),
  updateDoctor: (doctorId:string,dto:UpdateDoctorDTO) => apiRequest<Doctor>(`/doctors/${doctorId}`,{method:'PATCH',body:JSON.stringify(dto)}),
};
