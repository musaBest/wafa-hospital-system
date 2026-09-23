<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('cashier_workflow_cases') || !Schema::hasTable('patients')) return;

        $selfSponsorId = Schema::hasTable('sponsors') ? DB::table('sponsors')->where('code', 'self')->value('id') : null;
        $normalise = function ($value) {
            $text = trim((string) $value);
            $text = preg_replace('/\s+|د\.?|الدكتور/u', '', $text) ?? $text;
            return str_replace(['أ','إ','آ','ة','ى'], ['ا','ا','ا','ه','ي'], $text);
        };
        $uniqueMedicalSerial = function ($preferred) {
            $serial = trim((string) $preferred);
            if ($serial !== '' && strlen($serial) <= 9 && !DB::table('patients')->where('medical_serial', $serial)->exists()) return $serial;
            $counter = (int) DB::table('patients')->count() + 1;
            do { $serial = '9'.str_pad((string) $counter++, 8, '0', STR_PAD_LEFT); }
            while (DB::table('patients')->where('medical_serial', $serial)->exists());
            return $serial;
        };
        $uniqueIdNumber = function ($preferred, $caseId) {
            $id = trim((string) $preferred);
            if ($id === '') $id = 'WF-'.substr(sha1((string) $caseId), 0, 24);
            if (!DB::table('patients')->where('id_number', $id)->exists()) return $id;
            $base = $id; $i = 1;
            do { $id = substr($base, 0, 220).'-'.$i++; }
            while (DB::table('patients')->where('id_number', $id)->exists());
            return $id;
        };

        $clinics = Schema::hasTable('clinics') ? DB::table('clinics')->get() : collect();
        $doctors = Schema::hasTable('doctors') ? DB::table('doctors')->get() : collect();

        DB::table('cashier_workflow_cases')->orderBy('registered_at')->get()->each(function ($case) use ($selfSponsorId, $normalise, $uniqueMedicalSerial, $uniqueIdNumber, $clinics, $doctors) {
            $patient = DB::table('patients')->where('id', $case->patient_id)->first();
            if (!$patient && !empty($case->id_number)) $patient = DB::table('patients')->where('id_number', $case->id_number)->first();
            if (!$patient && !empty($case->medical_serial)) $patient = DB::table('patients')->where('medical_serial', $case->medical_serial)->first();
            if (!$patient) {
                $patientId = (string) Str::uuid();
                DB::table('patients')->insert([
                    'id' => $patientId,
                    'medical_serial' => $uniqueMedicalSerial($case->medical_serial ?? ''),
                    'full_name' => trim((string) ($case->patient_name ?? '')) ?: 'مريض غير مسمى',
                    'id_number' => $uniqueIdNumber($case->id_number ?? '', $case->id),
                    'dob' => $case->patient_dob ?: '1970-01-01',
                    'gender' => in_array($case->patient_gender, ['male','female'], true) ? $case->patient_gender : 'male',
                    'phone' => trim((string) ($case->patient_phone ?? '')) ?: '0000000',
                    'city' => $case->patient_city ?? null,
                    'area' => $case->patient_area ?? null,
                    'coverage_entity_id' => $selfSponsorId,
                    'registered_at' => $case->visit_date ?: now()->toDateString(),
                    'wallet_balance' => 0,
                    'civil_registry_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $patient = DB::table('patients')->where('id', $patientId)->first();
            }

            $clinic = $clinics->first(fn ($row) => $row->id === $case->clinic_id || $row->key === $case->clinic_id || $row->code === $case->clinic_code || $row->name_ar === $case->clinic_name || $row->name_en === $case->clinic_name);
            $doctorKey = $normalise($case->doctor_name ?? '');
            $doctor = $doctors->first(fn ($row) => $row->id === $case->doctor_id || $row->staff_id === $case->doctor_id || $normalise($row->name) === $doctorKey);

            $patch = [
                'patient_id' => $patient->id,
                'patient_name' => $patient->full_name,
                'medical_serial' => $patient->medical_serial,
                'id_number' => $patient->id_number,
                'patient_phone' => $patient->phone,
                'patient_dob' => $patient->dob,
                'patient_gender' => $patient->gender,
                'patient_city' => $patient->city,
                'patient_area' => $patient->area,
                'updated_at' => now(),
            ];
            if ($clinic) {
                $patch['clinic_id'] = $clinic->id;
                $patch['clinic_name'] = $clinic->name_ar;
                $patch['clinic_code'] = $clinic->code ?: 'CLN';
            }
            if ($doctor) {
                $patch['doctor_id'] = $doctor->id;
                $patch['doctor_name'] = $doctor->name;
            }
            DB::table('cashier_workflow_cases')->where('id', $case->id)->update($patch);

            if (!$clinic || !$doctor || !in_array($case->status, ['paid','collected','audited'], true) || !Schema::hasTable('visits') || !Schema::hasTable('queue_items')) return;

            $visitDate = $case->visit_date ?: now()->toDateString();
            $visitId = Str::isUuid((string) $case->visit_id) ? (string) $case->visit_id : (string) Str::uuid();
            $queueNumber = max(1, (int) ($case->queue_number ?? 1));
            while (DB::table('visits')->where('doctor_id', $doctor->id)->whereDate('visit_date', $visitDate)->where('queue_number', $queueNumber)->where('id', '!=', $visitId)->exists()) $queueNumber++;

            $visit = DB::table('visits')->where('id', $visitId)->first();
            $visitPayload = [
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'fee' => (float) ($case->amount ?? $clinic->visit_fee ?? 0),
                'visit_date' => $visitDate,
                'notes' => $case->notes ?? '',
                'queue_number' => $queueNumber,
                'status' => $visit && in_array($visit->status, ['waiting','exam'], true) ? $visit->status : 'waiting',
                'updated_at' => now(),
            ];
            if ($visit) DB::table('visits')->where('id', $visitId)->update($visitPayload);
            else DB::table('visits')->insert(['id' => $visitId, ...$visitPayload, 'created_at' => now()]);

            DB::table('cashier_workflow_cases')->where('id', $case->id)->update(['visit_id' => $visitId, 'queue_number' => $queueNumber, 'updated_at' => now()]);
            DB::table('queue_items')->updateOrInsert(['visit_id' => $visitId], [
                'id' => DB::table('queue_items')->where('visit_id', $visitId)->value('id') ?: (string) Str::uuid(),
                'patient_id' => $patient->id,
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctor->id,
                'queue_date' => $visitDate,
                'queue_number' => $queueNumber,
                'status' => $visitPayload['status'],
                'priority' => 3,
                'triage_note' => '',
                'updated_by' => null,
                'added_at' => $case->paid_at ?: ($case->registered_at ?: now()),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        // Data repair migration; no destructive rollback.
    }
};
