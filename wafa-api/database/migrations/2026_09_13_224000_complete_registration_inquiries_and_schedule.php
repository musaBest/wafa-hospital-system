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
        if (Schema::hasTable('cashier_workflow_cases')) {
            $columns = [
                'id_number' => fn (Blueprint $table) => $table->string('id_number', 40)->nullable(),
                'patient_phone' => fn (Blueprint $table) => $table->string('patient_phone', 60)->nullable(),
                'patient_dob' => fn (Blueprint $table) => $table->date('patient_dob')->nullable(),
                'patient_gender' => fn (Blueprint $table) => $table->string('patient_gender', 20)->nullable(),
                'patient_city' => fn (Blueprint $table) => $table->string('patient_city', 120)->nullable(),
                'patient_area' => fn (Blueprint $table) => $table->string('patient_area', 180)->nullable(),
                'coverage_entity' => fn (Blueprint $table) => $table->string('coverage_entity', 120)->nullable(),
            ];
            foreach ($columns as $column => $builder) {
                if (!Schema::hasColumn('cashier_workflow_cases', $column)) {
                    Schema::table('cashier_workflow_cases', fn (Blueprint $table) => $builder($table));
                }
            }
        }

        if (!Schema::hasTable('permissions') || !Schema::hasTable('role_permissions') || !Schema::hasTable('users')) return;

        DB::transaction(function () {
            foreach (config('hospital_permissions.catalog', []) as $index => $permission) {
                Permission::query()->updateOrCreate(['key' => $permission['key']], [
                    'module' => $permission['module'],
                    'action' => $permission['action'],
                    'name_ar' => $permission['name_ar'],
                    'name_en' => $permission['name_en'],
                    'is_financial' => $permission['financial'],
                    'sort_order' => $index + 1,
                ]);
            }

            foreach (['cashier', 'inquiry_clerk'] as $role) {
                DB::table('role_permissions')->where('role', $role)->delete();
                foreach ((config('hospital_permissions.role_defaults.'.$role) ?? []) as $key) {
                    DB::table('role_permissions')->insertOrIgnore(['role' => $role, 'permission_key' => $key]);
                }
            }

            // Keep the first desk strictly limited to registration + new visits.
            $cashier = User::withTrashed()->whereRaw('LOWER(username) = ?', ['cashier'])->first();
            if ($cashier) {
                if (method_exists($cashier, 'restore') && $cashier->trashed()) $cashier->restore();
                $cashier->forceFill([
                    'display_name' => 'موظف تسجيل المرضى والزيارات',
                    'role' => 'cashier',
                    'active' => true,
                    'permissions_customized' => false,
                    'deleted_at' => null,
                ])->save();
                if (Schema::hasTable('user_permissions')) DB::table('user_permissions')->where('user_id', $cashier->id)->delete();
            }

            $inquiry = User::withTrashed()->whereRaw('LOWER(username) = ?', ['inquiries'])->first();
            if ($inquiry) {
                if (method_exists($inquiry, 'restore') && $inquiry->trashed()) $inquiry->restore();
                $inquiry->forceFill([
                    'display_name' => 'موظف الاستعلامات',
                    'role' => 'inquiry_clerk',
                    'active' => true,
                    'permissions_customized' => false,
                    'deleted_at' => null,
                ])->save();
            } else {
                $inquiry = new User();
                $inquiry->forceFill([
                    'id' => '00000000-0000-4000-8000-000000000013',
                    'username' => 'inquiries',
                    'display_name' => 'موظف الاستعلامات',
                    'password' => 'Inquiry@2026',
                    'role' => 'inquiry_clerk',
                    'active' => true,
                    'permissions_customized' => false,
                ])->save();
            }
            if (Schema::hasTable('user_permissions')) DB::table('user_permissions')->where('user_id', $inquiry->id)->delete();

            if (Schema::hasTable('cashier_workflow_cases') && Schema::hasTable('patients')) {
                $cases = DB::table('cashier_workflow_cases')->select('id', 'patient_id')->get();
                foreach ($cases as $case) {
                    $patient = DB::table('patients')->where('id', $case->patient_id)->first();
                    if (!$patient) continue;
                    $coverage = null;
                    if (!empty($patient->coverage_entity_id) && Schema::hasTable('sponsors')) {
                        $coverage = DB::table('sponsors')->where('id', $patient->coverage_entity_id)->value('code');
                    }
                    DB::table('cashier_workflow_cases')->where('id', $case->id)->update([
                        'id_number' => $patient->id_number ?? null,
                        'patient_phone' => $patient->phone ?? null,
                        'patient_dob' => $patient->dob ?? null,
                        'patient_gender' => $patient->gender ?? null,
                        'patient_city' => $patient->city ?? null,
                        'patient_area' => $patient->area ?? null,
                        'coverage_entity' => $coverage,
                    ]);
                }
            }

            $this->seedClinicScheduleDoctors();
        });
    }

    private function seedClinicScheduleDoctors(): void
    {
        if (!Schema::hasTable('doctors') || !Schema::hasTable('clinics') || !Schema::hasTable('clinic_doctor')) return;
        if (!Schema::hasColumn('doctors', 'schedule_text')) return;

        $rows = [
            ['name'=>'د. محسن حسان','clinic'=>'neuro','schedule'=>'السبت مساءً، الأحد مساءً، الثلاثاء مساءً، الخميس مساءً · المسائية 14:00–18:00'],
            ['name'=>'د. وائل خليفة','clinic'=>'neuro','schedule'=>'الاثنين مساءً، الأربعاء مساءً · المسائية 14:00–18:00'],
            ['name'=>'د. محمد الكردي','clinic'=>'dental','schedule'=>'السبت صباحاً ومساءً، الاثنين صباحاً ومساءً، الأربعاء صباحاً ومساءً'],
            ['name'=>'د. ناجي الطويل','clinic'=>'dental','schedule'=>'الأحد صباحاً، الثلاثاء صباحاً، الخميس صباحاً · الصباحية 09:00–14:00'],
            ['name'=>'د. مازن القصاص','clinic'=>'ortho','schedule'=>'السبت مساءً، الثلاثاء مساءً، الخميس مساءً · المسائية 14:00–18:00'],
            ['name'=>'د. هاني بسيسو','clinic'=>'ortho','schedule'=>'الاثنين مساءً · المسائية 14:00–18:00'],
            ['name'=>'د. ناصر العطار','clinic'=>'internal','schedule'=>'الأحد مساءً، الاثنين مساءً، الخميس مساءً · المسائية 14:00–18:00'],
            ['name'=>'د. وسيم مهاني','clinic'=>'internal','schedule'=>'السبت صباحاً، الثلاثاء مساءً · صباحي 09:00–14:00 / مسائي 14:00–18:00'],
            ['name'=>'د. سلامة النتر','clinic'=>'endocrine','schedule'=>'السبت مساءً، الاثنين صباحاً، الأربعاء مساءً'],
            ['name'=>'د. عصام الغرابلي','clinic'=>'peds','schedule'=>'السبت إلى الخميس · الفترة المسائية 14:00–18:00 يومياً'],
            ['name'=>'د. عاطف الكحلوت','clinic'=>'urology','schedule'=>'السبت صباحاً، الاثنين صباحاً، الأربعاء صباحاً · ملاحظة: تبدأ عيادة المسالك البولية الساعة 15:00 حسب تعليمات الجدول'],
            ['name'=>'د. سعيد زمو','clinic'=>'urology','schedule'=>'الأحد مساءً، الثلاثاء مساءً، الخميس مساءً · ملاحظة: تبدأ عيادة المسالك البولية الساعة 15:00 حسب تعليمات الجدول'],
            ['name'=>'د. عبد الله الجمل','clinic'=>'psychiatry','schedule'=>'السبت مساءً، الاثنين مساءً، الأربعاء مساءً'],
            ['name'=>'د. تيسير الحجيري','clinic'=>'ultrasound','schedule'=>'السبت صباحاً، الأحد صباحاً، الاثنين صباحاً، الثلاثاء صباحاً، الأربعاء صباحاً'],
            ['name'=>'د. محمد يصل','clinic'=>'ultrasound','schedule'=>'السبت مساءً، الاثنين مساءً، الأربعاء مساءً'],
            ['name'=>'د. إسماعيل عودة','clinic'=>'ultrasound','schedule'=>'الأحد مساءً، الثلاثاء مساءً، الخميس مساءً'],
            ['name'=>'د. أحمد أبو ندى','clinic'=>'vascular','schedule'=>'السبت مساءً، الثلاثاء مساءً، الخميس مساءً · تبدأ عيادة الأوعية الدموية الساعة 15:00'],
            ['name'=>'د. أحمد أبو القمز','clinic'=>'surgery','schedule'=>'الاثنين مساءً، الخميس مساءً'],
            ['name'=>'د. عبد نصر داود','clinic'=>'surgery','schedule'=>'السبت مساءً، الأربعاء مساءً'],
            ['name'=>'د. ناصر أبو شعبان','clinic'=>'surgery','schedule'=>'الأحد مساءً'],
            ['name'=>'د. أيمن البدري','clinic'=>'rehab','schedule'=>'السبت مساءً، الاثنين مساءً، الأربعاء مساءً · الروماتزم والتأهيل'],
            ['name'=>'د. لؤي المصري','clinic'=>'audiology','schedule'=>'السبت إلى الخميس · صباحي 09:00–14:00 ومسائي 14:00–18:00 يومياً'],
            ['name'=>'د. بلال ديور','clinic'=>'nerve_emg','schedule'=>'الأحد، الثلاثاء، الخميس · تخطيط العصب بالحجز المسبق'],
        ];

        $clinicIds = DB::table('clinics')->pluck('id', 'key');
        foreach ($rows as $index => $row) {
            $clinicId = $clinicIds[$row['clinic']] ?? null;
            if (!$clinicId) continue;

            $doctor = DB::table('doctors')->where('name', $row['name'])->first();
            if ($doctor) {
                DB::table('doctors')->where('id', $doctor->id)->update([
                    'schedule_text' => $row['schedule'],
                    'active' => true,
                    'updated_at' => now(),
                ]);
                DB::table('clinic_doctor')->insertOrIgnore([
                    'clinic_id' => $clinicId,
                    'doctor_id' => $doctor->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                if ($row['name'] === 'د. أيمن البدري' && isset($clinicIds['nerve_emg'])) {
                    DB::table('clinic_doctor')->insertOrIgnore([
                        'clinic_id' => $clinicIds['nerve_emg'], 'doctor_id' => $doctor->id,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
                continue;
            }

            $serial = str_pad((string)($index + 1), 3, '0', STR_PAD_LEFT);
            $userId = sprintf('30000000-0000-4000-8000-%012d', $index + 1);
            $doctorId = sprintf('40000000-0000-4000-8000-%012d', $index + 1);
            $username = 'schedule.doctor.'.$serial;

            DB::table('users')->updateOrInsert(['id' => $userId], [
                'username' => $username,
                'display_name' => $row['name'],
                'password' => Hash::make('ScheduleOnly@2026-'.$serial),
                'role' => 'doctor',
                'active' => false,
                'permissions_customized' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('doctors')->insert([
                'id' => $doctorId,
                'user_id' => $userId,
                'staff_id' => 'SCH-'.$serial,
                'name' => $row['name'],
                'phone' => null,
                'specialty' => null,
                'schedule_text' => $row['schedule'],
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('clinic_doctor')->insertOrIgnore([
                'clinic_id' => $clinicId,
                'doctor_id' => $doctorId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if ($row['name'] === 'د. أيمن البدري' && isset($clinicIds['nerve_emg'])) {
                DB::table('clinic_doctor')->insertOrIgnore([
                    'clinic_id' => $clinicIds['nerve_emg'], 'doctor_id' => $doctorId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Keep hospital data intact when rolling back this compatibility migration.
    }
};
