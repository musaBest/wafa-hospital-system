<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    public $incrementing = false;
    public $timestamps = false;
    protected $primaryKey = 'key';
    protected $keyType = 'string';
    protected $fillable = ['key', 'module', 'action', 'name_ar', 'name_en', 'is_financial', 'sort_order'];
    protected function casts(): array { return ['is_financial' => 'boolean']; }
}
