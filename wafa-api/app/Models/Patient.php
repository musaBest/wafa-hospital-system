<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use HasUuids, SoftDeletes;
    protected $fillable = ['medical_serial','full_name','id_number','dob','gender','phone','city','area','coverage_entity_id','registered_at','wallet_balance','civil_registry_verified_at'];
    protected function casts(): array { return ['dob'=>'date:Y-m-d','registered_at'=>'date:Y-m-d','wallet_balance'=>'decimal:2','civil_registry_verified_at'=>'datetime']; }
    public function sponsor() { return $this->belongsTo(Sponsor::class, 'coverage_entity_id'); }
    public function visits() { return $this->hasMany(Visit::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
    public function ledger() { return $this->hasMany(WalletTransaction::class)->orderByDesc('occurred_at'); }
    public function findings() { return $this->hasMany(Finding::class); }
    public function appointments() { return $this->hasMany(FollowUpAppointment::class); }
    public function labOrders() { return $this->hasMany(LabOrder::class); }
    public function radiologyOrders() { return $this->hasMany(RadiologyOrder::class); }
    public function admissions() { return $this->hasMany(Admission::class)->latest('admission_date'); }
    public function admissionRequests() { return $this->hasMany(AdmissionRequest::class)->latest('requested_at'); }
    public function events() { return $this->hasMany(PatientEvent::class)->orderByDesc('occurred_at'); }
    public function inpatientTransactions() { return $this->hasMany(InpatientTransaction::class)->orderByDesc('occurred_at'); }
    public function outpatientPhysicalTherapyCases() { return $this->hasMany(OutpatientPhysicalTherapyCase::class); }
    public function outpatientPhysicalTherapySessions() { return $this->hasMany(OutpatientPhysicalTherapySession::class); }
}
