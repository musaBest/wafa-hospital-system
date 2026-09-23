<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $softDeleteTables = [
        'sponsors','visits','queue_items','invoices','admissions','admission_requests',
        'lab_orders','radiology_orders','findings','doctor_notes','inpatient_notes',
        'inpatient_reports','inpatient_transactions','wallet_transactions','follow_up_appointments',
    ];

    public function up(): void
    {
        foreach ($this->softDeleteTables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }

        if (Schema::hasTable('system_notifications')) {
            if (!Schema::hasColumn('system_notifications', 'module')) {
                Schema::table('system_notifications', function (Blueprint $table) {
                    $table->string('module', 120)->nullable()->index()->after('permission_key');
                });
            }
            if (!Schema::hasColumn('system_notifications', 'muted_by')) {
                Schema::table('system_notifications', function (Blueprint $table) {
                    $table->json('muted_by')->nullable()->after('read_at');
                });
            }
        }

        if (Schema::hasTable('permissions')) {
            foreach ([
                ['key'=>'patients.global_search','module'=>'patients','action'=>'view','name_ar'=>'بحث عام عن المرضى حسب الصلاحيات','name_en'=>'Global patient search by allowed scope','is_financial'=>false,'sort_order'=>95],
            ] as $permission) {
                DB::table('permissions')->updateOrInsert(['key'=>$permission['key']], $permission);
                DB::table('role_permissions')->updateOrInsert(['role'=>'treasurer','permission_key'=>$permission['key']], []);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('system_notifications')) {
            if (Schema::hasColumn('system_notifications','muted_by')) Schema::table('system_notifications', fn(Blueprint $table) => $table->dropColumn('muted_by'));
            if (Schema::hasColumn('system_notifications','module')) Schema::table('system_notifications', fn(Blueprint $table) => $table->dropColumn('module'));
        }
        foreach (array_reverse($this->softDeleteTables) as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, fn(Blueprint $table) => $table->dropSoftDeletes());
            }
        }
        if (Schema::hasTable('permissions')) DB::table('permissions')->where('key','patients.global_search')->delete();
    }
};
