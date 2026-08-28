<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Patient extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'patient_id',
        'admission_year',
        'national_id',
        'first_name',
        'father_name',
        'grandfather_name',
        'family_name',
        'gender',
        'birth_date',
        'marital_status',
        'region',
        'city_or_area',
        'phone',
        'occupation',
        'refugee_status',
        'ration_card_no',
        'blood_type',
        'allergies',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'admission_year' => 'integer',
        'birth_date' => 'date:Y-m-d',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'full_name',
        'age',
    ];

    /**
     * Boot the model.
     */
    protected static function booted(): void
    {
        static::creating(function (Patient $patient) {
            $year = $patient->admission_year ?: (int) date('Y');
            $patient->admission_year = $year;

            if (empty($patient->patient_id)) {
                $patient->patient_id = static::generateNextPatientId($year);
            }
        });
    }

    /**
     * Generate next sequential patient ID for a given year.
     * Format: YYYY + 4-digit zero-padded sequence (e.g., 20260001)
     */
    public static function generateNextPatientId(int $year): string
    {
        $latest = static::withTrashed()
            ->where('admission_year', $year)
            ->where('patient_id', 'LIKE', $year . '%')
            ->orderBy('patient_id', 'desc')
            ->first();

        if ($latest && preg_match('/^' . $year . '(\d{4,})$/', $latest->patient_id, $matches)) {
            $nextSeq = ((int) $matches[1]) + 1;
        } else {
            $count = static::withTrashed()->where('admission_year', $year)->count();
            $nextSeq = $count + 1;
        }

        return sprintf('%d%04d', $year, $nextSeq);
    }

    /**
     * Get 4-part Arabic full name.
     */
    public function getFullNameAttribute(): string
    {
        return trim(implode(' ', array_filter([
            $this->first_name,
            $this->father_name,
            $this->grandfather_name,
            $this->family_name,
        ])));
    }

    /**
     * Calculate age from birth_date.
     */
    public function getAgeAttribute(): ?int
    {
        return $this->birth_date ? Carbon::parse($this->birth_date)->age : null;
    }

    /**
     * Scope a query to search across patient names, IDs, and contact info.
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (empty($term)) {
            return $query;
        }

        $term = trim($term);
        $words = array_filter(explode(' ', $term));

        return $query->where(function ($q) use ($term, $words) {
            $q->where('patient_id', 'LIKE', "%{$term}%")
              ->orWhere('national_id', 'LIKE', "%{$term}%")
              ->orWhere('phone', 'LIKE', "%{$term}%")
              ->orWhere('first_name', 'LIKE', "%{$term}%")
              ->orWhere('father_name', 'LIKE', "%{$term}%")
              ->orWhere('grandfather_name', 'LIKE', "%{$term}%")
              ->orWhere('family_name', 'LIKE', "%{$term}%");

            // If multiple words entered (e.g. "ابو حماش" or "ندى ابو حماش")
            if (count($words) > 1) {
                $q->orWhere(function ($subQ) use ($words) {
                    foreach ($words as $word) {
                        $subQ->where(function ($nameQ) use ($word) {
                            $nameQ->where('first_name', 'LIKE', "%{$word}%")
                                  ->orWhere('father_name', 'LIKE', "%{$word}%")
                                  ->orWhere('grandfather_name', 'LIKE', "%{$word}%")
                                  ->orWhere('family_name', 'LIKE', "%{$word}%");
                        });
                    }
                });
            }
        });
    }

    /**
     * Scope a query to apply demographic and location filters.
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (!empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }

        if (!empty($filters['region'])) {
            $query->where('region', $filters['region']);
        }

        if (!empty($filters['refugee_status'])) {
            $query->where('refugee_status', $filters['refugee_status']);
        }

        if (!empty($filters['admission_year'])) {
            $query->where('admission_year', $filters['admission_year']);
        }

        if (!empty($filters['marital_status'])) {
            $query->where('marital_status', $filters['marital_status']);
        }

        return $query;
    }

    /**
     * Portal user account associated with the patient.
     */
    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    /**
     * Notifications associated with this patient.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
