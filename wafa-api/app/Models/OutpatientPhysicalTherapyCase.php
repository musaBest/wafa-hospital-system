<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OutpatientPhysicalTherapyCase extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'outpatient_pt_cases';

    protected $fillable = [
        'patient_id','pt_number','patient_group','case_date','diagnosis','coverage_entity_id','marital_status',
        'treatment_department','referral_source','treating_doctor','coverage_covers_cost','session_fee','status','created_by',
    ];

    protected function casts(): array
    {
        return ['case_date'=>'date','coverage_covers_cost'=>'boolean','session_fee'=>'decimal:2'];
    }

    public function patient() { return $this->belongsTo(Patient::class); }
    public function sponsor() { return $this->belongsTo(Sponsor::class, 'coverage_entity_id'); }
    public function sessions() { return $this->hasMany(OutpatientPhysicalTherapySession::class, 'case_id')->orderBy('session_date')->orderBy('session_number'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
