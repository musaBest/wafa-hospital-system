<?php

use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('operation_cases')) {
            Schema::create('operation_cases', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
                $table->string('patient_name');
                $table->string('medical_serial', 20)->index();
                $table->string('id_number', 40)->index();
                $table->date('dob')->nullable();
                $table->enum('gender', ['male','female'])->nullable();
                $table->string('phone', 40)->nullable();
                $table->string('address', 500)->nullable();
                $table->string('city', 120)->nullable();
                $table->string('area', 180)->nullable();
                $table->string('marital_status', 80)->nullable();
                $table->longText('diagnosis')->nullable();
                $table->string('doctor_name', 180)->nullable();
                $table->date('admission_date')->index();
                $table->string('admission_time', 20)->nullable();
                $table->date('discharge_date')->nullable();
                $table->unsignedInteger('stay_days')->nullable();
                $table->string('referral_entity', 180)->index();
                $table->string('department', 120)->default('عمليات');
                $table->string('case_number', 80)->index();
                $table->string('insurance_number', 100)->nullable();
                $table->string('conversion_duration', 120)->nullable();
                $table->string('conversion_reason', 500)->nullable();
                $table->string('source', 80)->default('operations_page');
                $table->foreignUuid('registered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('permissions')) {
            $permissions = [
                ['key'=>'operations.view','module'=>'operations','action'=>'view','name_ar'=>'عرض واجهة العمليات','name_en'=>'View operations interface','is_financial'=>false,'sort_order'=>2200],
                ['key'=>'operations.create','module'=>'operations','action'=>'create','name_ar'=>'تسجيل حالة عمليات','name_en'=>'Create operation admission cases','is_financial'=>false,'sort_order'=>2201],
                ['key'=>'operations.print','module'=>'operations','action'=>'print','name_ar'=>'طباعة إذن دخول مريض عمليات','name_en'=>'Print operation admission permission','is_financial'=>false,'sort_order'=>2202],
            ];
            foreach ($permissions as $row) {
                Permission::query()->updateOrCreate(['key'=>$row['key']], $row);
            }

            $roles = ['admin','treasurer','it_head','inpatient_manager','operations_clerk'];
            foreach ($roles as $role) {
                foreach (['operations.view','operations.create','operations.print'] as $key) {
                    DB::table('role_permissions')->insertOrIgnore(['role'=>$role,'permission_key'=>$key]);
                }
            }
        }

        if (Schema::hasTable('users')) {
            $user = User::withTrashed()->where('username', 'operations')->first();
            if ($user) {
                if (method_exists($user, 'restore') && $user->trashed()) $user->restore();
                $user->forceFill([
                    'display_name' => 'موظف العمليات',
                    'password' => Hash::make('Operations@2026'),
                    'role' => 'operations_clerk',
                    'active' => true,
                    'permissions_customized' => false,
                    'deleted_at' => null,
                ])->save();
            } else {
                User::create([
                    'id' => '00000000-0000-4000-8000-000000000014',
                    'username' => 'operations',
                    'display_name' => 'موظف العمليات',
                    'password' => 'Operations@2026',
                    'role' => 'operations_clerk',
                    'active' => true,
                    'permissions_customized' => false,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('operation_cases');
    }
};
