<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('outpatient_pt_cases') && !Schema::hasColumn('outpatient_pt_cases', 'coverage_covers_cost')) {
            Schema::table('outpatient_pt_cases', function (Blueprint $table) {
                $table->boolean('coverage_covers_cost')->default(false)->after('treating_doctor');
            });
        }

        $permissions = [
            'outpatient_pt.view','outpatient_pt.update','outpatient_pt.print','outpatient_pt.export',
            'inpatient_pt.view','inpatient_pt.update','inpatient_pt.print','inpatient_pt.export',
        ];
        if (Schema::hasTable('role_permissions') && Schema::hasTable('permissions')) {
            foreach ($permissions as $permission) {
                if (DB::table('permissions')->where('key', $permission)->exists()) {
                    DB::table('role_permissions')->updateOrInsert(
                        ['role' => 'pt_head', 'permission_key' => $permission],
                        []
                    );
                }
            }
        }

        if (Schema::hasTable('users')) {
            $username = 'physical.therapy.head';
            $existing = DB::table('users')->whereRaw('LOWER(username) = ?', [strtolower($username)])->first();
            if ($existing) {
                DB::table('users')->where('id', $existing->id)->update([
                    'display_name' => 'رئيس قسم العلاج الطبيعي',
                    'role' => 'pt_head',
                    'active' => true,
                    'permissions_customized' => false,
                    'deleted_at' => null,
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('users')->insert([
                    'id' => '00000000-0000-4000-8000-000000000009',
                    'username' => $username,
                    'display_name' => 'رئيس قسم العلاج الطبيعي',
                    'password' => Hash::make('PTHead@2026'),
                    'role' => 'pt_head',
                    'active' => true,
                    'permissions_customized' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('role_permissions')) {
            DB::table('role_permissions')->where('role', 'pt_head')->delete();
        }
        if (Schema::hasTable('users')) {
            DB::table('users')->where('username', 'physical.therapy.head')->delete();
        }
        if (Schema::hasTable('outpatient_pt_cases') && Schema::hasColumn('outpatient_pt_cases', 'coverage_covers_cost')) {
            Schema::table('outpatient_pt_cases', function (Blueprint $table) {
                $table->dropColumn('coverage_covers_cost');
            });
        }
    }
};
