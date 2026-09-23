<?php

use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('permissions')) {
            $permissions = [
                ['key'=>'archive.view','module'=>'archive','action'=>'view','name_ar'=>'عرض أرشيف المرضى الخارجين','name_en'=>'View discharged patient archive','is_financial'=>false,'sort_order'=>2300],
                ['key'=>'archive.export','module'=>'archive','action'=>'export','name_ar'=>'تصدير أرشيف المرضى PDF','name_en'=>'Export discharged archive PDF','is_financial'=>false,'sort_order'=>2301],
            ];
            foreach ($permissions as $row) {
                Permission::query()->updateOrCreate(['key'=>$row['key']], $row);
            }

            $roles = ['admin','treasurer','it_head','inpatient_manager','archive_clerk'];
            foreach ($roles as $role) {
                foreach (['archive.view','archive.export'] as $key) {
                    DB::table('role_permissions')->insertOrIgnore(['role'=>$role,'permission_key'=>$key]);
                }
            }
        }

        if (Schema::hasTable('users')) {
            $user = User::withTrashed()->whereRaw('LOWER(username) = ?', ['archive'])->first();
            if ($user) {
                if (method_exists($user, 'restore') && $user->trashed()) $user->restore();
                $user->forceFill([
                    'display_name' => 'موظف الأرشيف',
                    'password' => Hash::make('Archive@2026'),
                    'role' => 'archive_clerk',
                    'active' => true,
                    'permissions_customized' => false,
                    'deleted_at' => null,
                ])->save();
            } else {
                User::create([
                    'id' => '00000000-0000-4000-8000-000000000015',
                    'username' => 'archive',
                    'display_name' => 'موظف الأرشيف',
                    'password' => 'Archive@2026',
                    'role' => 'archive_clerk',
                    'active' => true,
                    'permissions_customized' => false,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('role_permissions')) {
            DB::table('role_permissions')->where('role', 'archive_clerk')->delete();
            DB::table('role_permissions')->whereIn('permission_key', ['archive.view','archive.export'])->delete();
        }
        if (Schema::hasTable('permissions')) Permission::query()->whereIn('key', ['archive.view','archive.export'])->delete();
    }
};
