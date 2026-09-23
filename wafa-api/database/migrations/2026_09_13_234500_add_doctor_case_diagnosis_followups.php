<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('visits')) {
            Schema::table('visits', function (Blueprint $table) {
                if (!Schema::hasColumn('visits', 'diagnosis')) $table->longText('diagnosis')->nullable()->after('notes');
                if (!Schema::hasColumn('visits', 'follow_up_notes')) $table->text('follow_up_notes')->nullable()->after('follow_up_date');
            });
        }

        if (Schema::hasTable('follow_up_appointments')) {
            Schema::table('follow_up_appointments', function (Blueprint $table) {
                if (!Schema::hasColumn('follow_up_appointments', 'reason')) $table->text('reason')->nullable()->after('status');
                if (!Schema::hasColumn('follow_up_appointments', 'created_by')) $table->foreignUuid('created_by')->nullable()->after('booked_visit_id')->constrained('users')->nullOnDelete();
            });
        }

        // Activate the schedule-created doctor logins so each doctor can open the new doctor portal.
        if (Schema::hasTable('users') && Schema::hasTable('doctors')) {
            $doctorUserIds = DB::table('doctors')->pluck('user_id')->filter()->values()->all();
            if ($doctorUserIds) {
                DB::table('users')
                    ->whereIn('id', $doctorUserIds)
                    ->where('role', 'doctor')
                    ->where('username', 'like', 'schedule.doctor.%')
                    ->update([
                        'active' => true,
                        'permissions_customized' => false,
                        'updated_at' => now(),
                    ]);
            }
        }

        // Keep old scheduled follow-ups readable: once their date passed and they were never booked,
        // the interface will show them as an automatically closed case without changing historical data.
    }

    public function down(): void
    {
        if (Schema::hasTable('follow_up_appointments')) {
            Schema::table('follow_up_appointments', function (Blueprint $table) {
                if (Schema::hasColumn('follow_up_appointments', 'created_by')) $table->dropConstrainedForeignId('created_by');
                if (Schema::hasColumn('follow_up_appointments', 'reason')) $table->dropColumn('reason');
            });
        }
        if (Schema::hasTable('visits')) {
            Schema::table('visits', function (Blueprint $table) {
                if (Schema::hasColumn('visits', 'follow_up_notes')) $table->dropColumn('follow_up_notes');
                if (Schema::hasColumn('visits', 'diagnosis')) $table->dropColumn('diagnosis');
            });
        }
    }
};
