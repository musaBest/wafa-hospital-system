<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Finding extends Model { use HasUuids, SoftDeletes; protected $fillable=['patient_id','region','note','finding_date','created_by']; protected function casts():array{return ['finding_date'=>'date:Y-m-d'];} public function patient(){return $this->belongsTo(Patient::class);} }
