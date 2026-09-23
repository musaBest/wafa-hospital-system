<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class InpatientNote extends Model { use HasUuids, SoftDeletes; protected $fillable=['admission_id','patient_id','category','note','authored_by','noted_at']; protected function casts():array{return ['noted_at'=>'datetime'];} public function admission(){return $this->belongsTo(Admission::class);} public function author(){return $this->belongsTo(User::class,'authored_by');} }
