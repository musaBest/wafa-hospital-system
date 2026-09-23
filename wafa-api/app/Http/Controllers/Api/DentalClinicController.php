<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{CashierWorkflowCase, Clinic, DentalVisit, DentalWaitlistItem, Doctor, Patient, QueueItem, Visit};
use App\Services\{ApiResourceService, AuditService, CivilRegistryService, PatientActivityService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Throwable;

class DentalClinicController extends Controller
{
    public const SERVICES = [
        'Diagnosis',
        'Scaling and polishing',
        'R.C.T',
        'R.C.T biocramic',
        'R.C.T MTA',
        'Pulpotomy',
        'Pulpoctomy',
        'Primary tooth Extraction',
        'Permanent tooth Extraction',
        'Surgical Extraction',
        'Compsite filling',
        'Amalgam filling',
        'G.I.C',
        'Porcelain crown',
        'Zirconia crown',
        'X-ray',
        'Cemenation',
        'Temporary cemenation',
        'Temporary filing',
        'Other',
    ];

    public function services()
    {
        return response()->json(['data' => self::SERVICES]);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'doctor_id' => 'nullable|uuid',
            'patient_id' => 'nullable|uuid',
            'service_name' => 'nullable|string|max:120',
            'status' => 'nullable|string|max:40',
            'search' => 'nullable|string|max:150',
        ]);

        $query = DentalVisit::with(['patient.sponsor','doctor','clinic','visit'])
            ->latest('visit_date')
            ->latest();

        $doctor = $request->user()?->doctor;
        $canSeeAll = $this->isEngineerMohammed($request) || $request->user()?->hasPermission('financial_audit.view') || $request->user()?->hasPermission('dental.export');
        if ($doctor && !$canSeeAll) $query->where('doctor_id', $doctor->id);

        $query->when($data['from'] ?? null, fn ($q, $v) => $q->whereDate('visit_date', '>=', $v));
        $query->when($data['to'] ?? null, fn ($q, $v) => $q->whereDate('visit_date', '<=', $v));
        $query->when($data['doctor_id'] ?? null, fn ($q, $v) => $q->where('doctor_id', $v));
        $query->when($data['patient_id'] ?? null, fn ($q, $v) => $q->where('patient_id', $v));
        $query->when($data['status'] ?? null, fn ($q, $v) => $q->where('status', $v));
        $query->when($data['service_name'] ?? null, function ($q, $v) {
            if ($v !== '') $q->where('service_name', $v);
        });
        $query->when($data['search'] ?? null, function ($q, $v) {
            $needle = '%'.trim($v).'%';
            $q->where(function ($inner) use ($needle) {
                $inner->where('service_name', 'like', $needle)
                    ->orWhere('other_service', 'like', $needle)
                    ->orWhere('notes', 'like', $needle)
                    ->orWhereHas('patient', fn ($p) => $p->where('full_name','like',$needle)->orWhere('id_number','like',$needle)->orWhere('medical_serial','like',$needle)->orWhere('phone','like',$needle))
                    ->orWhereHas('doctor', fn ($d) => $d->where('name','like',$needle));
            });
        });

        return response()->json(['data' => $query->limit(1000)->get()->map(fn ($row) => $this->resource($row))->values()]);
    }

    public function lookupPatient(Request $request, CivilRegistryService $registry, ApiResourceService $resources)
    {
        $data = $request->validate([
            'identity' => 'nullable|string|max:120',
            'phone' => 'nullable|string|max:60',
        ]);
        $identity = trim((string)($data['identity'] ?? ''));
        $phone = trim((string)($data['phone'] ?? ''));
        abort_if($identity === '' && $phone === '', 422, 'Identity number or phone is required.');

        $patient = Patient::with(['sponsor','findings','appointments','events'])
            ->where(function ($q) use ($identity, $phone) {
                if ($identity !== '') {
                    $q->where('id_number', $identity)
                        ->orWhere('medical_serial', $identity)
                        ->orWhere('full_name', 'like', '%'.$identity.'%');
                }
                if ($phone !== '') $q->orWhere('phone', $phone);
            })
            ->latest('registered_at')
            ->first();

        if ($patient) {
            return response()->json(['data' => [
                'source' => 'patient_file',
                'patient' => $resources->patient($patient, $request->user()),
                'registry' => null,
            ]]);
        }

        $registryRecord = null;
        if ($identity !== '') {
            try {
                $registryRecord = $registry->lookup($identity);
                if ($phone !== '') $registryRecord['phone'] = $phone;
            } catch (Throwable $e) {
                $registryRecord = null;
            }
        }

        return response()->json(['data' => [
            'source' => $registryRecord ? 'civil_registry' : 'not_found',
            'patient' => null,
            'registry' => $registryRecord,
        ]]);
    }

    public function store(Request $request, AuditService $audit, PatientActivityService $activity)
    {
        $data = $this->validateVisit($request, true);
        $dentalVisit = DB::transaction(function () use ($request, $data, $activity) {
            $patient = Patient::with('sponsor')->whereKey($data['patient_id'])->lockForUpdate()->firstOrFail();
            $clinic = $this->dentalClinic();
            $doctor = Doctor::whereKey($data['doctor_id'])->where('active', true)->firstOrFail();
            abort_unless($doctor->clinics()->whereKey($clinic->id)->exists(), 422, 'The doctor is not assigned to the Dental clinic.');

            $visitDate = $data['visit_date'];
            $queueNumber = (int) Visit::where('doctor_id', $doctor->id)->whereDate('visit_date', $visitDate)->lockForUpdate()->max('queue_number') + 1;
            $notes = $this->visitNotes($data);
            $visit = Visit::create([
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'fee' => $data['total_amount'],
                'visit_date' => $visitDate,
                'notes' => $notes,
                'queue_number' => $queueNumber,
                'status' => 'waiting',
            ]);
            QueueItem::create([
                'visit_id' => $visit->id,
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'queue_date' => $visitDate,
                'queue_number' => $queueNumber,
                'status' => 'waiting',
                'priority' => 3,
                'triage_note' => $this->serviceLabel($data['service_name'], $data['other_service'] ?? null),
                'updated_by' => $request->user()?->id,
                'added_at' => now(),
            ]);

            $dentalVisit = DentalVisit::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'visit_id' => $visit->id,
                'service_name' => $data['service_name'],
                'other_service' => $data['other_service'] ?? null,
                'total_amount' => $data['total_amount'],
                'paid_amount' => $data['paid_amount'],
                'remaining_amount' => $this->remaining($data['total_amount'], $data['paid_amount']),
                'notes' => $data['notes'] ?? '',
                'visit_date' => $visitDate,
                'status' => 'active',
                'created_by' => $request->user()?->id,
                'updated_by' => $request->user()?->id,
            ]);

            $this->syncFinanceCase($dentalVisit->fresh(['patient.sponsor','doctor','clinic','visit']), $request);
            $activity->event($patient->id, 'visit', 'تسجيل خدمة عيادة الأسنان', 'تم تسجيل خدمة '.$this->serviceLabel($data['service_name'], $data['other_service'] ?? null).' عند '.$doctor->name.' وإظهارها مباشرة في صفحة الطبيب.', 'waiting', 'dental_visit', $dentalVisit->id, $request->user()?->id);
            $activity->notify(null, $patient->id, 'info', 'حالة أسنان جديدة', $patient->full_name.' · '.$this->serviceLabel($data['service_name'], $data['other_service'] ?? null), '/doctor-dashboard', $doctor->user_id);
            $activity->notify('financial_audit.view', $patient->id, 'info', 'حالة أسنان مرتبطة بالمالية', $patient->full_name.' · إجمالي: '.$data['total_amount'].' · مدفوع: '.$data['paid_amount'].' · متبقي: '.$this->remaining($data['total_amount'], $data['paid_amount']), '/dental-clinic');

            return $dentalVisit->fresh(['patient.sponsor','doctor','clinic','visit']);
        });

        $audit->record($request, 'dental_visit.created', 'dental_visit', $dentalVisit->id, ['visit_id' => $dentalVisit->visit_id]);
        return response()->json(['data' => $this->resource($dentalVisit)], 201);
    }

    public function update(Request $request, DentalVisit $dentalVisit, AuditService $audit)
    {
        $data = $this->validateVisit($request, false);
        DB::transaction(function () use ($request, $dentalVisit, $data) {
            if (array_key_exists('doctor_id', $data)) {
                $clinic = $this->dentalClinic();
                $doctor = Doctor::whereKey($data['doctor_id'])->where('active', true)->firstOrFail();
                abort_unless($doctor->clinics()->whereKey($clinic->id)->exists(), 422, 'The doctor is not assigned to the Dental clinic.');
            }

            $patch = collect($data)->only(['patient_id','doctor_id','service_name','other_service','total_amount','paid_amount','notes','visit_date','status'])->all();
            if (array_key_exists('total_amount', $data) || array_key_exists('paid_amount', $data)) {
                $total = (float)($data['total_amount'] ?? $dentalVisit->total_amount);
                $paid = (float)($data['paid_amount'] ?? $dentalVisit->paid_amount);
                $patch['remaining_amount'] = $this->remaining($total, $paid);
            }
            $patch['updated_by'] = $request->user()?->id;
            $dentalVisit->update($patch);

            $fresh = $dentalVisit->fresh(['patient.sponsor','doctor','clinic','visit']);
            if ($fresh->visit) {
                $fresh->visit->update([
                    'patient_id' => $fresh->patient_id,
                    'doctor_id' => $fresh->doctor_id,
                    'fee' => $fresh->total_amount,
                    'visit_date' => $fresh->visit_date?->format('Y-m-d'),
                    'notes' => $this->visitNotes([
                        'service_name' => $fresh->service_name,
                        'other_service' => $fresh->other_service,
                        'total_amount' => (float)$fresh->total_amount,
                        'paid_amount' => (float)$fresh->paid_amount,
                        'notes' => $fresh->notes,
                    ]),
                    'status' => $fresh->status === 'cancelled' ? 'cancelled' : ($fresh->visit->status === 'completed' ? 'completed' : 'waiting'),
                ]);
                $fresh->visit->queueItem()?->update([
                    'patient_id' => $fresh->patient_id,
                    'doctor_id' => $fresh->doctor_id,
                    'queue_date' => $fresh->visit_date?->format('Y-m-d'),
                    'triage_note' => $this->serviceLabel($fresh->service_name, $fresh->other_service),
                    'status' => $fresh->status === 'cancelled' ? 'completed' : ($fresh->visit->status === 'completed' ? 'completed' : 'waiting'),
                    'updated_by' => $request->user()?->id,
                ]);
            }
            $this->syncFinanceCase($fresh, $request);
        });

        $audit->record($request, 'dental_visit.updated', 'dental_visit', $dentalVisit->id, $data);
        return response()->json(['data' => $this->resource($dentalVisit->fresh(['patient.sponsor','doctor','clinic','visit']))]);
    }

    public function destroy(Request $request, DentalVisit $dentalVisit, AuditService $audit)
    {
        DB::transaction(function () use ($request, $dentalVisit) {
            $dentalVisit->update(['status' => 'cancelled', 'updated_by' => $request->user()?->id]);
            $dentalVisit->visit?->queueItem()?->delete();
            $dentalVisit->visit?->update(['status' => 'cancelled']);
            if (Schema::hasTable('cashier_workflow_cases') && $dentalVisit->visit_id) {
                CashierWorkflowCase::where('visit_id', $dentalVisit->visit_id)->where('patient_id', $dentalVisit->patient_id)->update(['notes' => trim(($dentalVisit->notes ?? '')."\nتم إلغاء سجل عيادة الأسنان.")]);
            }
            $dentalVisit->delete();
        });
        $audit->record($request, 'dental_visit.deleted', 'dental_visit', $dentalVisit->id);
        return response()->noContent();
    }

    public function waitlist(Request $request)
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'doctor_id' => 'nullable|uuid',
            'status' => 'nullable|string|max:40',
            'search' => 'nullable|string|max:150',
        ]);

        $query = DentalWaitlistItem::with(['patient.sponsor','doctor'])->latest('requested_date')->latest();
        $query->when($data['from'] ?? null, fn ($q, $v) => $q->whereDate('requested_date', '>=', $v));
        $query->when($data['to'] ?? null, fn ($q, $v) => $q->whereDate('requested_date', '<=', $v));
        $query->when($data['doctor_id'] ?? null, fn ($q, $v) => $q->where('doctor_id', $v));
        $query->when($data['status'] ?? null, fn ($q, $v) => $q->where('status', $v));
        $query->when($data['search'] ?? null, function ($q, $v) {
            $needle = '%'.trim($v).'%';
            $q->where(fn ($inner) => $inner->where('full_name','like',$needle)->orWhere('id_number','like',$needle)->orWhere('medical_serial','like',$needle)->orWhere('phone','like',$needle)->orWhere('service_name','like',$needle)->orWhere('other_service','like',$needle));
        });
        return response()->json(['data' => $query->limit(1000)->get()->map(fn ($row) => $this->waitlistResource($row))->values()]);
    }

    public function storeWaitlist(Request $request, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'requested_date' => 'required|date',
            'appointment_time' => 'required|date_format:H:i',
            'doctor_id' => 'nullable|uuid|exists:doctors,id',
            'service_name' => ['required','string','max:120', Rule::in(self::SERVICES)],
            'other_service' => 'nullable|required_if:service_name,Other|string|max:180',
            'notes' => 'nullable|string|max:5000',
        ]);
        $item = DB::transaction(function () use ($request, $data, $activity) {
            $patient = Patient::with('sponsor')->whereKey($data['patient_id'])->firstOrFail();
            if (!empty($data['doctor_id'])) {
                $clinic = $this->dentalClinic();
                $doctor = Doctor::whereKey($data['doctor_id'])->where('active', true)->firstOrFail();
                abort_unless($doctor->clinics()->whereKey($clinic->id)->exists(), 422, 'The doctor is not assigned to the Dental clinic.');
            }
            $item = DentalWaitlistItem::create([
                'patient_id' => $patient->id,
                'full_name' => $patient->full_name,
                'medical_serial' => $patient->medical_serial,
                'id_number' => $patient->id_number,
                'phone' => $patient->phone,
                'requested_date' => $data['requested_date'],
                'appointment_time' => $data['appointment_time'],
                'service_name' => $data['service_name'],
                'other_service' => $data['other_service'] ?? null,
                'doctor_id' => $data['doctor_id'] ?? null,
                'status' => 'waiting',
                'notes' => $data['notes'] ?? '',
                'created_by' => $request->user()?->id,
                'updated_by' => $request->user()?->id,
            ]);
            $activity->event($patient->id, 'visit', 'إضافة لقائمة انتظار الأسنان', 'تم تحديد '.$data['requested_date'].' الساعة '.$data['appointment_time'].' لخدمة '.$this->serviceLabel($data['service_name'], $data['other_service'] ?? null).'.', 'waiting', 'dental_waitlist', $item->id, $request->user()?->id);
            $activity->notify('dental.view', $patient->id, 'info', 'موعد انتظار أسنان', $patient->full_name.' · '.$data['requested_date'].' '.$data['appointment_time'], '/dental-clinic');
            return $item->fresh(['patient.sponsor','doctor']);
        });

        $audit->record($request, 'dental_waitlist.created', 'dental_waitlist', $item->id);
        return response()->json(['data' => $this->waitlistResource($item)], 201);
    }

    public function updateWaitlist(Request $request, DentalWaitlistItem $dentalWaitlistItem, AuditService $audit)
    {
        $data = $request->validate([
            'requested_date' => 'sometimes|date',
            'appointment_time' => 'sometimes|date_format:H:i',
            'doctor_id' => 'nullable|uuid|exists:doctors,id',
            'service_name' => ['sometimes','string','max:120', Rule::in(self::SERVICES)],
            'other_service' => 'nullable|required_if:service_name,Other|string|max:180',
            'status' => 'sometimes|in:waiting,scheduled,served,cancelled',
            'notes' => 'nullable|string|max:5000',
        ]);
        if (array_key_exists('doctor_id', $data) && $data['doctor_id']) {
            $clinic = $this->dentalClinic();
            $doctor = Doctor::whereKey($data['doctor_id'])->where('active', true)->firstOrFail();
            abort_unless($doctor->clinics()->whereKey($clinic->id)->exists(), 422, 'The doctor is not assigned to the Dental clinic.');
        }
        $data['updated_by'] = $request->user()?->id;
        $dentalWaitlistItem->update($data);
        $audit->record($request, 'dental_waitlist.updated', 'dental_waitlist', $dentalWaitlistItem->id, $data);
        return response()->json(['data' => $this->waitlistResource($dentalWaitlistItem->fresh(['patient.sponsor','doctor']))]);
    }

    public function destroyWaitlist(Request $request, DentalWaitlistItem $dentalWaitlistItem, AuditService $audit)
    {
        $dentalWaitlistItem->delete();
        $audit->record($request, 'dental_waitlist.deleted', 'dental_waitlist', $dentalWaitlistItem->id);
        return response()->noContent();
    }

    private function validateVisit(Request $request, bool $create): array
    {
        $rules = [
            'patient_id' => [$create ? 'required' : 'sometimes', 'uuid', 'exists:patients,id'],
            'doctor_id' => [$create ? 'required' : 'sometimes', 'uuid', 'exists:doctors,id'],
            'service_name' => [$create ? 'required' : 'sometimes', 'string', 'max:120', Rule::in(self::SERVICES)],
            'other_service' => 'nullable|required_if:service_name,Other|string|max:180',
            'visit_date' => [$create ? 'required' : 'sometimes', 'date'],
            'total_amount' => [$create ? 'required' : 'sometimes', 'numeric', 'min:0', 'max:999999'],
            'paid_amount' => [$create ? 'required' : 'sometimes', 'numeric', 'min:0', 'max:999999'],
            'notes' => 'nullable|string|max:5000',
            'status' => 'sometimes|in:active,completed,cancelled',
        ];
        $data = $request->validate($rules);
        if (array_key_exists('paid_amount', $data) && array_key_exists('total_amount', $data)) abort_if((float)$data['paid_amount'] > (float)$data['total_amount'], 422, 'Paid amount cannot be greater than total amount.');
        return $data;
    }

    private function dentalClinic(): Clinic
    {
        return Clinic::where('key', 'dental')->firstOrFail();
    }

    private function remaining(float|string $total, float|string $paid): float
    {
        return round(max(0, (float)$total - (float)$paid), 2);
    }

    private function serviceLabel(string $service, ?string $other): string
    {
        $label = trim($service) === 'Other' ? trim((string)$other) : trim($service);
        return $label !== '' ? $label : 'Other';
    }

    private function visitNotes(array $data): string
    {
        $total = (float)($data['total_amount'] ?? 0);
        $paid = (float)($data['paid_amount'] ?? 0);
        $lines = [
            'خدمة الأسنان: '.$this->serviceLabel($data['service_name'] ?? 'Other', $data['other_service'] ?? null),
            'الإجمالي: '.$total.' · المدفوع: '.$paid.' · المتبقي: '.$this->remaining($total, $paid),
        ];
        if (trim((string)($data['notes'] ?? '')) !== '') $lines[] = 'ملاحظات: '.trim((string)$data['notes']);
        return implode("\n", $lines);
    }

    private function syncFinanceCase(DentalVisit $dentalVisit, Request $request): void
    {
        if (!Schema::hasTable('cashier_workflow_cases') || !$dentalVisit->visit_id) return;
        $patient = $dentalVisit->patient;
        $doctor = $dentalVisit->doctor;
        $clinic = $dentalVisit->clinic ?: $this->dentalClinic();
        if (!$patient || !$doctor || !$clinic) return;

        $total = (float)$dentalVisit->total_amount;
        $paid = (float)$dentalVisit->paid_amount;
        $remaining = $this->remaining($total, $paid);
        $status = $paid > 0 ? 'paid' : 'registered';
        $workflow = CashierWorkflowCase::where('visit_id', $dentalVisit->visit_id)->where('patient_id', $patient->id)->first();
        if (!$workflow) {
            $workflow = new CashierWorkflowCase([
                'id' => 'DENT-'.$dentalVisit->id,
                'visit_id' => $dentalVisit->visit_id,
                'patient_id' => $patient->id,
            ]);
        }

        $workflow->forceFill([
            'patient_name' => $patient->full_name,
            'medical_serial' => $patient->medical_serial,
            'id_number' => $patient->id_number,
            'patient_phone' => $patient->phone,
            'patient_dob' => $patient->dob?->format('Y-m-d'),
            'patient_gender' => $patient->gender,
            'patient_city' => $patient->city,
            'patient_area' => $patient->area,
            'coverage_entity' => $patient->sponsor?->code,
            'clinic_id' => $clinic->id,
            'clinic_name' => $clinic->name_ar,
            'clinic_code' => $clinic->code ?: 'DEN',
            'doctor_id' => $doctor->id,
            'doctor_name' => $doctor->name,
            'visit_date' => $dentalVisit->visit_date?->format('Y-m-d') ?: today()->toDateString(),
            'registered_at' => $workflow->registered_at ?: now(),
            'queue_number' => (int)($dentalVisit->visit?->queue_number ?? 1),
            'amount' => $total,
            'status' => in_array($workflow->status, ['collected','audited'], true) ? $workflow->status : $status,
            'payment_method' => $paid > 0 ? ($workflow->payment_method ?: 'cash') : null,
            'payment_source' => $paid > 0 ? ($workflow->payment_source ?: 'عيادة الأسنان') : null,
            'paid_at' => $paid > 0 ? ($workflow->paid_at ?: now()) : null,
            'notes' => $this->visitNotes([
                'service_name' => $dentalVisit->service_name,
                'other_service' => $dentalVisit->other_service,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'notes' => trim(($dentalVisit->notes ?? '')."\nالمتبقي: ".$remaining),
            ]),
            'registered_by' => $workflow->registered_by ?: $request->user()?->id,
            'paid_by' => $paid > 0 ? ($workflow->paid_by ?: $request->user()?->id) : null,
        ])->save();
    }

    private function resource(DentalVisit $row): array
    {
        return [
            'id' => $row->id,
            'patientId' => $row->patient_id,
            'doctorId' => $row->doctor_id,
            'clinicId' => $row->clinic_id,
            'visitId' => $row->visit_id,
            'serviceName' => $row->service_name,
            'otherService' => $row->other_service,
            'serviceLabel' => $this->serviceLabel($row->service_name, $row->other_service),
            'totalAmount' => (float)$row->total_amount,
            'paidAmount' => (float)$row->paid_amount,
            'remainingAmount' => (float)$row->remaining_amount,
            'notes' => $row->notes ?? '',
            'visitDate' => $row->visit_date?->format('Y-m-d'),
            'status' => $row->status,
            'createdAt' => $row->created_at?->toISOString(),
            'patient' => $row->patient ? [
                'id' => $row->patient->id,
                'fullName' => $row->patient->full_name,
                'medicalSerial' => $row->patient->medical_serial,
                'idNumber' => $row->patient->id_number,
                'phone' => $row->patient->phone,
                'dob' => $row->patient->dob?->format('Y-m-d'),
                'gender' => $row->patient->gender,
                'city' => $row->patient->city,
                'area' => $row->patient->area,
                'coverageEntity' => $row->patient->sponsor?->code,
            ] : null,
            'doctor' => $row->doctor ? ['id' => $row->doctor->id, 'name' => $row->doctor->name, 'staffId' => $row->doctor->staff_id] : null,
            'clinic' => $row->clinic ? ['id' => $row->clinic->id, 'nameAr' => $row->clinic->name_ar, 'code' => $row->clinic->code] : null,
            'queueNumber' => $row->visit?->queue_number,
        ];
    }

    private function waitlistResource(DentalWaitlistItem $row): array
    {
        return [
            'id' => $row->id,
            'patientId' => $row->patient_id,
            'fullName' => $row->full_name,
            'medicalSerial' => $row->medical_serial,
            'idNumber' => $row->id_number,
            'phone' => $row->phone,
            'requestedDate' => $row->requested_date?->format('Y-m-d'),
            'appointmentTime' => substr((string)$row->appointment_time, 0, 5),
            'serviceName' => $row->service_name,
            'otherService' => $row->other_service,
            'serviceLabel' => $this->serviceLabel($row->service_name, $row->other_service),
            'doctorId' => $row->doctor_id,
            'doctor' => $row->doctor ? ['id' => $row->doctor->id, 'name' => $row->doctor->name, 'staffId' => $row->doctor->staff_id] : null,
            'status' => $row->status,
            'notes' => $row->notes ?? '',
            'createdAt' => $row->created_at?->toISOString(),
            'patient' => $row->patient ? [
                'id' => $row->patient->id,
                'fullName' => $row->patient->full_name,
                'medicalSerial' => $row->patient->medical_serial,
                'idNumber' => $row->patient->id_number,
                'phone' => $row->patient->phone,
                'dob' => $row->patient->dob?->format('Y-m-d'),
                'gender' => $row->patient->gender,
                'city' => $row->patient->city,
                'area' => $row->patient->area,
                'coverageEntity' => $row->patient->sponsor?->code,
            ] : null,
        ];
    }

    private function isEngineerMohammed(Request $request): bool
    {
        $user = $request->user();
        return (bool) $user && ($user->id === '00000000-0000-4000-8000-000000000004' || mb_strtolower(trim($user->username)) === 'eng.mohammed_moqbil');
    }
}
