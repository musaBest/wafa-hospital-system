<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DentalWaitlistItem extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'patient_id','full_name','medical_serial','id_number','phone','requested_date','appointment_time',
        'service_name','other_service','doctor_id','status','notes','created_by','updated_by',
    ];

    protected function casts(): array
    {
        return [
            'requested_date' => 'date:Y-m-d',
        ];
    }

    public function patient() { return $this->belongsTo(Patient::class); }
    public function doctor() { return $this->belongsTo(Doctor::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function updater() { return $this->belongsTo(User::class, 'updated_by'); }
}
