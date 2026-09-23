<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Admission, OperationCase};
use Carbon\Carbon;
use Illuminate\Http\Request;

class ArchiveController extends Controller
{
    public function discharged(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:150',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $search = trim((string) ($data['search'] ?? ''));
        $from = $data['from'] ?? null;
        $to = $data['to'] ?? null;

        $admissions = Admission::with(['patient.sponsor', 'sponsor', 'doctor', 'responsible'])
            ->where('status', 'discharged')
            ->when($from, fn ($q, $v) => $q->whereDate('discharged_at', '>=', $v))
            ->when($to, fn ($q, $v) => $q->whereDate('discharged_at', '<=', $v))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($query) use ($search) {
                    $query->where('ward', 'like', "%{$search}%")
                        ->orWhere('diagnosis', 'like', "%{$search}%")
                        ->orWhere('room', 'like', "%{$search}%")
                        ->orWhere('bed', 'like', "%{$search}%")
                        ->orWhereHas('patient', function ($patient) use ($search) {
                            $patient->where('full_name', 'like', "%{$search}%")
                                ->orWhere('id_number', 'like', "%{$search}%")
                                ->orWhere('medical_serial', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%")
                                ->orWhere('city', 'like', "%{$search}%")
                                ->orWhere('area', 'like', "%{$search}%");
                        })
                        ->orWhereHas('doctor', fn ($doctor) => $doctor->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest('discharged_at')
            ->limit(400)
            ->get()
            ->map(fn ($item) => $this->admissionResource($item));

        $operationCases = OperationCase::with(['patient.sponsor', 'registrar'])
            ->whereNotNull('discharge_date')
            ->when($from, fn ($q, $v) => $q->whereDate('discharge_date', '>=', $v))
            ->when($to, fn ($q, $v) => $q->whereDate('discharge_date', '<=', $v))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($query) use ($search) {
                    $query->where('patient_name', 'like', "%{$search}%")
                        ->orWhere('id_number', 'like', "%{$search}%")
                        ->orWhere('medical_serial', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('doctor_name', 'like', "%{$search}%")
                        ->orWhere('referral_entity', 'like', "%{$search}%")
                        ->orWhere('department', 'like', "%{$search}%")
                        ->orWhere('diagnosis', 'like', "%{$search}%")
                        ->orWhere('case_number', 'like', "%{$search}%");
                });
            })
            ->latest('discharge_date')
            ->latest('created_at')
            ->limit(400)
            ->get()
            ->map(fn ($item) => $this->operationResource($item));

        $items = $admissions
            ->concat($operationCases)
            ->sortByDesc(fn ($row) => ($row['dischargeSort'] ?? '').' '.($row['createdAt'] ?? ''))
            ->values()
            ->take(600);

        return response()->json(['data' => $items]);
    }

    private function admissionResource(Admission $item): array
    {
        $patient = $item->patient;
        $admissionDate = $item->admission_date?->format('Y-m-d');
        $dischargeDate = $item->discharged_at?->format('Y-m-d');
        $stayDays = $this->stayDays($admissionDate, $dischargeDate);
        $address = $item->address ?: trim(($patient?->city ? $patient->city.' - ' : '').($patient?->area ?: ''));

        return [
            'id' => 'admission-'.$item->id,
            'sourceId' => $item->id,
            'sourceType' => 'admission',
            'sourceLabel' => 'مبيت داخلي',
            'patientId' => $patient?->id,
            'patientName' => $patient?->full_name ?? '—',
            'medicalSerial' => $patient?->medical_serial ?? '—',
            'idNumber' => $patient?->id_number ?? '—',
            'dob' => $patient?->dob?->format('Y-m-d'),
            'age' => $patient?->dob ? $patient->dob->age : null,
            'gender' => $patient?->gender,
            'phone' => $patient?->phone,
            'city' => $patient?->city,
            'area' => $patient?->area,
            'address' => $address,
            'maritalStatus' => $item->marital_status,
            'coverageEntity' => $item->sponsor?->name_ar ?? $patient?->sponsor?->name_ar ?? $item->coverage_entity_id,
            'department' => $item->ward,
            'room' => $item->room,
            'bed' => $item->bed,
            'doctorName' => $item->doctor?->name,
            'diagnosis' => $item->diagnosis,
            'admissionDate' => $admissionDate,
            'admissionTime' => $item->admission_time?->format('H:i'),
            'dischargeDate' => $dischargeDate,
            'dischargedAt' => $item->discharged_at?->toISOString(),
            'stayDays' => $stayDays,
            'referralEntity' => $item->referral_hospital,
            'referringDoctor' => $item->referring_doctor,
            'responsiblePerson' => $item->responsible?->display_name,
            'archiveStatus' => 'خرج من المستشفى',
            'dischargeSort' => $item->discharged_at?->format('Y-m-d H:i:s'),
            'createdAt' => $item->created_at?->toISOString(),
        ];
    }

    private function operationResource(OperationCase $item): array
    {
        $patient = $item->patient;
        $admissionDate = $item->admission_date?->format('Y-m-d');
        $dischargeDate = $item->discharge_date?->format('Y-m-d');
        $stayDays = $item->stay_days ?? $this->stayDays($admissionDate, $dischargeDate);

        return [
            'id' => 'operation-'.$item->id,
            'sourceId' => $item->id,
            'sourceType' => 'operation',
            'sourceLabel' => 'العمليات',
            'patientId' => $item->patient_id,
            'patientName' => $item->patient_name ?: ($patient?->full_name ?? '—'),
            'medicalSerial' => $item->medical_serial ?: ($patient?->medical_serial ?? '—'),
            'idNumber' => $item->id_number ?: ($patient?->id_number ?? '—'),
            'dob' => $item->dob?->format('Y-m-d') ?: $patient?->dob?->format('Y-m-d'),
            'age' => ($item->dob ?: $patient?->dob)?->age,
            'gender' => $item->gender ?: $patient?->gender,
            'phone' => $item->phone ?: $patient?->phone,
            'city' => $item->city ?: $patient?->city,
            'area' => $item->area ?: $patient?->area,
            'address' => $item->address ?: trim(($patient?->city ? $patient->city.' - ' : '').($patient?->area ?: '')),
            'maritalStatus' => $item->marital_status,
            'coverageEntity' => $patient?->sponsor?->name_ar,
            'department' => $item->department ?: 'عمليات',
            'room' => null,
            'bed' => null,
            'doctorName' => $item->doctor_name,
            'diagnosis' => $item->diagnosis,
            'admissionDate' => $admissionDate,
            'admissionTime' => $item->admission_time?->format('H:i'),
            'dischargeDate' => $dischargeDate,
            'dischargedAt' => $dischargeDate,
            'stayDays' => $stayDays,
            'referralEntity' => $item->referral_entity,
            'referringDoctor' => null,
            'responsiblePerson' => $item->registrar?->display_name,
            'caseNumber' => $item->case_number,
            'insuranceNumber' => $item->insurance_number,
            'conversionDuration' => $item->conversion_duration,
            'conversionReason' => $item->conversion_reason,
            'archiveStatus' => 'خرج من المستشفى',
            'dischargeSort' => $dischargeDate,
            'createdAt' => $item->created_at?->toISOString(),
        ];
    }

    private function stayDays(?string $start, ?string $end): ?int
    {
        if (!$start || !$end) return null;
        try {
            return max(1, Carbon::parse($start)->startOfDay()->diffInDays(Carbon::parse($end)->startOfDay()) + 1);
        } catch (\Throwable) {
            return null;
        }
    }
}
