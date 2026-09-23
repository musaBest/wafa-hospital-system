<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ElderlyResident extends Model
{
    use HasUuids, SoftDeletes;

    public const FIXED_ADDRESS = 'مركز الوفاء لرعاية المسنين والمسنات';

    protected $fillable = [
        'patient_id','full_name','medical_serial','id_number','dob','gender','marital_status','current_address','original_town','housing_type','admission_date',
        'receives_assistance','assistance_type','assistance_details','disabilities','custom_disability','is_deceased','exit_date','health_status_details',
        'employment_status','work_type','medications','assistive_tools','belongings','status','final_exit_date','temporary_leave_from','temporary_leave_to','temporary_leave_reason','notes','created_by','updated_by',
    ];

    protected function casts(): array
    {
        return [
            'dob' => 'date:Y-m-d',
            'admission_date' => 'date:Y-m-d',
            'receives_assistance' => 'boolean',
            'disabilities' => 'array',
            'is_deceased' => 'boolean',
            'exit_date' => 'date:Y-m-d',
            'medications' => 'array',
            'assistive_tools' => 'array',
            'final_exit_date' => 'date:Y-m-d',
            'temporary_leave_from' => 'date:Y-m-d',
            'temporary_leave_to' => 'date:Y-m-d',
        ];
    }

    public function patient() { return $this->belongsTo(Patient::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function updater() { return $this->belongsTo(User::class, 'updated_by'); }
}
