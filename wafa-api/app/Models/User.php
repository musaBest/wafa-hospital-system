<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'role',
        'department',
        'employee_id',
        'phone',
        'is_active',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Notifications targeted to this user.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Financial transfers recorded by this user (Accountant).
     */
    public function recordedTransfers(): HasMany
    {
        return $this->hasMany(Transfer::class, 'created_by');
    }

    /**
     * Role checking helpers
     */
    public function hasRole(string|array $roles): bool
    {
        if (is_array($roles)) {
            return in_array($this->role, $roles, true);
        }

        return $this->role === $roles;
    }

    public function isItAdmin(): bool
    {
        return $this->role === 'it_admin';
    }

    public function isManagementAdmin(): bool
    {
        return $this->role === 'management_admin';
    }

    public function isAccountant(): bool
    {
        return $this->role === 'accountant';
    }

    public function isDoctor(): bool
    {
        return $this->role === 'doctor';
    }

    public function isRegistrationClerk(): bool
    {
        return $this->role === 'registration_clerk';
    }

    public function isDataLookupClerk(): bool
    {
        return $this->role === 'data_lookup_clerk';
    }

    /**
     * Permission: Can access Financial Transfers & Payments.
     * EXCLUSIVELY granted to 'accountant'. IT Admin and all others are strictly forbidden.
     */
    public function canAccessTransfers(): bool
    {
        return $this->role === 'accountant';
    }

    /**
     * Permission: Can manage staff accounts.
     * Granted to IT Admin and Management Admin.
     */
    public function canManageStaff(): bool
    {
        return in_array($this->role, ['it_admin', 'management_admin'], true);
    }

    /**
     * Permission: Can modify system-wide settings and master clinics.
     * Granted EXCLUSIVELY to IT Admin (Ahmed, IT).
     */
    public function canManageSystemSettings(): bool
    {
        return $this->role === 'it_admin';
    }

    /**
     * Permission: Can register and edit patient files.
     */
    public function canManagePatients(): bool
    {
        return in_array($this->role, ['it_admin', 'management_admin', 'registration_clerk'], true);
    }

    /**
     * Human-readable Arabic label for the role.
     */
    public function getRoleLabelAttribute(): string
    {
        $labels = [
            'it_admin' => 'مدير النظام (IT - أحمد)',
            'management_admin' => 'إدارة المستشفى (Management)',
            'accountant' => 'المحاسب المالي (Accountant)',
            'doctor' => 'الطبيب المعالج (Physician)',
            'registration_clerk' => 'كاتب التسجيل والاستقبال (Registration Clerk)',
            'data_lookup_clerk' => 'كاتب الاستعلامات والبحث (Lookup Clerk)',
            'lab_technician' => 'فني المختبرات (Lab Technician)',
            'pt_specialist' => 'أخصائي العلاج الطبيعي (PT Specialist)',
            'radiologist' => 'فني الأشعة (Radiologist)',
            'social_worker' => 'الأخصائي الاجتماعي (Social Worker)',
        ];

        return $labels[$this->role] ?? $this->role;
    }
}
