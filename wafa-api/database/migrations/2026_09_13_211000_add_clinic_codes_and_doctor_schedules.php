<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('clinics') && !Schema::hasColumn('clinics', 'code')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->string('code', 12)->nullable()->after('key');
            });
        }
        if (Schema::hasTable('doctors') && !Schema::hasColumn('doctors', 'schedule_text')) {
            Schema::table('doctors', function (Blueprint $table) {
                $table->text('schedule_text')->nullable()->after('specialty');
            });
        }

        if (!Schema::hasTable('clinics')) return;

        $clinics = [
            ['key'=>'general','code'=>'GEN','name_ar'=>'العيادة العامة','name_en'=>'General clinic','fee'=>15],
            ['key'=>'ortho','code'=>'ORT','name_ar'=>'جراحة العظام','name_en'=>'Orthopedics','fee'=>25],
            ['key'=>'neuro','code'=>'NEU','name_ar'=>'المخ والأعصاب','name_en'=>'Neurology','fee'=>30],
            ['key'=>'dental','code'=>'DEN','name_ar'=>'عيادة الأسنان','name_en'=>'Dental clinic','fee'=>20],
            ['key'=>'pt','code'=>'PTH','name_ar'=>'العلاج الطبيعي','name_en'=>'Physical therapy','fee'=>18],
            ['key'=>'eye','code'=>'EYE','name_ar'=>'عيادة العيون','name_en'=>'Ophthalmology','fee'=>22],
            ['key'=>'derma','code'=>'DRM','name_ar'=>'الجلدية','name_en'=>'Dermatology','fee'=>20],
            ['key'=>'ent','code'=>'ENT','name_ar'=>'أنف وأذن وحنجرة','name_en'=>'ENT','fee'=>20],
            ['key'=>'peds','code'=>'PED','name_ar'=>'طب الأطفال','name_en'=>'Pediatrics','fee'=>15],
            ['key'=>'internal','code'=>'INT','name_ar'=>'الباطنة','name_en'=>'Internal medicine','fee'=>20],
            ['key'=>'cardio','code'=>'CAR','name_ar'=>'القلبية','name_en'=>'Cardiology','fee'=>30],
            ['key'=>'obgyn','code'=>'OBG','name_ar'=>'النسائية والتوليد','name_en'=>'Obstetrics & gynecology','fee'=>25],
            ['key'=>'surgery','code'=>'SUR','name_ar'=>'الجراحة العامة والمناظير','name_en'=>'General surgery & endoscopy','fee'=>30],
            ['key'=>'rehab','code'=>'REH','name_ar'=>'الروماتيزم والتأهيل','name_en'=>'Rheumatology & rehabilitation','fee'=>18],
            ['key'=>'endocrine','code'=>'END','name_ar'=>'الغدد والسكري','name_en'=>'Endocrinology & diabetes','fee'=>20],
            ['key'=>'urology','code'=>'URO','name_ar'=>'جراحة المسالك البولية','name_en'=>'Urology','fee'=>25],
            ['key'=>'psychiatry','code'=>'PSY','name_ar'=>'الطب النفسي','name_en'=>'Psychiatry','fee'=>20],
            ['key'=>'ultrasound','code'=>'USG','name_ar'=>'التصوير التلفزيوني','name_en'=>'Ultrasound imaging','fee'=>35],
            ['key'=>'vascular','code'=>'VAS','name_ar'=>'جراحة الأوعية الدموية','name_en'=>'Vascular surgery','fee'=>30],
            ['key'=>'audiology','code'=>'AUD','name_ar'=>'السمعيات','name_en'=>'Audiology','fee'=>20],
            ['key'=>'nerve_emg','code'=>'EMG','name_ar'=>'تخطيط العصب','name_en'=>'Nerve conduction / EMG','fee'=>30],
        ];

        foreach ($clinics as $index => $row) {
            $existing = DB::table('clinics')->where('key', $row['key'])->first();
            if ($existing) {
                DB::table('clinics')->where('key', $row['key'])->update([
                    'code' => $row['code'],
                    'name_ar' => $row['name_ar'],
                    'name_en' => $row['name_en'],
                    'active' => true,
                    'updated_at' => now(),
                ]);
                continue;
            }
            DB::table('clinics')->insert([
                'id' => sprintf('20000000-0000-4000-8000-%012d', $index + 1),
                'key' => $row['key'],
                'code' => $row['code'],
                'name_ar' => $row['name_ar'],
                'name_en' => $row['name_en'],
                'visit_fee' => $row['fee'],
                'kind' => 'outpatient',
                'daily_rate' => 0,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('clinics')->where('key', 'inpatient')->update(['code'=>'INP','updated_at'=>now()]);
    }

    public function down(): void
    {
        if (Schema::hasTable('doctors') && Schema::hasColumn('doctors', 'schedule_text')) {
            Schema::table('doctors', fn (Blueprint $table) => $table->dropColumn('schedule_text'));
        }
        if (Schema::hasTable('clinics') && Schema::hasColumn('clinics', 'code')) {
            Schema::table('clinics', fn (Blueprint $table) => $table->dropColumn('code'));
        }
    }
};
