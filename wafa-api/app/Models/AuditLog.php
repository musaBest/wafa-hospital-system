<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class AuditLog extends Model {
    use HasUuids;
    public $timestamps=false;
    protected $fillable=['user_id','action','entity_type','entity_id','ip_address','metadata','created_at'];
    protected function casts():array{return ['metadata'=>'array','created_at'=>'datetime'];}
    public function user(){return $this->belongsTo(User::class);}
}

