<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Patient;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientController extends Controller
{
    /**
     * Display a listing of patients with search, filtering, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Patient::query()
            ->search($request->input('search'))
            ->filter($request->only(['gender', 'region', 'refugee_status', 'admission_year', 'marital_status']));

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        $allowedSorts = ['id', 'patient_id', 'national_id', 'first_name', 'family_name', 'birth_date', 'created_at'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, strtolower($sortDir) === 'asc' ? 'asc' : 'desc');
        } else {
            $query->latest();
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $patients = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $patients->items(),
            'pagination' => [
                'total' => $patients->total(),
                'count' => $patients->count(),
                'per_page' => $patients->perPage(),
                'current_page' => $patients->currentPage(),
                'total_pages' => $patients->lastPage(),
            ],
        ]);
    }

    /**
     * Store a newly created patient in storage.
     */
    public function store(StorePatientRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $patient = DB::transaction(function () use ($validated) {
            $patient = Patient::create($validated);

            // Trigger notification for medical reception & doctors
            Notification::send([
                'patient_id' => $patient->id,
                'target_role' => 'all_staff',
                'type' => 'patient_registered',
                'title' => 'تسجيل مريض جديد',
                'message' => "تم فتح ملف طبي جديد للمريض {$patient->full_name} برقم طبي ({$patient->patient_id})",
                'action_url' => "/patients/{$patient->id}",
                'priority' => 'normal',
            ]);

            return $patient;
        });

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل المريض وفتح الملف الطبي بنجاح',
            'data' => $patient->fresh(),
        ], 201);
    }

    /**
     * Display the specified patient profile.
     */
    public function show(Patient $patient): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $patient,
        ]);
    }

    /**
     * Update the specified patient in storage.
     */
    public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse
    {
        $validated = $request->validated();

        $patient->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات المريض بنجاح',
            'data' => $patient->fresh(),
        ]);
    }

    /**
     * Remove the specified patient from storage (Soft delete).
     */
    public function destroy(Patient $patient): JsonResponse
    {
        $patientId = $patient->patient_id;
        $patientName = $patient->full_name;

        $patient->delete();

        return response()->json([
            'success' => true,
            'message' => "تم أرشفة وحذف ملف المريض {$patientName} ({$patientId}) بنجاح",
        ]);
    }

    /**
     * Get next suggested Patient ID for a specific year.
     */
    public function getNextPatientId(Request $request): JsonResponse
    {
        $year = (int) ($request->input('year') ?: date('Y'));
        $nextId = Patient::generateNextPatientId($year);

        return response()->json([
            'success' => true,
            'year' => $year,
            'next_patient_id' => $nextId,
        ]);
    }

    /**
     * Get patient registry summary statistics.
     */
    public function stats(): JsonResponse
    {
        $currentYear = (int) date('Y');

        $totalPatients = Patient::count();
        $thisYearPatients = Patient::where('admission_year', $currentYear)->count();
        
        $maleCount = Patient::where('gender', 'male')->count();
        $femaleCount = Patient::where('gender', 'female')->count();

        $refugeeCount = Patient::where('refugee_status', 'refugee')->count();
        $citizenCount = Patient::where('refugee_status', 'citizen')->count();

        $byRegion = Patient::select('region', DB::raw('count(*) as count'))
            ->whereNotNull('region')
            ->groupBy('region')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'stats' => [
                'total_patients' => $totalPatients,
                'this_year_patients' => $thisYearPatients,
                'gender' => [
                    'male' => $maleCount,
                    'female' => $femaleCount,
                ],
                'refugee_status' => [
                    'refugee' => $refugeeCount,
                    'citizen' => $citizenCount,
                ],
                'top_regions' => $byRegion,
            ],
        ]);
    }
}
