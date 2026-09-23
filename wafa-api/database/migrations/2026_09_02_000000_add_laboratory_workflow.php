<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->change();
        });

        Schema::create('diagnostic_services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('type', ['lab','radiology'])->index();
            $table->string('name_ar');
            $table->string('name_en');
            $table->string('category')->index();
            $table->decimal('price', 12, 2);
            $table->json('tests')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('lab_orders', function (Blueprint $table) {
            $table->foreignUuid('service_id')->nullable()->after('patient_id')->constrained('diagnostic_services')->nullOnDelete();
            $table->foreignUuid('doctor_id')->nullable()->after('service_id')->constrained('doctors')->nullOnDelete();
            $table->decimal('price', 12, 2)->default(0)->after('category');
            $table->json('result_rows')->nullable()->after('result');
            $table->text('notes')->nullable()->after('result_rows');
            $table->timestamp('completed_at')->nullable()->after('notes');
            $table->foreignUuid('completed_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
            $table->string('report_number')->nullable()->unique()->after('completed_by');
        });

        Schema::table('radiology_orders', function (Blueprint $table) {
            $table->foreignUuid('service_id')->nullable()->after('patient_id')->constrained('diagnostic_services')->nullOnDelete();
            $table->foreignUuid('doctor_id')->nullable()->after('service_id')->constrained('doctors')->nullOnDelete();
            $table->decimal('price', 12, 2)->default(0)->after('exam');
            $table->timestamp('completed_at')->nullable()->after('result');
        });
    }

    public function down(): void
    {
        Schema::table('radiology_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_id');
            $table->dropConstrainedForeignId('doctor_id');
            $table->dropColumn(['price','completed_at']);
        });
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_id');
            $table->dropConstrainedForeignId('doctor_id');
            $table->dropConstrainedForeignId('completed_by');
            $table->dropUnique(['report_number']);
            $table->dropColumn(['price','result_rows','notes','completed_at','report_number']);
        });
        Schema::dropIfExists('diagnostic_services');
    }
};
