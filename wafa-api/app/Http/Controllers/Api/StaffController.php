<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    /**
     * Display a listing of hospital staff accounts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('department')) {
            $query->where('department', $request->department);
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'LIKE', "%{$term}%")
                  ->orWhere('email', 'LIKE', "%{$term}%")
                  ->orWhere('phone', 'LIKE', "%{$term}%")
                  ->orWhere('employee_id', 'LIKE', "%{$term}%");
            });
        }

        $staff = $query->latest()->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $staff->items(),
            'pagination' => [
                'total' => $staff->total(),
                'current_page' => $staff->currentPage(),
                'per_page' => $staff->perPage(),
                'total_pages' => $staff->lastPage(),
            ],
        ]);
    }

    /**
     * Store a newly created staff account (Admin Only).
     */
    public function store(Request $request): JsonResponse
    {
        $allowedRoles = [
            'it_admin',
            'management_admin',
            'accountant',
            'doctor',
            'registration_clerk',
            'data_lookup_clerk',
            'lab_technician',
            'pt_specialist',
            'radiologist',
            'social_worker',
        ];

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in($allowedRoles)],
            'department' => ['nullable', 'string', 'max:100'],
            'employee_id' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
        ], [
            'name.required' => 'يرجى إدخال اسم الموظف الرباعي',
            'email.required' => 'البريد الإلكتروني مطلوب',
            'email.unique' => 'هذا البريد الإلكتروني مسجل لموظف آخر بالفعل',
            'password.required' => 'كلمة المرور مطلوبة',
            'password.min' => 'كلمة المرور يجب ألا تقل عن 6 خانات',
            'role.required' => 'يرجى تحديد رتبة / دور الموظف (RBAC)',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['is_active'] = $request->input('is_active', true);

        $user = User::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء حساب الموظف وتعيين الصلاحيات بنجاح',
            'data' => $user,
        ], 201);
    }

    /**
     * Display staff details.
     */
    public function show(User $staff): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $staff,
        ]);
    }

    /**
     * Update a staff account.
     */
    public function update(Request $request, User $staff): JsonResponse
    {
        $allowedRoles = [
            'it_admin',
            'management_admin',
            'accountant',
            'doctor',
            'registration_clerk',
            'data_lookup_clerk',
            'lab_technician',
            'pt_specialist',
            'radiologist',
            'social_worker',
        ];

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($staff->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['sometimes', 'required', Rule::in($allowedRoles)],
            'department' => ['nullable', 'string', 'max:100'],
            'employee_id' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $staff->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث بيانات الموظف بنجاح',
            'data' => $staff->fresh(),
        ]);
    }

    /**
     * Deactivate / Delete staff account.
     */
    public function destroy(Request $request, User $staff): JsonResponse
    {
        if ($request->user() && $request->user()->id === $staff->id) {
            return response()->json([
                'success' => false,
                'message' => 'لا يمكنك حذف أو تعطيل حسابك الشخصي أثناء تسجيل الدخول.',
            ], 422);
        }

        $staffName = $staff->name;
        $staff->delete();

        return response()->json([
            'success' => true,
            'message' => "تم حذف حساب الموظف {$staffName} بنجاح",
        ]);
    }
}
