<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{DiagnosticService, LabOrder, Patient, RadiologyOrder, WalletTransaction};
use App\Services\{AuditService, TrashService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiagnosticController extends Controller
{
    public function services()
    {
        return response()->json(['data' => DiagnosticService::query()->where('active', true)->orderBy('type')->orderBy('name_en')->get()]);
    }

    public function storeService(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'type' => 'required|in:lab,radiology', 'name_ar' => 'required|string|max:200',
            'name_en' => 'required|string|max:200', 'category' => 'required|string|max:100',
            'price' => 'required|numeric|min:0.01', 'tests' => 'nullable|array',
            'tests.*.test' => 'required_with:tests|string|max:200',
            'tests.*.reference_range' => 'nullable|string|max:200',
        ]);
        $service = DiagnosticService::create($data + ['active' => true, 'created_by' => $request->user()->id]);
        $audit->record($request, 'diagnostic_service.created', 'diagnostic_service', $service->id, ['price' => $service->price]);
        return response()->json(['data' => $service], 201);
    }

    public function updateService(Request $request, DiagnosticService $diagnosticService, AuditService $audit)
    {
        $data = $request->validate([
            'name_ar' => 'sometimes|string|max:200', 'name_en' => 'sometimes|string|max:200',
            'category' => 'sometimes|string|max:100', 'price' => 'sometimes|numeric|min:0.01',
            'tests' => 'nullable|array',
            'tests.*.test' => 'required_with:tests|string|max:200',
            'tests.*.reference_range' => 'nullable|string|max:200',
            'active' => 'sometimes|boolean',
        ]);
        if (array_key_exists('price', $data)) {
            abort_unless($request->user()->hasPermission('diagnostic_catalog.manage'), 403, 'Diagnostic price changes require pricing permission.');
        }
        $diagnosticService->update($data);
        $audit->record($request, 'diagnostic_service.updated', 'diagnostic_service', $diagnosticService->id, $data);
        return response()->json(['data' => $diagnosticService->fresh()]);
    }

    public function destroyService(Request $request, DiagnosticService $diagnosticService, AuditService $audit, TrashService $trash)
    {
        $trash->capture($request,$diagnosticService,'diagnostic_service',$diagnosticService->name_ar ?: $diagnosticService->name_en,['section'=>'diagnostics']);
        $diagnosticService->update(['active' => false]);
        $diagnosticService->delete();
        $audit->record($request, 'diagnostic_service.deleted', 'diagnostic_service', $diagnosticService->id);
        return response()->json(['message' => 'Diagnostic service archived.']);
    }

    public function labs(Request $request)
    {
        $query = LabOrder::with(['patient','service','doctor'])->latest('ordered_at');
        if ($request->user()->role === 'doctor') $query->where('doctor_id', $request->user()->doctor?->id);
        return response()->json(['data' => $query->get()->map(fn (LabOrder $order) => $this->labResource($order))]);
    }

    public function storeLab(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'diagnostic_service_id' => 'required|uuid|exists:diagnostic_services,id',
            'doctor_id' => 'nullable|uuid|exists:doctors,id',
        ]);
        $service = DiagnosticService::query()->whereKey($data['diagnostic_service_id'])->where('type', 'lab')->where('active', true)->firstOrFail();
        $order = DB::transaction(function () use ($data, $service, $request) {
            $patient = Patient::query()->lockForUpdate()->findOrFail($data['patient_id']);
            $this->debitPatient($patient, $service, 'lab_order');
            return LabOrder::create([
                'patient_id' => $patient->id, 'service_id' => $service->id,
                'doctor_id' => $data['doctor_id'] ?? null, 'category' => $service->category,
                'price' => $service->price, 'ordered_at' => now(), 'status' => 'processing',
                'created_by' => $request->user()->id,
            ]);
        });
        $audit->record($request, 'lab.created', 'lab_order', $order->id, ['price' => $service->price]);
        return response()->json(['data' => $this->labResource($order->load(['patient','service','doctor']))], 201);
    }

    public function completeLab(Request $request, LabOrder $labOrder, AuditService $audit)
    {
        $data = $request->validate([
            'result_rows' => 'required|array|min:1',
            'result_rows.*.test' => 'required|string|max:200',
            'result_rows.*.result' => 'required|string|max:200',
            'result_rows.*.reference_range' => 'nullable|string|max:200',
            'notes' => 'nullable|string|max:10000',
        ]);
        $labOrder->update([
            'status' => 'done', 'result_rows' => $data['result_rows'], 'notes' => $data['notes'] ?? null,
            'completed_at' => now(), 'completed_by' => $request->user()->id,
            'report_number' => $labOrder->report_number ?: 'LAB-'.now()->format('Y').'-'.strtoupper(substr(str_replace('-', '', $labOrder->id), 0, 8)),
        ]);
        $audit->record($request, 'lab.completed', 'lab_order', $labOrder->id);
        return response()->json(['data' => $this->labResource($labOrder->fresh()->load(['patient','service','doctor']))]);
    }

    public function updateLab(Request $request, LabOrder $labOrder)
    {
        $data = $request->validate(['status' => 'required|in:processing,done,cancelled','result' => 'nullable|string|max:20000']);
        $labOrder->update($data);
        return response()->json(['data' => $labOrder]);
    }

    public function radiology(Request $request)
    {
        $query = RadiologyOrder::with(['patient','service','doctor'])->latest('ordered_at');
        if ($request->user()->role === 'doctor') $query->where('doctor_id', $request->user()->doctor?->id);
        return response()->json(['data' => $query->get()]);
    }

    public function storeRadiology(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'diagnostic_service_id' => 'required|uuid|exists:diagnostic_services,id',
            'doctor_id' => 'nullable|uuid|exists:doctors,id',
        ]);
        $service = DiagnosticService::query()->whereKey($data['diagnostic_service_id'])->where('type', 'radiology')->where('active', true)->firstOrFail();
        $order = DB::transaction(function () use ($data, $service, $request) {
            $patient = Patient::query()->lockForUpdate()->findOrFail($data['patient_id']);
            $this->debitPatient($patient, $service, 'radiology_order');
            return RadiologyOrder::create([
                'patient_id' => $patient->id, 'service_id' => $service->id,
                'doctor_id' => $data['doctor_id'] ?? null, 'exam' => $service->name_ar,
                'price' => $service->price, 'ordered_at' => now(), 'status' => 'waiting',
                'created_by' => $request->user()->id,
            ]);
        });
        $audit->record($request, 'radiology.created', 'radiology_order', $order->id, ['price' => $service->price]);
        return response()->json(['data' => $order->load(['patient','service','doctor'])], 201);
    }

    public function updateRadiology(Request $request, RadiologyOrder $radiologyOrder)
    {
        $data = $request->validate(['status' => 'required|in:waiting,done,cancelled','result' => 'nullable|string|max:20000']);
        if (($data['status'] ?? null) === 'done') $data['completed_at'] = now();
        $radiologyOrder->update($data);
        return response()->json(['data' => $radiologyOrder]);
    }

    private function debitPatient(Patient $patient, DiagnosticService $service, string $referenceType): void
    {
        if ((float) $patient->wallet_balance < (float) $service->price) {
            throw ValidationException::withMessages(['wallet' => ['Insufficient patient wallet balance for this diagnostic service.']]);
        }
        $patient->decrement('wallet_balance', $service->price);
        WalletTransaction::create([
            'patient_id' => $patient->id, 'type' => 'debit', 'occurred_at' => now(),
            'service' => $service->name_ar, 'amount' => $service->price, 'method' => 'wallet',
            'receipt_number' => 'DIA-'.now()->format('Y').'-'.strtoupper(substr((string) \Illuminate\Support\Str::uuid(), 0, 8)),
            'reference_type' => $referenceType, 'reference_id' => $service->id,
            'metadata' => ['service_name_en' => $service->name_en, 'category' => $service->category],
        ]);
    }

    private function labResource(LabOrder $order): array
    {
        return [
            'id' => $order->id, 'patientId' => $order->patient_id, 'patientName' => $order->patient?->full_name,
            'serviceId' => $order->service_id, 'serviceName' => $order->service?->name_ar ?? $order->category,
            'category' => $order->category, 'price' => (float) $order->price, 'doctorId' => $order->doctor_id,
            'doctorName' => $order->doctor?->name, 'date' => $order->ordered_at?->toISOString(),
            'status' => $order->status, 'resultRows' => $order->result_rows, 'notes' => $order->notes,
            'completedAt' => $order->completed_at?->toISOString(), 'reportNumber' => $order->report_number,
        ];
    }
}
