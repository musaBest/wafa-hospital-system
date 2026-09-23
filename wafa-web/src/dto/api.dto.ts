import type { CivilRegistryRecord, Invoice, Patient, Visit } from '../types';

export interface LaravelResource<T> { data: T }
export interface LaravelCollection<T> { data: T[]; meta?: { current_page:number; last_page:number; total:number } }
export interface RegisterPatientDTO { identity_or_name:string; phone:string; registry_data:CivilRegistryRecord }
export interface RegisterVisitDTO { patient_id:string; clinic_id:string; doctor_id:string; visit_date:string; notes?:string; appointment_id?:string }
export interface CreateInvoiceDTO { patient_id:string; service:string; unit_price:number; coverage_ratio:number; payment_method:'cash'|'app'; transfer?:{sender_phone:string;sender_name:string;source:'wallet'|'bank'|'jawwalPay'} }
export type PatientResource = LaravelResource<Patient>;
export type VisitResource = LaravelResource<Visit>;
export type InvoiceResource = LaravelResource<Invoice>;
