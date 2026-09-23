<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('outpatient_pt_sessions') && !Schema::hasColumn('outpatient_pt_sessions', 'deleted_at')) {
            Schema::table('outpatient_pt_sessions', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('outpatient_pt_sessions') && Schema::hasColumn('outpatient_pt_sessions', 'deleted_at')) {
            Schema::table('outpatient_pt_sessions', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
