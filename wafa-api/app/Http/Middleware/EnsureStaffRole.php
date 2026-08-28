<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح - يرجى تسجيل الدخول أولاً',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'حساب الموظف معطل. يرجى التواصل مع إدارة النظام.',
            ], 403);
        }

        if (!empty($roles) && !in_array($user->role, $roles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'ليس لديك صلاحية كافية لتنفيذ هذا الإجراء (' . $user->role_label . ')',
                'user_role' => $user->role,
                'required_roles' => $roles,
            ], 403);
        }

        return $next($request);
    }
}
