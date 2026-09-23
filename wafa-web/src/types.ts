export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light' | 'aurora' | 'pearl';
export type QueueStatus = 'waiting' | 'exam' | 'completed';
export type KnownRole = 'admin' | 'cashier' | 'inquiry_clerk' | 'payment_auditor' | 'financial_collector' | 'financial_auditor' | 'operations_clerk' | 'archive_clerk' | 'doctor' | 'it_head' | 'treasurer' | 'receptionist' | 'lab_technician' | 'inpatient_manager' | 'rehab_specialist' | 'social_worker' | 'inpatient_finance' | 'moh_user' | 'inpatient_pt' | 'outpatient_pt' | 'pt_head' | 'elderly_care_manager' | 'custom';
export type Role = KnownRole | (string & {});
export type PaymentMethod = 'cash' | 'app';

export interface LedgerEntry {
  id: string; type: 'credit' | 'debit'; timestamp: string; service: string;
  amount: number; method: string; receiptNumber: string; referenceId?: string;
}

export interface PatientEvent {
  id: string;
  type: 'visit' | 'queue' | 'admission_request' | 'admission' | 'discharge' | 'report' | 'finance' | 'note';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  referenceId?: string;
}

export interface Patient {
  id: string; medicalSerial: string; fullName: string; idNumber: string; dob: string;
  gender: 'male' | 'female'; phone: string; city: string; area: string;
  coverageEntity: string; regDate: string; findings: Finding[];
  walletBalance: number; ledger: LedgerEntry[];
  timeline?: PatientEvent[];
  appointments?: FollowUpAppointment[];
}

export interface Finding { id: string; region: string; note: string; date: string }
export interface Doctor { id: string; staffId: string; password: string; name: string; phone: string; clinics: string[]; active: boolean; specialty?: string; scheduleText?: string }
export interface Clinic { id: string; key: string; code?: string; nameAr: string; nameEn: string; visitFee: number; active: boolean; kind?: 'outpatient' | 'inpatient' | 'mixed'; dailyRate?: number }

export interface Visit {
  id: string; patientId: string; clinicId: string; doctorId: string; fee: number;
  date: string; notes: string; queueNumber: number; status: QueueStatus;
  completedAt?: string; followUpDate?: string; followUpNotes?: string; diagnosis?: string; appointmentId?: string; appointment?: FollowUpAppointment | null;
}

export interface FollowUpAppointment {
  id: string; patientId: string; doctorId: string; clinicId: string; sourceVisitId: string;
  date: string; status: 'scheduled' | 'booked' | 'completed' | 'cancelled'; computedStatus?: 'scheduled' | 'booked' | 'completed' | 'cancelled' | 'auto_closed'; statusLabel?: string; reason?: string; bookedVisitId?: string;
}

export interface DoctorNote { id: string; doctorId: string; patientId: string; text: string; createdAt: string }
export interface QueueItem { id: string; visitId?: string; patientId: string; clinicId: string; doctorId?: string; status: QueueStatus; queueNumber: number; addedAt: string; priority?: 1|2|3|4|5; triageNote?: string; updatedBy?: string; paymentReleased?: boolean }
export interface InpatientTransaction { id: string; type: 'charge' | 'payment'; amount: number; date: string; description: string; method?: string; receiptNumber?: string; category?: 'daily' | 'service' | 'payment' }
export interface InpatientNote { id: string; date: string; author: string; category: 'clinical' | 'administrative' | 'handover'; text: string }
export interface InpatientCoverageRule { id:string; afterDay:number; coveragePct:number; label?:string }
export interface InpatientCoverageMovement {
  id:string; date:string; movementType:string; referralHospital:string; coverageEntity:string; coverageLabel?:string;
  coverageStart:string; coverageEnd?:string; firstPeriodDays:number; firstPeriodPct:number; dailyRate:number;
  additionalRules:InpatientCoverageRule[]; notes?:string; createdBy?:string;
}
export type InpatientReportFieldKey =
  | 'name' | 'age' | 'gender' | 'nationalId' | 'dob' | 'medicalSerial'
  | 'address' | 'coverage' | 'ward' | 'admissionDate' | 'diagnosis'
  | 'referralHospital' | 'maritalStatus' | 'phone' | 'city';

export interface InpatientReport {
  id: string;
  date: string;
  type: 'clinical' | 'nursing' | 'handover' | 'discharge' | 'attachment' | 'rehab_letter' | 'rehab_needs' | 'rehab_followup' | 'social_psych' | 'pt_internal';
  title: string;
  summary: string;
  author: string;
  content?: string;
  note?: string;
  needs?: string[];
  patientFields?: InpatientReportFieldKey[];
  metadata?: Record<string,string>;
}

export interface Admission {
  id: string; patientId: string; ward: string; wardType?: 'male' | 'female'; room?: string; bed?: string; diagnosis: string;
  admissionDate: string; admissionTime?: string; expectedDischargeDate?: string; coverageEntity: string;
  contributionPct: number; status: 'admitted' | 'discharged'; dischargedAt?: string;
  responsiblePerson?: string; attendingDoctor?: string; dailyRate?: number;
  maritalStatus?: string; address?: string; referralHospital?: string; referringDoctor?: string;
  rehabRenewalNo?: string; rehabReferralEndDate?: string; rehabRenewalNotes?: string;
  sourceVisitId?: string; requestId?: string;
  transactions?: InpatientTransaction[]; notes?: InpatientNote[]; reports?: InpatientReport[];
  coverageMovements?: InpatientCoverageMovement[]; financialAlert61Notified?: boolean; financialAlert90Notified?: boolean;
}

export interface AdmissionRequest {
  id: string;
  patientId: string;
  requestedAt: string;
  requestedBy: string;
  sourceVisitId?: string;
  preferredWard?: string;
  diagnosis: string;
  priority: 'routine' | 'urgent' | 'emergency';
  reportRefs: Array<{ id: string; kind: 'lab' | 'radiology'; title: string; date: string }>;
  status: 'pending' | 'accepted' | 'cancelled';
  resolvedAt?: string;
  admissionId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'critical';
  link?: string;
  patientId?: string;
}
export interface TransferDetails { senderPhone: string; senderName: string; source: string }
export interface Invoice { id: string; patientId: string; service: string; unitPrice: number; coveragePct: number; payableAmount: number; paymentMethod: PaymentMethod; transferDetails?: TransferDetails; date: string; receiptNumber: string }

export type CashierWorkflowStatus = 'registered' | 'paid' | 'collected' | 'audited';
export interface CashierWorkflowCase {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  medicalSerial: string;
  idNumber?: string | null;
  patientPhone?: string | null;
  patientDob?: string | null;
  patientGender?: 'male' | 'female' | null;
  patientCity?: string | null;
  patientArea?: string | null;
  coverageEntity?: string | null;
  clinicId: string;
  clinicName: string;
  clinicCode: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  registeredAt: string;
  queueNumber: number;
  amount: number;
  status: CashierWorkflowStatus;
  paymentMethod?: 'cash' | 'app' | null;
  paymentSource?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  paidAt?: string | null;
  receiptNumber?: string | null;
  collectedAt?: string | null;
  auditedAt?: string | null;
  notes?: string | null;
}

export interface LabResultRow { test: string; result: string; referenceRange: string }
export interface DiagnosticService {
  id: string; type: 'lab' | 'radiology'; nameAr: string; nameEn: string;
  category: string; price: number; active: boolean; tests: Array<{ test: string; referenceRange: string }>;
}
export interface LabOrder {
  id: string; patientId: string; serviceId?: string; serviceName?: string; category: string;
  price?: number; doctorId?: string; date: string; status: 'processing' | 'done';
  resultRows?: LabResultRow[]; notes?: string; completedAt?: string; reportNumber?: string;
}
export interface RadiologyOrder {
  id: string; patientId: string; serviceId?: string; exam: string; price?: number;
  doctorId?: string; date: string; status: 'waiting' | 'done'; result?: string; completedAt?: string;
}
export interface Sponsor { id: string; nameAr: string; nameEn: string; code?: string; active?: boolean }

export interface HospitalState {
  patients: Patient[]; doctors: Doctor[]; clinics: Clinic[]; sponsors: Sponsor[];
  visits: Visit[]; queue: QueueItem[]; admissions: Admission[]; admissionRequests: AdmissionRequest[]; notifications: NotificationItem[]; invoices: Invoice[]; paymentCases: CashierWorkflowCase[];
  diagnosticServices: DiagnosticService[]; labs: LabOrder[]; radiology: RadiologyOrder[]; appointments: FollowUpAppointment[];
  doctorNotes: DoctorNote[];
}



export interface OperationCase {
  id: string;
  patientId: string;
  patientName: string;
  medicalSerial: string;
  idNumber: string;
  dob?: string;
  gender?: 'male' | 'female';
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  maritalStatus?: string;
  diagnosis?: string;
  doctorName?: string;
  admissionDate: string;
  admissionTime?: string;
  dischargeDate?: string;
  stayDays?: number | null;
  referralEntity: string;
  department?: string;
  caseNumber?: string;
  insuranceNumber?: string;
  conversionDuration?: string;
  conversionReason?: string;
  createdAt?: string;
  registeredBy?: string;
}


export interface DischargedArchiveRecord {
  id: string;
  sourceId: string;
  sourceType: 'admission' | 'operation';
  sourceLabel: string;
  patientId?: string | null;
  patientName: string;
  medicalSerial: string;
  idNumber: string;
  dob?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | null;
  phone?: string | null;
  city?: string | null;
  area?: string | null;
  address?: string | null;
  maritalStatus?: string | null;
  coverageEntity?: string | null;
  department?: string | null;
  room?: string | null;
  bed?: string | null;
  doctorName?: string | null;
  diagnosis?: string | null;
  admissionDate?: string | null;
  admissionTime?: string | null;
  dischargeDate?: string | null;
  dischargedAt?: string | null;
  stayDays?: number | null;
  referralEntity?: string | null;
  referringDoctor?: string | null;
  responsiblePerson?: string | null;
  caseNumber?: string | null;
  insuranceNumber?: string | null;
  conversionDuration?: string | null;
  conversionReason?: string | null;
  archiveStatus: string;
  createdAt?: string | null;
}

export interface OperationLookupRecord {
  source: 'patient_file' | 'civil_registry';
  patientId?: string | null;
  medicalSerial?: string | null;
  fullName: string;
  idNumber: string;
  dob: string;
  gender: 'male' | 'female';
  phone?: string;
  city?: string;
  area?: string;
  address?: string;
  coverageEntity?: string;
}

export interface SessionUser { id: string; username: string; displayName: string; role: Role; doctorId?: string; permissions: string[] }
export interface AccessPermission { key: string; module: string; action: string; nameAr: string; nameEn: string; financial: boolean }
export interface ManagedUser { id: string; username: string; displayName: string; role: Role; active: boolean; permissionsCustomized: boolean; permissions: string[]; assignedPermissions?: string[]; effectivePermissions?: string[]; lastLoginAt?: string; createdAt?: string; manageable: boolean }
export interface CivilRegistryRecord { fullName: string; idNumber: string; dob: string; gender: 'male' | 'female'; city: string; area: string; coverageEntity: string }

export interface OutpatientPTPatient {
  id: string;
  medicalSerial: string;
  fullName: string;
  idNumber: string;
  dob: string;
  gender: 'male' | 'female';
  phone: string;
  city?: string;
  area?: string;
  coverageEntity?: string;
  registeredAt?: string;
}

export interface OutpatientPTSession {
  id: string;
  caseId: string;
  patientId: string;
  sessionNumber: number;
  sessionDate: string;
  appointmentAt?: string;
  therapist?: string;
  specialist?: string;
  treatments: string[];
  notes?: string;
}

export interface OutpatientPTCase {
  id: string;
  ptNumber: string;
  patientGroup: 'men' | 'women_children';
  caseDate: string;
  diagnosis: string;
  maritalStatus?: string;
  treatmentDepartment?: string;
  referralSource?: string;
  treatingDoctor?: string;
  coverageCoversCost?: boolean;
  sessionFee: number;
  status: 'active' | 'closed';
  coverage?: { id: string; code: string; nameAr: string; nameEn: string } | null;
  patient: OutpatientPTPatient;
  sessions: OutpatientPTSession[];
  sessionCount: number;
}

export interface EngineerActivityLog {
  id: string;
  userId?: string | null;
  username: string;
  displayName: string;
  action: string;
  actionAr: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  date?: string;
  time?: string;
  day?: string;
}
export interface EngineerSessionLog {
  id: string;
  userId?: string | null;
  username: string;
  displayName: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  loginAt?: string;
  logoutAt?: string | null;
  lastSeenAt?: string | null;
  date?: string;
  loginTime?: string;
  logoutTime?: string | null;
  day?: string;
  durationSeconds?: number | null;
}
export interface EngineerUserOption { id: string; username: string; displayName: string; role: string; active: boolean; lastLoginAt?: string | null }
export interface DeletedItemRecord {
  id: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  deletedBy: string;
  deletedAt?: string;
  date?: string;
  time?: string;
  day?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
export interface OutpatientPTWaitlistItem {
  id: string;
  patientId?: string | null;
  caseId?: string | null;
  ptNumber?: string | null;
  fullName: string;
  idNumber?: string | null;
  phone?: string | null;
  patientGroup: 'men' | 'women_children';
  requestedDate: string;
  appointmentAt?: string | null;
  queueNumber: number;
  dailyLimit?: number | null;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  urgent: boolean;
  notes?: string | null;
  receivedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}
