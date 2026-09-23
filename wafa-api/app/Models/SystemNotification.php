<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class SystemNotification extends Model { use HasUuids; protected $fillable=['user_id','permission_key','module','patient_id','type','title','body','link','read_at','muted_by']; protected function casts():array{return ['read_at'=>'datetime','muted_by'=>'array'];} public function patient(){return $this->belongsTo(Patient::class);} public function user(){return $this->belongsTo(User::class);} }
