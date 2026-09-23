<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Clinic, Doctor, User};
use App\Services\{ApiResourceService, AuditService, TrashService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DoctorController extends Controller
{
    public function index(ApiResourceService $resources)
    {
        return response()->json([
            'data' => Doctor::with('clinics')->get()->map(fn ($doctor) => $resources->doctor($doctor)),
        ]);
    }

    public function store(Request $request, ApiResourceService $resources, AuditService $audit)
    {
        $data = $request->validate([
            'staff_id' => 'required|string|max:50|unique:doctors,staff_id|unique:users,username',
            'password' => 'required|string|min:8|max:100',
            'name' => 'required|string|max:150',
            'phone' => 'nullable|string|max:30',
            'specialty' => 'nullable|string|max:150',
            'schedule_text' => 'nullable|string|max:2000',
            'clinic_ids' => 'required_without:clinic_keys|array|min:1',
            'clinic_ids.*' => 'uuid|exists:clinics,id',
            'clinic_keys' => 'required_without:clinic_ids|array|min:1',
            'clinic_keys.*' => 'string|max:100|exists:clinics,key',
        ]);

        $clinicIds = $data['clinic_ids'] ?? Clinic::query()
            ->whereIn('key', array_values(array_unique($data['clinic_keys'] ?? [])))
            ->pluck('id')
            ->all();

        abort_if(empty($clinicIds), 422, 'At least one valid clinic is required.');

        $doctor = DB::transaction(function () use ($data, $clinicIds, $request) {
            $user = User::create([
                'username' => $data['staff_id'],
                'display_name' => $data['name'],
                'password' => $data['password'],
                'role' => 'doctor',
                'active' => true,
                'created_by' => $request->user()->id,
            ]);

            $doctor = Doctor::create([
                'user_id' => $user->id,
                'staff_id' => $data['staff_id'],
                'name' => $data['name'],
                'phone' => $data['phone'] ?? null,
                'specialty' => $data['specialty'] ?? null,
                'schedule_text' => $data['schedule_text'] ?? null,
                'active' => true,
            ]);
            $doctor->clinics()->sync($clinicIds);
            $this->ensureDentalDoctorPermissions($user, $clinicIds);

            return $doctor->load('clinics');
        });

        $audit->record($request, 'doctor.created', 'doctor', $doctor->id);

        return response()->json([
            'data' => array_merge($resources->doctor($doctor), [
                'credentials' => [
                    'username' => $doctor->staff_id,
                    'temporaryPassword' => $data['password'],
                ],
            ]),
        ], 201);
    }

    public function update(Request $request, Doctor $doctor, ApiResourceService $resources, AuditService $audit)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:150',
            'phone' => 'nullable|string|max:30',
            'specialty' => 'nullable|string|max:150',
            'schedule_text' => 'nullable|string|max:2000',
            'active' => 'sometimes|boolean',
            'password' => 'nullable|string|min:8|max:100',
            'clinic_ids' => 'nullable|array',
            'clinic_ids.*' => 'uuid|exists:clinics,id',
        ]);

        DB::transaction(function () use ($doctor, $data) {
            $doctor->update(collect($data)->only(['name', 'phone', 'specialty', 'schedule_text', 'active'])->all());
            $doctor->user->update(array_filter([
                'display_name' => $data['name'] ?? null,
                'active' => $data['active'] ?? null,
                'password' => $data['password'] ?? null,
            ], fn ($value) => $value !== null));
            if (array_key_exists('clinic_ids', $data)) {
                $doctor->clinics()->sync($data['clinic_ids']);
                $this->ensureDentalDoctorPermissions($doctor->user, $data['clinic_ids']);
            }
        });

        $audit->record($request, 'doctor.updated', 'doctor', $doctor->id);
        return response()->json(['data' => $resources->doctor($doctor->fresh()->load('clinics'))]);
    }


    private function ensureDentalDoctorPermissions(?User $user, array $clinicIds): void
    {
        if (!$user || !Schema::hasTable('user_permissions')) return;
        $dentalId = Clinic::query()->where('key', 'dental')->value('id');
        if (!$dentalId || !in_array($dentalId, $clinicIds, true)) return;
        $keys = ['doctor_portal.view','doctor_portal.update','queue.update','diagnostics.view','diagnostics.create','diagnostics.update','dental.view','dental.update'];
        $user->forceFill(['role' => 'doctor', 'permissions_customized' => true, 'active' => true])->save();
        DB::table('user_permissions')->where('user_id', $user->id)->delete();
        foreach ($keys as $key) DB::table('user_permissions')->insertOrIgnore(['user_id' => $user->id, 'permission_key' => $key]);
    }

    public function destroy(Request $request, Doctor $doctor, AuditService $audit, TrashService $trash)
    {
        $doctor->load(['clinics','user']);
        $trash->capture($request, $doctor, 'doctor', $doctor->name.' · '.$doctor->staff_id, ['section'=>'doctors']);
        DB::transaction(function () use ($doctor) {
            $doctor->update(['active' => false]);
            $doctor->user?->tokens()->delete();
            $doctor->user?->update(['active' => false]);
            $doctor->delete();
        });
        $audit->record($request, 'doctor.deleted', 'doctor', $doctor->id);
        return response()->noContent();
    }
}
