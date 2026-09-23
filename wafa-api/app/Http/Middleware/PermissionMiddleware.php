<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();
        abort_unless($user && collect($permissions)->contains(fn (string $key) => $user->hasPermission($key)), 403, 'You do not have permission to perform this action.');
        return $next($request);
    }
}
