<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('permissions_customized')->default(false)->after('active');
            $table->foreignUuid('created_by')->nullable()->after('permissions_customized')->constrained('users')->nullOnDelete();
            $table->softDeletes();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('module')->index();
            $table->string('action');
            $table->string('name_ar');
            $table->string('name_en');
            $table->boolean('is_financial')->default(false)->index();
            $table->unsignedInteger('sort_order')->default(0);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->string('role');
            $table->string('permission_key');
            $table->foreign('permission_key')->references('key')->on('permissions')->cascadeOnDelete();
            $table->primary(['role', 'permission_key']);
        });

        Schema::create('user_permissions', function (Blueprint $table) {
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('permission_key');
            $table->foreign('permission_key')->references('key')->on('permissions')->cascadeOnDelete();
            $table->primary(['user_id', 'permission_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_permissions');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['permissions_customized', 'deleted_at']);
        });
    }
};
