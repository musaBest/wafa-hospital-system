<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class DoctorNote extends Model { use HasUuids, SoftDeletes; protected $fillable=['doctor_id','patient_id','visit_id','content']; public function doctor(){return $this->belongsTo(Doctor::class);} public function patient(){return $this->belongsTo(Patient::class);} public function visit(){return $this->belongsTo(Visit::class);} }
