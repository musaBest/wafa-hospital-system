<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserSessionLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id','token_id','device_name','ip_address','user_agent','login_at','logout_at','last_seen_at','metadata'
    ];

    protected function casts(): array
    {
        return ['login_at'=>'datetime','logout_at'=>'datetime','last_seen_at'=>'datetime','metadata'=>'array'];
    }

    public function user() { return $this->belongsTo(User::class); }
}
