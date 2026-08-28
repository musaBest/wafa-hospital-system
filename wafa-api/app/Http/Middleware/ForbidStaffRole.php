<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForbidStaffRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$forbiddenRoles
     */
    public function handle(Request $request, Closure $next, string ...$forbiddenRoles): Response
    {
        $user = $request->user();

        if ($user && in_array($user->role, $forbiddenRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'الوصول محظور تماماً: وفقاً لقواعد الحوكمة وفصل السلطات المالية، يُحظر على ' . $user->role_label . ' الوصول إلى هذا القسم.',
                'forbidden_role' => $user->role,
            ], 403);
        }

        return $next($request);
    }
}
