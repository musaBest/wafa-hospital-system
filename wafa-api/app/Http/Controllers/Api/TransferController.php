<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transfer;
use App\Models\Patient;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    /**
     * Display a listing of financial transfers (Accountant only).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transfer::with(['patient', 'accountant'])->latest();

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        $transfers = $query->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $transfers->items(),
            'pagination' => [
                'total' => $transfers->total(),
                'current_page' => $transfers->currentPage(),
                'per_page' => $transfers->perPage(),
                'total_pages' => $transfers->lastPage(),
            ],
        ]);
    }

    /**
     * Store a new financial payment / transfer.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'amount' => ['required', 'numeric', 'min:0.5'],
            'currency' => ['nullable', 'string', 'max:10'],
            'payment_method' => ['required', 'in:cash,digital_transfer'],
            'sender_name' => ['nullable', 'required_if:payment_method,digital_transfer', 'string', 'max:150'],
            'reference_number' => ['nullable', 'required_if:payment_method,digital_transfer', 'string', 'max:100'],
            'transfer_platform' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'patient_id.required' => 'يرجى تحديد المريض صاحب المعاملة المالية',
            'amount.required' => 'يرجى إدخال مبلغ الدفعة المسددة',
            'payment_method.required' => 'يرجى تحديد طريقة الدفع (نقدي / حوالة إلكترونية)',
            'sender_name.required_if' => 'اسم المحول إلزامي في حالة الدفع عبر حوالة إلكترونية/بنكية',
            'reference_number.required_if' => 'رقم مرجع الحوالة إلزامي في حالة الدفع الإلكتروني',
        ]);

        $transfer = DB::transaction(function () use ($validated, $request) {
            $user = $request->user();

            $transfer = Transfer::create([
                'patient_id' => $validated['patient_id'],
                'amount' => $validated['amount'],
                'currency' => $validated['currency'] ?? 'ILS',
                'payment_method' => $validated['payment_method'],
                'sender_name' => $validated['sender_name'] ?? null,
                'reference_number' => $validated['reference_number'] ?? null,
                'transfer_platform' => $validated['transfer_platform'] ?? null,
                'status' => 'confirmed',
                'created_by' => $user ? $user->id : 1,
                'confirmed_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]);

            $patient = Patient::find($validated['patient_id']);

            // Send notification to hospital accountant log
            Notification::send([
                'target_role' => 'accountant',
                'type' => 'payment_received',
                'title' => 'تحصيل دفعة مالية جديدة',
                'message' => "تم تسجيل سند قبض مالي رقم ({$transfer->receipt_number}) بقيمة {$transfer->amount} شيكل للمريض {$patient->full_name}",
                'priority' => 'normal',
            ]);

            return $transfer;
        });

        return response()->json([
            'success' => true,
            'message' => 'تم توثيق الدفعة المالية وإصدار سند القبض بنجاح',
            'data' => $transfer->load(['patient', 'accountant']),
        ], 201);
    }

    /**
     * Display transfer details.
     */
    public function show(Transfer $transfer): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $transfer->load(['patient', 'accountant']),
        ]);
    }

    /**
     * Financial statistics summary for Accountant.
     */
    public function stats(): JsonResponse
    {
        $today = now()->startOfDay();

        $totalAmount = Transfer::where('status', 'confirmed')->sum('amount');
        $todayAmount = Transfer::where('status', 'confirmed')->where('created_at', '>=', $today)->sum('amount');
        
        $cashTotal = Transfer::where('status', 'confirmed')->where('payment_method', 'cash')->sum('amount');
        $digitalTotal = Transfer::where('status', 'confirmed')->where('payment_method', 'digital_transfer')->sum('amount');
        
        $totalCount = Transfer::count();

        return response()->json([
            'success' => true,
            'stats' => [
                'total_amount' => (float) $totalAmount,
                'today_amount' => (float) $todayAmount,
                'cash_total' => (float) $cashTotal,
                'digital_total' => (float) $digitalTotal,
                'total_count' => $totalCount,
            ],
        ]);
    }
}
