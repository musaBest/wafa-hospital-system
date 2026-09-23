<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            $table->string('ward_type', 20)->nullable()->index();
            $table->string('marital_status', 80)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('referral_hospital', 180)->nullable()->index();
            $table->string('referring_doctor', 180)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('admissions', function (Blueprint $table) {
            $table->dropIndex(['ward_type']);
            $table->dropIndex(['referral_hospital']);
            $table->dropColumn(['ward_type','marital_status','address','referral_hospital','referring_doctor']);
        });
    }
};
