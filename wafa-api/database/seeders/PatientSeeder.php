<?php

namespace Database\Seeders;

use App\Models\Patient;
use App\Models\Notification;
use Illuminate\Database\Seeder;

class PatientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $patients = [
            [
                'patient_id' => '20170062',
                'admission_year' => 2017,
                'national_id' => '902263925',
                'first_name' => 'ندى',
                'father_name' => 'مروان',
                'grandfather_name' => 'بدر',
                'family_name' => 'ابو حماش',
                'gender' => 'female',
                'birth_date' => '1996-12-22',
                'marital_status' => 'single',
                'refugee_status' => 'refugee',
                'ration_card_no' => 'RC-992384',
                'occupation' => 'طالبة جامعية',
                'region' => 'رفح',
                'city_or_area' => 'حي تل السلطان',
                'phone' => '0599882994',
                'blood_type' => 'A+',
                'allergies' => 'حساسية البنسلين (Penicillin Allergy)',
                'notes' => 'متابعة عيادة المسالك وديناميكية التبول',
            ],
            [
                'patient_id' => '20260999',
                'admission_year' => 2026,
                'national_id' => '800414070',
                'first_name' => 'ادهم',
                'father_name' => 'ماهر',
                'grandfather_name' => 'مطر',
                'family_name' => 'ابولبده',
                'gender' => 'male',
                'birth_date' => '1984-12-21',
                'marital_status' => 'married',
                'refugee_status' => 'refugee',
                'ration_card_no' => 'RC-881204',
                'occupation' => 'أعمال حرة',
                'region' => 'غزة',
                'city_or_area' => 'حي السرايا',
                'phone' => '0595435555',
                'blood_type' => 'O+',
                'allergies' => 'لا توجد حساسية معروفة',
                'notes' => 'neck pain radiate to both uls - متابعة علاج طبيعي مكثف',
            ],
            [
                'patient_id' => '19710001',
                'admission_year' => 1971,
                'national_id' => '951902148',
                'first_name' => 'صفاء',
                'father_name' => 'علي',
                'grandfather_name' => 'عبد الرحمن',
                'family_name' => 'ابو ليله',
                'gender' => 'female',
                'birth_date' => '1971-04-15',
                'marital_status' => 'married',
                'refugee_status' => 'citizen',
                'ration_card_no' => null,
                'occupation' => 'ربة منزل',
                'region' => 'غزة',
                'city_or_area' => 'حي الرمال الجنوبي',
                'phone' => '0598119960',
                'blood_type' => 'B+',
                'allergies' => 'حساسية من أدوية السلفا (Sulfa Drugs)',
                'notes' => 'جلسات علاج بالأكسجين المضغوط وعيادة الأسنان',
            ],
            [
                'patient_id' => '20260202',
                'admission_year' => 2026,
                'national_id' => '922505193',
                'first_name' => 'عايشة',
                'father_name' => 'عبدالرحمن',
                'grandfather_name' => 'مصطفى',
                'family_name' => 'حسونة',
                'gender' => 'female',
                'birth_date' => '1968-08-10',
                'marital_status' => 'married',
                'refugee_status' => 'refugee',
                'ration_card_no' => 'RC-772910',
                'occupation' => 'ربة منزل',
                'region' => 'غزة',
                'city_or_area' => 'مخيم الشاطئ',
                'phone' => '0599810785',
                'blood_type' => 'AB+',
                'allergies' => 'حساسية من مضادات الالتهاب غير الستيرويدية (NSAIDs)',
                'notes' => 'تغطية وزارة الصحة - تأهيل ما بعد جلطة دماغية',
            ],
            [
                'patient_id' => '20180002',
                'admission_year' => 2018,
                'national_id' => '972395750',
                'first_name' => 'رسميه',
                'father_name' => 'حسن',
                'grandfather_name' => 'إبراهيم',
                'family_name' => 'طافش',
                'gender' => 'female',
                'birth_date' => '1952-03-01',
                'marital_status' => 'divorced',
                'refugee_status' => 'refugee',
                'ration_card_no' => 'RC-552194',
                'occupation' => 'متقاعدة',
                'region' => 'الوسطى',
                'city_or_area' => 'مخيم النصيرات - أرض الحساينة',
                'phone' => '0599255286',
                'blood_type' => 'O-',
                'allergies' => 'حساسية من صبغات الأشعة اليودية (Iodine Contrast)',
                'notes' => 'متابعة قسم الأشعة HIP JOINT AP LAT',
            ],
            [
                'patient_id' => '20260005',
                'admission_year' => 2026,
                'national_id' => '940602411',
                'first_name' => 'جميل',
                'father_name' => 'كامل',
                'grandfather_name' => 'عبد الله',
                'family_name' => 'راجح',
                'gender' => 'male',
                'birth_date' => '1964-07-14',
                'marital_status' => 'married',
                'refugee_status' => 'refugee',
                'ration_card_no' => 'RC-661840',
                'occupation' => 'مريض بدون عمل',
                'region' => 'غزة',
                'city_or_area' => 'حي التفاح - الشعف',
                'phone' => '0599406024',
                'blood_type' => 'A-',
                'allergies' => 'لا توجد',
                'notes' => 'ملف الخدمة الاجتماعية - مساهمات الأجهزة والأدوات الطبية',
            ],
            [
                'patient_id' => '20260006',
                'admission_year' => 2026,
                'national_id' => '400512891',
                'first_name' => 'محمود',
                'father_name' => 'أحمد',
                'grandfather_name' => 'خليل',
                'family_name' => 'الداعور',
                'gender' => 'male',
                'birth_date' => '1990-11-05',
                'marital_status' => 'married',
                'refugee_status' => 'citizen',
                'ration_card_no' => null,
                'occupation' => 'مهندس',
                'region' => 'الشمال',
                'city_or_area' => 'بيت لاهيا',
                'phone' => '0597112233',
                'blood_type' => 'B-',
                'allergies' => 'حساسية الأسبرين',
                'notes' => 'متابعة العيادات الخارجية والتصوير التلفزيوني',
            ],
            [
                'patient_id' => '20260007',
                'admission_year' => 2026,
                'national_id' => '402891102',
                'first_name' => 'ياسمين',
                'father_name' => 'سامي',
                'grandfather_name' => 'فؤاد',
                'family_name' => 'البردويل',
                'gender' => 'female',
                'birth_date' => '2001-05-18',
                'marital_status' => 'single',
                'refugee_status' => 'refugee',
                'ration_card_no' => 'RC-998811',
                'occupation' => 'معلمة',
                'region' => 'خانيونس',
                'city_or_area' => 'حي الأمل',
                'phone' => '0598554433',
                'blood_type' => 'O+',
                'allergies' => null,
                'notes' => 'جلسات علاج طبيعي وتأهيل عمود فقري',
            ],
        ];

        foreach ($patients as $data) {
            Patient::updateOrCreate(
                ['patient_id' => $data['patient_id']],
                $data
            );
        }

        // Seed initial hospital notifications
        Notification::updateOrCreate(
            ['title' => 'جاهزية تقرير ديناميكية التبول'],
            [
                'target_role' => 'doctor',
                'type' => 'lab_results_ready',
                'title' => 'جاهزية تقرير ديناميكية التبول',
                'message' => 'تم استكمال الفحص الطبي والتقرير لديناميكية التبول للمريضة ندى ابو حماش (20170062)',
                'action_url' => '/patients/1',
                'priority' => 'normal',
                'is_read' => false,
            ]
        );

        Notification::updateOrCreate(
            ['title' => 'تنبيه انتهاء تغطية تحويلة'],
            [
                'target_role' => 'accountant',
                'type' => 'coverage_expiring',
                'title' => 'تنبيه انتهاء تغطية تحويلة',
                'message' => 'تغطية وزارة الصحة للمريضة عايشة حسونة (20260202) توشك على الانتهاء خلال 3 أيام',
                'action_url' => '/patients/4',
                'priority' => 'high',
                'is_read' => false,
            ]
        );
    }
}
