<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class FollowUpAppointment extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','doctor_id','clinic_id','source_visit_id','appointment_date','status','reason','booked_visit_id','created_by']; protected function casts():array{return ['appointment_date'=>'date:Y-m-d'];} public function patient(){return $this->belongsTo(Patient::class);} public function doctor(){return $this->belongsTo(Doctor::class);} public function clinic(){return $this->belongsTo(Clinic::class);} public function sourceVisit(){return $this->belongsTo(Visit::class,'source_visit_id');} }
