<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashierWorkflowCase extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id','visit_id','patient_id','patient_name','medical_serial','id_number','patient_phone','patient_dob','patient_gender','patient_city','patient_area','coverage_entity',
        'clinic_id','clinic_name','clinic_code','doctor_id','doctor_name',
        'visit_date','registered_at','queue_number','amount','status',
        'payment_method','payment_source','sender_name','sender_phone','paid_at',
        'receipt_number','collected_at','audited_at','notes',
        'registered_by','paid_by','collected_by','audited_by',
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date:Y-m-d',
            'patient_dob' => 'date:Y-m-d',
            'registered_at' => 'datetime',
            'paid_at' => 'datetime',
            'collected_at' => 'datetime',
            'audited_at' => 'datetime',
            'amount' => 'decimal:2',
            'queue_number' => 'integer',
        ];
    }
}
