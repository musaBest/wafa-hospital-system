<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DeletedItem extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'user_id','entity_type','entity_id','entity_label','payload','deleted_at','restored_at','metadata'
    ];

    protected function casts(): array
    {
        return ['payload'=>'array','metadata'=>'array','deleted_at'=>'datetime','restored_at'=>'datetime'];
    }

    public function user() { return $this->belongsTo(User::class); }
}
