<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('user_session_logs')) {
            Schema::create('user_session_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->unsignedBigInteger('token_id')->nullable()->index();
                $table->string('device_name', 120)->nullable();
                $table->ipAddress('ip_address')->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('login_at')->nullable()->index();
                $table->timestamp('logout_at')->nullable()->index();
                $table->timestamp('last_seen_at')->nullable()->index();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('deleted_items')) {
            Schema::create('deleted_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('entity_type', 120)->index();
                $table->string('entity_id', 120)->nullable()->index();
                $table->string('entity_label', 255)->nullable();
                $table->json('payload')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('deleted_at')->index();
                $table->timestamp('restored_at')->nullable()->index();
            });
        }

        if (Schema::hasTable('outpatient_pt_cases') && !Schema::hasColumn('outpatient_pt_cases', 'deleted_at')) {
            Schema::table('outpatient_pt_cases', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('outpatient_pt_waitlist')) {
            Schema::create('outpatient_pt_waitlist', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('patient_id')->nullable()->constrained('patients')->nullOnDelete();
                $table->foreignUuid('case_id')->nullable()->constrained('outpatient_pt_cases')->nullOnDelete();
                $table->string('full_name', 180);
                $table->string('id_number', 40)->nullable()->index();
                $table->string('phone', 40)->nullable();
                $table->enum('patient_group', ['men', 'women_children'])->default('men')->index();
                $table->date('requested_date')->index();
                $table->dateTime('appointment_at')->nullable()->index();
                $table->unsignedInteger('queue_number')->default(1)->index();
                $table->unsignedInteger('daily_limit')->nullable();
                $table->enum('status', ['waiting','received','completed','cancelled'])->default('waiting')->index();
                $table->boolean('urgent')->default(false)->index();
                $table->longText('notes')->nullable();
                $table->timestamp('received_at')->nullable()->index();
                $table->timestamp('completed_at')->nullable()->index();
                $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
                $table->index(['requested_date','patient_group','status']);
            });
        }

        $permissions = [
            ['key'=>'engineer_activity.view','module'=>'engineer_activity','action'=>'view','name_ar'=>'عرض شاشة نشاط المستخدمين','name_en'=>'View user activity monitor','is_financial'=>false,'sort_order'=>900],
            ['key'=>'trash_bin.view','module'=>'trash_bin','action'=>'view','name_ar'=>'عرض سلة المحذوفات الخاصة','name_en'=>'View private trash bin','is_financial'=>false,'sort_order'=>901],
            ['key'=>'trash_bin.restore','module'=>'trash_bin','action'=>'update','name_ar'=>'استعادة عناصر من سلة المحذوفات','name_en'=>'Restore from private trash bin','is_financial'=>false,'sort_order'=>902],
        ];
        if (Schema::hasTable('permissions')) {
            foreach ($permissions as $permission) {
                DB::table('permissions')->updateOrInsert(['key'=>$permission['key']], $permission);
                DB::table('role_permissions')->updateOrInsert(['role'=>'treasurer','permission_key'=>$permission['key']], []);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('outpatient_pt_waitlist')) Schema::dropIfExists('outpatient_pt_waitlist');
        if (Schema::hasTable('outpatient_pt_cases') && Schema::hasColumn('outpatient_pt_cases', 'deleted_at')) {
            Schema::table('outpatient_pt_cases', function (Blueprint $table) { $table->dropSoftDeletes(); });
        }
        Schema::dropIfExists('deleted_items');
        Schema::dropIfExists('user_session_logs');
        if (Schema::hasTable('permissions')) {
            DB::table('permissions')->whereIn('key', ['engineer_activity.view','trash_bin.view','trash_bin.restore'])->delete();
        }
    }
};
