<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\User;
use App\Services\{AuditService, TrashService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $actor = $request->user();
        $users = User::query()->orderBy('display_name')->get()->map(fn (User $user) => $this->resource($user, $actor));
        return response()->json(['data' => $users]);
    }

    public function permissions(Request $request)
    {
        $query = Permission::query()->orderBy('sort_order');
        // Only Eng. Mohammed (the protected treasury owner) receives financial permission definitions in the UI/API.
        if (!$request->user()->isPrimaryCashier()) $query->where('is_financial', false);
        $permissions = $query->get()->map(fn (Permission $permission) => [
            'key' => $permission->key,
            'module' => $permission->module,
            'action' => $permission->action,
            'nameAr' => $permission->name_ar,
            'nameEn' => $permission->name_en,
            'financial' => $permission->is_financial,
        ]);
        return response()->json(['data' => $permissions]);
    }

    public function store(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'username' => 'required|string|max:80|unique:users,username',
            'display_name' => 'required|string|max:150',
            'password' => 'required|string|min:8|max:100|confirmed',
            'role' => 'required|string|max:120',
            'active' => 'sometimes|boolean',
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,key',
        ]);
        $actor = $request->user();
        $this->guardCashierIdentity($actor, $data['role'], $data['username']);
        $this->guardGrantablePermissions($actor, $data['permissions']);
        $this->guardRoleRestrictions($actor, $data['role'], $data['permissions']);

        $user = DB::transaction(function () use ($data, $request) {
            $user = User::create([
                'username' => $data['username'],
                'display_name' => $data['display_name'],
                'password' => $data['password'],
                'role' => $data['role'],
                'active' => $data['active'] ?? true,
                'permissions_customized' => true,
                'created_by' => $request->user()->id,
            ]);
            $user->permissions()->sync(array_values(array_unique($data['permissions'])));
            return $user;
        });

        $audit->record($request, 'user.created', 'user', $user->id, ['role' => $user->role, 'permissions' => $data['permissions']]);
        return response()->json(['data' => $this->resource($user, $actor)], 201);
    }

    public function update(Request $request, User $user, AuditService $audit)
    {
        $actor = $request->user();
        // Eng. Mohammed / treasury-owner account is protected from every other account, including Eng. Ahmed.
        abort_if(!$actor->isPrimaryCashier() && $user->isPrimaryCashier(), 403, 'The treasury owner account (Eng. Mohammed Moqbil) can only be modified by Eng. Mohammed.');
        abort_if($user->role === 'doctor' && !$actor->isPrimaryCashier() && !$actor->isItHead(), 422, 'Doctor credentials are managed from the doctors page.');

        $data = $request->validate([
            'username' => ['sometimes','string','max:80',Rule::unique('users','username')->ignore($user->id)],
            'display_name' => 'sometimes|string|max:150',
            'password' => 'nullable|string|min:8|max:100|confirmed',
            'role' => 'sometimes|string|max:120',
            'active' => 'sometimes|boolean',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string|exists:permissions,key',
        ]);

        $nextRole = $data['role'] ?? $user->role;
        $nextUsername = $data['username'] ?? $user->username;
        $this->guardCashierIdentity($actor, $nextRole, $nextUsername, $user);
        if (array_key_exists('permissions', $data)) {
            $data['permissions'] = $this->normalizePermissionsForUpdate($actor, $user, $data['permissions']);
            $this->guardRoleRestrictions($actor, $nextRole, $data['permissions']);
        }
        if (!$actor->isPrimaryCashier()) abort_if($user->is($actor) && array_key_exists('active', $data) && !$data['active'], 422, 'You cannot disable your own account.');

        DB::transaction(function () use ($data, $user) {
            $attributes = collect($data)->except(['permissions','password_confirmation'])->filter(fn ($value) => $value !== null)->all();
            if ($attributes) $user->forceFill($attributes)->save();
            if (array_key_exists('permissions', $data)) {
                // Write the pivot explicitly and mark the account customized in the same transaction.
                // This avoids stale role-template reads on SQLite and guarantees the new grants survive refresh/re-login.
                $keys = array_values(array_unique($data['permissions']));
                DB::table('user_permissions')->where('user_id', $user->id)->delete();
                if ($keys) {
                    DB::table('user_permissions')->insert(array_map(fn (string $key) => [
                        'user_id' => $user->id,
                        'permission_key' => $key,
                    ], $keys));
                }
                DB::table('users')->where('id', $user->id)->update([
                    'permissions_customized' => true,
                    'updated_at' => now(),
                ]);
                $user->permissions_customized = true;
            }
        });

        $audit->record($request, 'user.updated', 'user', $user->id, ['permissions_changed' => array_key_exists('permissions', $data)]);

        // Always return a fresh canonical copy from the database so the web UI can reflect the
        // saved role/status/permissions immediately after pressing Save.
        $savedUser = $user->fresh();
        $savedUser->unsetRelation('permissions');
        return response()->json(['data' => $this->resource($savedUser, $actor)]);
    }

    public function destroy(Request $request, User $user, AuditService $audit, TrashService $trash)
    {
        $actor = $request->user();
        abort_if($user->isPrimaryCashier(), 403, 'حساب مهندس محمد مرجعي ولا يمكن حذفه.');
        if (!$actor->isPrimaryCashier()) {
            abort_if($user->is($actor), 422, 'You cannot delete your own account.');
            abort_if($user->role === 'doctor' && !$actor->isItHead(), 422, 'Doctors are removed from the doctors page.');
        }
        $trash->capture($request,$user,'user',$user->display_name.' · '.$user->username,['section'=>'users']);
        $user->tokens()->delete();
        $user->update(['active'=>false]);
        $audit->record($request, 'user.deleted', 'user', $user->id);
        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }

    private function guardGrantablePermissions(User $actor, array $requested, ?User $target = null): void
    {
        if ($actor->isPrimaryCashier()) return;
        abort_if($target?->isPrimaryCashier(), 403, 'The treasury owner account (Eng. Mohammed Moqbil) is protected.');
        $financialRequested = Permission::query()->whereIn('key', $requested)->where('is_financial', true)->exists();
        abort_if($financialRequested, 422, 'Financial permissions can only be granted by Eng. Mohammed Moqbil.');
    }

    /**
     * For edits performed by Eng. Ahmed/non-financial administrators, preserve any financial
     * grants the target already has and only replace the non-financial portion. The client no
     * longer has to echo hidden financial permissions back to the API, so Save is deterministic.
     */
    private function normalizePermissionsForUpdate(User $actor, User $target, array $requested): array
    {
        $requested = collect($requested)->map(fn ($key) => (string) $key)->unique()->values();
        if ($actor->isPrimaryCashier()) return $requested->all();

        abort_if($target->isPrimaryCashier(), 403, 'The treasury owner account (Eng. Mohammed Moqbil) is protected.');
        $financialCatalog = Permission::query()->where('is_financial', true)->pluck('key');
        $attemptedFinancial = $requested->intersect($financialCatalog);
        $currentFinancial = collect($target->effectivePermissionKeys())->intersect($financialCatalog)->values();

        // A non-financial administrator may submit an old client payload containing existing hidden
        // financial grants, but may never add a new financial permission.
        $newFinancial = $attemptedFinancial->diff($currentFinancial);
        abort_if($newFinancial->isNotEmpty(), 422, 'Financial permissions can only be changed by Eng. Mohammed Moqbil.');

        $nonFinancial = $requested->diff($financialCatalog);
        return $nonFinancial->merge($currentFinancial)->unique()->values()->all();
    }

    private function guardRoleRestrictions(User $actor, string $role, array $requested): void
    {
        if (strtolower(trim($role)) === 'it_head') {
            abort_if(Permission::query()->whereIn('key', $requested)->where('is_financial', true)->exists(), 422, 'The IT head cannot receive financial permissions.');
        }
    }

    private function guardCashierIdentity(User $actor, string $role, string $username, ?User $target = null): void
    {
        // The protected identity is Eng. Mohammed's existing account, not the ordinary cashier role.
        if ($target?->isPrimaryCashier()) {
            abort_unless($actor->isPrimaryCashier(), 403, 'The treasury owner account (Eng. Mohammed Moqbil) is protected.');
        }

        // Prevent a second account from impersonating the protected treasury username.
        if (!$target?->isPrimaryCashier()) {
            abort_if(strtolower(trim($username)) === 'eng.mohammed_moqbil', 422, 'This username is reserved for the treasury owner account.');
        }
    }

    private function resource(User $user, ?User $actor = null): array
    {
        $actorIsCashier = $actor?->isPrimaryCashier() ?? false;
        $actorIsItHead = $actor?->isItHead() ?? false;
        $protectedCashier = $user->isPrimaryCashier() && !$actorIsCashier;
        return [
            'id' => $user->id,
            'username' => $user->username,
            'displayName' => $user->display_name,
            'role' => $user->role,
            'active' => $user->active && !$user->trashed(),
            'permissionsCustomized' => $user->permissions_customized,
            // In the Users & Permissions screen, show the administrator-saved checklist.
            // This keeps edited permissions visible after Save/Refresh, while login/runtime
            // still uses effectivePermissionKeys() from AuthController.
            'permissions' => $user->displayPermissionKeys(),
            'effectivePermissions' => $user->effectivePermissionKeys(),
            'assignedPermissions' => $user->assignedPermissionKeys(),
            'lastLoginAt' => $user->last_login_at?->toISOString(),
            'createdAt' => $user->created_at?->toISOString(),
            'manageable' => $actorIsCashier || ($actorIsItHead && !$protectedCashier) || (!$protectedCashier && $user->role !== 'doctor'),
            'protected' => $protectedCashier,
        ];
    }
}
