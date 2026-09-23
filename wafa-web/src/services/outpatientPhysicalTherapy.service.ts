import { apiRequest } from './apiClient';
import type { OutpatientPTCase, OutpatientPTPatient, OutpatientPTSession, OutpatientPTWaitlistItem, Sponsor } from '../types';

export interface SaveOutpatientPTCaseDTO {
  patient_id: string;
  patient_group: 'men' | 'women_children';
  case_date: string;
  diagnosis: string;
  coverage_entity_id?: string;
  marital_status?: string;
  treatment_department?: string;
  referral_source?: string;
  treating_doctor?: string;
  coverage_covers_cost?: boolean;
  session_fee?: number;
  status?: 'active' | 'closed';
}


export interface SaveOutpatientPTWaitlistDTO {
  patient_id?: string;
  case_id?: string;
  full_name: string;
  id_number?: string;
  phone?: string;
  patient_group?: 'men' | 'women_children';
  requested_date: string;
  appointment_at?: string;
  queue_number?: number;
  daily_limit?: number;
  status?: 'waiting' | 'received' | 'completed' | 'cancelled';
  urgent?: boolean;
  notes?: string;
}

export interface SaveOutpatientPTSessionDTO {
  session_date: string;
  appointment_at?: string;
  therapist?: string;
  specialist?: string;
  treatments?: string[];
  notes?: string;
}

export const outpatientPhysicalTherapyService = {
  cases: () => apiRequest<OutpatientPTCase[]>('/outpatient-physical-therapy/cases',{cache:'no-store'}),
  findPatient: (identity:string) => apiRequest<{patient:OutpatientPTPatient|null}>(`/outpatient-physical-therapy/patients/find?identity=${encodeURIComponent(identity)}`,{cache:'no-store'}),
  sponsors: () => apiRequest<Sponsor[]>('/sponsors',{cache:'no-store'}),
  createCase: (dto:SaveOutpatientPTCaseDTO) => apiRequest<OutpatientPTCase>('/outpatient-physical-therapy/cases',{method:'POST',body:JSON.stringify(dto)}),
  updateCase: (id:string,dto:Partial<SaveOutpatientPTCaseDTO>) => apiRequest<OutpatientPTCase>(`/outpatient-physical-therapy/cases/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  removeCase: (id:string) => apiRequest(`/outpatient-physical-therapy/cases/${id}`,{method:'DELETE'}),
  createSession: (caseId:string,dto:SaveOutpatientPTSessionDTO) => apiRequest<OutpatientPTSession>(`/outpatient-physical-therapy/cases/${caseId}/sessions`,{method:'POST',body:JSON.stringify(dto)}),
  updateSession: (id:string,dto:Partial<SaveOutpatientPTSessionDTO>) => apiRequest<OutpatientPTSession>(`/outpatient-physical-therapy/sessions/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  removeSession: (id:string) => apiRequest(`/outpatient-physical-therapy/sessions/${id}`,{method:'DELETE'}),
  waitlist: (params?:{from?:string;to?:string;status?:string;group?:string;search?:string}) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key,value])=>{ if(value) search.set(key,value); });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return apiRequest<OutpatientPTWaitlistItem[]>(`/outpatient-physical-therapy/waitlist${suffix}`,{cache:'no-store'});
  },
  createWaitlist: (dto:SaveOutpatientPTWaitlistDTO) => apiRequest<OutpatientPTWaitlistItem>('/outpatient-physical-therapy/waitlist',{method:'POST',body:JSON.stringify(dto)}),
  updateWaitlist: (id:string,dto:Partial<SaveOutpatientPTWaitlistDTO>) => apiRequest<OutpatientPTWaitlistItem>(`/outpatient-physical-therapy/waitlist/${id}`,{method:'PATCH',body:JSON.stringify(dto)}),
  removeWaitlist: (id:string) => apiRequest(`/outpatient-physical-therapy/waitlist/${id}`,{method:'DELETE'}),
  addCoverage: (nameAr:string,nameEn?:string) => apiRequest<Sponsor>('/outpatient-physical-therapy/coverage-entities',{method:'POST',body:JSON.stringify({name_ar:nameAr,name_en:nameEn || nameAr})}),
};
