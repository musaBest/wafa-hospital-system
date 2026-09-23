<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PrimaryCashierMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->isPrimaryCashier(), 403, 'Full financial access is restricted to Eng. Mohammed Moqbil (treasury owner).');
        return $next($request);
    }
}
