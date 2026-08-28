<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Staff Login.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'يرجى إدخال البريد الإلكتروني أو اسم المستخدم',
            'password.required' => 'يرجى إدخال كلمة المرور',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['بيانات الاعتماد المدخلة غير صحيحة. يرجى التحقق من البريد وكلمة المرور.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'حساب الموظف معطل حالياً. يرجى التواصل مع إدارة النظام.',
            ], 403);
        }

        // Create Sanctum Token
        $token = $user->createToken('staff-web-token', [$user->role])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح. مرحباً بك في نظام مستشفى الوفاء.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => $user->role_label,
                'department' => $user->department,
                'employee_id' => $user->employee_id,
                'phone' => $user->phone,
                'permissions' => [
                    'can_access_transfers' => $user->canAccessTransfers(),
                    'can_manage_staff' => $user->canManageStaff(),
                    'can_manage_system' => $user->canManageSystemSettings(),
                    'can_manage_patients' => $user->canManagePatients(),
                    'is_read_only' => $user->isDataLookupClerk(),
                ],
            ],
        ]);
    }

    /**
     * Get Current Authenticated Staff User Profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => $user->role_label,
                'department' => $user->department,
                'employee_id' => $user->employee_id,
                'phone' => $user->phone,
                'permissions' => [
                    'can_access_transfers' => $user->canAccessTransfers(),
                    'can_manage_staff' => $user->canManageStaff(),
                    'can_manage_system' => $user->canManageSystemSettings(),
                    'can_manage_patients' => $user->canManagePatients(),
                    'is_read_only' => $user->isDataLookupClerk(),
                ],
            ],
        ]);
    }

    /**
     * Staff Logout.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح.',
        ]);
    }
}
