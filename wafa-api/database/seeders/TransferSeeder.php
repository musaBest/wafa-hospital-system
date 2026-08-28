<?php

namespace Database\Seeders;

use App\Models\Transfer;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;

class TransferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $accountant = User::where('role', 'accountant')->first();
        $accountantId = $accountant ? $accountant->id : 1;

        $patients = Patient::take(4)->get();

        if ($patients->count() >= 2) {
            Transfer::updateOrCreate(
                ['receipt_number' => 'TR-2026-0001'],
                [
                    'patient_id' => $patients[0]->id,
                    'amount' => 450.00,
                    'currency' => 'ILS',
                    'payment_method' => 'digital_transfer',
                    'sender_name' => 'جمعية الإغاثة الطبية الفلسطينية',
                    'reference_number' => 'REF-PAL-99214',
                    'transfer_platform' => 'PalPay',
                    'status' => 'confirmed',
                    'created_by' => $accountantId,
                    'confirmed_at' => now()->subDays(2),
                    'notes' => 'سداد دفعة مساهمة تأهيل طبي للمريضة ندى ابو حماش',
                ]
            );

            Transfer::updateOrCreate(
                ['receipt_number' => 'TR-2026-0002'],
                [
                    'patient_id' => $patients[1]->id,
                    'amount' => 150.00,
                    'currency' => 'ILS',
                    'payment_method' => 'cash',
                    'sender_name' => null,
                    'reference_number' => null,
                    'transfer_platform' => null,
                    'status' => 'confirmed',
                    'created_by' => $accountantId,
                    'confirmed_at' => now()->subDay(),
                    'notes' => 'رسوم كشف وجلسة علاج طبيعي أولى للمريض ادهم ابولبده',
                ]
            );

            if (isset($patients[2])) {
                Transfer::updateOrCreate(
                    ['receipt_number' => 'TR-2026-0003'],
                    [
                        'patient_id' => $patients[2]->id,
                        'amount' => 300.00,
                        'currency' => 'ILS',
                        'payment_method' => 'digital_transfer',
                        'sender_name' => 'علي عبد الرحمن ابو ليله',
                        'reference_number' => 'JW-8830129',
                        'transfer_platform' => 'Jawwal Pay',
                        'status' => 'confirmed',
                        'created_by' => $accountantId,
                        'confirmed_at' => now(),
                        'notes' => 'دفعة جلسات الأكسجين المضغوط وعيادة الأسنان للمريضة صفاء ابو ليله',
                    ]
                );
            }
        }
    }
}
