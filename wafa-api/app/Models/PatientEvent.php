<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class PatientEvent extends Model { use HasUuids; protected $fillable=['patient_id','type','title','description','status','reference_type','reference_id','occurred_at','created_by']; protected function casts():array{return ['occurred_at'=>'datetime'];} public function patient(){return $this->belongsTo(Patient::class);} }
