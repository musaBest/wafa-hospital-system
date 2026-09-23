<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('outpatient_pt_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->enum('patient_group', ['men', 'women_children']);
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['year', 'patient_group']);
        });

        Schema::create('outpatient_pt_cases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->unique()->constrained('patients')->cascadeOnDelete();
            $table->string('pt_number', 9)->unique();
            $table->enum('patient_group', ['men', 'women_children'])->index();
            $table->date('case_date')->index();
            $table->longText('diagnosis');
            $table->foreignUuid('coverage_entity_id')->nullable()->constrained('sponsors')->nullOnDelete();
            $table->string('marital_status', 80)->nullable();
            $table->string('treatment_department', 120)->nullable();
            $table->string('referral_source', 160)->nullable();
            $table->string('treating_doctor', 160)->nullable();
            $table->string('insurance_class', 120)->nullable();
            $table->string('employee_name', 160)->nullable();
            $table->string('relationship', 120)->nullable();
            $table->string('decision_link', 255)->nullable();
            $table->string('change_specialist', 160)->nullable();
            $table->decimal('session_fee', 10, 2)->default(10);
            $table->enum('status', ['active', 'closed'])->default('active')->index();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['patient_id', 'case_date']);
        });

        Schema::create('outpatient_pt_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('case_id')->constrained('outpatient_pt_cases')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->unsignedInteger('session_number');
            $table->date('session_date')->index();
            $table->dateTime('appointment_at')->nullable()->index();
            $table->string('therapist', 160)->nullable()->index();
            $table->string('specialist', 160)->nullable();
            $table->json('treatments')->nullable();
            $table->longText('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['case_id', 'session_number']);
            $table->index(['patient_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outpatient_pt_sessions');
        Schema::dropIfExists('outpatient_pt_cases');
        Schema::dropIfExists('outpatient_pt_sequences');
    }
};
