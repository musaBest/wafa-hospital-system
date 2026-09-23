<?php

use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('elderly_residents')) {
            Schema::create('elderly_residents', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('patient_id')->nullable()->constrained('patients')->nullOnDelete();
                $table->string('full_name', 180)->index();
                $table->string('medical_serial', 60)->nullable()->index();
                $table->string('id_number', 80)->index();
                $table->date('dob')->nullable();
                $table->enum('gender', ['male','female'])->nullable();
                $table->string('marital_status', 80)->nullable();
                $table->string('current_address')->default('مركز الوفاء لرعاية المسنين والمسنات');
                $table->string('original_town', 160)->nullable();
                $table->enum('housing_type', ['owned','rented'])->nullable();
                $table->date('admission_date')->index();
                $table->boolean('receives_assistance')->default(false)->index();
                $table->string('assistance_type', 180)->nullable();
                $table->text('assistance_details')->nullable();
                $table->json('disabilities')->nullable();
                $table->string('custom_disability', 220)->nullable();
                $table->boolean('is_deceased')->default(false)->index();
                $table->date('exit_date')->nullable()->index();
                $table->longText('health_status_details')->nullable();
                $table->enum('employment_status', ['working','not_working'])->default('not_working')->index();
                $table->string('work_type', 180)->nullable();
                $table->json('medications')->nullable();
                $table->json('assistive_tools')->nullable();
                $table->text('belongings')->nullable();
                $table->enum('status', ['active','temporary_leave','final_exit','deceased'])->default('active')->index();
                $table->date('final_exit_date')->nullable()->index();
                $table->date('temporary_leave_from')->nullable()->index();
                $table->date('temporary_leave_to')->nullable()->index();
                $table->string('temporary_leave_reason', 255)->nullable();
                $table->text('notes')->nullable();
                $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
                $table->unique(['id_number','deleted_at']);
            });
        }

        if (!Schema::hasTable('permissions') || !Schema::hasTable('role_permissions')) return;

        DB::transaction(function () {
            $catalog = config('hospital_permissions.catalog', []);
            foreach ($catalog as $index => $permission) {
                Permission::query()->updateOrCreate(['key' => $permission['key']], [
                    'module' => $permission['module'],
                    'action' => $permission['action'],
                    'name_ar' => $permission['name_ar'],
                    'name_en' => $permission['name_en'],
                    'is_financial' => $permission['financial'],
                    'sort_order' => $index + 1,
                ]);
            }

            foreach (config('hospital_permissions.role_defaults', []) as $role => $keys) {
                DB::table('role_permissions')->where('role', $role)->delete();
                $allPermissionKeys = collect($catalog)->pluck('key')->all();
                $resolvedKeys = $keys === ['*']
                    ? $allPermissionKeys
                    : ($keys === ['@nonfinancial'] ? collect($catalog)->where('financial', false)->pluck('key')->all() : $keys);
                foreach ($resolvedKeys as $key) {
                    DB::table('role_permissions')->insertOrIgnore(['role' => $role, 'permission_key' => $key]);
                }
            }

            $user = User::withTrashed()->whereRaw('LOWER(username) = ?', ['elderly.care'])->first()
                ?: User::withTrashed()->find('00000000-0000-4000-8000-000000000024');
            if ($user) {
                if (method_exists($user, 'restore') && $user->trashed()) $user->restore();
                $user->forceFill([
                    'username' => 'elderly.care',
                    'display_name' => 'مسؤول قسم المسنين والمسنات',
                    'password' => 'Elderly@2026',
                    'role' => 'elderly_care_manager',
                    'active' => true,
                    'permissions_customized' => false,
                    'deleted_at' => null,
                ])->save();
            } else {
                User::create([
                    'id' => '00000000-0000-4000-8000-000000000024',
                    'username' => 'elderly.care',
                    'display_name' => 'مسؤول قسم المسنين والمسنات',
                    'password' => 'Elderly@2026',
                    'role' => 'elderly_care_manager',
                    'active' => true,
                    'permissions_customized' => false,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('elderly_residents');
    }
};
