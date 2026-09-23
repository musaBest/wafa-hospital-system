<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class AdmissionRequest extends Model { use HasUuids, SoftDeletes;
    protected $fillable=['patient_id','source_visit_id','preferred_ward','diagnosis','priority','report_refs','status','requested_by','requested_at','resolved_at','admission_id'];
    protected function casts():array{return ['report_refs'=>'array','requested_at'=>'datetime','resolved_at'=>'datetime'];}
    public function patient(){return $this->belongsTo(Patient::class);} public function visit(){return $this->belongsTo(Visit::class,'source_visit_id');} public function admission(){return $this->belongsTo(Admission::class);} public function requester(){return $this->belongsTo(User::class,'requested_by');}
}
