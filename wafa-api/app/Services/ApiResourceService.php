<?php

namespace App\Services;

use App\Models\{Admission, AdmissionRequest, Clinic, Doctor, FollowUpAppointment, InpatientNote, InpatientReport, InpatientTransaction, Invoice, Patient, PatientEvent, QueueItem, Sponsor, Visit, WalletTransaction};
use App\Models\User;

class ApiResourceService
{
    public function patient(Patient $patient, ?User $viewer = null): array
    {
        $financial = $viewer?->hasPermission('patient_finance.view') ?? false;
        $result = [
            'id'=>$patient->id,'medicalSerial'=>$patient->medical_serial,'fullName'=>$patient->full_name,'idNumber'=>$patient->id_number,
            'dob'=>$patient->dob?->format('Y-m-d'),'gender'=>$patient->gender,'phone'=>$patient->phone,'city'=>$patient->city,'area'=>$patient->area,
            'coverageEntity'=>$patient->sponsor?->code ?? 'self','regDate'=>$patient->registered_at?->format('Y-m-d'),
            'findings'=>$patient->relationLoaded('findings') ? $patient->findings->map(fn($x)=>['id'=>$x->id,'region'=>$x->region,'note'=>$x->note,'date'=>$x->finding_date?->format('Y-m-d')])->values() : [],
            'appointments'=>$patient->relationLoaded('appointments') ? $patient->appointments->map(fn($x)=>$this->appointment($x))->values() : [],
            'timeline'=>$patient->relationLoaded('events') ? $patient->events->map(fn($x)=>$this->patientEvent($x))->values() : [],
        ];
        if ($financial) {
            $result['walletBalance']=(float)$patient->wallet_balance;
            $result['ledger']=$patient->relationLoaded('ledger') ? $patient->ledger->map(fn($x)=>$this->ledger($x))->values() : [];
        }
        return $result;
    }
    public function clinic(Clinic $x):array{return ['id'=>$x->id,'key'=>$x->key,'code'=>$x->code,'nameAr'=>$x->name_ar,'nameEn'=>$x->name_en,'visitFee'=>(float)$x->visit_fee,'kind'=>$x->kind ?? 'outpatient','dailyRate'=>(float)($x->daily_rate ?? 0),'active'=>$x->active];}
    public function sponsor(Sponsor $x):array{return ['id'=>$x->id,'code'=>$x->code,'nameAr'=>$x->name_ar,'nameEn'=>$x->name_en,'active'=>$x->active];}
    public function doctor(Doctor $x):array{return ['id'=>$x->id,'staffId'=>$x->staff_id,'name'=>$x->name,'phone'=>$x->phone,'specialty'=>$x->specialty,'scheduleText'=>$x->schedule_text,'clinics'=>$x->relationLoaded('clinics')?$x->clinics->pluck('id')->values():[],'active'=>$x->active];}
    public function visit(Visit $x):array{return ['id'=>$x->id,'patientId'=>$x->patient_id,'clinicId'=>$x->clinic_id,'doctorId'=>$x->doctor_id,'fee'=>(float)$x->fee,'date'=>$x->visit_date?->format('Y-m-d'),'notes'=>$x->notes ?? '','diagnosis'=>$x->diagnosis ?? '','queueNumber'=>$x->queue_number,'status'=>$x->status,'completedAt'=>$x->completed_at?->toISOString(),'followUpDate'=>$x->follow_up_date?->format('Y-m-d'),'followUpNotes'=>$x->follow_up_notes ?? '','appointmentId'=>$x->appointment_id];}
    public function queue(QueueItem $x):array{return ['id'=>$x->id,'visitId'=>$x->visit_id,'patientId'=>$x->patient_id,'clinicId'=>$x->clinic_id,'doctorId'=>$x->doctor_id,'status'=>$x->status,'queueNumber'=>$x->queue_number,'priority'=>(int)($x->priority??3),'triageNote'=>$x->triage_note,'updatedBy'=>$x->updated_by,'addedAt'=>$x->added_at?->format('H:i')];}
    public function appointment(FollowUpAppointment $x):array{
        $date=$x->appointment_date?->format('Y-m-d');
        $computed=$x->status;
        if($x->status==='scheduled' && $x->appointment_date && $x->appointment_date->lt(today())) $computed='auto_closed';
        return ['id'=>$x->id,'patientId'=>$x->patient_id,'doctorId'=>$x->doctor_id,'clinicId'=>$x->clinic_id,'sourceVisitId'=>$x->source_visit_id,'date'=>$date,'status'=>$x->status,'computedStatus'=>$computed,'statusLabel'=>$computed==='auto_closed'?'تم إنهاء الحالة تلقائياً':($x->status==='scheduled'?'مراجعة مجدولة':($x->status==='booked'?'تم تسجيل زيارة المراجعة':($x->status==='completed'?'مكتملة':'ملغية'))),'reason'=>$x->reason ?? '','bookedVisitId'=>$x->booked_visit_id];
    }
    public function ledger(WalletTransaction $x):array{return ['id'=>$x->id,'type'=>$x->type,'timestamp'=>$x->occurred_at?->toISOString(),'service'=>$x->service,'amount'=>(float)$x->amount,'method'=>$x->method,'receiptNumber'=>$x->receipt_number,'referenceType'=>$x->reference_type,'referenceId'=>$x->reference_id,'metadata'=>$x->metadata];}
    public function invoice(Invoice $x):array{return ['id'=>$x->id,'patientId'=>$x->patient_id,'service'=>$x->service,'unitPrice'=>(float)$x->unit_price,'coveragePct'=>(float)$x->coverage_ratio,'payableAmount'=>(float)$x->payable_amount,'paymentMethod'=>$x->payment_method,'transferDetails'=>$x->payment_method==='app'?['senderPhone'=>$x->sender_phone,'senderName'=>$x->sender_name,'source'=>$x->transfer_source]:null,'date'=>$x->issued_at?->toISOString(),'receiptNumber'=>$x->receipt_number];}
    public function admission(Admission $x):array{return [
        'id'=>$x->id,'patientId'=>$x->patient_id,'ward'=>$x->ward,'wardType'=>$x->ward_type,'room'=>$x->room,'bed'=>$x->bed,'diagnosis'=>$x->diagnosis,
        'admissionDate'=>$x->admission_date?->format('Y-m-d'),'admissionTime'=>$x->admission_time?->toISOString(),'expectedDischargeDate'=>$x->expected_discharge_date?->format('Y-m-d'),
        'coverageEntity'=>$x->sponsor?->code,'contributionPct'=>(float)$x->contribution_pct,'dailyRate'=>(float)($x->daily_rate??0),'status'=>$x->status,
        'maritalStatus'=>$x->marital_status,'address'=>$x->address,'referralHospital'=>$x->referral_hospital,'referringDoctor'=>$x->referring_doctor,
        'responsibleUserId'=>$x->responsible_user_id,'responsiblePerson'=>$x->relationLoaded('responsible')?$x->responsible?->display_name:null,'attendingDoctorId'=>$x->attending_doctor_id,'attendingDoctor'=>$x->relationLoaded('doctor')?$x->doctor?->name:null,'sourceVisitId'=>$x->source_visit_id,'requestId'=>$x->request_id,
        'dischargedAt'=>$x->discharged_at?->toISOString(),
        'transactions'=>$x->relationLoaded('transactions')?$x->transactions->map(fn($t)=>$this->inpatientTransaction($t))->values():[],
        'notes'=>$x->relationLoaded('notes')?$x->notes->map(fn($n)=>$this->inpatientNote($n))->values():[],
        'reports'=>$x->relationLoaded('reports')?$x->reports->map(fn($r)=>$this->inpatientReport($r))->values():[],
    ];}
    public function admissionRequest(AdmissionRequest $x):array{return ['id'=>$x->id,'patientId'=>$x->patient_id,'sourceVisitId'=>$x->source_visit_id,'preferredWard'=>$x->preferred_ward,'diagnosis'=>$x->diagnosis,'priority'=>$x->priority,'reportRefs'=>$x->report_refs??[],'status'=>$x->status,'requestedBy'=>$x->relationLoaded('requester')?($x->requester?->display_name??$x->requested_by):$x->requested_by,'requestedAt'=>$x->requested_at?->toISOString(),'resolvedAt'=>$x->resolved_at?->toISOString(),'admissionId'=>$x->admission_id,'patient'=>$x->relationLoaded('patient')?['id'=>$x->patient->id,'fullName'=>$x->patient->full_name,'medicalSerial'=>$x->patient->medical_serial]:null];}
    public function inpatientTransaction(InpatientTransaction $x):array{return ['id'=>$x->id,'admissionId'=>$x->admission_id,'patientId'=>$x->patient_id,'type'=>$x->type,'category'=>$x->category,'amount'=>(float)$x->amount,'date'=>$x->occurred_at?->toISOString(),'description'=>$x->description,'method'=>$x->method,'receiptNumber'=>$x->receipt_number];}
    public function inpatientNote(InpatientNote $x):array{return ['id'=>$x->id,'admissionId'=>$x->admission_id,'patientId'=>$x->patient_id,'category'=>$x->category,'text'=>$x->note,'author'=>$x->relationLoaded('author')?$x->author?->display_name:null,'date'=>$x->noted_at?->toISOString()];}
    public function inpatientReport(InpatientReport $x):array{return ['id'=>$x->id,'admissionId'=>$x->admission_id,'patientId'=>$x->patient_id,'type'=>$x->type,'title'=>$x->title,'summary'=>$x->summary,'author'=>$x->relationLoaded('author')?$x->author?->display_name:null,'date'=>$x->report_date?->format('Y-m-d')];}
    public function patientEvent(PatientEvent $x):array{return ['id'=>$x->id,'type'=>$x->type,'title'=>$x->title,'description'=>$x->description,'status'=>$x->status,'referenceType'=>$x->reference_type,'referenceId'=>$x->reference_id,'timestamp'=>$x->occurred_at?->toISOString()];}
}
