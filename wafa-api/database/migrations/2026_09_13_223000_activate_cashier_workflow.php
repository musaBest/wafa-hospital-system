<?php

use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('permissions') || !Schema::hasTable('role_permissions')) return;

        DB::transaction(function () {
            $catalog = config('hospital_permissions.catalog', []);
            foreach ($catalog as $index => $permission) {
                Permission::query()->updateOrCreate(['key' => $permission['key']], [
                    'module' => $permission['module'], 'action' => $permission['action'],
                    'name_ar' => $permission['name_ar'], 'name_en' => $permission['name_en'],
                    'is_financial' => $permission['financial'], 'sort_order' => $index + 1,
                ]);
            }

            $roles = ['cashier','payment_auditor','financial_collector','financial_auditor'];
            DB::table('role_permissions')->whereIn('role', $roles)->delete();
            foreach ($roles as $role) {
                foreach ((config('hospital_permissions.role_defaults.'.$role) ?? []) as $key) {
                    DB::table('role_permissions')->insertOrIgnore(['role'=>$role,'permission_key'=>$key]);
                }
            }

            $accounts = [
                ['id'=>'00000000-0000-4000-8000-000000000002','username'=>'cashier','display_name'=>'موظف تسجيل المرضى والزيارات','password'=>'Cashier@2026','role'=>'cashier'],
                ['id'=>'00000000-0000-4000-8000-000000000010','username'=>'payment.audit','display_name'=>'موظف التطبيق والتحصيل البنكي والتدقيق','password'=>'Payment@2026','role'=>'payment_auditor'],
                ['id'=>'00000000-0000-4000-8000-000000000011','username'=>'financial.collector','display_name'=>'المحصل المالي','password'=>'Collector@2026','role'=>'financial_collector'],
                ['id'=>'00000000-0000-4000-8000-000000000012','username'=>'mohammed.shukri','display_name'=>'أ. محمد الشكري - المدقق المالي','password'=>'Audit@2026','role'=>'financial_auditor'],
            ];

            foreach ($accounts as $row) {
                $user = User::withTrashed()->whereRaw('LOWER(username) = ?', [mb_strtolower($row['username'])])->first();
                if (!$user) $user = User::withTrashed()->find($row['id']);
                if ($user) {
                    if (method_exists($user, 'restore') && $user->trashed()) $user->restore();
                    $user->forceFill([
                        'username'=>$row['username'],'display_name'=>$row['display_name'],'password'=>$row['password'],
                        'role'=>$row['role'],'active'=>true,'permissions_customized'=>false,'deleted_at'=>null,
                    ])->save();
                } else {
                    $user = User::create($row + ['active'=>true,'permissions_customized'=>false]);
                }
                if (Schema::hasTable('user_permissions')) DB::table('user_permissions')->where('user_id',$user->id)->delete();
            }
        });
    }

    public function down(): void {}
};
