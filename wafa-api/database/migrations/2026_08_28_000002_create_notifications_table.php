<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('patient_id')->nullable()->constrained('patients')->onDelete('cascade');
            $table->string('target_role', 50)->nullable()->comment('Target staff role or "all_staff" or "patient"');
            $table->string('type', 50)->comment('Type of notification: patient_registered, appointment_reminder, lab_results_ready, etc.');
            $table->string('title', 255);
            $table->text('message');
            $table->string('action_url', 255)->nullable();
            $table->enum('priority', ['normal', 'high', 'urgent'])->default('normal');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
