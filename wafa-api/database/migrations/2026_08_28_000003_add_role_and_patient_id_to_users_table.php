<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 50)->default('registration_clerk')->after('email')->index()->comment('Staff role in the hospital RBAC hierarchy');
            $table->string('department', 100)->nullable()->after('role')->comment('Hospital department / clinic');
            $table->string('employee_id', 50)->nullable()->after('department')->comment('Staff badge / ID number');
            $table->string('phone', 50)->nullable()->after('employee_id');
            $table->boolean('is_active')->default(true)->after('password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'department', 'employee_id', 'phone', 'is_active']);
        });
    }
};
