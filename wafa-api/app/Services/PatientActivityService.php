<?php

namespace App\Services;

use App\Models\{Patient, PatientEvent, SystemNotification, WalletTransaction};
use Illuminate\Support\Str;

class PatientActivityService
{
    public function event(string $patientId, string $type, string $title, ?string $description = null, ?string $status = null, ?string $referenceType = null, ?string $referenceId = null, ?string $createdBy = null): PatientEvent
    {
        return PatientEvent::create([
            'patient_id'=>$patientId,'type'=>$type,'title'=>$title,'description'=>$description,'status'=>$status,
            'reference_type'=>$referenceType,'reference_id'=>$referenceId,'occurred_at'=>now(),'created_by'=>$createdBy,
        ]);
    }

    public function notify(?string $permissionKey, ?string $patientId, string $type, string $title, ?string $body = null, ?string $link = null, ?string $userId = null): SystemNotification
    {
        return SystemNotification::create([
            'user_id'=>$userId,'permission_key'=>$permissionKey,'module'=>$permissionKey ? explode('.', $permissionKey)[0] : null,'patient_id'=>$patientId,'type'=>$type,
            'title'=>$title,'body'=>$body,'link'=>$link,'read_at'=>null,
        ]);
    }

    public function wallet(Patient $patient, string $direction, float $amount, string $service, string $method, string $referenceType, ?string $referenceId = null, ?string $receipt = null, array $metadata = []): WalletTransaction
    {
        $amount = round(max(0, $amount), 2);
        if ($direction === 'debit') $patient->decrement('wallet_balance', $amount);
        else $patient->increment('wallet_balance', $amount);
        return WalletTransaction::create([
            'patient_id'=>$patient->id,'type'=>$direction,'occurred_at'=>now(),'service'=>$service,'amount'=>$amount,'method'=>$method,
            'receipt_number'=>$receipt ?: strtoupper(substr($referenceType,0,3)).'-'.now()->format('YmdHis').'-'.substr((string)Str::uuid(),0,8),
            'reference_type'=>$referenceType,'reference_id'=>$referenceId,'metadata'=>$metadata ?: null,
        ]);
    }
}
