<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OutpatientPhysicalTherapyWaitlist extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'outpatient_pt_waitlist';

    protected $fillable = [
        'patient_id','case_id','full_name','id_number','phone','patient_group','requested_date','appointment_at',
        'queue_number','daily_limit','status','urgent','notes','received_at','completed_at','created_by','updated_by'
    ];

    protected function casts(): array
    {
        return [
            'requested_date'=>'date:Y-m-d','appointment_at'=>'datetime','queue_number'=>'integer','daily_limit'=>'integer',
            'urgent'=>'boolean','received_at'=>'datetime','completed_at'=>'datetime'
        ];
    }

    public function patient() { return $this->belongsTo(Patient::class); }
    public function caseFile() { return $this->belongsTo(OutpatientPhysicalTherapyCase::class, 'case_id'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
