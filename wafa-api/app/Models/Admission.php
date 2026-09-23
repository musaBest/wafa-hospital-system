<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Admission extends Model { use HasUuids, SoftDeletes;
    protected $fillable=['patient_id','ward','ward_type','room','bed','diagnosis','admission_date','admission_time','expected_discharge_date','coverage_entity_id','contribution_pct','daily_rate','status','discharged_at','admitted_by','discharged_by','responsible_user_id','attending_doctor_id','marital_status','address','referral_hospital','referring_doctor','source_visit_id','request_id'];
    protected function casts():array{return ['admission_date'=>'date:Y-m-d','admission_time'=>'datetime','expected_discharge_date'=>'date:Y-m-d','contribution_pct'=>'decimal:2','daily_rate'=>'decimal:2','discharged_at'=>'datetime'];}
    public function patient(){return $this->belongsTo(Patient::class);} public function sponsor(){return $this->belongsTo(Sponsor::class,'coverage_entity_id');}
    public function transactions(){return $this->hasMany(InpatientTransaction::class)->orderBy('occurred_at');} public function notes(){return $this->hasMany(InpatientNote::class)->orderByDesc('noted_at');} public function reports(){return $this->hasMany(InpatientReport::class)->orderByDesc('report_date');}
    public function responsible(){return $this->belongsTo(User::class,'responsible_user_id');} public function doctor(){return $this->belongsTo(Doctor::class,'attending_doctor_id');} public function request(){return $this->belongsTo(AdmissionRequest::class,'request_id');}
}
