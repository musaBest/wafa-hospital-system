<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class LabOrder extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','service_id','doctor_id','category','price','ordered_at','status','result','result_rows','notes','completed_at','completed_by','report_number','created_by']; protected function casts():array{return ['ordered_at'=>'datetime','completed_at'=>'datetime','price'=>'decimal:2','result_rows'=>'array'];} public function patient(){return $this->belongsTo(Patient::class);} public function service(){return $this->belongsTo(DiagnosticService::class,'service_id');} public function doctor(){return $this->belongsTo(Doctor::class);} }
