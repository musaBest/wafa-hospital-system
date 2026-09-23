<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Doctor extends Model { use HasUuids,SoftDeletes; protected $fillable=['user_id','staff_id','name','phone','specialty','schedule_text','active']; protected function casts():array{return ['active'=>'boolean'];} public function user(){return $this->belongsTo(User::class);} public function clinics(){return $this->belongsToMany(Clinic::class)->withTimestamps();} public function visits(){return $this->hasMany(Visit::class);} public function notes(){return $this->hasMany(DoctorNote::class);} }
