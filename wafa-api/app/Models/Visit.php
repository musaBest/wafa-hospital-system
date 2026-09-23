<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Visit extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','clinic_id','doctor_id','fee','visit_date','notes','diagnosis','queue_number','status','completed_at','follow_up_date','follow_up_notes','appointment_id']; protected function casts():array{return ['fee'=>'decimal:2','visit_date'=>'date:Y-m-d','completed_at'=>'datetime','follow_up_date'=>'date:Y-m-d'];} public function patient(){return $this->belongsTo(Patient::class);} public function clinic(){return $this->belongsTo(Clinic::class);} public function doctor(){return $this->belongsTo(Doctor::class);} public function queueItem(){return $this->hasOne(QueueItem::class);} public function appointment(){return $this->belongsTo(FollowUpAppointment::class,'appointment_id');} }
