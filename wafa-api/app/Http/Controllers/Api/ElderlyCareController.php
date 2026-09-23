<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{ElderlyResident, Patient};
use App\Services\{AuditService, CivilRegistryService, PatientActivityService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class ElderlyCareController extends Controller
{
    public const FIXED_ADDRESS = ElderlyResident::FIXED_ADDRESS;
    public const DISABILITIES = ['ذهنية','حركية','سمعية','نفسية','بصرية','كلية'];

    public function disabilities()
    {
        return response()->json(['data' => self::DISABILITIES]);
    }

    public function lookup(Request $request, CivilRegistryService $registry)
    {
        $data = $request->validate([
            'identity' => 'required|string|max:120',
        ]);
        $identity = trim((string)$data['identity']);

        $patient = Patient::with('sponsor')
            ->where('id_number', $identity)
            ->orWhere('medical_serial', $identity)
            ->first();

        if ($patient) {
            return response()->json(['data' => [
                'source' => 'patient_file',
                'record' => $this->patientSnapshot($patient),
                'fixedAddress' => self::FIXED_ADDRESS,
            ]]);
        }

        $registryRecord = null;
        try {
            $registryRecord = $registry->lookup($identity);
        } catch (Throwable $e) {
            $registryRecord = null;
        }

        return response()->json(['data' => [
            'source' => $registryRecord ? 'civil_registry' : 'not_found',
            'record' => $registryRecord ? $this->registrySnapshot($registryRecord) : null,
            'fixedAddress' => self::FIXED_ADDRESS,
        ]]);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'status' => 'nullable|string|max:40',
            'gender' => 'nullable|in:male,female',
            'housing_type' => 'nullable|in:owned,rented',
            'search' => 'nullable|string|max:150',
        ]);

        $query = ElderlyResident::with('patient.sponsor')->latest('admission_date')->latest();
        $query->when($data['from'] ?? null, fn ($q, $v) => $q->whereDate('admission_date', '>=', $v));
        $query->when($data['to'] ?? null, fn ($q, $v) => $q->whereDate('admission_date', '<=', $v));
        $query->when($data['status'] ?? null, function ($q, $v) {
            if ($v !== 'all') $q->where('status', $v);
        });
        $query->when($data['gender'] ?? null, fn ($q, $v) => $q->where('gender', $v));
        $query->when($data['housing_type'] ?? null, fn ($q, $v) => $q->where('housing_type', $v));
        $query->when($data['search'] ?? null, function ($q, $v) {
            $needle = '%'.trim($v).'%';
            $q->where(function ($inner) use ($needle) {
                $inner->where('full_name', 'like', $needle)
                    ->orWhere('id_number', 'like', $needle)
                    ->orWhere('medical_serial', 'like', $needle)
                    ->orWhere('original_town', 'like', $needle)
                    ->orWhere('health_status_details', 'like', $needle)
                    ->orWhere('belongings', 'like', $needle);
            });
        });

        return response()->json(['data' => $query->limit(2000)->get()->map(fn ($row) => $this->resource($row))->values()]);
    }

    public function store(Request $request, AuditService $audit, PatientActivityService $activity)
    {
        $data = $this->validatedResident($request, true);

        $resident = DB::transaction(function () use ($request, $data, $activity) {
            $patient = $this->resolvePatient($data);
            $existing = ElderlyResident::withTrashed()->where('id_number', $data['id_number'] ?? $patient?->id_number)->first();
            abort_if($existing && !$existing->trashed(), 422, 'يوجد ملف مسنين/مسنات لهذا الرقم مسبقاً.');

            $payload = $this->payload($data, $patient, $request->user()?->id);
            if ($existing) {
                if (method_exists($existing, 'restore')) $existing->restore();
                $existing->forceFill($payload + ['deleted_at' => null])->save();
                $resident = $existing;
            } else {
                $resident = ElderlyResident::create($payload);
            }

            if ($patient) {
                $activity->event($patient->id, 'admission', 'فتح ملف رعاية مسنين/مسنات', 'تم تسجيل المقيم/ة في مركز الوفاء لرعاية المسنين والمسنات.', 'active', 'elderly_resident', $resident->id, $request->user()?->id);
                $activity->notify('elderly.view', $patient->id, 'info', 'ملف مسنين/مسنات جديد', $patient->full_name.' · تاريخ الدخول '.$resident->admission_date?->format('Y-m-d'), '/elderly-care');
            }

            return $resident->fresh('patient.sponsor');
        });

        $audit->record($request, 'elderly_resident.created', 'elderly_resident', $resident->id);
        return response()->json(['data' => $this->resource($resident)], 201);
    }

    public function update(Request $request, ElderlyResident $elderlyResident, AuditService $audit, PatientActivityService $activity)
    {
        $data = $this->validatedResident($request, false);
        $resident = DB::transaction(function () use ($request, $elderlyResident, $data, $activity) {
            $patient = $this->resolvePatient($data) ?: $elderlyResident->patient;
            $payload = $this->payload($data, $patient, $request->user()?->id, false);
            $elderlyResident->fill($payload)->save();
            if ($patient) {
                $activity->event($patient->id, 'note', 'تحديث ملف رعاية المسنين/المسنات', 'تم تحديث بيانات الملف الاجتماعي والصحي والإداري.', 'updated', 'elderly_resident', $elderlyResident->id, $request->user()?->id);
            }
            return $elderlyResident->fresh('patient.sponsor');
        });

        $audit->record($request, 'elderly_resident.updated', 'elderly_resident', $resident->id, $data);
        return response()->json(['data' => $this->resource($resident)]);
    }

    public function status(Request $request, ElderlyResident $elderlyResident, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active','temporary_leave','final_exit','deceased'])],
            'final_exit_date' => 'nullable|date',
            'temporary_leave_from' => 'nullable|date',
            'temporary_leave_to' => 'nullable|date|after_or_equal:temporary_leave_from',
            'temporary_leave_reason' => 'nullable|string|max:255',
            'exit_date' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
        ]);

        $patch = [
            'status' => $data['status'],
            'updated_by' => $request->user()?->id,
            'notes' => array_key_exists('notes', $data) ? ($data['notes'] ?? '') : $elderlyResident->notes,
        ];

        if ($data['status'] === 'temporary_leave') {
            $patch['temporary_leave_from'] = $data['temporary_leave_from'] ?? today()->toDateString();
            $patch['temporary_leave_to'] = $data['temporary_leave_to'] ?? null;
            $patch['temporary_leave_reason'] = $data['temporary_leave_reason'] ?? 'زيارة مؤقتة';
            $patch['final_exit_date'] = null;
            $patch['is_deceased'] = false;
        } elseif ($data['status'] === 'final_exit') {
            $patch['final_exit_date'] = $data['final_exit_date'] ?? today()->toDateString();
            $patch['exit_date'] = $patch['final_exit_date'];
            $patch['temporary_leave_from'] = null;
            $patch['temporary_leave_to'] = null;
            $patch['temporary_leave_reason'] = null;
            $patch['is_deceased'] = false;
        } elseif ($data['status'] === 'deceased') {
            $patch['is_deceased'] = true;
            $patch['exit_date'] = $data['exit_date'] ?? today()->toDateString();
            $patch['final_exit_date'] = $patch['exit_date'];
            $patch['temporary_leave_from'] = null;
            $patch['temporary_leave_to'] = null;
            $patch['temporary_leave_reason'] = null;
        } else {
            $patch['is_deceased'] = false;
            $patch['final_exit_date'] = null;
            $patch['temporary_leave_from'] = null;
            $patch['temporary_leave_to'] = null;
            $patch['temporary_leave_reason'] = null;
        }

        $elderlyResident->fill($patch)->save();
        if ($elderlyResident->patient_id) {
            $activity->event($elderlyResident->patient_id, $data['status'] === 'active' ? 'note' : 'discharge', 'تحديث حالة ملف المسنين/المسنات', 'الحالة الجديدة: '.$this->statusLabel($data['status']), $data['status'], 'elderly_resident', $elderlyResident->id, $request->user()?->id);
        }
        $audit->record($request, 'elderly_resident.status', 'elderly_resident', $elderlyResident->id, $patch);
        return response()->json(['data' => $this->resource($elderlyResident->fresh('patient.sponsor'))]);
    }

    private function validatedResident(Request $request, bool $create): array
    {
        return $request->validate([
            'patient_id' => 'nullable|uuid|exists:patients,id',
            'full_name' => [$create ? 'required' : 'sometimes', 'string', 'max:180'],
            'medical_serial' => 'nullable|string|max:60',
            'id_number' => [$create ? 'required' : 'sometimes', 'string', 'max:80'],
            'dob' => 'nullable|date',
            'gender' => 'nullable|in:male,female',
            'marital_status' => 'nullable|string|max:80',
            'original_town' => 'nullable|string|max:160',
            'housing_type' => 'nullable|in:owned,rented',
            'admission_date' => [$create ? 'required' : 'sometimes', 'date'],
            'receives_assistance' => 'sometimes|boolean',
            'assistance_type' => 'nullable|required_if:receives_assistance,1,true|string|max:180',
            'assistance_details' => 'nullable|string|max:5000',
            'disabilities' => 'nullable|array',
            'disabilities.*' => 'string|max:80',
            'custom_disability' => 'nullable|string|max:220',
            'is_deceased' => 'sometimes|boolean',
            'exit_date' => 'nullable|required_if:is_deceased,1,true|date',
            'health_status_details' => 'nullable|string|max:20000',
            'employment_status' => 'nullable|in:working,not_working',
            'work_type' => 'nullable|required_if:employment_status,working|string|max:180',
            'medications' => 'nullable|array',
            'medications.*' => 'nullable|string|max:300',
            'assistive_tools' => 'nullable|array',
            'assistive_tools.*' => 'nullable|string|max:300',
            'belongings' => 'nullable|string|max:10000',
            'notes' => 'nullable|string|max:5000',
        ]);
    }

    private function resolvePatient(array $data): ?Patient
    {
        if (!empty($data['patient_id'])) return Patient::whereKey($data['patient_id'])->first();
        if (!empty($data['id_number'])) return Patient::where('id_number', $data['id_number'])->first();
        return null;
    }

    private function payload(array $data, ?Patient $patient, ?string $userId, bool $create = true): array
    {
        $base = [
            'patient_id' => $patient?->id,
            'full_name' => $data['full_name'] ?? $patient?->full_name,
            'medical_serial' => $data['medical_serial'] ?? $patient?->medical_serial,
            'id_number' => $data['id_number'] ?? $patient?->id_number,
            'dob' => $data['dob'] ?? $patient?->dob?->format('Y-m-d'),
            'gender' => $data['gender'] ?? $patient?->gender,
            'current_address' => self::FIXED_ADDRESS,
            'original_town' => $data['original_town'] ?? null,
            'housing_type' => $data['housing_type'] ?? null,
            'marital_status' => $data['marital_status'] ?? null,
            'receives_assistance' => (bool)($data['receives_assistance'] ?? false),
            'assistance_type' => !empty($data['receives_assistance']) ? ($data['assistance_type'] ?? null) : null,
            'assistance_details' => !empty($data['receives_assistance']) ? ($data['assistance_details'] ?? null) : null,
            'disabilities' => array_values(array_filter($data['disabilities'] ?? [], fn ($v) => trim((string)$v) !== '')),
            'custom_disability' => trim((string)($data['custom_disability'] ?? '')) ?: null,
            'is_deceased' => (bool)($data['is_deceased'] ?? false),
            'exit_date' => !empty($data['is_deceased']) ? ($data['exit_date'] ?? today()->toDateString()) : null,
            'health_status_details' => $data['health_status_details'] ?? null,
            'employment_status' => $data['employment_status'] ?? 'not_working',
            'work_type' => ($data['employment_status'] ?? 'not_working') === 'working' ? ($data['work_type'] ?? null) : null,
            'medications' => array_values(array_filter($data['medications'] ?? [], fn ($v) => trim((string)$v) !== '')),
            'assistive_tools' => array_values(array_filter($data['assistive_tools'] ?? [], fn ($v) => trim((string)$v) !== '')),
            'belongings' => $data['belongings'] ?? null,
            'notes' => $data['notes'] ?? null,
            'updated_by' => $userId,
        ];
        if (array_key_exists('admission_date', $data)) $base['admission_date'] = $data['admission_date'];
        if ($create) {
            $base['admission_date'] = $data['admission_date'];
            $base['created_by'] = $userId;
            $base['status'] = !empty($data['is_deceased']) ? 'deceased' : 'active';
            if (!empty($data['is_deceased'])) $base['final_exit_date'] = $base['exit_date'];
        }
        return $base;
    }

    private function patientSnapshot(Patient $patient): array
    {
        return [
            'patientId' => $patient->id,
            'fullName' => $patient->full_name,
            'medicalSerial' => $patient->medical_serial,
            'idNumber' => $patient->id_number,
            'dob' => $patient->dob?->format('Y-m-d'),
            'gender' => $patient->gender,
            'city' => $patient->city,
            'area' => $patient->area,
            'maritalStatus' => null,
            'currentAddress' => self::FIXED_ADDRESS,
        ];
    }

    private function registrySnapshot(array $row): array
    {
        return [
            'patientId' => null,
            'fullName' => $row['fullName'] ?? '',
            'medicalSerial' => null,
            'idNumber' => $row['idNumber'] ?? '',
            'dob' => $row['dob'] ?? null,
            'gender' => $row['gender'] ?? null,
            'city' => $row['city'] ?? '',
            'area' => $row['area'] ?? '',
            'maritalStatus' => $row['maritalStatus'] ?? null,
            'currentAddress' => self::FIXED_ADDRESS,
        ];
    }

    private function resource(ElderlyResident $row): array
    {
        return [
            'id' => $row->id,
            'patientId' => $row->patient_id,
            'fullName' => $row->full_name,
            'medicalSerial' => $row->medical_serial,
            'idNumber' => $row->id_number,
            'dob' => $row->dob?->format('Y-m-d'),
            'age' => $row->dob ? $row->dob->age : null,
            'gender' => $row->gender,
            'maritalStatus' => $row->marital_status,
            'currentAddress' => $row->current_address ?: self::FIXED_ADDRESS,
            'originalTown' => $row->original_town,
            'housingType' => $row->housing_type,
            'admissionDate' => $row->admission_date?->format('Y-m-d'),
            'receivesAssistance' => (bool)$row->receives_assistance,
            'assistanceType' => $row->assistance_type,
            'assistanceDetails' => $row->assistance_details,
            'disabilities' => $row->disabilities ?: [],
            'customDisability' => $row->custom_disability,
            'isDeceased' => (bool)$row->is_deceased,
            'exitDate' => $row->exit_date?->format('Y-m-d'),
            'healthStatusDetails' => $row->health_status_details,
            'employmentStatus' => $row->employment_status,
            'workType' => $row->work_type,
            'medications' => $row->medications ?: [],
            'assistiveTools' => $row->assistive_tools ?: [],
            'belongings' => $row->belongings,
            'status' => $row->status,
            'statusLabel' => $this->statusLabel($row->status),
            'finalExitDate' => $row->final_exit_date?->format('Y-m-d'),
            'temporaryLeaveFrom' => $row->temporary_leave_from?->format('Y-m-d'),
            'temporaryLeaveTo' => $row->temporary_leave_to?->format('Y-m-d'),
            'temporaryLeaveReason' => $row->temporary_leave_reason,
            'notes' => $row->notes,
            'createdAt' => $row->created_at?->toISOString(),
            'updatedAt' => $row->updated_at?->toISOString(),
        ];
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'temporary_leave' => 'بإذن مؤقت / زيارة',
            'final_exit' => 'خروج نهائي',
            'deceased' => 'وفاة',
            default => 'مقيم حالياً',
        };
    }
}
