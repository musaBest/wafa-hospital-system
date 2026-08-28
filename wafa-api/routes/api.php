<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\TransferController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\CivilRegistryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - El-Wafa Hospital Information System
|--------------------------------------------------------------------------
*/

// Health Check
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'system' => 'El-Wafa Hospital Management System API',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Authentication (Staff only)
Route::post('/auth/login', [AuthController::class, 'login']);

// Civil Registry Lookup Service (Swappable integration)
Route::get('/civil-registry/lookup/{nationalId}', [CivilRegistryController::class, 'lookup']);

// Public/Shared read endpoints during development (can be authenticated)
Route::get('/notifications', [NotificationController::class, 'index']);
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

Route::get('/patients/stats', [PatientController::class, 'stats']);
Route::get('/patients/next-id', [PatientController::class, 'getNextPatientId']);
Route::get('/patients', [PatientController::class, 'index']);
Route::get('/patients/{patient}', [PatientController::class, 'show']);
Route::post('/patients', [PatientController::class, 'store']);
Route::put('/patients/{patient}', [PatientController::class, 'update']);
Route::delete('/patients/{patient}', [PatientController::class, 'destroy']);

// Protected Authenticated Endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Staff & User Management (IT Admin & Management Admin only)
    Route::middleware('role:it_admin,management_admin')->group(function () {
        Route::apiResource('staff', StaffController::class);
    });

    // Financial Transfers & Payments Module (EXCLUSIVE to Accountant — EXPLICITLY FORBIDDEN to IT Admin & Management)
    Route::middleware(['forbid.role:it_admin,management_admin', 'role:accountant'])->group(function () {
        Route::get('/transfers/stats', [TransferController::class, 'stats']);
        Route::apiResource('transfers', TransferController::class)->except(['destroy']);
    });
});

// Open transfer routes for convenient dev/testing when unauthenticated (also guarded by controller role logic)
Route::get('/dev/transfers/stats', [TransferController::class, 'stats']);
Route::get('/dev/transfers', [TransferController::class, 'index']);
Route::post('/dev/transfers', [TransferController::class, 'store']);
Route::get('/dev/transfers/{transfer}', [TransferController::class, 'show']);
Route::get('/dev/staff', [StaffController::class, 'index']);
Route::post('/dev/staff', [StaffController::class, 'store']);
