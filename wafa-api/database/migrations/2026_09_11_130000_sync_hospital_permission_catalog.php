<?php

use App\Models\Permission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('permissions') || !Schema::hasTable('role_permissions')) return;

        $catalog = config('hospital_permissions.catalog', []);
        if (!$catalog) return;

        $permissionRows = [];
        foreach ($catalog as $index => $permission) {
            $permissionRows[] = [
                'key' => $permission['key'],
                'module' => $permission['module'],
                'action' => $permission['action'],
                'name_ar' => $permission['name_ar'],
                'name_en' => $permission['name_en'],
                'is_financial' => $permission['financial'],
                'sort_order' => $index + 1,
            ];
        }

        Permission::query()->upsert(
            $permissionRows,
            ['key'],
            ['module', 'action', 'name_ar', 'name_en', 'is_financial', 'sort_order']
        );

        $allPermissionKeys = collect($catalog)->pluck('key')->values()->all();
        $roleRows = [];
        foreach (config('hospital_permissions.role_defaults', []) as $role => $keys) {
            $resolved = $keys === ['*']
                ? $allPermissionKeys
                : ($keys === ['@nonfinancial']
                    ? collect($catalog)->where('financial', false)->pluck('key')->values()->all()
                    : $keys);

            foreach ($resolved as $key) {
                $roleRows[] = ['role' => $role, 'permission_key' => $key];
            }
        }

        if ($roleRows) DB::table('role_permissions')->insertOrIgnore($roleRows);
    }

    public function down(): void
    {
        // Permission catalog synchronization is additive and intentionally not reversed.
    }
};
