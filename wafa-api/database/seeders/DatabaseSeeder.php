<?php

namespace Database\Seeders;

use App\Models\{Clinic,DiagnosticService,Doctor,Invoice,Patient,PatientSequence,Permission,Sponsor,User,WalletTransaction};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $users=[
                ['id'=>'00000000-0000-4000-8000-000000000001','username'=>'Dr.Fouad_Najm','display_name'=>'Dr. Fouad Najm','password'=>'Admin@2026','role'=>'admin'],
                ['id'=>'00000000-0000-4000-8000-000000000002','username'=>'cashier','display_name'=>'موظف تسجيل المرضى والزيارات','password'=>'Cashier@2026','role'=>'cashier'],
                ['id'=>'00000000-0000-4000-8000-000000000014','username'=>'operations','display_name'=>'موظف العمليات','password'=>'Operations@2026','role'=>'operations_clerk'],
                ['id'=>'00000000-0000-4000-8000-000000000015','username'=>'archive','display_name'=>'موظف الأرشيف','password'=>'Archive@2026','role'=>'archive_clerk'],
                ['id'=>'00000000-0000-4000-8000-000000000013','username'=>'inquiries','display_name'=>'موظف الاستعلامات','password'=>'Inquiry@2026','role'=>'inquiry_clerk'],
                ['id'=>'00000000-0000-4000-8000-000000000003','username'=>'Eng.Ahmed_Jaber','display_name'=>'Eng. Ahmed Jaber','password'=>'IT@2026','role'=>'it_head'],
                ['id'=>'00000000-0000-4000-8000-000000000004','username'=>'Eng.Mohammed_Moqbil','display_name'=>'Eng. Mohammed Moqbil','password'=>'Treasury@2026','role'=>'treasurer'],
                ['id'=>'00000000-0000-4000-8000-000000000005','username'=>'laboratory','display_name'=>'Laboratory Technician','password'=>'Lab@2026','role'=>'lab_technician'],
                ['id'=>'00000000-0000-4000-8000-000000000006','username'=>'inpatient','display_name'=>'مسؤول المبيت','password'=>'Inpatient@2026','role'=>'inpatient_manager'],
                ['id'=>'00000000-0000-4000-8000-000000000007','username'=>'moh','display_name'=>'بوابة وزارة الصحة','password'=>'MOH@2026','role'=>'moh_user'],
                ['id'=>'00000000-0000-4000-8000-000000000008','username'=>'social.service','display_name'=>'الخدمة الاجتماعية والنفسية','password'=>'Social@2026','role'=>'social_worker'],
                ['id'=>'00000000-0000-4000-8000-000000000009','username'=>'physical.therapy.head','display_name'=>'رئيس قسم العلاج الطبيعي','password'=>'PTHead@2026','role'=>'pt_head'],
                ['id'=>'00000000-0000-4000-8000-000000000010','username'=>'payment.audit','display_name'=>'موظف التطبيق والتحصيل البنكي والتدقيق','password'=>'Payment@2026','role'=>'payment_auditor'],
                ['id'=>'00000000-0000-4000-8000-000000000011','username'=>'financial.collector','display_name'=>'المحصل المالي','password'=>'Collector@2026','role'=>'financial_collector'],
                ['id'=>'00000000-0000-4000-8000-000000000012','username'=>'mohammed.shukri','display_name'=>'أ. محمد الشكري - المدقق المالي','password'=>'Audit@2026','role'=>'financial_auditor'],
                ['id'=>'00000000-0000-4000-8000-000000000024','username'=>'elderly.care','display_name'=>'مسؤول قسم المسنين والمسنات','password'=>'Elderly@2026','role'=>'elderly_care_manager'],
            ];
            foreach($users as $row){
                // v4.3.19: keep built-in access accounts recoverable on every upgrade.
                // This updates only login-critical fields and does not erase customized permissions.
                $existing = User::withTrashed()->whereRaw('LOWER(username) = ?', [mb_strtolower($row['username'])])->first();
                if ($existing) {
                    if (method_exists($existing, 'restore') && $existing->trashed()) $existing->restore();
                    $existing->forceFill([
                        'password' => $row['password'],
                        'active' => true,
                        'deleted_at' => null,
                    ])->save();
                    continue;
                }
                User::create($row+['active'=>true,'permissions_customized'=>false]);
            }

            $catalog = config('hospital_permissions.catalog');
            foreach ($catalog as $index => $permission) {
                Permission::updateOrCreate(['key' => $permission['key']], [
                    'module' => $permission['module'],
                    'action' => $permission['action'],
                    'name_ar' => $permission['name_ar'],
                    'name_en' => $permission['name_en'],
                    'is_financial' => $permission['financial'],
                    'sort_order' => $index + 1,
                ]);
            }
            DB::table('role_permissions')->delete();
            $allPermissionKeys = collect($catalog)->pluck('key')->all();
            foreach (config('hospital_permissions.role_defaults') as $role => $keys) {
                $resolvedKeys = $keys === ['*']
                    ? $allPermissionKeys
                    : ($keys === ['@nonfinancial'] ? collect($catalog)->where('financial', false)->pluck('key')->all() : $keys);
                foreach ($resolvedKeys as $key) {
                    DB::table('role_permissions')->insert(['role' => $role, 'permission_key' => $key]);
                }
            }

            $sponsors=[
                ['id'=>'10000000-0000-4000-8000-000000000001','code'=>'moh','name_ar'=>'وزارة الصحة','name_en'=>'Ministry of Health'],
                ['id'=>'10000000-0000-4000-8000-000000000002','code'=>'unrwa','name_ar'=>'وكالة الغوث (الأونروا)','name_en'=>'UNRWA'],
                ['id'=>'10000000-0000-4000-8000-000000000003','code'=>'private','name_ar'=>'تأمين خاص','name_en'=>'Private insurance'],
                ['id'=>'10000000-0000-4000-8000-000000000004','code'=>'self','name_ar'=>'مساهمة ذاتية / حالة إنسانية','name_en'=>'Self-funded / humanitarian'],
                ['id'=>'10000000-0000-4000-8000-000000000005','code'=>'charity','name_ar'=>'جمعيات خيرية','name_en'=>'Charitable organizations'],
            ];
            foreach($sponsors as $row)Sponsor::updateOrCreate(['code'=>$row['code']],$row+['active'=>true]);

            $clinics=[
                ['general','العيادة العامة','General clinic',15],['ortho','عيادة العظام','Orthopedics',25],['neuro','المخ والأعصاب','Neurology',30],['dental','عيادة الأسنان','Dental clinic',20],['pt','العلاج الطبيعي','Physical therapy',18],['eye','عيادة العيون','Ophthalmology',22],['derma','الجلدية','Dermatology',20],['ent','أنف وأذن وحنجرة','ENT',20],['peds','عيادة الأطفال','Pediatrics',15],['internal','الباطنة','Internal medicine',20],['cardio','القلبية','Cardiology',30],['obgyn','النسائية والتوليد','Obstetrics & gynecology',25],['surgery','الجراحة العامة','General surgery',30],['rehab','التأهيل الطبي','Medical rehabilitation',18],
            ];
            foreach($clinics as $i=>$row)Clinic::updateOrCreate(['key'=>$row[0]],[
                'id'=>sprintf('20000000-0000-4000-8000-%012d',$i+1),
                'name_ar'=>$row[1],'name_en'=>$row[2],'visit_fee'=>$row[3],
                'kind'=>'outpatient','daily_rate'=>0,'active'=>true
            ]);
            Clinic::updateOrCreate(['key'=>'inpatient'],[
                'id'=>'20000000-0000-4000-8000-000000000099',
                'name_ar'=>'قسم المبيت الداخلي','name_en'=>'Inpatient Department',
                'visit_fee'=>0,'kind'=>'inpatient','daily_rate'=>120,'active'=>true
            ]);

            // v4.3.75: Dental clinic is a special module with its own doctors and permissions.
            $dentalClinic = Clinic::withTrashed()->where('key','dental')->first();
            if ($dentalClinic) {
                if (method_exists($dentalClinic, 'restore') && $dentalClinic->trashed()) $dentalClinic->restore();
                $dentalClinic->forceFill(['code'=>'DEN','active'=>true,'deleted_at'=>null])->save();

                $dentalDoctors = [
                    ['user_id'=>'00000000-0000-4000-8000-000000000021','doctor_id'=>'21000000-0000-4000-8000-000000000001','username'=>'Dr.Naji_AlTaweel','name'=>'د. ناجي الطويل','schedule'=>'طبيب أسنان دائم في المستشفى'],
                    ['user_id'=>'00000000-0000-4000-8000-000000000022','doctor_id'=>'21000000-0000-4000-8000-000000000002','username'=>'Dr.Mohammed_AlKurdi','name'=>'د. محمد الكردي','schedule'=>'عيادة الأسنان حسب جدول المستشفى'],
                    ['user_id'=>'00000000-0000-4000-8000-000000000023','doctor_id'=>'21000000-0000-4000-8000-000000000003','username'=>'Dr.Mohammed_Shamieh','name'=>'د. محمد شامية','schedule'=>'عيادة الأسنان حسب جدول المستشفى'],
                ];
                $dentalDoctorPermissions = ['doctor_portal.view','doctor_portal.update','queue.update','diagnostics.view','diagnostics.create','diagnostics.update','dental.view','dental.update'];
                foreach ($dentalDoctors as $row) {
                    $user = User::withTrashed()->whereRaw('LOWER(username) = ?', [mb_strtolower($row['username'])])->first() ?: User::withTrashed()->find($row['user_id']);
                    if ($user) {
                        if (method_exists($user, 'restore') && $user->trashed()) $user->restore();
                        $user->forceFill(['username'=>$row['username'],'display_name'=>$row['name'],'password'=>'Dental@2026','role'=>'doctor','active'=>true,'permissions_customized'=>true,'deleted_at'=>null])->save();
                    } else {
                        $user = User::create(['id'=>$row['user_id'],'username'=>$row['username'],'display_name'=>$row['name'],'password'=>'Dental@2026','role'=>'doctor','active'=>true,'permissions_customized'=>true]);
                    }
                    $doctor = Doctor::withTrashed()->where('staff_id',$row['username'])->first() ?: Doctor::withTrashed()->find($row['doctor_id']);
                    if ($doctor) {
                        if (method_exists($doctor, 'restore') && $doctor->trashed()) $doctor->restore();
                        $doctor->forceFill(['user_id'=>$user->id,'staff_id'=>$row['username'],'name'=>$row['name'],'phone'=>'','specialty'=>'طب الأسنان','schedule_text'=>$row['schedule'],'active'=>true,'deleted_at'=>null])->save();
                    } else {
                        $doctor = Doctor::create(['id'=>$row['doctor_id'],'user_id'=>$user->id,'staff_id'=>$row['username'],'name'=>$row['name'],'phone'=>'','specialty'=>'طب الأسنان','schedule_text'=>$row['schedule'],'active'=>true]);
                    }
                    $doctor->clinics()->syncWithoutDetaching([$dentalClinic->id]);
                    DB::table('user_permissions')->where('user_id',$user->id)->delete();
                    foreach ($dentalDoctorPermissions as $key) DB::table('user_permissions')->insertOrIgnore(['user_id'=>$user->id,'permission_key'=>$key]);
                }
            }

            $diagnostics = [
                ['lab','تحليل الكيمياء السريرية','Clinical Chemistry','clinicalChemistry',35,[['test'=>'F.B.S','reference_range'=>'70 - 110 mg/dL'],['test'=>'Urea','reference_range'=>'10 - 45 mg/dL'],['test'=>'Creatinine','reference_range'=>'0.6 - 1.2 mg/dL']]],
                ['lab','فحص تعداد الدم الكامل','Complete Blood Count','hematology',30,[['test'=>'WBC','reference_range'=>'4 - 11 x10³/µL'],['test'=>'Hemoglobin','reference_range'=>'12 - 17 g/dL'],['test'=>'Platelets','reference_range'=>'150 - 450 x10³/µL']]],
                ['lab','فحص وظائف الغدة الدرقية','Thyroid Function Test','endocrinology',45,[['test'=>'Free T4','reference_range'=>'0.8 - 1.8 ng/dL'],['test'=>'T.S.H','reference_range'=>'0.5 - 5.0 µIU/mL']]],
                ['lab','زراعة وحساسية','Culture & Sensitivity','microbiology',55,[['test'=>'Organism','reference_range'=>'No growth'],['test'=>'Culture','reference_range'=>'Negative']]],
                ['lab','تحليل البول','Urinalysis','urinalysis',20,[['test'=>'Color','reference_range'=>'Yellow'],['test'=>'Protein','reference_range'=>'Negative'],['test'=>'Glucose','reference_range'=>'Negative']]],
                ['radiology','صورة أشعة سينية','X-Ray','xray',50,[]],
                ['radiology','تصوير بالموجات فوق الصوتية','Ultrasound','ultrasound',80,[]],
                ['radiology','تصوير طبقي محوري','CT Scan','ct',220,[]],
            ];
            foreach ($diagnostics as $index => $row) {
                // Seed the built-in catalog only when a row truly does not exist. Never overwrite
                // names/prices/test rows edited from the diagnostic catalog, and do not resurrect
                // a built-in service that an authorized user intentionally archived/deleted.
                DiagnosticService::withTrashed()->firstOrCreate(
                    ['id'=>sprintf('30000000-0000-4000-8000-%012d',$index+1)],
                    ['type'=>$row[0],'name_ar'=>$row[1],'name_en'=>$row[2],'category'=>$row[3],'price'=>$row[4],'tests'=>$row[5],'active'=>true,'created_by'=>'00000000-0000-4000-8000-000000000004']
                );
            }

            $sequenceYear=(int)date('Y');
            $sequence=PatientSequence::firstOrCreate(['year'=>$sequenceYear],['last_number'=>0,'male_last_number'=>0,'female_last_number'=>0]);
            $patient=Patient::updateOrCreate(['id_number'=>'402918374'],['id'=>'40000000-0000-4000-8000-000000000001','medical_serial'=>'1'.date('Y').'0001','full_name'=>'محمد أحمد أبو حسن','dob'=>'1994-05-12','gender'=>'male','phone'=>'0599123456','city'=>'gaza','area'=>'الرمال','coverage_entity_id'=>'10000000-0000-4000-8000-000000000004','registered_at'=>today(),'wallet_balance'=>100,'civil_registry_verified_at'=>now()]);
            Patient::updateOrCreate(['id_number'=>'409218375'],['id'=>'40000000-0000-4000-8000-000000000002','medical_serial'=>'2'.date('Y').'0001','full_name'=>'سارة محمود النجار','dob'=>'2001-09-21','gender'=>'female','phone'=>'0568123456','city'=>'gaza','area'=>'النصر','coverage_entity_id'=>'10000000-0000-4000-8000-000000000002','registered_at'=>today(),'wallet_balance'=>0,'civil_registry_verified_at'=>now()]);
            $sequence->forceFill([
                'male_last_number'=>max((int)($sequence->male_last_number ?? 0),1),
                'female_last_number'=>max((int)($sequence->female_last_number ?? 0),1),
                'last_number'=>max((int)$sequence->last_number,1),
            ])->save();
            $invoice=Invoice::updateOrCreate(['receipt_number'=>'RCP-'.date('Y').'-00001'],['id'=>'50000000-0000-4000-8000-000000000001','patient_id'=>$patient->id,'service'=>'إيداع رصيد افتتاحي','unit_price'=>100,'coverage_ratio'=>0,'payable_amount'=>100,'payment_method'=>'cash','issued_at'=>now(),'created_by'=>'00000000-0000-4000-8000-000000000002']);
            WalletTransaction::updateOrCreate(['receipt_number'=>$invoice->receipt_number],['id'=>'60000000-0000-4000-8000-000000000001','patient_id'=>$patient->id,'type'=>'credit','occurred_at'=>$invoice->issued_at,'service'=>$invoice->service,'amount'=>100,'method'=>'cash','reference_type'=>'invoice','reference_id'=>$invoice->id]);
        });
    }
}
