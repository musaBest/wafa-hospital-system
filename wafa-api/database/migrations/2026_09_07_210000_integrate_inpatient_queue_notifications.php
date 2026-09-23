<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('kind', 30)->default('outpatient')->index();
            $table->decimal('daily_rate', 12, 2)->default(0);
        });

        Schema::create('admission_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->uuid('source_visit_id')->nullable()->index();
            $table->string('preferred_ward')->nullable();
            $table->text('diagnosis');
            $table->string('priority', 30)->default('routine')->index();
            $table->json('report_refs')->nullable();
            $table->enum('status', ['pending','accepted','cancelled'])->default('pending')->index();
            $table->foreignUuid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('requested_at')->index();
            $table->timestamp('resolved_at')->nullable();
            $table->uuid('admission_id')->nullable()->index();
            $table->timestamps();
        });

        Schema::table('admissions', function (Blueprint $table) {
            $table->string('room')->nullable();
            $table->string('bed')->nullable();
            $table->timestamp('admission_time')->nullable();
            $table->date('expected_discharge_date')->nullable();
            $table->uuid('responsible_user_id')->nullable()->index();
            $table->uuid('attending_doctor_id')->nullable()->index();
            $table->decimal('daily_rate', 12, 2)->default(0);
            $table->uuid('source_visit_id')->nullable()->index();
            $table->uuid('request_id')->nullable()->index();
        });

        Schema::create('inpatient_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('admission_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['charge','payment']);
            $table->string('category', 30)->default('service');
            $table->decimal('amount', 12, 2);
            $table->timestamp('occurred_at')->index();
            $table->string('description');
            $table->string('method')->nullable();
            $table->string('receipt_number')->nullable()->unique();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('inpatient_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('admission_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->string('category', 50)->default('administrative');
            $table->longText('note');
            $table->foreignUuid('authored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('noted_at')->index();
            $table->timestamps();
        });

        Schema::create('inpatient_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('admission_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->string('type', 80)->default('progress');
            $table->string('title');
            $table->longText('summary');
            $table->foreignUuid('authored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('report_date')->index();
            $table->timestamps();
        });

        Schema::create('patient_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->string('type', 60)->index();
            $table->string('title');
            $table->longText('description')->nullable();
            $table->string('status', 60)->nullable()->index();
            $table->string('reference_type', 60)->nullable();
            $table->uuid('reference_id')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['patient_id','occurred_at']);
        });

        Schema::create('system_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('permission_key')->nullable()->index();
            $table->foreignUuid('patient_id')->nullable()->constrained('patients')->cascadeOnDelete();
            $table->string('type', 60)->default('info');
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('link')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::table('queue_items', function (Blueprint $table) {
            $table->unsignedTinyInteger('priority')->default(3)->index();
            $table->text('triage_note')->nullable();
            $table->uuid('updated_by')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('queue_items', function (Blueprint $table) {
            $table->dropColumn(['priority','triage_note','updated_by']);
        });
        Schema::dropIfExists('system_notifications');
        Schema::dropIfExists('patient_events');
        Schema::dropIfExists('inpatient_reports');
        Schema::dropIfExists('inpatient_notes');
        Schema::dropIfExists('inpatient_transactions');
        Schema::table('admissions', function (Blueprint $table) {
            $table->dropColumn(['room','bed','admission_time','expected_discharge_date','responsible_user_id','attending_doctor_id','daily_rate','source_visit_id','request_id']);
        });
        Schema::dropIfExists('admission_requests');
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn(['kind','daily_rate']);
        });
    }
};
