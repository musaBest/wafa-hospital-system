<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('user_permissions') || !Schema::hasColumn('users', 'permissions_customized')) return;

        // v4.3.18 repair: if an account already has explicit permission rows, those rows are the
        // authoritative configuration and must survive refresh/re-login instead of falling back to
        // its role template. Protected engineer accounts keep their intentional fixed access model.
        $protected = [
            '00000000-0000-4000-8000-000000000003',
            '00000000-0000-4000-8000-000000000004',
        ];
        $ids = DB::table('user_permissions')->distinct()->pluck('user_id')->filter()->values()->all();
        if ($ids) {
            DB::table('users')
                ->whereIn('id', $ids)
                ->whereNotIn('id', $protected)
                ->update(['permissions_customized' => true, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Data repair is intentionally not reversed; reverting would discard user choices.
    }
};
