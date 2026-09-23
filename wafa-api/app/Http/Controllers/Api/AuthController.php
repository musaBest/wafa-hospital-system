<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Permission;
use App\Models\AuditLog;
use App\Models\UserSessionLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data=$request->validate(['username'=>'required|string','password'=>'required|string','device_name'=>'nullable|string|max:100']);
        // v4.3.44 performance: do not synchronize the full permission catalog on every login.
        // The setup/update process already runs migrations + seeding. Rewriting dozens of
        // permission and role rows here made a local SQLite login noticeably slow on Windows.
        $username = trim($data['username']);
        $password = trim($data['password']);

        // Fast path uses the indexed username column. Keep a case-insensitive fallback so
        // existing users can still type a different letter case without losing compatibility.
        $user=User::with('doctor')
            ->where('username', $username)
            ->where('active',true)
            ->first();
        if (!$user) {
            $user=User::with('doctor')
                ->whereRaw('LOWER(username) = ?', [mb_strtolower($username)])
                ->where('active',true)
                ->first();
        }

        $passwordMatches = $user ? $this->passwordMatches($password, (string) $user->password) : false;

        // v4.3.47 compatibility: some bundled/legacy SQLite databases contain bcrypt
        // hashes created by Node/Python using the $2b$ prefix. PHP verifies those hashes,
        // but Laravel's strict bcrypt algorithm guard rejects the prefix before verification.
        // Once a legacy hash is verified, transparently rehash it with Laravel ($2y$) so
        // subsequent logins use the framework-native format.
        if ($user && $passwordMatches && $this->usesLegacyBcryptPrefix((string) $user->password)) {
            $user->forceFill(['password' => Hash::make($password)])->save();
        }

        if(!$user || !$passwordMatches) {
            $user = $this->attemptBootstrapLogin($username, $password);
        }

        if(!$user) throw ValidationException::withMessages(['username'=>['Invalid username or password.']]);

        // v4.3.48 upgrade self-heal: older bundled databases may not yet contain the
        // permissions introduced by the inpatient specialty modules and outpatient PT.
        // Perform only cheap count checks on normal logins; run the bulk catalog sync
        // once, only when the database is actually stale. This restores hidden sections
        // without bringing back the expensive every-login synchronization.
        $this->ensurePermissionCatalogIfStale($user);

        $user->update(['last_login_at'=>now()]);
        $tokenResult = $user->createToken($data['device_name'] ?? 'wafaa-web');
        $accessToken = $tokenResult->accessToken;
        UserSessionLog::create([
            'user_id' => $user->id,
            'token_id' => $accessToken?->id,
            'device_name' => $data['device_name'] ?? 'wafaa-web',
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            'login_at' => now(),
            'last_seen_at' => now(),
            'metadata' => ['username' => $user->username, 'display_name' => $user->display_name],
        ]);
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'auth.login',
            'entity_type' => 'session',
            'entity_id' => null,
            'ip_address' => $request->ip(),
            'metadata' => ['device_name' => $data['device_name'] ?? 'wafaa-web'],
            'created_at' => now(),
        ]);
        $token=$tokenResult->plainTextToken;
        return response()->json(['data'=>['token'=>$token,'user'=>$this->resource($user)]]);
    }
    public function me(Request $request){return response()->json(['data'=>$this->resource($request->user())]);}
    public function logout(Request $request){
        $token = $request->user()->currentAccessToken();
        if ($token) {
            UserSessionLog::where('token_id', $token->id)->whereNull('logout_at')->latest('login_at')->limit(1)->update(['logout_at' => now(), 'last_seen_at' => now()]);
        }
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'auth.logout',
            'entity_type' => 'session',
            'entity_id' => null,
            'ip_address' => $request->ip(),
            'metadata' => ['device_name' => 'wafaa-web'],
            'created_at' => now(),
        ]);
        $token?->delete();
        return response()->json(['message'=>'Logged out.']);
    }

    /**
     * Verify both Laravel-native bcrypt hashes ($2y$) and legacy compatible bcrypt
     * hashes ($2a$/$2b$) without disabling Laravel's global HASH_VERIFY protection.
     */
    private function passwordMatches(string $password, string $hash): bool
    {
        if ($hash === '') return false;

        if ($this->usesLegacyBcryptPrefix($hash)) {
            // $2a$/$2b$ and $2y$ share the same bcrypt payload. PHP's password_verify
            // accepts the legacy form, but Laravel's BcryptHasher algorithm guard does not.
            $hash = '$2y$'.substr($hash, 4);
        }

        try {
            return Hash::check($password, $hash);
        } catch (\RuntimeException $e) {
            // Treat malformed/unsupported hashes as a failed login rather than a 500 error.
            report($e);
            return false;
        }
    }

    private function usesLegacyBcryptPrefix(string $hash): bool
    {
        return str_starts_with($hash, '$2a$') || str_starts_with($hash, '$2b$');
    }


    /**
     * v4.3.11 login repair:
     * Some Windows extractions were running against an old/empty SQLite file or
     * copied credentials with hidden spaces. This bootstrap path accepts the
     * protected built-in accounts, recreates/repairs the matching active user,
     * and ensures the permission catalog exists before issuing a token.
     */
    private function attemptBootstrapLogin(string $username, string $password): ?User
    {
        $accounts = [
            'dr.fouad_najm' => ['id'=>'00000000-0000-4000-8000-000000000001','username'=>'Dr.Fouad_Najm','display_name'=>'Dr. Fouad Najm','password'=>'Admin@2026','role'=>'admin'],
            'cashier' => ['id'=>'00000000-0000-4000-8000-000000000002','username'=>'cashier','display_name'=>'موظف تسجيل المرضى والزيارات','password'=>'Cashier@2026','role'=>'cashier'],
            'eng.ahmed_jaber' => ['id'=>'00000000-0000-4000-8000-000000000003','username'=>'Eng.Ahmed_Jaber','display_name'=>'Eng. Ahmed Jaber','password'=>'IT@2026','role'=>'it_head'],
            'eng.mohammed_moqbil' => ['id'=>'00000000-0000-4000-8000-000000000004','username'=>'Eng.Mohammed_Moqbil','display_name'=>'Eng. Mohammed Moqbil','password'=>'Treasury@2026','role'=>'treasurer'],
            'laboratory' => ['id'=>'00000000-0000-4000-8000-000000000005','username'=>'laboratory','display_name'=>'Laboratory Technician','password'=>'Lab@2026','role'=>'lab_technician'],
            'inpatient' => ['id'=>'00000000-0000-4000-8000-000000000006','username'=>'inpatient','display_name'=>'مسؤول المبيت','password'=>'Inpatient@2026','role'=>'inpatient_manager'],
            'moh' => ['id'=>'00000000-0000-4000-8000-000000000007','username'=>'moh','display_name'=>'بوابة وزارة الصحة','password'=>'MOH@2026','role'=>'moh_user'],
            'social.service' => ['id'=>'00000000-0000-4000-8000-000000000008','username'=>'social.service','display_name'=>'الخدمة الاجتماعية والنفسية','password'=>'Social@2026','role'=>'social_worker'],
            'physical.therapy.head' => ['id'=>'00000000-0000-4000-8000-000000000009','username'=>'physical.therapy.head','display_name'=>'رئيس قسم العلاج الطبيعي','password'=>'PTHead@2026','role'=>'pt_head'],
            'payment.audit' => ['id'=>'00000000-0000-4000-8000-000000000010','username'=>'payment.audit','display_name'=>'موظف التطبيق والتحصيل البنكي والتدقيق','password'=>'Payment@2026','role'=>'payment_auditor'],
            'financial.collector' => ['id'=>'00000000-0000-4000-8000-000000000011','username'=>'financial.collector','display_name'=>'المحصل المالي','password'=>'Collector@2026','role'=>'financial_collector'],
            'mohammed.shukri' => ['id'=>'00000000-0000-4000-8000-000000000012','username'=>'mohammed.shukri','display_name'=>'أ. محمد الشكري - المدقق المالي','password'=>'Audit@2026','role'=>'financial_auditor'],
            'inquiries' => ['id'=>'00000000-0000-4000-8000-000000000013','username'=>'inquiries','display_name'=>'موظف الاستعلامات','password'=>'Inquiry@2026','role'=>'inquiry_clerk'],
            'dr.naji_altaweel' => ['id'=>'00000000-0000-4000-8000-000000000021','username'=>'Dr.Naji_AlTaweel','display_name'=>'د. ناجي الطويل','password'=>'Dental@2026','role'=>'doctor'],
            'dr.mohammed_alkurdi' => ['id'=>'00000000-0000-4000-8000-000000000022','username'=>'Dr.Mohammed_AlKurdi','display_name'=>'د. محمد الكردي','password'=>'Dental@2026','role'=>'doctor'],
            'dr.mohammed_shamieh' => ['id'=>'00000000-0000-4000-8000-000000000023','username'=>'Dr.Mohammed_Shamieh','display_name'=>'د. محمد شامية','password'=>'Dental@2026','role'=>'doctor'],
        ];

        $key = mb_strtolower(trim($username));
        $account = $accounts[$key] ?? null;
        if (!$account || !hash_equals($account['password'], trim($password))) return null;

        // This recovery path is exceptional. If it is ever needed on an older database,
        // synchronize permissions in bulk instead of performing hundreds of row-by-row queries.
        $this->ensurePermissionCatalog();

        return DB::transaction(function () use ($account) {
            $existing = User::withTrashed()
                ->whereRaw('LOWER(username) = ?', [mb_strtolower($account['username'])])
                ->first();

            if ($existing) {
                // v4.3.19 login hardening:
                // If a protected built-in account already exists but its password was changed,
                // corrupted, or seeded from an older copy, allow the published default credential
                // to recover access. Preserve the user's role/custom permissions and only repair
                // fields that are required for a successful login.
                if (method_exists($existing, 'restore') && $existing->trashed()) $existing->restore();
                $existing->forceFill([
                    'password' => Hash::make($account['password']),
                    'active' => true,
                    'deleted_at' => null,
                ])->save();
                return $existing->fresh()->load('doctor');
            }

            $user = new User(['id' => $account['id'], 'username' => $account['username']]);
            $user->forceFill([
                'id' => $account['id'],
                'username' => $account['username'],
                'display_name' => $account['display_name'],
                'password' => Hash::make($account['password']),
                'role' => $account['role'],
                'active' => true,
                'permissions_customized' => false,
                'deleted_at' => null,
            ])->save();

            return $user->fresh()->load('doctor');
        });
    }

    private function ensurePermissionCatalogIfStale(User $user): void
    {
        $catalog = config('hospital_permissions.catalog', []);
        if (!$catalog) return;

        $allKeys = collect($catalog)->pluck('key')->values()->all();
        $presentCount = Permission::query()->whereIn('key', $allKeys)->count();
        if ($presentCount !== count($allKeys)) {
            $this->ensurePermissionCatalog();
            return;
        }

        $roleDefaults = config('hospital_permissions.role_defaults', []);
        $keys = $roleDefaults[$user->role] ?? [];
        if (!$keys || $keys === ['*']) return;

        $resolved = $keys === ['@nonfinancial']
            ? collect($catalog)->where('financial', false)->pluck('key')->values()->all()
            : $keys;

        if (!$resolved) return;

        $roleCount = DB::table('role_permissions')
            ->where('role', $user->role)
            ->whereIn('permission_key', $resolved)
            ->count();

        if ($roleCount !== count($resolved)) {
            $this->ensurePermissionCatalog();
        }
    }

    private function ensurePermissionCatalog(): void
    {
        $catalog = config('hospital_permissions.catalog', []);
        if (!$catalog) return;

        $permissionRows = [];
        foreach ($catalog as $index => $permission) {
            $permissionRows[] = [
                'key' => $permission['key'],
                'module' => $permission['module'],
                'action' => $permission['action'],
                'name_ar' => $permission['name_ar'],
                'name_en' => $permission['name_en'],
                'is_financial' => $permission['financial'],
                'sort_order' => $index + 1,
            ];
        }

        // One UPSERT replaces the previous updateOrCreate loop (roughly two SQL statements
        // per permission). This method is now used only by the emergency bootstrap path.
        Permission::query()->upsert(
            $permissionRows,
            ['key'],
            ['module', 'action', 'name_ar', 'name_en', 'is_financial', 'sort_order']
        );

        $allPermissionKeys = collect($catalog)->pluck('key')->all();
        $roleRows = [];
        foreach (config('hospital_permissions.role_defaults', []) as $role => $keys) {
            $resolvedKeys = $keys === ['*']
                ? $allPermissionKeys
                : ($keys === ['@nonfinancial'] ? collect($catalog)->where('financial', false)->pluck('key')->all() : $keys);
            foreach ($resolvedKeys as $key) {
                $roleRows[] = ['role' => $role, 'permission_key' => $key];
            }
        }

        if ($roleRows) {
            DB::table('role_permissions')->insertOrIgnore($roleRows);
        }
    }

    private function resource(User $user): array
    {
        $user->loadMissing('doctor');
        return ['id'=>$user->id,'username'=>$user->username,'displayName'=>$user->display_name,'role'=>$user->role,'doctorId'=>$user->doctor?->id,'permissions'=>$user->effectivePermissionKeys()];
    }
}
