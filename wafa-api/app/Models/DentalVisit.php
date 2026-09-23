<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DentalVisit extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'patient_id','doctor_id','clinic_id','visit_id','service_name','other_service',
        'total_amount','paid_amount','remaining_amount','notes','visit_date','status','created_by','updated_by',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'remaining_amount' => 'decimal:2',
            'visit_date' => 'date:Y-m-d',
        ];
    }

    public function patient() { return $this->belongsTo(Patient::class); }
    public function doctor() { return $this->belongsTo(Doctor::class); }
    public function clinic() { return $this->belongsTo(Clinic::class); }
    public function visit() { return $this->belongsTo(Visit::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function updater() { return $this->belongsTo(User::class, 'updated_by'); }
}
