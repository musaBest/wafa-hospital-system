<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiagnosticService extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = ['type','name_ar','name_en','category','price','tests','active','created_by'];
    protected function casts(): array { return ['price'=>'decimal:2','tests'=>'array','active'=>'boolean']; }
    public function labOrders() { return $this->hasMany(LabOrder::class, 'service_id'); }
    public function radiologyOrders() { return $this->hasMany(RadiologyOrder::class, 'service_id'); }
}
