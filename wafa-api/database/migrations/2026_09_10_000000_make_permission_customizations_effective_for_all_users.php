<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('user_permissions') || !Schema::hasColumn('users', 'permissions_customized')) return;

        // v4.3.21 repair: any account that already has saved rows in user_permissions must run
        // from those saved rows. Earlier repairs skipped protected engineer accounts, so editing
        // Eng. Ahmed could change the visible checklist/count without changing real access. Only
        // Eng. Mohammed remains a fixed super-user who always owns every permission.
        $ids = DB::table('user_permissions')
            ->distinct()
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->values()
            ->all();

        if (!$ids) return;

        DB::table('users')
            ->whereIn('id', $ids)
            ->where('id', '!=', User::PRIMARY_TREASURER_ID)
            ->update(['permissions_customized' => true, 'updated_at' => now()]);
    }

    public function down(): void
    {
        // This is a safe data repair and intentionally not reversed.
    }
};
