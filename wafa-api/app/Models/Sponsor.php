<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Sponsor extends Model { use HasUuids, SoftDeletes; protected $fillable=['code','name_ar','name_en','active']; protected function casts():array{return ['active'=>'boolean'];} public function patients(){return $this->hasMany(Patient::class,'coverage_entity_id');} }
