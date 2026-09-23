<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{ElderlyResident, Patient};
use App\Services\ApiResourceService;
use Illuminate\Http\Request;

class PatientInquiryController extends Controller
{
    /**
     * Read-only hospital-wide patient directory for the inquiries desk.
     *
     * v4.3.82: the inquiries desk must show every person who entered the
     * hospital flow, not only ordinary outpatient files. The response now merges:
     * - all registered patient files, with flags for clinics / inpatient / elderly care
     * - elderly-care residents who were opened directly from the civil registry
     *   and do not yet have a linked patient file.
     *
     * No write actions are exposed from this controller.
     */
    public function index(Request $request, ApiResourceService $resource)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:150',
        ]);

        $search = trim((string)($data['search'] ?? ''));
        $patientQuery = Patient::with('sponsor')
            ->withCount(['visits', 'admissions'])
            ->orderBy('full_name');

        if ($search !== '') {
            $patientQuery->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('id_number', 'like', "%{$search}%")
                    ->orWhere('medical_serial', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('area', 'like', "%{$search}%");
            });
        }

        $patients = $patientQuery->limit(3000)->get();

        $patientIds = $patients->pluck('id')->filter()->values();
        $idNumbers = $patients->pluck('id_number')->filter()->values();
        $elderlyRows = ElderlyResident::query()
            ->when($patientIds->isNotEmpty(), fn ($q) => $q->orWhereIn('patient_id', $patientIds))
            ->when($idNumbers->isNotEmpty(), fn ($q) => $q->orWhereIn('id_number', $idNumbers))
            ->get();
        $elderlyByPatient = $elderlyRows->whereNotNull('patient_id')->keyBy('patient_id');
        $elderlyById = $elderlyRows->keyBy('id_number');

        $directory = $patients->map(function ($patient) use ($resource, $request, $elderlyByPatient, $elderlyById) {
            $row = $resource->patient($patient, $request->user());
            $elderly = $elderlyByPatient->get($patient->id) ?: $elderlyById->get($patient->id_number);
            $tags = [];
            if ((int)($patient->visits_count ?? 0) > 0) $tags[] = 'عيادات';
            if ((int)($patient->admissions_count ?? 0) > 0) $tags[] = 'مبيت';
            if ($elderly) $tags[] = 'مسنين/مسنات';
            if (!$tags) $tags[] = 'ملف مريض';

            $row['sourceTags'] = array_values(array_unique($tags));
            $row['sourceSummary'] = implode(' / ', $row['sourceTags']);
            $row['inquiryRecordType'] = 'patient';
            $row['latestStatus'] = $elderly ? $this->elderlyStatusLabel($elderly->status) : 'مسجل في النظام';
            $row['lastEntryDate'] = $elderly?->admission_date?->format('Y-m-d') ?: ($row['regDate'] ?? null);
            return $row;
        })->values();

        $linkedPatientIds = $patients->pluck('id')->filter()->all();
        $linkedIdNumbers = $patients->pluck('id_number')->filter()->all();
        $elderlyOnly = ElderlyResident::query()
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('full_name', 'like', "%{$search}%")
                        ->orWhere('id_number', 'like', "%{$search}%")
                        ->orWhere('medical_serial', 'like', "%{$search}%")
                        ->orWhere('original_town', 'like', "%{$search}%")
                        ->orWhere('current_address', 'like', "%{$search}%")
                        ->orWhere('health_status_details', 'like', "%{$search}%");
                });
            })
            ->when(!empty($linkedPatientIds) || !empty($linkedIdNumbers), function ($q) use ($linkedPatientIds, $linkedIdNumbers) {
                if (!empty($linkedPatientIds)) {
                    $q->where(function ($inner) use ($linkedPatientIds) {
                        $inner->whereNull('patient_id')->orWhereNotIn('patient_id', $linkedPatientIds);
                    });
                }
                if (!empty($linkedIdNumbers)) {
                    $q->whereNotIn('id_number', $linkedIdNumbers);
                }
            })
            ->latest('admission_date')
            ->limit(3000)
            ->get()
            ->map(fn ($row) => $this->elderlyDirectoryRow($row));

        return response()->json([
            'data' => $directory->concat($elderlyOnly)
                ->sortBy(fn ($row) => strtolower((string)($row['fullName'] ?? '')))
                ->values(),
        ]);
    }

    private function elderlyDirectoryRow(ElderlyResident $row): array
    {
        return [
            'id' => 'elderly-'.$row->id,
            'patientId' => $row->patient_id,
            'elderlyResidentId' => $row->id,
            'medicalSerial' => $row->medical_serial ?: '—',
            'fullName' => $row->full_name,
            'idNumber' => $row->id_number,
            'dob' => $row->dob?->format('Y-m-d'),
            'gender' => $row->gender,
            'phone' => '',
            'city' => $row->original_town ?: '',
            'area' => $row->current_address ?: ElderlyResident::FIXED_ADDRESS,
            'coverageEntity' => 'elderly-care',
            'regDate' => $row->created_at?->format('Y-m-d') ?: $row->admission_date?->format('Y-m-d'),
            'findings' => [],
            'appointments' => [],
            'timeline' => [],
            'sourceTags' => ['مسنين/مسنات'],
            'sourceSummary' => 'مسنين/مسنات',
            'inquiryRecordType' => 'elderly_resident',
            'latestStatus' => $this->elderlyStatusLabel($row->status),
            'lastEntryDate' => $row->admission_date?->format('Y-m-d'),
        ];
    }

    private function elderlyStatusLabel(?string $status): string
    {
        return match ($status) {
            'temporary_leave' => 'بإذن مؤقت / زيارة',
            'final_exit' => 'خروج نهائي',
            'deceased' => 'وفاة',
            default => 'مقيم حالياً',
        };
    }
}
