<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BillingOperatorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && ($user->isPrimaryCashier() || $user->isBillingCashier()), 403, 'Billing access is restricted to the cashier and the treasury owner.');
        return $next($request);
    }
}
