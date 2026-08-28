<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Transfer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'receipt_number',
        'patient_id',
        'amount',
        'currency',
        'payment_method',
        'sender_name',
        'reference_number',
        'transfer_platform',
        'status',
        'created_by',
        'confirmed_at',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Transfer $transfer) {
            if (empty($transfer->receipt_number)) {
                $transfer->receipt_number = static::generateNextReceiptNumber();
            }
            if (empty($transfer->confirmed_at)) {
                $transfer->confirmed_at = now();
            }
        });
    }

    /**
     * Generate sequential financial receipt number.
     * Format: TR-YYYY-0001
     */
    public static function generateNextReceiptNumber(): string
    {
        $year = date('Y');
        $prefix = "TR-{$year}-";

        $latest = static::withTrashed()
            ->where('receipt_number', 'LIKE', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->first();

        if ($latest && preg_match('/' . preg_quote($prefix, '/') . '(\d+)$/', $latest->receipt_number, $matches)) {
            $nextSeq = ((int) $matches[1]) + 1;
        } else {
            $nextSeq = 1;
        }

        return sprintf('%s%04d', $prefix, $nextSeq);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function accountant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (empty($term)) {
            return $query;
        }

        $term = trim($term);

        return $query->where(function ($q) use ($term) {
            $q->where('receipt_number', 'LIKE', "%{$term}%")
              ->orWhere('reference_number', 'LIKE', "%{$term}%")
              ->orWhere('sender_name', 'LIKE', "%{$term}%")
              ->orWhereHas('patient', function ($patientQ) use ($term) {
                  $patientQ->search($term);
              });
        });
    }
}
