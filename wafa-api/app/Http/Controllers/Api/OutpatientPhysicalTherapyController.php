<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{DeletedItem,OutpatientPhysicalTherapyCase,OutpatientPhysicalTherapySequence,OutpatientPhysicalTherapySession,OutpatientPhysicalTherapyWaitlist,Patient,Sponsor};
use App\Services\{AuditService,PatientActivityService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OutpatientPhysicalTherapyController extends Controller
{
    public function findPatient(Request $request)
    {
        $data = $request->validate(['identity'=>'required|string|min:2|max:150']);
        $patient = Patient::with('sponsor')->where('id_number', trim($data['identity']))->first();
        return response()->json(['data'=>['patient'=>$patient ? $this->patientResource($patient) : null]]);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'search'=>'nullable|string|max:150',
            'from'=>'nullable|date',
            'to'=>'nullable|date',
            'group'=>['nullable', Rule::in(['men','women_children'])],
            'status'=>['nullable', Rule::in(['active','closed'])],
        ]);

        $query = OutpatientPhysicalTherapyCase::query()
            ->with(['patient.sponsor','sponsor','sessions'])
            ->latest('case_date')
            ->latest('created_at');

        $query->when($data['search'] ?? null, function ($q, $search) {
            $q->where(function ($inner) use ($search) {
                $inner->where('pt_number','like',"%{$search}%")
                    ->orWhere('diagnosis','like',"%{$search}%")
                    ->orWhereHas('patient', fn($p) => $p->where('full_name','like',"%{$search}%")
                        ->orWhere('id_number','like',"%{$search}%")
                        ->orWhere('medical_serial','like',"%{$search}%"));
            });
        });
        $query->when($data['from'] ?? null, fn($q,$date)=>$q->whereDate('case_date','>=',$date));
        $query->when($data['to'] ?? null, fn($q,$date)=>$q->whereDate('case_date','<=',$date));
        $query->when($data['group'] ?? null, fn($q,$group)=>$q->where('patient_group',$group));
        $query->when($data['status'] ?? null, fn($q,$status)=>$q->where('status',$status));

        return response()->json(['data'=>$query->get()->map(fn($case)=>$this->caseResource($case))->values()]);
    }

    public function store(Request $request, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate($this->caseRules());
        $patient = Patient::findOrFail($data['patient_id']);
        $sponsor = $this->resolveSponsor($data['coverage_entity_id'] ?? null);

        $case = DB::transaction(function () use ($data, $patient, $sponsor, $request) {
            $year = (int) substr($data['case_date'], 0, 4);
            $seed = OutpatientPhysicalTherapySequence::firstOrCreate(
                ['year'=>$year,'patient_group'=>$data['patient_group']],
                ['last_number'=>0]
            );
            $sequence = OutpatientPhysicalTherapySequence::query()->lockForUpdate()->findOrFail($seed->id);
            $next = (int)$sequence->last_number + 1;
            abort_if($next > 9999, 422, 'تم استنفاد الأرقام التسلسلية لهذه السنة والقسم.');
            $sequence->update(['last_number'=>$next]);
            $prefix = $data['patient_group'] === 'men' ? '1' : '2';
            $ptNumber = $prefix . str_pad((string)$year, 4, '0', STR_PAD_LEFT) . str_pad((string)$next, 4, '0', STR_PAD_LEFT);

            return OutpatientPhysicalTherapyCase::create([
                ...$this->casePayload($data, $sponsor?->id),
                'patient_id'=>$patient->id,
                'pt_number'=>$ptNumber,
                'created_by'=>$request->user()->id,
            ]);
        });

        $audit->record($request,'outpatient_pt.case.created','outpatient_pt_case',$case->id,['patient_id'=>$patient->id,'pt_number'=>$case->pt_number]);
        $activity->event($patient->id,'outpatient_pt','فتح ملف علاج طبيعي خارجي','تم إنشاء ملف العلاج الطبيعي الخارجي رقم '.$case->pt_number.' بالتشخيص: '.$case->diagnosis,'active','outpatient_pt_case',$case->id,$request->user()->id);
        return response()->json(['data'=>$this->caseResource($case->load(['patient.sponsor','sponsor','sessions']))],201);
    }

    public function update(Request $request, OutpatientPhysicalTherapyCase $outpatientPtCase, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate([
            'case_date'=>'sometimes|required|date',
            'diagnosis'=>'sometimes|required|string|max:10000',
            'coverage_entity_id'=>'nullable|string|max:120',
            'marital_status'=>'nullable|string|max:80',
            'treatment_department'=>'nullable|string|max:120',
            'referral_source'=>'nullable|string|max:160',
            'treating_doctor'=>'nullable|string|max:160',
            'coverage_covers_cost'=>'nullable|boolean',
            'session_fee'=>'nullable|numeric|min:0|max:999999.99',
            'status'=>['nullable',Rule::in(['active','closed'])],
        ]);
        $coverageWasSubmitted = array_key_exists('coverage_entity_id',$data);
        $sponsor = $coverageWasSubmitted ? $this->resolveSponsor($data['coverage_entity_id']) : null;
        if ($coverageWasSubmitted) $data['coverage_entity_id'] = $sponsor?->id;
        $effectiveSponsorId = $coverageWasSubmitted ? $sponsor?->id : $outpatientPtCase->coverage_entity_id;
        $coversCost = $effectiveSponsorId ? (bool)($data['coverage_covers_cost'] ?? $outpatientPtCase->coverage_covers_cost) : false;
        if ($coversCost) $data['session_fee'] = 0;
        $data['coverage_covers_cost'] = $coversCost;
        $outpatientPtCase->update($data);
        $audit->record($request,'outpatient_pt.case.updated','outpatient_pt_case',$outpatientPtCase->id,array_keys($data));
        $activity->event($outpatientPtCase->patient_id,'outpatient_pt','تحديث ملف العلاج الطبيعي الخارجي','تم تحديث ملف العلاج الطبيعي رقم '.$outpatientPtCase->pt_number.'.','updated','outpatient_pt_case',$outpatientPtCase->id,$request->user()->id);
        return response()->json(['data'=>$this->caseResource($outpatientPtCase->fresh()->load(['patient.sponsor','sponsor','sessions']))]);
    }

    public function destroy(Request $request, OutpatientPhysicalTherapyCase $outpatientPtCase, AuditService $audit, PatientActivityService $activity)
    {
        $outpatientPtCase->load(['patient','sponsor','sessions']);
        DeletedItem::create([
            'user_id' => $request->user()?->id,
            'entity_type' => 'outpatient_pt_case',
            'entity_id' => $outpatientPtCase->id,
            'entity_label' => ($outpatientPtCase->patient?->full_name ?? 'مريض').' · '.$outpatientPtCase->pt_number,
            'payload' => $this->caseResource($outpatientPtCase),
            'metadata' => ['sessions_count' => $outpatientPtCase->sessions->count()],
            'deleted_at' => now(),
        ]);
        $audit->record($request,'outpatient_pt.case.deleted','outpatient_pt_case',$outpatientPtCase->id,['pt_number'=>$outpatientPtCase->pt_number]);
        $activity->event($outpatientPtCase->patient_id,'outpatient_pt','حذف ملف علاج طبيعي خارجي','تم حذف ملف العلاج الطبيعي رقم '.$outpatientPtCase->pt_number.'.','deleted','outpatient_pt_case',$outpatientPtCase->id,$request->user()->id);
        $outpatientPtCase->delete();
        return response()->json(['ok'=>true]);
    }

    public function storeSession(Request $request, OutpatientPhysicalTherapyCase $outpatientPtCase, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate($this->sessionRules());
        $session = DB::transaction(function () use ($data, $outpatientPtCase, $request) {
            $last = (int) OutpatientPhysicalTherapySession::query()
                ->where('case_id',$outpatientPtCase->id)
                ->lockForUpdate()
                ->max('session_number');
            return OutpatientPhysicalTherapySession::create([
                'case_id'=>$outpatientPtCase->id,
                'patient_id'=>$outpatientPtCase->patient_id,
                'session_number'=>$last + 1,
                'session_date'=>$data['session_date'],
                'appointment_at'=>$data['appointment_at'] ?? null,
                'therapist'=>$data['therapist'] ?? null,
                'specialist'=>$data['specialist'] ?? null,
                'treatments'=>$data['treatments'] ?? [],
                'notes'=>$data['notes'] ?? null,
                'created_by'=>$request->user()->id,
            ]);
        });
        $audit->record($request,'outpatient_pt.session.created','outpatient_pt_session',$session->id,['case_id'=>$outpatientPtCase->id,'session_number'=>$session->session_number]);
        $services = implode('، ', $session->treatments ?? []);
        $activity->event($outpatientPtCase->patient_id,'outpatient_pt_session','جلسة علاج طبيعي خارجي رقم '.$session->session_number,'تاريخ الجلسة '.$session->session_date?->format('Y-m-d').($services ? ' · الخدمات: '.$services : ''),'completed','outpatient_pt_session',$session->id,$request->user()->id);
        return response()->json(['data'=>$this->sessionResource($session)],201);
    }

    public function updateSession(Request $request, OutpatientPhysicalTherapySession $outpatientPtSession, AuditService $audit, PatientActivityService $activity)
    {
        $data = $request->validate([
            'session_date'=>'sometimes|required|date',
            'appointment_at'=>'nullable|date',
            'therapist'=>'nullable|string|max:160',
            'specialist'=>'nullable|string|max:160',
            'treatments'=>'nullable|array|max:40',
            'treatments.*'=>'string|max:100',
            'notes'=>'nullable|string|max:10000',
        ]);
        $outpatientPtSession->update($data);
        $audit->record($request,'outpatient_pt.session.updated','outpatient_pt_session',$outpatientPtSession->id,array_keys($data));
        $activity->event($outpatientPtSession->patient_id,'outpatient_pt_session','تحديث جلسة علاج طبيعي خارجي رقم '.$outpatientPtSession->session_number,'تم تحديث تفاصيل الجلسة المحفوظة.','updated','outpatient_pt_session',$outpatientPtSession->id,$request->user()->id);
        return response()->json(['data'=>$this->sessionResource($outpatientPtSession->fresh())]);
    }

    public function destroySession(Request $request, OutpatientPhysicalTherapySession $outpatientPtSession, AuditService $audit, PatientActivityService $activity)
    {
        $outpatientPtSession->load(['patient','caseFile']);
        DeletedItem::create([
            'user_id'=>$request->user()?->id,
            'entity_type'=>'outpatient_pt_session',
            'entity_id'=>$outpatientPtSession->id,
            'entity_label'=>($outpatientPtSession->patient?->full_name ?? 'مريض').' · جلسة '.$outpatientPtSession->session_number.' · '.($outpatientPtSession->caseFile?->pt_number ?? ''),
            'payload'=>[
                'id'=>$outpatientPtSession->id,
                'case_id'=>$outpatientPtSession->case_id,
                'patient_id'=>$outpatientPtSession->patient_id,
                'ptNumber'=>$outpatientPtSession->caseFile?->pt_number,
                'fullName'=>$outpatientPtSession->patient?->full_name,
                'id_number'=>$outpatientPtSession->patient?->id_number,
                'sessionNumber'=>$outpatientPtSession->session_number,
                'sessionDate'=>$outpatientPtSession->session_date?->format('Y-m-d'),
                'appointmentAt'=>$outpatientPtSession->appointment_at?->toISOString(),
                'therapist'=>$outpatientPtSession->therapist,
                'specialist'=>$outpatientPtSession->specialist,
                'treatments'=>$outpatientPtSession->treatments,
                'notes'=>$outpatientPtSession->notes,
            ],
            'metadata'=>['message'=>'جلسة علاج طبيعي محذوفة ويمكن استعادتها من شاشة مهندس محمد'],
            'deleted_at'=>now(),
        ]);
        $audit->record($request,'outpatient_pt.session.deleted','outpatient_pt_session',$outpatientPtSession->id,['case_id'=>$outpatientPtSession->case_id,'session_number'=>$outpatientPtSession->session_number]);
        $activity->event($outpatientPtSession->patient_id,'outpatient_pt_session','حذف جلسة علاج طبيعي خارجي رقم '.$outpatientPtSession->session_number,'تم حذف الجلسة المحددة من ملف العلاج الطبيعي.','deleted','outpatient_pt_session',$outpatientPtSession->id,$request->user()->id);
        $outpatientPtSession->delete();
        return response()->json(['ok'=>true]);
    }

    public function addCoverage(Request $request, AuditService $audit)
    {
        $data = $request->validate(['name_ar'=>'required|string|max:160','name_en'=>'nullable|string|max:160']);
        $base = Str::slug($data['name_en'] ?: $data['name_ar']);
        $base = $base ?: 'pt-coverage';
        $code = $base;
        $suffix = 1;
        while (Sponsor::where('code',$code)->exists()) $code = $base.'-'.(++$suffix);
        $sponsor = Sponsor::create(['code'=>$code,'name_ar'=>$data['name_ar'],'name_en'=>$data['name_en'] ?: $data['name_ar'],'active'=>true]);
        $audit->record($request,'outpatient_pt.coverage.created','sponsor',$sponsor->id,['code'=>$sponsor->code]);
        return response()->json(['data'=>['id'=>$sponsor->id,'code'=>$sponsor->code,'nameAr'=>$sponsor->name_ar,'nameEn'=>$sponsor->name_en,'active'=>true]],201);
    }


    public function waitlist(Request $request)
    {
        $data = $request->validate([
            'from'=>'nullable|date','to'=>'nullable|date','status'=>['nullable',Rule::in(['waiting','received','completed','cancelled'])],
            'group'=>['nullable',Rule::in(['men','women_children'])],'search'=>'nullable|string|max:150',
        ]);
        $query = OutpatientPhysicalTherapyWaitlist::query()->with(['patient','caseFile'])
            ->orderByDesc('urgent')->orderBy('requested_date')->orderBy('queue_number');
        $query->when($data['from'] ?? null, fn($q,$v)=>$q->whereDate('requested_date','>=',$v));
        $query->when($data['to'] ?? null, fn($q,$v)=>$q->whereDate('requested_date','<=',$v));
        $query->when($data['status'] ?? null, fn($q,$v)=>$q->where('status',$v));
        $query->when($data['group'] ?? null, fn($q,$v)=>$q->where('patient_group',$v));
        $query->when($data['search'] ?? null, function($q,$search){
            $q->where(fn($inner)=>$inner->where('full_name','like',"%{$search}%")->orWhere('id_number','like',"%{$search}%")->orWhere('phone','like',"%{$search}%"));
        });
        return response()->json(['data'=>$query->get()->map(fn($item)=>$this->waitlistResource($item))->values()]);
    }

    public function storeWaitlist(Request $request, AuditService $audit)
    {
        $data = $request->validate($this->waitlistRules());
        $case = !empty($data['case_id']) ? OutpatientPhysicalTherapyCase::with('patient')->find($data['case_id']) : null;
        $patient = !empty($data['patient_id']) ? Patient::find($data['patient_id']) : ($case?->patient);
        $date = $data['requested_date'];
        $group = $data['patient_group'] ?? ($case?->patient_group ?? (($patient?->gender === 'male') ? 'men' : 'women_children'));
        $next = OutpatientPhysicalTherapyWaitlist::whereDate('requested_date',$date)->where('patient_group',$group)->max('queue_number');
        $item = OutpatientPhysicalTherapyWaitlist::create([
            'patient_id'=>$patient?->id,
            'case_id'=>$case?->id,
            'full_name'=>$data['full_name'] ?? $patient?->full_name ?? $case?->patient?->full_name,
            'id_number'=>$data['id_number'] ?? $patient?->id_number ?? $case?->patient?->id_number,
            'phone'=>$data['phone'] ?? $patient?->phone ?? $case?->patient?->phone,
            'patient_group'=>$group,
            'requested_date'=>$date,
            'appointment_at'=>$data['appointment_at'] ?? null,
            'queue_number'=>$data['queue_number'] ?? ((int)$next + 1),
            'daily_limit'=>$data['daily_limit'] ?? null,
            'urgent'=>(bool)($data['urgent'] ?? false),
            'status'=>$data['status'] ?? 'waiting',
            'notes'=>$data['notes'] ?? null,
            'created_by'=>$request->user()?->id,
            'updated_by'=>$request->user()?->id,
        ]);
        $audit->record($request,'outpatient_pt.waitlist.created','outpatient_pt_waitlist',$item->id,['full_name'=>$item->full_name,'queue_number'=>$item->queue_number,'urgent'=>$item->urgent]);
        return response()->json(['data'=>$this->waitlistResource($item->fresh(['patient','caseFile']))],201);
    }

    public function updateWaitlist(Request $request, OutpatientPhysicalTherapyWaitlist $waitlist, AuditService $audit)
    {
        $data = $request->validate($this->waitlistRules(false));
        if (($data['status'] ?? null) === 'received' && !$waitlist->received_at) $data['received_at'] = now();
        if (($data['status'] ?? null) === 'completed' && !$waitlist->completed_at) {
            $data['completed_at'] = now();
            if (!$waitlist->received_at) $data['received_at'] = now();
        }
        $data['updated_by'] = $request->user()?->id;
        $waitlist->update($data);
        $audit->record($request,'outpatient_pt.waitlist.updated','outpatient_pt_waitlist',$waitlist->id,array_keys($data));
        return response()->json(['data'=>$this->waitlistResource($waitlist->fresh(['patient','caseFile']))]);
    }

    public function destroyWaitlist(Request $request, OutpatientPhysicalTherapyWaitlist $waitlist, AuditService $audit)
    {
        DeletedItem::create([
            'user_id'=>$request->user()?->id,
            'entity_type'=>'outpatient_pt_waitlist',
            'entity_id'=>$waitlist->id,
            'entity_label'=>$waitlist->full_name.' · دور '.$waitlist->queue_number,
            'payload'=>$this->waitlistResource($waitlist),
            'deleted_at'=>now(),
        ]);
        $audit->record($request,'outpatient_pt.waitlist.deleted','outpatient_pt_waitlist',$waitlist->id,['full_name'=>$waitlist->full_name]);
        $waitlist->delete();
        return response()->json(['ok'=>true]);
    }

    private function waitlistRules(bool $creating = true): array
    {
        $required = $creating ? 'required' : 'sometimes|required';
        return [
            'patient_id'=>'nullable|uuid|exists:patients,id',
            'case_id'=>'nullable|uuid|exists:outpatient_pt_cases,id',
            'full_name'=>[$required,'string','max:180'],
            'id_number'=>'nullable|string|max:40',
            'phone'=>'nullable|string|max:40',
            'patient_group'=>['nullable', Rule::in(['men','women_children'])],
            'requested_date'=>[$required,'date'],
            'appointment_at'=>'nullable|date',
            'queue_number'=>'nullable|integer|min:1|max:9999',
            'daily_limit'=>'nullable|integer|min:1|max:9999',
            'status'=>['nullable', Rule::in(['waiting','received','completed','cancelled'])],
            'urgent'=>'nullable|boolean',
            'notes'=>'nullable|string|max:10000',
        ];
    }

    private function waitlistResource(OutpatientPhysicalTherapyWaitlist $item): array
    {
        return [
            'id'=>$item->id,
            'patientId'=>$item->patient_id,
            'caseId'=>$item->case_id,
            'ptNumber'=>$item->caseFile?->pt_number,
            'fullName'=>$item->full_name,
            'idNumber'=>$item->id_number,
            'phone'=>$item->phone,
            'patientGroup'=>$item->patient_group,
            'requestedDate'=>$item->requested_date?->format('Y-m-d'),
            'appointmentAt'=>$item->appointment_at?->toISOString(),
            'queueNumber'=>(int)$item->queue_number,
            'dailyLimit'=>$item->daily_limit ? (int)$item->daily_limit : null,
            'status'=>$item->status,
            'urgent'=>(bool)$item->urgent,
            'notes'=>$item->notes,
            'receivedAt'=>$item->received_at?->toISOString(),
            'completedAt'=>$item->completed_at?->toISOString(),
            'createdAt'=>$item->created_at?->toISOString(),
        ];
    }

    private function caseRules(): array
    {
        return [
            'patient_id'=>'required|uuid|exists:patients,id|unique:outpatient_pt_cases,patient_id',
            'patient_group'=>['required', Rule::in(['men','women_children'])],
            'case_date'=>'required|date',
            'diagnosis'=>'required|string|max:10000',
            'coverage_entity_id'=>'nullable|string|max:120',
            'marital_status'=>'nullable|string|max:80',
            'treatment_department'=>'nullable|string|max:120',
            'referral_source'=>'nullable|string|max:160',
            'treating_doctor'=>'nullable|string|max:160',
            'coverage_covers_cost'=>'nullable|boolean',
            'session_fee'=>'nullable|numeric|min:0|max:999999.99',
            'status'=>['nullable',Rule::in(['active','closed'])],
        ];
    }

    private function casePayload(array $data, ?string $sponsorId): array
    {
        return [
            'patient_group'=>$data['patient_group'],
            'case_date'=>$data['case_date'],
            'diagnosis'=>$data['diagnosis'],
            'coverage_entity_id'=>$sponsorId,
            'marital_status'=>$data['marital_status'] ?? null,
            'treatment_department'=>$data['treatment_department'] ?? ($data['patient_group']==='men'?'الرجال':'النساء والأطفال'),
            'referral_source'=>$data['referral_source'] ?? null,
            'treating_doctor'=>$data['treating_doctor'] ?? null,
            'coverage_covers_cost'=>($sponsorId && (bool)($data['coverage_covers_cost'] ?? false)),
            'session_fee'=>($sponsorId && (bool)($data['coverage_covers_cost'] ?? false)) ? 0 : ($data['session_fee'] ?? 0),
            'status'=>$data['status'] ?? 'active',
        ];
    }

    private function sessionRules(): array
    {
        return [
            'session_date'=>'required|date',
            'appointment_at'=>'nullable|date',
            'therapist'=>'nullable|string|max:160',
            'specialist'=>'nullable|string|max:160',
            'treatments'=>'nullable|array|max:40',
            'treatments.*'=>'string|max:100',
            'notes'=>'nullable|string|max:10000',
        ];
    }

    private function resolveSponsor(?string $value): ?Sponsor
    {
        if (!$value) return null;
        return Sponsor::where('id',$value)->orWhere('code',$value)->firstOrFail();
    }

    private function patientResource(Patient $patient): array
    {
        return [
            'id'=>$patient->id,'medicalSerial'=>$patient->medical_serial,'fullName'=>$patient->full_name,'idNumber'=>$patient->id_number,
            'dob'=>$patient->dob?->format('Y-m-d'),'gender'=>$patient->gender,'phone'=>$patient->phone,'city'=>$patient->city,'area'=>$patient->area,
            'coverageEntity'=>$patient->sponsor?->code ?? 'self','registeredAt'=>$patient->registered_at?->format('Y-m-d'),
        ];
    }

    private function caseResource(OutpatientPhysicalTherapyCase $case): array
    {
        $patient = $case->patient;
        return [
            'id'=>$case->id,
            'ptNumber'=>$case->pt_number,
            'patientGroup'=>$case->patient_group,
            'caseDate'=>$case->case_date?->format('Y-m-d'),
            'diagnosis'=>$case->diagnosis,
            'maritalStatus'=>$case->marital_status,
            'treatmentDepartment'=>$case->treatment_department,
            'referralSource'=>$case->referral_source,
            'treatingDoctor'=>$case->treating_doctor,
            'coverageCoversCost'=>(bool)$case->coverage_covers_cost,
            'sessionFee'=>(float)$case->session_fee,
            'status'=>$case->status,
            'coverage'=>$case->sponsor ? ['id'=>$case->sponsor->id,'code'=>$case->sponsor->code,'nameAr'=>$case->sponsor->name_ar,'nameEn'=>$case->sponsor->name_en] : null,
            'patient'=>$patient ? [
                'id'=>$patient->id,'medicalSerial'=>$patient->medical_serial,'fullName'=>$patient->full_name,'idNumber'=>$patient->id_number,
                'dob'=>$patient->dob?->format('Y-m-d'),'gender'=>$patient->gender,'phone'=>$patient->phone,'city'=>$patient->city,'area'=>$patient->area,
                'coverageEntity'=>$patient->sponsor?->code ?? 'self','registeredAt'=>$patient->registered_at?->format('Y-m-d'),
            ] : null,
            'sessions'=>$case->relationLoaded('sessions') ? $case->sessions->map(fn($session)=>$this->sessionResource($session))->values() : [],
            'sessionCount'=>$case->relationLoaded('sessions') ? $case->sessions->count() : $case->sessions()->count(),
        ];
    }

    private function sessionResource(OutpatientPhysicalTherapySession $session): array
    {
        return [
            'id'=>$session->id,'caseId'=>$session->case_id,'patientId'=>$session->patient_id,'sessionNumber'=>(int)$session->session_number,
            'sessionDate'=>$session->session_date?->format('Y-m-d'),'appointmentAt'=>$session->appointment_at?->toISOString(),
            'therapist'=>$session->therapist,'specialist'=>$session->specialist,'treatments'=>$session->treatments ?? [],'notes'=>$session->notes,
        ];
    }
}
