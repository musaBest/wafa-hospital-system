<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('cashier_workflow_cases')) return;

        Schema::create('cashier_workflow_cases', function (Blueprint $table) {
            // These identifiers are intentionally strings rather than foreign UUIDs.
            // The React application historically supports offline/local records. Keeping
            // snapshots here lets the new multi-user cashier workflow work across PCs
            // without invalidating existing locally-created patient/visit identifiers.
            $table->string('id', 100)->primary();
            $table->string('visit_id', 100)->index();
            $table->string('patient_id', 100)->index();
            $table->string('patient_name', 180);
            $table->string('medical_serial', 60)->index();
            $table->string('clinic_id', 100)->index();
            $table->string('clinic_name', 180);
            $table->string('clinic_code', 24)->nullable();
            $table->string('doctor_id', 100)->index();
            $table->string('doctor_name', 180);
            $table->date('visit_date')->index();
            $table->timestamp('registered_at')->index();
            $table->unsignedInteger('queue_number')->default(1);
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('status', 30)->default('registered')->index();
            $table->string('payment_method', 30)->nullable();
            $table->string('payment_source', 120)->nullable();
            $table->string('sender_name', 180)->nullable();
            $table->string('sender_phone', 60)->nullable();
            $table->timestamp('paid_at')->nullable()->index();
            $table->string('receipt_number', 120)->nullable()->unique();
            $table->timestamp('collected_at')->nullable()->index();
            $table->timestamp('audited_at')->nullable()->index();
            $table->text('notes')->nullable();
            $table->foreignUuid('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('collected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('audited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['visit_id', 'patient_id'], 'cashier_workflow_visit_patient_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashier_workflow_cases');
    }
};
