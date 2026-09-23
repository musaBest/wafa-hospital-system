<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Clinic extends Model { use HasUuids,SoftDeletes; protected $fillable=['key','code','name_ar','name_en','visit_fee','kind','daily_rate','active']; protected function casts():array{return ['visit_fee'=>'decimal:2','daily_rate'=>'decimal:2','active'=>'boolean'];} public function doctors(){return $this->belongsToMany(Doctor::class)->withTimestamps();} public function visits(){return $this->hasMany(Visit::class);} }
