<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OutpatientPhysicalTherapySession extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'outpatient_pt_sessions';

    protected $fillable = [
        'case_id','patient_id','session_number','session_date','appointment_at','therapist','specialist','treatments','notes','created_by',
    ];

    protected function casts(): array
    {
        return ['session_date'=>'date','appointment_at'=>'datetime','treatments'=>'array'];
    }

    public function caseFile() { return $this->belongsTo(OutpatientPhysicalTherapyCase::class, 'case_id'); }
    public function patient() { return $this->belongsTo(Patient::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
