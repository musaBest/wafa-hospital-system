<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{CashierWorkflowCase, Clinic, Doctor, Patient, QueueItem, Sponsor, Visit};
use App\Services\{AuditService, PatientActivityService, PatientSerialService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CashierWorkflowController extends Controller
{


    private function firstNonBlank(mixed ...$values): string
    {
        foreach ($values as $value) {
            $text = trim((string) $value);
            if ($text !== '') return $text;
        }
        return '';
    }

    private function normaliseArabicName(mixed $value): string
    {
        $text = trim((string) $value);
        $text = preg_replace('/\s+|د\.?|الدكتور/u', '', $text) ?? $text;
        return str_replace(['أ','إ','آ','ة','ى'], ['ا','ا','ا','ه','ي'], $text);
    }

    private function resolveDoctorForCase(CashierWorkflowCase $case): ?Doctor
    {
        $doctor = Doctor::query()
            ->whereKey($case->doctor_id)
            ->orWhere('staff_id', $case->doctor_id)
            ->orWhere('name', $case->doctor_name)
            ->first();

        if (!$doctor && trim((string) $case->doctor_name) !== '') {
            $key = $this->normaliseArabicName($case->doctor_name);
            $doctor = Doctor::all()->first(fn ($row) => $this->normaliseArabicName($row->name) === $key);
        }

        if ($doctor && ($case->doctor_id !== $doctor->id || $case->doctor_name !== $doctor->name)) {
            $case->forceFill(['doctor_id' => $doctor->id, 'doctor_name' => $doctor->name])->save();
        }

        return $doctor;
    }

    private function resolveClinicForCase(CashierWorkflowCase $case): ?Clinic
    {
        $clinic = Clinic::query()
            ->whereKey($case->clinic_id)
            ->orWhere('key', $case->clinic_id)
            ->orWhere('code', $case->clinic_code)
            ->orWhere('name_ar', $case->clinic_name)
            ->orWhere('name_en', $case->clinic_name)
            ->first();

        if ($clinic && ($case->clinic_id !== $clinic->id || $case->clinic_name !== $clinic->name_ar || $case->clinic_code !== $clinic->code)) {
            $case->forceFill([
                'clinic_id' => $clinic->id,
                'clinic_name' => $clinic->name_ar,
                'clinic_code' => $clinic->code ?: strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $clinic->key), 0, 4)) ?: 'CLN',
            ])->save();
        }

        return $clinic;
    }

    private function resolvePatientForCase(CashierWorkflowCase $case): ?Patient
    {
        $patient = Patient::query()
            ->whereKey($case->patient_id)
            ->when($case->id_number, fn ($q) => $q->orWhere('id_number', $case->id_number))
            ->when($case->medical_serial, fn ($q) => $q->orWhere('medical_serial', $case->medical_serial))
            ->first();

        if (!$patient) {
            $gender = in_array($case->patient_gender, ['male', 'female'], true) ? $case->patient_gender : 'male';
            $idNumber = $this->firstNonBlank($case->id_number, 'WF-'.substr(sha1($case->id), 0, 24));
            $baseId = $idNumber;
            $i = 1;
            while (Patient::where('id_number', $idNumber)->exists()) {
                $idNumber = substr($baseId, 0, 220).'-'.$i++;
            }

            $medicalSerial = trim((string) $case->medical_serial);
            if ($medicalSerial === '' || Patient::where('medical_serial', $medicalSerial)->exists()) {
                $medicalSerial = app(PatientSerialService::class)->next($gender, (int) date('Y'));
            }

            $sponsor = null;
            if ($case->coverage_entity) {
                $sponsor = Sponsor::where('code', $case->coverage_entity)
                    ->orWhere('name_ar', $case->coverage_entity)
                    ->orWhere('name_en', $case->coverage_entity)
                    ->first();
            }
            $sponsor ??= Sponsor::where('code', 'self')->first();

            $patient = Patient::create([
                'medical_serial' => $medicalSerial,
                'full_name' => $this->firstNonBlank($case->patient_name, 'مريض غير مسمى'),
                'id_number' => $idNumber,
                'dob' => $case->patient_dob?->format('Y-m-d') ?: '1970-01-01',
                'gender' => $gender,
                'phone' => $this->firstNonBlank($case->patient_phone, '0000000'),
                'city' => $case->patient_city,
                'area' => $case->patient_area,
                'coverage_entity_id' => $sponsor?->id,
                'registered_at' => $case->visit_date?->format('Y-m-d') ?: today()->toDateString(),
                'wallet_balance' => 0,
                'civil_registry_verified_at' => now(),
            ]);
        }

        $patch = [
            'patient_id' => $patient->id,
            'patient_name' => $patient->full_name,
            'medical_serial' => $patient->medical_serial,
            'id_number' => $patient->id_number,
            'patient_phone' => $patient->phone,
            'patient_dob' => $patient->dob?->format('Y-m-d'),
            'patient_gender' => $patient->gender,
            'patient_city' => $patient->city,
            'patient_area' => $patient->area,
            'coverage_entity' => $patient->sponsor?->code ?? $case->coverage_entity,
        ];
        foreach ($patch as $key => $value) {
            if ($value !== null && $case->{$key} != $value) {
                $case->forceFill($patch)->save();
                break;
            }
        }

        return $patient;
    }

    private function doctorVisibleStatuses(): array
    {
        // A case becomes visible to the selected doctor immediately after registration.
        // Payment/collection/audit can continue without blocking the clinical queue.
        return ['registered', 'paid', 'collected', 'audited'];
    }

    /**
     * v4.5.1 - رقم الدور يُحجز على مستوى العيادة لا الطبيب.
     *
     * كان الترقيم يبحث عن رقم شاغر ضمن مواعيد الطبيب الواحد، بينما يُعرض على
     * الإيصال وشاشة الانتظار بصيغة "رمز العيادة - الرقم". فإن كان في العيادة
     * أكثر من طبيب يظهر رقمان متطابقان لنفس رمز العيادة في اليوم نفسه، ويلتبس
     * الدور على المرضى وعلى موظف الاستقبال.
     * الآن النطاق هو العيادة والتاريخ، فيصبح "رمز العيادة - الرقم" فريداً فعلاً.
     */
    private function nextAvailableQueueNumber(string $clinicId, string $visitDate, int $preferred, ?string $visitId = null): int
    {
        $number = max(1, $preferred);
        while (
            Visit::withTrashed()
                ->where('clinic_id', $clinicId)
                ->whereDate('visit_date', $visitDate)
                ->where('queue_number', $number)
                ->when($visitId, fn ($q) => $q->whereKeyNot($visitId))
                ->exists()
            || QueueItem::withTrashed()
                ->where('clinic_id', $clinicId)
                ->whereDate('queue_date', $visitDate)
                ->where('queue_number', $number)
                ->when($visitId, fn ($q) => $q->where('visit_id', '!=', $visitId))
                ->exists()
        ) {
            $number++;
        }
        return $number;
    }

    public function ensureDoctorVisitAndQueue(CashierWorkflowCase $case): void
    {
        if (!in_array($case->status, $this->doctorVisibleStatuses(), true)) return;

        $patient = $this->resolvePatientForCase($case);
        $clinic = $this->resolveClinicForCase($case);
        $doctor = $this->resolveDoctorForCase($case);
        if (!$patient || !$clinic || !$doctor) return;

        $visitDate = $case->visit_date?->format('Y-m-d') ?: today()->toDateString();
        $visit = Visit::withTrashed()->whereKey($case->visit_id)->first();
        if ($visit && method_exists($visit, 'trashed') && $visit->trashed()) $visit->restore();

        if (!$visit) {
            $queueNumber = $this->nextAvailableQueueNumber($clinic->id, $visitDate, (int) $case->queue_number);
            $visit = new Visit();
            if (Str::isUuid((string) $case->visit_id)) $visit->forceFill(['id' => $case->visit_id]);
            $visit->forceFill([
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'fee' => (float) $case->amount,
                'visit_date' => $visitDate,
                'notes' => $case->notes ?? '',
                'queue_number' => $queueNumber,
                'status' => 'waiting',
            ])->save();
            if ($visit->id !== $case->visit_id || (int) $case->queue_number !== $queueNumber) {
                $case->forceFill(['visit_id' => $visit->id, 'queue_number' => $queueNumber])->save();
            }
        } elseif ($visit->status !== 'completed') {
            $queueNumber = $this->nextAvailableQueueNumber($clinic->id, $visitDate, (int) $case->queue_number, $visit->id);
            $visit->forceFill([
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'fee' => (float) $case->amount,
                'visit_date' => $visitDate,
                'notes' => $visit->notes ?: ($case->notes ?? ''),
                'queue_number' => $queueNumber,
                'status' => in_array($visit->status, ['waiting', 'exam'], true) ? $visit->status : 'waiting',
            ])->save();
            if ((int) $case->queue_number !== $queueNumber || $case->visit_id !== $visit->id) {
                $case->forceFill(['visit_id' => $visit->id, 'queue_number' => $queueNumber])->save();
            }
        }

        if ($visit->status === 'completed') return;

        $queue = QueueItem::withTrashed()->where('visit_id', $visit->id)->first();
        if ($queue && method_exists($queue, 'trashed') && $queue->trashed()) $queue->restore();
        $queuePayload = [
            'patient_id' => $patient->id,
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'queue_date' => $visitDate,
            'queue_number' => (int) $visit->queue_number,
            'status' => in_array($visit->status, ['waiting', 'exam'], true) ? $visit->status : 'waiting',
            'priority' => 3,
            'triage_note' => '',
            'updated_by' => null,
            'added_at' => $case->paid_at ?? $case->registered_at ?? now(),
        ];
        if ($queue) $queue->forceFill($queuePayload)->save();
        else QueueItem::create(['visit_id' => $visit->id, ...$queuePayload]);
    }

    private function resource(CashierWorkflowCase $item): array
    {
        return [
            'id' => $item->id,
            'visitId' => $item->visit_id,
            'patientId' => $item->patient_id,
            'patientName' => $item->patient_name,
            'medicalSerial' => $item->medical_serial,
            'idNumber' => $item->id_number,
            'patientPhone' => $item->patient_phone,
            'patientDob' => $item->patient_dob?->format('Y-m-d'),
            'patientGender' => $item->patient_gender,
            'patientCity' => $item->patient_city,
            'patientArea' => $item->patient_area,
            'coverageEntity' => $item->coverage_entity,
            'clinicId' => $item->clinic_id,
            'clinicName' => $item->clinic_name,
            'clinicCode' => $item->clinic_code ?: 'CLN',
            'doctorId' => $item->doctor_id,
            'doctorName' => $item->doctor_name,
            'visitDate' => $item->visit_date?->format('Y-m-d'),
            'registeredAt' => $item->registered_at?->toISOString(),
            'queueNumber' => (int) $item->queue_number,
            'amount' => (float) $item->amount,
            'status' => $item->status,
            'paymentMethod' => $item->payment_method,
            'paymentSource' => $item->payment_source,
            'senderName' => $item->sender_name,
            'senderPhone' => $item->sender_phone,
            'paidAt' => $item->paid_at?->toISOString(),
            'receiptNumber' => $item->receipt_number,
            'collectedAt' => $item->collected_at?->toISOString(),
            'auditedAt' => $item->audited_at?->toISOString(),
            'notes' => $item->notes,
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = CashierWorkflowCase::query()->orderByDesc('registered_at');

        // Each desk receives exactly the stages it needs. This is enforced at the API
        // level, not only by hiding menu items in the browser.
        $canPayment = $user->hasPermission('cashier_payment.view');
        $canCollection = $user->hasPermission('cashier_collection.view');
        $canAudit = $user->hasPermission('financial_audit.view');
        if ($canPayment && $canCollection && $canAudit) {
            // Treasury/administrators with all workflow permissions may inspect every stage.
        } elseif ($canAudit) {
            $query->whereIn('status', ['collected', 'audited']);
        } elseif ($canCollection) {
            $query->whereIn('status', ['paid', 'collected', 'audited']);
        } elseif ($canPayment) {
            $query->whereIn('status', ['registered', 'paid', 'collected', 'audited']);
        } else {
            abort(403, 'Unauthorized workflow desk.');
        }

        $items = $query->limit(5000)->get()->map(fn ($item) => $this->resource($item))->values();
        return response()->json(['data' => $items]);
    }


    public function registrationRecent(Request $request)
    {
        $items = CashierWorkflowCase::query()
            ->orderByDesc('registered_at')
            ->limit(200)
            ->get()
            ->map(fn ($item) => $this->resource($item))
            ->values();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'id' => 'required|string|max:100',
            'visit_id' => 'required|string|max:100',
            'patient_id' => 'required|string|max:100',
            'patient_name' => 'required|string|max:180',
            'medical_serial' => 'required|string|max:60',
            'id_number' => 'nullable|string|max:40',
            'patient_phone' => 'nullable|string|max:60',
            'patient_dob' => 'nullable|date',
            'patient_gender' => 'nullable|in:male,female',
            'patient_city' => 'nullable|string|max:120',
            'patient_area' => 'nullable|string|max:180',
            'coverage_entity' => 'nullable|string|max:120',
            'clinic_id' => 'required|string|max:100',
            'clinic_name' => 'required|string|max:180',
            'clinic_code' => 'nullable|string|max:24',
            'doctor_id' => 'required|string|max:100',
            'doctor_name' => 'required|string|max:180',
            'visit_date' => 'required|date',
            'registered_at' => 'nullable|date',
            'queue_number' => 'required|integer|min:1|max:999999',
            'amount' => 'required|numeric|min:0|max:9999999',
            'notes' => 'nullable|string|max:5000',
        ]);

        $item = DB::transaction(function () use ($data, $request) {
            $existing = CashierWorkflowCase::query()
                ->where('id', $data['id'])
                ->orWhere(fn ($q) => $q->where('visit_id', $data['visit_id'])->where('patient_id', $data['patient_id']))
                ->lockForUpdate()
                ->first();

            if ($existing) {
                // Never roll a case backwards if the receptionist retries/syncs the visit.
                if ($existing->status !== 'registered') return $existing;
                $existing->update([
                    'patient_name' => $data['patient_name'],
                    'medical_serial' => $data['medical_serial'],
                    'id_number' => $data['id_number'] ?? $existing->id_number,
                    'patient_phone' => $data['patient_phone'] ?? $existing->patient_phone,
                    'patient_dob' => $data['patient_dob'] ?? $existing->patient_dob,
                    'patient_gender' => $data['patient_gender'] ?? $existing->patient_gender,
                    'patient_city' => $data['patient_city'] ?? $existing->patient_city,
                    'patient_area' => $data['patient_area'] ?? $existing->patient_area,
                    'coverage_entity' => $data['coverage_entity'] ?? $existing->coverage_entity,
                    'clinic_id' => $data['clinic_id'],
                    'clinic_name' => $data['clinic_name'],
                    'clinic_code' => $data['clinic_code'] ?? $existing->clinic_code,
                    'doctor_id' => $data['doctor_id'],
                    'doctor_name' => $data['doctor_name'],
                    'visit_date' => $data['visit_date'],
                    'queue_number' => $data['queue_number'],
                    'amount' => $data['amount'],
                    'notes' => $data['notes'] ?? $existing->notes,
                ]);
                return $existing->fresh();
            }

            return CashierWorkflowCase::create([
                ...$data,
                'registered_at' => $data['registered_at'] ?? now(),
                'status' => 'registered',
                'registered_by' => $request->user()->id,
            ]);
        });

        $audit->record($request, 'cashier_workflow.registered', 'cashier_workflow', null, [
            'workflow_id' => $item->id,
            'patient' => $item->patient_name,
            'medical_serial' => $item->medical_serial,
            'clinic' => $item->clinic_name,
            'doctor' => $item->doctor_name,
            'queue_number' => $item->queue_number,
        ]);

        return response()->json(['data' => $this->resource($item)], 201);
    }

    public function payment(Request $request, CashierWorkflowCase $cashierWorkflowCase, AuditService $audit)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:9999999',
            'payment_method' => 'required|in:cash,app',
            'payment_source' => 'required|string|max:120',
            'sender_name' => 'nullable|string|max:180',
            'sender_phone' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:5000',
        ]);

        abort_unless(in_array($cashierWorkflowCase->status, ['registered', 'paid'], true), 422, 'This case has already moved to the collector.');
        if ($data['payment_method'] === 'app') {
            abort_if(trim((string) ($data['sender_name'] ?? '')) === '' || trim((string) ($data['sender_phone'] ?? '')) === '', 422, 'Sender name and phone are required for application/bank payments.');
        }

        $cashierWorkflowCase->update([
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'],
            'payment_source' => $data['payment_source'],
            'sender_name' => $data['sender_name'] ?? 'نفسه',
            'sender_phone' => $data['sender_phone'] ?? '',
            'notes' => $data['notes'] ?? $cashierWorkflowCase->notes,
            'status' => 'paid',
            'paid_at' => now(),
            'paid_by' => $request->user()->id,
        ]);

        $this->ensureDoctorVisitAndQueue($cashierWorkflowCase->fresh());

        $audit->record($request, 'cashier_workflow.paid', 'cashier_workflow', null, [
            'workflow_id' => $cashierWorkflowCase->id,
            'amount' => (float) $cashierWorkflowCase->amount,
            'payment_method' => $cashierWorkflowCase->payment_method,
            'payment_source' => $cashierWorkflowCase->payment_source,
        ]);

        return response()->json(['data' => $this->resource($cashierWorkflowCase->fresh())]);
    }

    public function collect(Request $request, CashierWorkflowCase $cashierWorkflowCase, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate(['receipt_number' => 'nullable|string|max:120']);
        abort_unless(in_array($cashierWorkflowCase->status, ['paid', 'collected'], true), 422, 'Payment must be completed before collection.');

        if ($cashierWorkflowCase->status !== 'collected') {
            $receipt = trim((string) ($data['receipt_number'] ?? ''));
            if ($receipt === '') {
                $receipt = 'RCP-'.now()->format('Ymd').'-'.str_pad((string) (CashierWorkflowCase::whereDate('collected_at', today())->count() + 1), 5, '0', STR_PAD_LEFT);
            }
            abort_if(CashierWorkflowCase::where('receipt_number', $receipt)->whereKeyNot($cashierWorkflowCase->id)->exists(), 422, 'Receipt number is already used.');
            $cashierWorkflowCase->update([
                'status' => 'collected',
                'receipt_number' => $receipt,
                'collected_at' => now(),
                'collected_by' => $request->user()->id,
            ]);

            $this->ensureDoctorVisitAndQueue($cashierWorkflowCase->fresh());

            $activity->event(
                $cashierWorkflowCase->patient_id,
                'visit',
                'الدفع مكتمل والحالة جاهزة للطبيب',
                'تم تحصيل رسوم زيارة '.$cashierWorkflowCase->clinic_name.' وتحويل الحالة تلقائياً إلى صفحة '.$cashierWorkflowCase->doctor_name.' برقم الدور '.($cashierWorkflowCase->clinic_code ?: 'CLN').'-'.$cashierWorkflowCase->queue_number.'.',
                'paid',
                'visit',
                $cashierWorkflowCase->visit_id,
                $request->user()->id
            );
            $doctorUserId = Doctor::whereKey($cashierWorkflowCase->doctor_id)->value('user_id');
            if ($doctorUserId) {
                $activity->notify(
                    null,
                    $cashierWorkflowCase->patient_id,
                    'success',
                    'حالة مدفوعة جاهزة للفحص',
                    $cashierWorkflowCase->patient_name.' · '.$cashierWorkflowCase->clinic_name.' · الدور '.($cashierWorkflowCase->clinic_code ?: 'CLN').'-'.$cashierWorkflowCase->queue_number,
                    '/doctor-dashboard',
                    $doctorUserId
                );
            }
        }

        $audit->record($request, 'cashier_workflow.collected', 'cashier_workflow', null, [
            'workflow_id' => $cashierWorkflowCase->id,
            'receipt_number' => $cashierWorkflowCase->receipt_number,
            'queue' => ($cashierWorkflowCase->clinic_code ?: 'CLN').'-'.$cashierWorkflowCase->queue_number,
        ]);

        return response()->json(['data' => $this->resource($cashierWorkflowCase->fresh())]);
    }

    public function update(Request $request, CashierWorkflowCase $cashierWorkflowCase, AuditService $audit)
    {
        $data = $request->validate([
            'patient_name' => 'sometimes|required|string|max:180',
            'medical_serial' => 'sometimes|required|string|max:60',
            'id_number' => 'sometimes|nullable|string|max:40',
            'patient_phone' => 'sometimes|nullable|string|max:60',
            'patient_dob' => 'sometimes|nullable|date',
            'patient_gender' => 'sometimes|nullable|in:male,female',
            'patient_city' => 'sometimes|nullable|string|max:120',
            'patient_area' => 'sometimes|nullable|string|max:180',
            'coverage_entity' => 'sometimes|nullable|string|max:120',
            'clinic_id' => 'sometimes|string|max:100',
            'clinic_name' => 'sometimes|required|string|max:180',
            'clinic_code' => 'sometimes|nullable|string|max:24',
            'doctor_id' => 'sometimes|string|max:100',
            'doctor_name' => 'sometimes|required|string|max:180',
            'visit_date' => 'sometimes|date',
            'queue_number' => 'sometimes|integer|min:1|max:999999',
            'amount' => 'sometimes|numeric|min:0|max:9999999',
            'payment_method' => 'sometimes|nullable|in:cash,app',
            'payment_source' => 'sometimes|nullable|string|max:120',
            'sender_name' => 'sometimes|nullable|string|max:180',
            'sender_phone' => 'sometimes|nullable|string|max:60',
            'receipt_number' => 'sometimes|nullable|string|max:120',
            'notes' => 'sometimes|nullable|string|max:5000',
            'status' => 'sometimes|in:collected,audited',
            'audited_at' => 'sometimes|nullable|date',
        ]);

        $map = [
            'patient_name','medical_serial','id_number','patient_phone','patient_dob','patient_gender','patient_city','patient_area','coverage_entity','clinic_id','clinic_name','clinic_code','doctor_id','doctor_name',
            'visit_date','queue_number','amount','payment_method','payment_source','sender_name','sender_phone',
            'receipt_number','notes','status','audited_at',
        ];
        $patch = [];
        foreach ($map as $key) if (array_key_exists($key, $data)) $patch[$key] = $data[$key];
        if (($patch['status'] ?? null) === 'audited' && !array_key_exists('audited_at', $patch)) $patch['audited_at'] = now();
        if (($patch['status'] ?? null) === 'audited') $patch['audited_by'] = $request->user()->id;
        $cashierWorkflowCase->update($patch);

        $audit->record($request, 'cashier_workflow.audited', 'cashier_workflow', null, [
            'workflow_id' => $cashierWorkflowCase->id,
            'fields' => array_keys($patch),
        ]);

        return response()->json(['data' => $this->resource($cashierWorkflowCase->fresh())]);
    }

    public function destroy(Request $request, CashierWorkflowCase $cashierWorkflowCase, AuditService $audit)
    {
        $snapshot = ['workflow_id' => $cashierWorkflowCase->id, 'patient' => $cashierWorkflowCase->patient_name, 'receipt_number' => $cashierWorkflowCase->receipt_number];
        $cashierWorkflowCase->delete();
        $audit->record($request, 'cashier_workflow.deleted', 'cashier_workflow', null, $snapshot);
        return response()->noContent();
    }

    public function manual(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'id' => 'required|string|max:100',
            'visit_id' => 'required|string|max:100',
            'patient_id' => 'required|string|max:100',
            'patient_name' => 'required|string|max:180',
            'medical_serial' => 'required|string|max:60',
            'id_number' => 'nullable|string|max:40',
            'patient_phone' => 'nullable|string|max:60',
            'patient_dob' => 'nullable|date',
            'patient_gender' => 'nullable|in:male,female',
            'patient_city' => 'nullable|string|max:120',
            'patient_area' => 'nullable|string|max:180',
            'coverage_entity' => 'nullable|string|max:120',
            'clinic_id' => 'required|string|max:100',
            'clinic_name' => 'required|string|max:180',
            'clinic_code' => 'nullable|string|max:24',
            'doctor_id' => 'required|string|max:100',
            'doctor_name' => 'required|string|max:180',
            'visit_date' => 'required|date',
            'queue_number' => 'required|integer|min:1|max:999999',
            'amount' => 'required|numeric|min:0|max:9999999',
            'payment_method' => 'nullable|in:cash,app',
            'payment_source' => 'nullable|string|max:120',
            'sender_name' => 'nullable|string|max:180',
            'sender_phone' => 'nullable|string|max:60',
            'receipt_number' => 'nullable|string|max:120|unique:cashier_workflow_cases,receipt_number',
            'paid_at' => 'nullable|date',
            'collected_at' => 'nullable|date',
            'notes' => 'nullable|string|max:5000',
        ]);

        $stamp = now();
        $item = CashierWorkflowCase::create([
            ...$data,
            'registered_at' => $stamp,
            'paid_at' => $data['paid_at'] ?? $stamp,
            'collected_at' => $data['collected_at'] ?? $stamp,
            'audited_at' => $stamp,
            'status' => 'audited',
            'registered_by' => $request->user()->id,
            'paid_by' => $request->user()->id,
            'collected_by' => $request->user()->id,
            'audited_by' => $request->user()->id,
        ]);

        $audit->record($request, 'cashier_workflow.manual_created', 'cashier_workflow', null, ['workflow_id' => $item->id]);
        return response()->json(['data' => $this->resource($item)], 201);
    }
}
