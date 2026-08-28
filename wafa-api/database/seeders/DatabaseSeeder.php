<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('password123');

        // 1. IT Admin (Ahmed, IT / Super Admin)
        User::updateOrCreate(
            ['email' => 'admin@wafa.hospital'],
            [
                'name' => 'أحمد المهندس (مدير تكنولوجيا المعلومات)',
                'role' => 'it_admin',
                'department' => 'قسم الحاسوب وتكنولوجيا المعلومات',
                'employee_id' => 'EMP-IT-01',
                'phone' => '0599000001',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 2. Management Admin
        User::updateOrCreate(
            ['email' => 'management@wafa.hospital'],
            [
                'name' => 'أ. سامي الإداري (إدارة المستشفى)',
                'role' => 'management_admin',
                'department' => 'الشؤون الإدارية والتنفيذية',
                'employee_id' => 'EMP-MGT-02',
                'phone' => '0599000002',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 3. Financial Accountant
        User::updateOrCreate(
            ['email' => 'accountant@wafa.hospital'],
            [
                'name' => 'أ. هاني المحاسب (رئيس الحسابات والقبض)',
                'role' => 'accountant',
                'department' => 'الدائرة المالية والصندوق',
                'employee_id' => 'EMP-ACC-03',
                'phone' => '0599000003',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 4. Treating Physician (Doctor)
        User::updateOrCreate(
            ['email' => 'doctor.kamal@wafa.hospital'],
            [
                'name' => 'د. كمال النملة (استشاري تأهيل طبي وجراحة)',
                'role' => 'doctor',
                'department' => 'العيادات الخارجية والتأهيل',
                'employee_id' => 'EMP-DOC-04',
                'phone' => '0599000004',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 5. Registration & Reception Clerk
        User::updateOrCreate(
            ['email' => 'registration@wafa.hospital'],
            [
                'name' => 'أ. مريم الاستقبال (موظفة التسجيل وفتح الملفات)',
                'role' => 'registration_clerk',
                'department' => 'السكرتاريا الطبية والاستقبال',
                'employee_id' => 'EMP-REC-05',
                'phone' => '0599000005',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 6. Data Lookup Clerk (Read-only search & inquiry)
        User::updateOrCreate(
            ['email' => 'lookup@wafa.hospital'],
            [
                'name' => 'أ. طارق الاستعلامات (موظف البحث والاستعلام)',
                'role' => 'data_lookup_clerk',
                'department' => 'قسم الاستعلامات والإحصاء',
                'employee_id' => 'EMP-INQ-06',
                'phone' => '0599000006',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 7. Lab Technician
        User::updateOrCreate(
            ['email' => 'lab@wafa.hospital'],
            [
                'name' => 'أ. رمزي المختبر (فني تحاليل طبية)',
                'role' => 'lab_technician',
                'department' => 'المختبرات والتحاليل الطبية',
                'employee_id' => 'EMP-LAB-07',
                'phone' => '0599000007',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 8. PT Specialist
        User::updateOrCreate(
            ['email' => 'pt@wafa.hospital'],
            [
                'name' => 'أ. يوسف العلاج الطبيعي (أخصائي تأهيل حركي)',
                'role' => 'pt_specialist',
                'department' => 'قسم العلاج الطبيعي والتأهيل',
                'employee_id' => 'EMP-PT-08',
                'phone' => '0599000008',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 9. Radiologist
        User::updateOrCreate(
            ['email' => 'radiology@wafa.hospital'],
            [
                'name' => 'أ. وسيم الأشعة (فني تصوير تشخيصي)',
                'role' => 'radiologist',
                'department' => 'قسم الأشعة والتصوير الطبي',
                'employee_id' => 'EMP-RAD-09',
                'phone' => '0599000009',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // 10. Social Worker
        User::updateOrCreate(
            ['email' => 'social@wafa.hospital'],
            [
                'name' => 'أ. فاطمة الخدمة الاجتماعية (أخصائية اجتماعية)',
                'role' => 'social_worker',
                'department' => 'قسم الخدمة الاجتماعية والمساعدات',
                'employee_id' => 'EMP-SOC-10',
                'phone' => '0599000010',
                'is_active' => true,
                'password' => $password,
            ]
        );

        // Run Patients and Transfers Seeders
        $this->call([
            PatientSeeder::class,
            TransferSeeder::class,
        ]);
    }
}
