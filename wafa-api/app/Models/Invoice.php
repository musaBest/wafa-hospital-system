<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Invoice extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','service','unit_price','coverage_ratio','payable_amount','payment_method','sender_phone','sender_name','transfer_source','issued_at','receipt_number','created_by']; protected function casts():array{return ['unit_price'=>'decimal:2','coverage_ratio'=>'decimal:2','payable_amount'=>'decimal:2','issued_at'=>'datetime'];} public function patient(){return $this->belongsTo(Patient::class);} public function creator(){return $this->belongsTo(User::class,'created_by');} }
