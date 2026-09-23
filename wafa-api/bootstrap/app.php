<?php

use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\PermissionMiddleware;
use App\Http\Middleware\PrimaryCashierMiddleware;
use App\Http\Middleware\BillingOperatorMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['role' => RoleMiddleware::class, 'permission' => PermissionMiddleware::class, 'cashier.only' => PrimaryCashierMiddleware::class, 'billing.operator' => BillingOperatorMiddleware::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Laravel's JSON exception renderer is used for /api requests.
    })->create();
