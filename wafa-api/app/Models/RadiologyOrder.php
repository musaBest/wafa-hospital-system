<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class RadiologyOrder extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','service_id','doctor_id','exam','price','ordered_at','status','result','completed_at','created_by']; protected function casts():array{return ['ordered_at'=>'datetime','completed_at'=>'datetime','price'=>'decimal:2'];} public function patient(){return $this->belongsTo(Patient::class);} public function service(){return $this->belongsTo(DiagnosticService::class,'service_id');} public function doctor(){return $this->belongsTo(Doctor::class);} }
