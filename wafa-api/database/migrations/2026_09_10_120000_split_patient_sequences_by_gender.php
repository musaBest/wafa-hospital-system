<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patient_sequences', function (Blueprint $table) {
            $table->unsignedInteger('male_last_number')->default(0);
            $table->unsignedInteger('female_last_number')->default(0);
        });

        // Start the new independent male/female counters from the actual number of
        // registered patients for each year. The displayed number is always:
        // 1YYYY#### for males and 2YYYY#### for females.
        $years = DB::table('patients')->pluck('registered_at')
            ->filter()
            ->map(fn ($date) => (int) substr((string) $date, 0, 4))
            ->unique()
            ->values();

        foreach ($years as $year) {
            $maleCount = DB::table('patients')->where('gender', 'male')->whereYear('registered_at', $year)->count();
            $femaleCount = DB::table('patients')->where('gender', 'female')->whereYear('registered_at', $year)->count();
            DB::table('patient_sequences')->updateOrInsert(
                ['year' => $year],
                [
                    'last_number' => max($maleCount, $femaleCount),
                    'male_last_number' => $maleCount,
                    'female_last_number' => $femaleCount,
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::table('patient_sequences', function (Blueprint $table) {
            $table->dropColumn(['male_last_number', 'female_last_number']);
        });
    }
};
