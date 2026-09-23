<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public function record(Request $request, string $action, string $entityType, ?string $entityId = null, array $metadata = []): void
    {
        AuditLog::create(['user_id'=>$request->user()?->id,'action'=>$action,'entity_type'=>$entityType,'entity_id'=>$entityId,'ip_address'=>$request->ip(),'metadata'=>$metadata ?: null,'created_at'=>now()]);
    }
}
