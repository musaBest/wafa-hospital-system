<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OperationCase extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'patient_id', 'patient_name', 'medical_serial', 'id_number', 'dob', 'gender', 'phone', 'address', 'city', 'area', 'marital_status',
        'diagnosis', 'doctor_name', 'admission_date', 'admission_time', 'discharge_date', 'stay_days', 'referral_entity', 'department',
        'case_number', 'insurance_number', 'conversion_duration', 'conversion_reason', 'source', 'registered_by',
    ];

    protected function casts(): array
    {
        return [
            'dob' => 'date:Y-m-d',
            'admission_date' => 'date:Y-m-d',
            'admission_time' => 'datetime',
            'discharge_date' => 'date:Y-m-d',
            'stay_days' => 'integer',
        ];
    }

    public function patient() { return $this->belongsTo(Patient::class); }
    public function registrar() { return $this->belongsTo(User::class, 'registered_by'); }
}
