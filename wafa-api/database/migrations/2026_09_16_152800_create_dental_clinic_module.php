<?php

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('clinics')) {
            $dentalClinic = Clinic::withTrashed()->firstOrNew(['key' => 'dental']);
            if (!$dentalClinic->exists) $dentalClinic->id = '20000000-0000-4000-8000-000000000004';
            $dentalClinic->forceFill([
                'code' => 'DEN',
                'name_ar' => 'عيادة الأسنان',
                'name_en' => 'Dental clinic',
                'visit_fee' => 20,
                'kind' => 'outpatient',
                'daily_rate' => 0,
                'active' => true,
                'deleted_at' => null,
            ])->save();
            if (method_exists($dentalClinic, 'restore') && $dentalClinic->trashed()) $dentalClinic->restore();
        }

        if (!Schema::hasTable('dental_visits')) {
            Schema::create('dental_visits', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
                $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
                $table->foreignUuid('clinic_id')->constrained('clinics')->cascadeOnDelete();
                $table->foreignUuid('visit_id')->nullable()->index()->constrained('visits')->nullOnDelete();
                $table->string('service_name', 120)->index();
                $table->string('other_service', 180)->nullable();
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->decimal('paid_amount', 12, 2)->default(0);
                $table->decimal('remaining_amount', 12, 2)->default(0);
                $table->text('notes')->nullable();
                $table->date('visit_date')->index();
                $table->string('status', 30)->default('active')->index();
                $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('dental_waitlist_items')) {
            Schema::create('dental_waitlist_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('patient_id')->nullable()->constrained('patients')->nullOnDelete();
                $table->string('full_name', 180)->index();
                $table->string('medical_serial', 60)->nullable()->index();
                $table->string('id_number', 80)->nullable()->index();
                $table->string('phone', 60)->nullable()->index();
                $table->date('requested_date')->index();
                $table->string('appointment_time', 8);
                $table->string('service_name', 120)->index();
                $table->string('other_service', 180)->nullable();
                $table->foreignUuid('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
                $table->string('status', 30)->default('waiting')->index();
                $table->text('notes')->nullable();
                $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('permissions') || !Schema::hasTable('role_permissions')) return;

        DB::transaction(function () {
            $catalog = config('hospital_permissions.catalog', []);
            foreach ($catalog as $index => $permission) {
                Permission::query()->updateOrCreate(['key' => $permission['key']], [
                    'module' => $permission['module'], 'action' => $permission['action'],
                    'name_ar' => $permission['name_ar'], 'name_en' => $permission['name_en'],
                    'is_financial' => $permission['financial'], 'sort_order' => $index + 1,
                ]);
            }

            foreach (config('hospital_permissions.role_defaults', []) as $role => $keys) {
                DB::table('role_permissions')->where('role', $role)->delete();
                $allPermissionKeys = collect($catalog)->pluck('key')->all();
                $resolvedKeys = $keys === ['*']
                    ? $allPermissionKeys
                    : ($keys === ['@nonfinancial'] ? collect($catalog)->where('financial', false)->pluck('key')->all() : $keys);
                foreach ($resolvedKeys as $key) DB::table('role_permissions')->insertOrIgnore(['role' => $role, 'permission_key' => $key]);
            }

            $this->seedDentalDoctors();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dental_waitlist_items');
        Schema::dropIfExists('dental_visits');
    }

    private function seedDentalDoctors(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('doctors') || !Schema::hasTable('clinic_doctor')) return;
        $clinic = Clinic::where('key', 'dental')->first();
        if (!$clinic) return;

        $rows = [
            ['user_id' => '00000000-0000-4000-8000-000000000021', 'doctor_id' => '21000000-0000-4000-8000-000000000001', 'username' => 'Dr.Naji_AlTaweel', 'name' => 'د. ناجي الطويل', 'phone' => '', 'schedule' => 'طبيب أسنان دائم في المستشفى'],
            ['user_id' => '00000000-0000-4000-8000-000000000022', 'doctor_id' => '21000000-0000-4000-8000-000000000002', 'username' => 'Dr.Mohammed_AlKurdi', 'name' => 'د. محمد الكردي', 'phone' => '', 'schedule' => 'عيادة الأسنان حسب جدول المستشفى'],
            ['user_id' => '00000000-0000-4000-8000-000000000023', 'doctor_id' => '21000000-0000-4000-8000-000000000003', 'username' => 'Dr.Mohammed_Shamieh', 'name' => 'د. محمد شامية', 'phone' => '', 'schedule' => 'عيادة الأسنان حسب جدول المستشفى'],
        ];
        $permissionKeys = ['doctor_portal.view','doctor_portal.update','queue.update','diagnostics.view','diagnostics.create','diagnostics.update','dental.view','dental.update'];
        foreach ($rows as $row) {
            $user = User::withTrashed()->whereRaw('LOWER(username) = ?', [mb_strtolower($row['username'])])->first() ?: User::withTrashed()->find($row['user_id']);
            if ($user) {
                if (method_exists($user, 'restore') && $user->trashed()) $user->restore();
                $user->forceFill(['username' => $row['username'], 'display_name' => $row['name'], 'password' => 'Dental@2026', 'role' => 'doctor', 'active' => true, 'permissions_customized' => true, 'deleted_at' => null])->save();
            } else {
                $user = User::create(['id' => $row['user_id'], 'username' => $row['username'], 'display_name' => $row['name'], 'password' => 'Dental@2026', 'role' => 'doctor', 'active' => true, 'permissions_customized' => true]);
            }
            $doctor = Doctor::withTrashed()->where('staff_id', $row['username'])->first() ?: Doctor::withTrashed()->find($row['doctor_id']);
            if ($doctor) {
                if (method_exists($doctor, 'restore') && $doctor->trashed()) $doctor->restore();
                $doctor->forceFill(['user_id' => $user->id, 'staff_id' => $row['username'], 'name' => $row['name'], 'phone' => $row['phone'], 'specialty' => 'طب الأسنان', 'schedule_text' => $row['schedule'], 'active' => true, 'deleted_at' => null])->save();
            } else {
                $doctor = Doctor::create(['id' => $row['doctor_id'], 'user_id' => $user->id, 'staff_id' => $row['username'], 'name' => $row['name'], 'phone' => $row['phone'], 'specialty' => 'طب الأسنان', 'schedule_text' => $row['schedule'], 'active' => true]);
            }
            $doctor->clinics()->syncWithoutDetaching([$clinic->id]);
            if (Schema::hasTable('user_permissions')) {
                DB::table('user_permissions')->where('user_id', $user->id)->delete();
                foreach ($permissionKeys as $key) DB::table('user_permissions')->insertOrIgnore(['user_id' => $user->id, 'permission_key' => $key]);
            }
        }
    }
};
