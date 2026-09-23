<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSequence;

class PatientSerialService
{
    /**
     * Hospital-wide patient/case number.
     * Male   => 1 + YYYY + 4-digit independent sequence
     * Female => 2 + YYYY + 4-digit independent sequence
     * Example: 120260001 / 220260001
     */
    public function next(string $gender, int $year): string
    {
        $prefix = $gender === 'male' ? '1' : '2';
        $column = $gender === 'male' ? 'male_last_number' : 'female_last_number';

        $sequence = PatientSequence::query()->lockForUpdate()->firstOrCreate(
            ['year' => $year],
            ['last_number' => 0, 'male_last_number' => 0, 'female_last_number' => 0],
        );

        $next = (int) ($sequence->{$column} ?? 0);
        do {
            $next++;
            abort_if($next > 9999, 422, 'The annual patient sequence has reached its limit.');
            $serial = $prefix.$year.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        } while (Patient::withTrashed()->where('medical_serial', $serial)->exists());

        $sequence->forceFill([
            $column => $next,
            'last_number' => max((int) $sequence->last_number, $next),
        ])->save();

        return $serial;
    }
}
