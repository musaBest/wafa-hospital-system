<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{OperationCase, Patient, Sponsor};
use App\Services\{AuditService, CivilRegistryService, PatientActivityService, PatientSerialService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class OperationCaseController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:150',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);
        $items = OperationCase::with(['patient','registrar'])
            ->when($data['search'] ?? null, function ($q, $v) {
                $q->where(function ($x) use ($v) {
                    $x->where('patient_name', 'like', "%{$v}%")
                        ->orWhere('id_number', 'like', "%{$v}%")
                        ->orWhere('medical_serial', 'like', "%{$v}%")
                        ->orWhere('phone', 'like', "%{$v}%")
                        ->orWhere('doctor_name', 'like', "%{$v}%")
                        ->orWhere('referral_entity', 'like', "%{$v}%");
                });
            })
            ->when($data['from'] ?? null, fn ($q, $v) => $q->whereDate('admission_date', '>=', $v))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->whereDate('admission_date', '<=', $v))
            ->latest('admission_date')
            ->latest('created_at')
            ->limit(300)
            ->get();

        return response()->json(['data' => $items->map(fn ($item) => $this->resource($item))->values()]);
    }

    public function lookup(Request $request, CivilRegistryService $registry)
    {
        $data = $request->validate(['identity' => 'required|string|min:2|max:150']);
        $identity = trim($data['identity']);
        $patient = Patient::with('sponsor')
            ->where('id_number', $identity)
            ->orWhere('medical_serial', $identity)
            ->first();

        if ($patient) {
            return response()->json(['data' => [
                'source' => 'patient_file',
                'patientId' => $patient->id,
                'medicalSerial' => $patient->medical_serial,
                'fullName' => $patient->full_name,
                'idNumber' => $patient->id_number,
                'dob' => $patient->dob?->format('Y-m-d'),
                'gender' => $patient->gender,
                'phone' => $patient->phone,
                'city' => $patient->city,
                'area' => $patient->area,
                'address' => trim(($patient->city ? $patient->city.' - ' : '').($patient->area ?: '')),
                'coverageEntity' => $patient->sponsor?->code ?? 'self',
            ]]);
        }

        $record = $registry->lookup($identity);
        return response()->json(['data' => [
            'source' => 'civil_registry',
            'patientId' => null,
            'medicalSerial' => null,
            'fullName' => $record['fullName'] ?? '',
            'idNumber' => $record['idNumber'] ?? $identity,
            'dob' => $record['dob'] ?? '',
            'gender' => $record['gender'] ?? 'male',
            'phone' => '',
            'city' => $record['city'] ?? '',
            'area' => $record['area'] ?? '',
            'address' => trim(($record['city'] ?? '').(($record['area'] ?? '') ? ' - '.$record['area'] : '')),
            'coverageEntity' => $record['coverageEntity'] ?? 'self',
        ]]);
    }

    public function store(Request $request, PatientSerialService $serial, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate([
            'registry_data' => 'required|array',
            'registry_data.fullName' => 'required|string|max:150',
            'registry_data.idNumber' => 'required|string|max:30',
            'registry_data.dob' => 'required|date|before_or_equal:today',
            'registry_data.gender' => 'required|in:male,female',
            'registry_data.city' => 'nullable|string|max:100',
            'registry_data.area' => 'nullable|string|max:150',
            'registry_data.coverageEntity' => 'nullable|string|max:100',
            'phone' => 'required|string|min:7|max:30',
            'address' => 'nullable|string|max:500',
            'marital_status' => 'nullable|string|max:80',
            'diagnosis' => 'nullable|string|max:5000',
            'doctor_name' => 'nullable|string|max:150',
            'admission_date' => 'required|date',
            'admission_time' => 'nullable|string|max:20',
            'discharge_date' => 'nullable|date',
            'stay_days' => 'nullable|integer|min:0|max:9999',
            'referral_entity' => 'required|string|max:180',
            'department' => 'nullable|string|max:120',
            'case_number' => 'nullable|string|max:80',
            'insurance_number' => 'nullable|string|max:100',
            'conversion_duration' => 'nullable|string|max:120',
            'conversion_reason' => 'nullable|string|max:500',
        ]);

        $record = Validator::make($data['registry_data'], [
            'fullName' => 'required|string|max:150',
            'idNumber' => 'required|string|max:30',
            'dob' => 'required|date|before_or_equal:today',
            'gender' => 'required|in:male,female',
            'city' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:150',
            'coverageEntity' => 'nullable|string|max:100',
        ])->validate();

        $case = DB::transaction(function () use ($data, $record, $serial, $request, $activity) {
            $patient = Patient::where('id_number', $record['idNumber'])->lockForUpdate()->first();
            $sponsor = Sponsor::where('id', $record['coverageEntity'] ?? '')
                ->orWhere('code', $record['coverageEntity'] ?? 'self')
                ->first() ?? Sponsor::where('code', 'self')->first();

            if (!$patient) {
                $patient = Patient::create([
                    'medical_serial' => $serial->next($record['gender'], (int) date('Y')),
                    'full_name' => $record['fullName'],
                    'id_number' => $record['idNumber'],
                    'dob' => $record['dob'],
                    'gender' => $record['gender'],
                    'phone' => $data['phone'],
                    'city' => $record['city'] ?? null,
                    'area' => $record['area'] ?? ($data['address'] ?? null),
                    'coverage_entity_id' => $sponsor?->id,
                    'registered_at' => today(),
                    'wallet_balance' => 0,
                    'civil_registry_verified_at' => now(),
                ]);
            } else {
                $patient->update([
                    'full_name' => $record['fullName'],
                    'dob' => $record['dob'],
                    'gender' => $record['gender'],
                    'phone' => $data['phone'],
                    'city' => $record['city'] ?? $patient->city,
                    'area' => $record['area'] ?? ($data['address'] ?? $patient->area),
                    'coverage_entity_id' => $sponsor?->id ?? $patient->coverage_entity_id,
                    'civil_registry_verified_at' => now(),
                ]);
            }

            $case = OperationCase::create([
                'patient_id' => $patient->id,
                'patient_name' => $patient->full_name,
                'medical_serial' => $patient->medical_serial,
                'id_number' => $patient->id_number,
                'dob' => $patient->dob?->format('Y-m-d'),
                'gender' => $patient->gender,
                'phone' => $data['phone'],
                'address' => $data['address'] ?? trim(($patient->city ? $patient->city.' - ' : '').($patient->area ?? '')),
                'city' => $patient->city,
                'area' => $patient->area,
                'marital_status' => $data['marital_status'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'doctor_name' => $data['doctor_name'] ?? null,
                'admission_date' => $data['admission_date'],
                'admission_time' => $data['admission_time'] ?? now()->format('H:i'),
                'discharge_date' => $data['discharge_date'] ?? null,
                'stay_days' => $data['stay_days'] ?? null,
                'referral_entity' => $data['referral_entity'],
                'department' => $data['department'] ?? 'عمليات',
                'case_number' => ($data['case_number'] ?? '') !== '' ? $data['case_number'] : (string) random_int(1000, 9999),
                'insurance_number' => $data['insurance_number'] ?? null,
                'conversion_duration' => $data['conversion_duration'] ?? null,
                'conversion_reason' => $data['conversion_reason'] ?? null,
                'source' => 'operations_page',
                'registered_by' => $request->user()->id,
            ]);

            $activity->event($patient->id, 'admission', 'إذن دخول عمليات', 'تم إصدار إذن دخول مريض لقسم العمليات. الجهة: '.$case->referral_entity, 'issued', 'operation_case', $case->id, $request->user()->id);
            return $case;
        });

        $audit->record($request, 'operation_case.created', 'operation_case', $case->id, ['patient_id' => $case->patient_id]);
        return response()->json(['data' => $this->resource($case->fresh(['patient','registrar']))], 201);
    }

    private function resource(OperationCase $item): array
    {
        return [
            'id' => $item->id,
            'patientId' => $item->patient_id,
            'patientName' => $item->patient_name,
            'medicalSerial' => $item->medical_serial,
            'idNumber' => $item->id_number,
            'dob' => $item->dob?->format('Y-m-d'),
            'gender' => $item->gender,
            'phone' => $item->phone,
            'address' => $item->address,
            'city' => $item->city,
            'area' => $item->area,
            'maritalStatus' => $item->marital_status,
            'diagnosis' => $item->diagnosis,
            'doctorName' => $item->doctor_name,
            'admissionDate' => $item->admission_date?->format('Y-m-d'),
            'admissionTime' => $item->admission_time?->format('H:i'),
            'dischargeDate' => $item->discharge_date?->format('Y-m-d'),
            'stayDays' => $item->stay_days,
            'referralEntity' => $item->referral_entity,
            'department' => $item->department,
            'caseNumber' => $item->case_number,
            'insuranceNumber' => $item->insurance_number,
            'conversionDuration' => $item->conversion_duration,
            'conversionReason' => $item->conversion_reason,
            'createdAt' => $item->created_at?->toISOString(),
            'registeredBy' => $item->registrar?->display_name,
        ];
    }
}
