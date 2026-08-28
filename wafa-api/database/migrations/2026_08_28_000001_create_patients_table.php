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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('patient_id', 20)->unique()->comment('Composite: Admission Year + 4-digit sequence (e.g., 20260001)');
            $table->unsignedSmallInteger('admission_year')->index()->comment('Admission year');
            $table->string('national_id', 20)->nullable()->index()->comment('Palestinian 9-digit National ID');
            
            // 4-part Arabic Name
            $table->string('first_name', 100)->index();
            $table->string('father_name', 100);
            $table->string('grandfather_name', 100);
            $table->string('family_name', 100)->index();
            
            // Demographics & Social Status
            $table->enum('gender', ['male', 'female'])->index();
            $table->date('birth_date')->nullable();
            $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed'])->nullable();
            $table->enum('refugee_status', ['citizen', 'refugee'])->default('citizen')->index();
            $table->string('ration_card_no', 50)->nullable()->comment('UNRWA Ration Card No');
            $table->string('occupation', 150)->nullable();
            
            // Location & Contact
            $table->string('region', 100)->nullable()->index()->comment('Governorate: Gaza, North, Middle, Khan Younis, Rafah');
            $table->string('city_or_area', 150)->nullable()->comment('City / Neighborhood / Camp');
            $table->string('phone', 50)->nullable()->index();
            
            // Clinical / Medical Information
            $table->string('blood_type', 10)->nullable();
            $table->text('allergies')->nullable()->comment('Medical allergies and clinical alert warnings');
            $table->text('notes')->nullable()->comment('General medical notes');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
