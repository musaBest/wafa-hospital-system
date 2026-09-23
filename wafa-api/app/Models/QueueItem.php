<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class QueueItem extends Model { use HasUuids, SoftDeletes; protected $fillable=['visit_id','patient_id','clinic_id','doctor_id','queue_date','queue_number','status','priority','triage_note','updated_by','added_at']; protected function casts():array{return ['queue_date'=>'date:Y-m-d','added_at'=>'datetime','priority'=>'integer'];} public function visit(){return $this->belongsTo(Visit::class);} public function patient(){return $this->belongsTo(Patient::class);} public function doctor(){return $this->belongsTo(Doctor::class);} public function clinic(){return $this->belongsTo(Clinic::class);} }
