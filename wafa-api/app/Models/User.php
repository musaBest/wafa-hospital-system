<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    public const CASHIER_ID = '00000000-0000-4000-8000-000000000002';
    public const IT_HEAD_ID = '00000000-0000-4000-8000-000000000003';
    public const PRIMARY_TREASURER_ID = '00000000-0000-4000-8000-000000000004';
    // Kept for compatibility with middleware/controllers written before v4.3.4.
    public const PRIMARY_CASHIER_ID = self::PRIMARY_TREASURER_ID;

    protected $fillable = ['username', 'display_name', 'password', 'role', 'active', 'permissions_customized', 'created_by'];
    protected $hidden = ['password', 'remember_token'];
    protected function casts(): array { return ['password' => 'hashed', 'active' => 'boolean', 'permissions_customized' => 'boolean', 'last_login_at' => 'datetime']; }
    public function doctor() { return $this->hasOne(Doctor::class); }
    public function permissions() { return $this->belongsToMany(Permission::class, 'user_permissions', 'user_id', 'permission_key'); }

    /** Protected financial owner: Eng. Mohammed Moqbil / أمين الصندوق. */
    public function isPrimaryCashier(): bool
    {
        return $this->id === self::PRIMARY_TREASURER_ID || strtolower(trim($this->username)) === 'eng.mohammed_moqbil';
    }

    public function isBillingCashier(): bool
    {
        return $this->id === self::CASHIER_ID || strtolower(trim($this->username)) === 'cashier';
    }

    public function isItHead(): bool
    {
        return $this->id === self::IT_HEAD_ID || strtolower(trim($this->username)) === 'eng.ahmed_jaber';
    }

    public function assignedPermissionKeys(): array
    {
        return $this->permissions()
            ->orderBy('permissions.sort_order')
            ->pluck('permissions.key')
            ->unique()
            ->values()
            ->all();
    }

    public function displayPermissionKeys(): array
    {
        // The users/permissions screen must show the exact checklist saved by the administrator.
        // Runtime engineer privileges are still resolved by effectivePermissionKeys(), but the
        // editor should never hide a saved custom checklist after refresh.
        if ($this->permissions_customized) {
            return $this->assignedPermissionKeys();
        }

        return $this->effectivePermissionKeys();
    }

    public function effectivePermissionKeys(): array
    {
        // Eng. Mohammed is the only fixed super-user/financial owner. His runtime permissions are
        // intentionally all permissions and are not reduced by the editor screen.
        if ($this->isPrimaryCashier()) {
            return Permission::query()->orderBy('sort_order')->pluck('key')->values()->all();
        }

        // The registration cashier is a fixed first-desk account. It must never inherit
        // patient browsing/editing or financial permissions, even if an older database still
        // contains customized pivot grants from versions before the cashier split.
        if ($this->isBillingCashier()) {
            $keys = [
                'patients.create',
                'visits.create',
                'clinics.view', 'doctors.view',
                'dental.view', 'dental.update',
            ];
            return Permission::query()->whereIn('key', $keys)->orderBy('sort_order')->pluck('key')->values()->all();
        }

        // If any other account (including Eng. Ahmed) was edited from Users & Permissions, the saved
        // pivot rows become the runtime source of truth. Earlier versions returned the IT-head
        // role template before checking permissions_customized, so the checklist/count changed
        // but the actual page/API access stayed unchanged. This order makes Save real.
        if ($this->permissions_customized) {
            return $this->assignedPermissionKeys();
        }

        // Eng. Ahmed's default, before customization: every non-financial permission. Financial
        // screens are still impossible to grant except by Eng. Mohammed.
        if ($this->isItHead()) {
            return Permission::query()->where('is_financial', false)->orderBy('sort_order')->pluck('key')->values()->all();
        }

        // Once an ordinary account has been explicitly edited from Users & Permissions, its
        // pivot grants are the source of truth. This includes the built-in cashier account: the
        // default cashier template is only a fallback until an administrator customizes it.
        // Financial grants remain protected by UserController, so this does not broaden who may
        // grant financial access.

        // Role-based accounts keep their role template. Non-custom IT and cashier accounts are
        // handled above with stricter fixed rules.
        return Permission::query()
            ->join('role_permissions', 'permissions.key', '=', 'role_permissions.permission_key')
            ->where('role_permissions.role', $this->role)
            ->orderBy('permissions.sort_order')
            ->pluck('permissions.key')->unique()->values()->all();
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->effectivePermissionKeys(), true);
    }
}
