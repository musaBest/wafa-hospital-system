<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class WalletTransaction extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','type','occurred_at','service','amount','method','receipt_number','reference_type','reference_id','metadata']; protected function casts():array{return ['occurred_at'=>'datetime','amount'=>'decimal:2','metadata'=>'array'];} public function patient(){return $this->belongsTo(Patient::class);} }
