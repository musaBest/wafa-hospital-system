<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('username')->unique();
            $table->string('display_name');
            $table->string('password');
            $table->string('role', 120)->index();
            $table->boolean('active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('password_reset_tokens', function (Blueprint $table) { $table->string('email')->primary(); $table->string('token'); $table->timestamp('created_at')->nullable(); });
        Schema::create('personal_access_tokens', function (Blueprint $table) { $table->id(); $table->morphs('tokenable'); $table->text('name'); $table->string('token',64)->unique(); $table->text('abilities')->nullable(); $table->timestamp('last_used_at')->nullable(); $table->timestamp('expires_at')->nullable()->index(); $table->timestamps(); });

        Schema::create('sponsors', function (Blueprint $table) { $table->uuid('id')->primary(); $table->string('code')->unique(); $table->string('name_ar'); $table->string('name_en'); $table->boolean('active')->default(true); $table->timestamps(); });
        Schema::create('clinics', function (Blueprint $table) { $table->uuid('id')->primary(); $table->string('key')->unique(); $table->string('name_ar'); $table->string('name_en'); $table->decimal('visit_fee',12,2); $table->boolean('active')->default(true); $table->timestamps(); $table->softDeletes(); });
        Schema::create('doctors', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('user_id')->unique()->constrained()->cascadeOnDelete(); $table->string('staff_id')->unique(); $table->string('name'); $table->string('phone')->nullable(); $table->string('specialty')->nullable(); $table->boolean('active')->default(true); $table->timestamps(); $table->softDeletes(); });
        Schema::create('clinic_doctor', function (Blueprint $table) { $table->id(); $table->foreignUuid('clinic_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('doctor_id')->constrained()->cascadeOnDelete(); $table->timestamps(); $table->unique(['clinic_id','doctor_id']); });

        Schema::create('patient_sequences', function (Blueprint $table) { $table->unsignedSmallInteger('year')->primary(); $table->unsignedInteger('last_number')->default(1101); });
        Schema::create('patients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('medical_serial',9)->unique();
            $table->string('full_name')->index();
            $table->string('id_number')->unique();
            $table->date('dob');
            $table->enum('gender',['male','female']);
            $table->string('phone');
            $table->string('city')->nullable();
            $table->string('area')->nullable();
            $table->foreignUuid('coverage_entity_id')->nullable()->constrained('sponsors')->nullOnDelete();
            $table->date('registered_at')->index();
            $table->decimal('wallet_balance',12,2)->default(0);
            $table->timestamp('civil_registry_verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('findings', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->string('region'); $table->text('note'); $table->date('finding_date'); $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); });

        Schema::create('follow_up_appointments', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('doctor_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('clinic_id')->constrained()->cascadeOnDelete(); $table->uuid('source_visit_id')->nullable(); $table->date('appointment_date')->index(); $table->enum('status',['scheduled','booked','completed','cancelled'])->default('scheduled'); $table->uuid('booked_visit_id')->nullable(); $table->timestamps(); });
        Schema::create('visits', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('clinic_id')->constrained(); $table->foreignUuid('doctor_id')->constrained(); $table->decimal('fee',12,2); $table->date('visit_date')->index(); $table->text('notes')->nullable(); $table->unsignedInteger('queue_number'); $table->enum('status',['waiting','exam','completed','cancelled'])->default('waiting'); $table->timestamp('completed_at')->nullable(); $table->date('follow_up_date')->nullable(); $table->foreignUuid('appointment_id')->nullable()->constrained('follow_up_appointments')->nullOnDelete(); $table->timestamps(); $table->unique(['doctor_id','visit_date','queue_number']); });
        Schema::table('follow_up_appointments', function (Blueprint $table) { $table->foreign('source_visit_id')->references('id')->on('visits')->cascadeOnDelete(); $table->foreign('booked_visit_id')->references('id')->on('visits')->nullOnDelete(); });
        Schema::create('queue_items', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('visit_id')->unique()->constrained()->cascadeOnDelete(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('clinic_id')->constrained(); $table->foreignUuid('doctor_id')->constrained(); $table->date('queue_date')->index(); $table->unsignedInteger('queue_number'); $table->enum('status',['waiting','exam','completed'])->default('waiting'); $table->timestamp('added_at'); $table->timestamps(); $table->unique(['doctor_id','queue_date','queue_number']); });

        Schema::create('invoices', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->string('service'); $table->decimal('unit_price',12,2); $table->decimal('coverage_ratio',5,2)->default(0); $table->decimal('payable_amount',12,2); $table->enum('payment_method',['cash','app']); $table->string('sender_phone')->nullable(); $table->string('sender_name')->nullable(); $table->string('transfer_source')->nullable(); $table->timestamp('issued_at')->index(); $table->string('receipt_number')->unique(); $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); });
        Schema::create('wallet_transactions', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->enum('type',['credit','debit']); $table->timestamp('occurred_at')->index(); $table->string('service'); $table->decimal('amount',12,2); $table->string('method'); $table->string('receipt_number')->unique(); $table->string('reference_type')->nullable(); $table->uuid('reference_id')->nullable(); $table->json('metadata')->nullable(); $table->timestamps(); $table->index(['patient_id','occurred_at']); });

        Schema::create('admissions', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->string('ward'); $table->text('diagnosis'); $table->date('admission_date')->index(); $table->foreignUuid('coverage_entity_id')->nullable()->constrained('sponsors')->nullOnDelete(); $table->decimal('contribution_pct',5,2)->default(0); $table->enum('status',['admitted','discharged'])->default('admitted')->index(); $table->timestamp('discharged_at')->nullable(); $table->foreignUuid('admitted_by')->nullable()->constrained('users')->nullOnDelete(); $table->foreignUuid('discharged_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); });
        Schema::create('doctor_notes', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('doctor_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->foreignUuid('visit_id')->nullable()->constrained()->nullOnDelete(); $table->longText('content'); $table->timestamps(); $table->index(['doctor_id','patient_id']); });
        Schema::create('lab_orders', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->string('category'); $table->timestamp('ordered_at'); $table->enum('status',['processing','done','cancelled'])->default('processing'); $table->text('result')->nullable(); $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); });
        Schema::create('radiology_orders', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete(); $table->string('exam'); $table->timestamp('ordered_at'); $table->enum('status',['waiting','done','cancelled'])->default('waiting'); $table->text('result')->nullable(); $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); });
        Schema::create('audit_logs', function (Blueprint $table) { $table->uuid('id')->primary(); $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete(); $table->string('action')->index(); $table->string('entity_type'); $table->uuid('entity_id')->nullable(); $table->ipAddress('ip_address')->nullable(); $table->json('metadata')->nullable(); $table->timestamp('created_at')->index(); });

        Schema::create('cache', function (Blueprint $table) { $table->string('key')->primary(); $table->mediumText('value'); $table->integer('expiration'); });
        Schema::create('cache_locks', function (Blueprint $table) { $table->string('key')->primary(); $table->string('owner'); $table->integer('expiration'); });
        Schema::create('jobs', function (Blueprint $table) { $table->id(); $table->string('queue')->index(); $table->longText('payload'); $table->unsignedTinyInteger('attempts'); $table->unsignedInteger('reserved_at')->nullable(); $table->unsignedInteger('available_at'); $table->unsignedInteger('created_at'); });
        Schema::create('job_batches', function (Blueprint $table) { $table->string('id')->primary(); $table->string('name'); $table->integer('total_jobs'); $table->integer('pending_jobs'); $table->integer('failed_jobs'); $table->longText('failed_job_ids'); $table->mediumText('options')->nullable(); $table->integer('cancelled_at')->nullable(); $table->integer('created_at'); $table->integer('finished_at')->nullable(); });
        Schema::create('failed_jobs', function (Blueprint $table) { $table->id(); $table->string('uuid')->unique(); $table->text('connection'); $table->text('queue'); $table->longText('payload'); $table->longText('exception'); $table->timestamp('failed_at')->useCurrent(); });
        Schema::create('sessions', function (Blueprint $table) { $table->string('id')->primary(); $table->foreignUuid('user_id')->nullable()->index(); $table->string('ip_address',45)->nullable(); $table->text('user_agent')->nullable(); $table->longText('payload'); $table->integer('last_activity')->index(); });
    }

    public function down(): void
    {
        foreach (['sessions','failed_jobs','job_batches','jobs','cache_locks','cache','audit_logs','radiology_orders','lab_orders','doctor_notes','admissions','wallet_transactions','invoices','queue_items','visits','follow_up_appointments','findings','patients','patient_sequences','clinic_doctor','doctors','clinics','sponsors','personal_access_tokens','password_reset_tokens','users'] as $table) Schema::dropIfExists($table);
    }
};
