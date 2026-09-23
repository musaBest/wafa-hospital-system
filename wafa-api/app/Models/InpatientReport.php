<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class InpatientReport extends Model { use HasUuids, SoftDeletes; protected $fillable=['admission_id','patient_id','type','title','summary','authored_by','report_date']; protected function casts():array{return ['report_date'=>'date:Y-m-d'];} public function admission(){return $this->belongsTo(Admission::class);} public function author(){return $this->belongsTo(User::class,'authored_by');} }
