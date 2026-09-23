<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class InpatientTransaction extends Model { use HasUuids, SoftDeletes; protected $fillable=['admission_id','patient_id','type','category','amount','occurred_at','description','method','receipt_number','created_by']; protected function casts():array{return ['amount'=>'decimal:2','occurred_at'=>'datetime'];} public function admission(){return $this->belongsTo(Admission::class);} public function patient(){return $this->belongsTo(Patient::class);} }
