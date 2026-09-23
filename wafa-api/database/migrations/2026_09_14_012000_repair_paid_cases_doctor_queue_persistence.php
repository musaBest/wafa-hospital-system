<?php

use App\Http\Controllers\Api\CashierWorkflowController;
use App\Models\CashierWorkflowCase;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        if (!class_exists(CashierWorkflowCase::class) || !class_exists(CashierWorkflowController::class)) {
            return;
        }

        $controller = app(CashierWorkflowController::class);
        CashierWorkflowCase::query()
            ->whereIn('status', ['paid', 'collected', 'audited'])
            ->orderBy('registered_at')
            ->chunk(100, function ($cases) use ($controller) {
                foreach ($cases as $case) {
                    $controller->ensureDoctorVisitAndQueue($case);
                }
            });
    }

    public function down(): void
    {
        // Repair-only migration. It does not remove patient, visit, or queue data.
    }
};
