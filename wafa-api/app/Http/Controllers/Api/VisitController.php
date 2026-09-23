<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{CashierWorkflowCase, Clinic, Doctor, DoctorNote, FollowUpAppointment, Patient, QueueItem, Visit};
use App\Services\{ApiResourceService, AuditService, PatientActivityService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class VisitController extends Controller
{
    public function index(Request $request, ApiResourceService $resource)
    {
        $data=$request->validate(['date'=>'nullable|date','doctor_id'=>'nullable|uuid','patient_id'=>'nullable|uuid']);
        $q=Visit::latest('visit_date');
        foreach(['doctor_id','patient_id'] as $key)$q->when($data[$key]??null,fn($x,$v)=>$x->where($key,$v));
        $q->when($data['date']??null,fn($x,$v)=>$x->whereDate('visit_date',$v));
        return response()->json(['data'=>$q->limit(500)->get()->map(fn($x)=>$resource->visit($x))]);
    }

    public function store(Request $request, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate(['patient_id'=>'required|uuid|exists:patients,id','clinic_id'=>'required|uuid|exists:clinics,id','doctor_id'=>'required|uuid|exists:doctors,id','visit_date'=>'required|date','notes'=>'nullable|string|max:5000','appointment_id'=>'nullable|uuid|exists:follow_up_appointments,id']);
        $visit=DB::transaction(function()use($data,$request,$activity){
            $patient=Patient::whereKey($data['patient_id'])->lockForUpdate()->firstOrFail();
            $clinic=Clinic::whereKey($data['clinic_id'])->where('active',true)->whereIn('kind',['outpatient','mixed'])->firstOrFail();
            $doctor=Doctor::whereKey($data['doctor_id'])->where('active',true)->firstOrFail();
            abort_unless($doctor->clinics()->whereKey($clinic->id)->exists(),422,'The doctor is not assigned to this clinic.');
            $appointment=null;
            if(!empty($data['appointment_id'])){
                $appointment=FollowUpAppointment::whereKey($data['appointment_id'])->lockForUpdate()->firstOrFail();
                abort_unless($appointment->patient_id===$patient->id && $appointment->doctor_id===$doctor->id && $appointment->clinic_id===$clinic->id,422,'Appointment details do not match.');
                abort_unless($appointment->status==='scheduled' && $appointment->appointment_date->format('Y-m-d')===$data['visit_date'],422,'Follow-up can only be booked on its scheduled day.');
            }
            $queueNumber=(int)Visit::where('doctor_id',$doctor->id)->whereDate('visit_date',$data['visit_date'])->lockForUpdate()->max('queue_number')+1;
            $visit=Visit::create(['patient_id'=>$patient->id,'clinic_id'=>$clinic->id,'doctor_id'=>$doctor->id,'fee'=>$clinic->visit_fee,'visit_date'=>$data['visit_date'],'notes'=>$data['notes']??'','queue_number'=>$queueNumber,'status'=>'waiting','appointment_id'=>$appointment?->id]);
            QueueItem::create(['visit_id'=>$visit->id,'patient_id'=>$patient->id,'clinic_id'=>$clinic->id,'doctor_id'=>$doctor->id,'queue_date'=>$data['visit_date'],'queue_number'=>$queueNumber,'status'=>'waiting','priority'=>3,'updated_by'=>$request->user()->id,'added_at'=>now()]);
            $registrationOnly = $request->user()?->role === 'cashier';
            if (!$registrationOnly && (float)$clinic->visit_fee > 0) {
                $activity->wallet($patient,'debit',(float)$clinic->visit_fee,'زيارة عيادة: '.$clinic->name_ar,'wallet','visit',$visit->id,null,['clinic_id'=>$clinic->id,'doctor_id'=>$doctor->id]);
            }
            if($appointment)$appointment->update(['status'=>'booked','booked_visit_id'=>$visit->id]);

            $activity->event(
                $patient->id,
                'visit',
                'تسجيل زيارة عيادة',
                $registrationOnly
                    ? 'تم تسجيل زيارة في '.$clinic->name_ar.'، رقم الدور '.$queueNumber.'، وبانتظار التحصيل المالي.'
                    : 'تم تسجيل زيارة في '.$clinic->name_ar.'، رقم الدور '.$queueNumber.'.',
                'waiting',
                'visit',
                $visit->id,
                $request->user()->id
            );

            if (Schema::hasTable('cashier_workflow_cases') && $request->user()?->hasPermission('visits.create')) {
                CashierWorkflowCase::updateOrCreate(
                    ['visit_id' => $visit->id, 'patient_id' => $patient->id],
                    [
                        'id' => 'CWF-'.$visit->id,
                        'patient_name' => $patient->full_name,
                        'medical_serial' => $patient->medical_serial,
                        'id_number' => $patient->id_number,
                        'patient_phone' => $patient->phone,
                        'patient_dob' => $patient->dob?->format('Y-m-d'),
                        'patient_gender' => $patient->gender,
                        'patient_city' => $patient->city,
                        'patient_area' => $patient->area,
                        'coverage_entity' => $patient->sponsor?->code,
                        'clinic_id' => $clinic->id,
                        'clinic_name' => $clinic->name_ar,
                        'clinic_code' => $clinic->code ?: strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $clinic->key), 0, 4)) ?: 'CLN',
                        'doctor_id' => $doctor->id,
                        'doctor_name' => $doctor->name,
                        'visit_date' => $data['visit_date'],
                        'registered_at' => now(),
                        'queue_number' => $queueNumber,
                        'amount' => (float)$clinic->visit_fee,
                        'status' => 'registered',
                        'notes' => $data['notes'] ?? '',
                        'registered_by' => $request->user()->id,
                    ]
                );
            }

            return $visit;
        });
        $audit->record($request,'visit.created','visit',$visit->id,['queue_number'=>$visit->queue_number]);
        return response()->json(['data'=>$resource->visit($visit)],201);
    }

    public function queue(Request $request, ApiResourceService $resource)
    {
        $data=$request->validate(['date'=>'nullable|date','doctor_id'=>'nullable|uuid']);
        $q=QueueItem::whereDate('queue_date',$data['date']??today())->orderBy('priority')->orderBy('queue_number');
        $q->when($data['doctor_id']??null,fn($x,$v)=>$x->where('doctor_id',$v));
        return response()->json(['data'=>$q->get()->map(fn($x)=>$resource->queue($x))]);
    }

    public function updateQueue(Request $request, QueueItem $queueItem, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate(['status'=>'sometimes|in:waiting,exam,completed','queue_number'=>'sometimes|integer|min:1|max:9999','priority'=>'sometimes|integer|min:1|max:5','triage_note'=>'nullable|string|max:5000']);
        if($request->user()->role==='doctor')abort_unless($request->user()->doctor?->id===$queueItem->doctor_id,403);
        DB::transaction(function()use($queueItem,$data,$request,$activity){
            if(isset($data['queue_number']) && (int)$data['queue_number'] !== (int)$queueItem->queue_number){
                $target=QueueItem::where('doctor_id',$queueItem->doctor_id)->whereDate('queue_date',$queueItem->queue_date)->where('queue_number',$data['queue_number'])->whereKeyNot($queueItem->id)->lockForUpdate()->first();
                if($target){
                    $old=(int)$queueItem->queue_number;
                    $temp=(int)QueueItem::where('doctor_id',$queueItem->doctor_id)->whereDate('queue_date',$queueItem->queue_date)->max('queue_number')+10000;
                    $queueItem->update(['queue_number'=>$temp]);
                    $target->update(['queue_number'=>$old,'updated_by'=>$request->user()->id]);
                }
            }
            $queueItem->update(array_merge($data,['updated_by'=>$request->user()->id]));
            $visitPatch=[];
            if(isset($data['status'])){
                $visitPatch['status']=$data['status'];
                if($data['status']==='completed')$visitPatch['completed_at']=now();
            }
            if(isset($data['queue_number']))$visitPatch['queue_number']=$data['queue_number'];
            if($visitPatch)$queueItem->visit()->update($visitPatch);
            if(($data['status']??null)==='completed'){
                $activity->event($queueItem->patient_id,'queue','اكتمال دور المريض','تم إنهاء دور المريض في الطابور والفرز.','completed','visit',$queueItem->visit_id,$request->user()->id);
                $activity->notify('queue.view',$queueItem->patient_id,'queue','اكتملت حالة في الطابور','تم إنهاء خدمة المريض في الطابور.','/queue');
            } elseif(isset($data['priority']) || array_key_exists('triage_note',$data) || isset($data['queue_number'])) {
                $activity->event($queueItem->patient_id,'queue','تحديث الفرز والطابور',$data['triage_note']??'تم تعديل أولوية أو رقم الدور.','updated','visit',$queueItem->visit_id,$request->user()->id);
            }
        });
        $audit->record($request,'queue.updated','queue_item',$queueItem->id,$data);
        return response()->json(['data'=>$resource->queue($queueItem->fresh())]);
    }

    public function doctorToday(Request $request, ApiResourceService $resource)
    {
        $doctor=$request->user()->doctor; abort_unless($doctor,403);
        $targetDate=today()->toDateString();
        $recentCutoff=now()->subHours(36);

        // Repair/bridge any registered/paid workflow case that belongs to this doctor. In earlier
        // builds the browser could save the visit date with UTC, so a case registered
        // just after midnight locally was stored as yesterday. Keep those cases visible
        // instead of losing them from the doctor's daily queue.
        $normaliseName = fn ($value) => str_replace(['أ','إ','آ','ة','ى'], ['ا','ا','ا','ه','ي'], preg_replace('/\s+|د\.?|الدكتور/u', '', trim((string) $value)) ?? '');
        $doctorNameKey = $normaliseName($doctor->name);
        $candidateCases=CashierWorkflowCase::whereIn('status',['registered','paid','collected','audited'])
            ->where(function($q)use($targetDate,$recentCutoff){
                $q->whereDate('visit_date',$targetDate)
                  ->orWhere('registered_at','>=',$recentCutoff)
                  ->orWhere('paid_at','>=',$recentCutoff)
                  ->orWhere('collected_at','>=',$recentCutoff);
            })
            ->get()
            ->filter(function($case)use($doctor,$normaliseName,$doctorNameKey){
                return $case->doctor_id === $doctor->id
                    || $case->doctor_id === $doctor->staff_id
                    || $normaliseName($case->doctor_name) === $doctorNameKey;
            })
            ->values();

        $workflowController = app(CashierWorkflowController::class);
        $candidateCases->each(fn($case) => $workflowController->ensureDoctorVisitAndQueue($case));

        // Re-read after the repair above. Some old cases did not have visit_id/queue rows
        // before this request; using the stale collection hid them until another refresh.
        $candidateCases=CashierWorkflowCase::whereIn('status',['registered','paid','collected','audited'])
            ->where(function($q)use($targetDate,$recentCutoff){
                $q->whereDate('visit_date',$targetDate)
                  ->orWhere('registered_at','>=',$recentCutoff)
                  ->orWhere('paid_at','>=',$recentCutoff)
                  ->orWhere('collected_at','>=',$recentCutoff);
            })
            ->get()
            ->filter(function($case)use($doctor,$normaliseName,$doctorNameKey){
                return $case->doctor_id === $doctor->id
                    || $case->doctor_id === $doctor->staff_id
                    || $normaliseName($case->doctor_name) === $doctorNameKey;
            })
            ->values();
        $eligibleVisitIds=$candidateCases->pluck('visit_id')->filter()->unique()->values();

        $items=QueueItem::with(['patient','visit','clinic'])
            ->where('doctor_id',$doctor->id)
            ->where(function($q)use($targetDate,$eligibleVisitIds){
                $q->whereDate('queue_date',$targetDate);
                if($eligibleVisitIds->isNotEmpty()) $q->orWhereIn('visit_id',$eligibleVisitIds);
            })
            ->whereHas('visit',fn($q)=>$q->where('status','!=','completed'))
            ->orderBy('priority')->orderBy('queue_number')->get();

        $workflows=CashierWorkflowCase::whereIn('visit_id',$items->pluck('visit_id')->filter()->values())
            ->get()->keyBy('visit_id');

        $visible=$items->filter(function($item)use($workflows){
            $workflow=$workflows[$item->visit_id]??null;
            if(!$workflow) return true; // legacy/non-cashier visits remain visible
            return in_array($workflow->status,['registered','paid','collected','audited'],true);
        })->values();

        return response()->json(['data'=>$visible->map(function($x)use($resource,$workflows){
            $workflow=$workflows[$x->visit_id]??null;
            return array_merge($resource->queue($x),[
                'patient'=>[
                    'id'=>$x->patient->id,'fullName'=>$x->patient->full_name,'medicalSerial'=>$x->patient->medical_serial,
                    'idNumber'=>$x->patient->id_number,'phone'=>$x->patient->phone,
                ],
                'clinic'=>[
                    'id'=>$x->clinic?->id,'nameAr'=>$x->clinic?->name_ar,'nameEn'=>$x->clinic?->name_en,
                    'code'=>$x->clinic?->code ?: strtoupper(substr(preg_replace('/[^A-Za-z0-9]/','',$x->clinic?->key ?? ''),0,4)) ?: 'CLN',
                ],
                'visit'=>$resource->visit($x->visit),
                'payment'=>[
                    'confirmed'=>!$workflow || in_array($workflow->status,['paid','collected','audited'],true),
                    'workflowStatus'=>$workflow?->status ?? 'legacy',
                    'amount'=>(float)($workflow?->amount ?? $x->visit?->fee ?? 0),
                    'receiptNumber'=>$workflow?->receipt_number,
                    'paymentSource'=>$workflow?->payment_source,
                    'collectedAt'=>$workflow?->collected_at?->toISOString(),
                ],
            ]);
        })->values()]);
    }

    public function doctorPast(Request $request, ApiResourceService $resource)
    {
        $doctor=$request->user()->doctor; abort_unless($doctor,403);
        $data=$request->validate(['date'=>'nullable|date']);
        $q=Visit::with(['patient','clinic'])->where('doctor_id',$doctor->id)->where('status','completed')->latest('completed_at');
        $q->when($data['date']??null,fn($x,$v)=>$x->whereDate('visit_date',$v));
        return response()->json(['data'=>$q->limit(500)->get()->map(fn($x)=>array_merge($resource->visit($x),[
            'patient'=>['id'=>$x->patient->id,'fullName'=>$x->patient->full_name,'medicalSerial'=>$x->patient->medical_serial,'idNumber'=>$x->patient->id_number,'phone'=>$x->patient->phone],
            'clinic'=>['id'=>$x->clinic?->id,'nameAr'=>$x->clinic?->name_ar,'nameEn'=>$x->clinic?->name_en,'code'=>$x->clinic?->code],
        ]))]);
    }

    public function dueFollowUps(Request $request, ApiResourceService $resource)
    {
        $data=$request->validate(['date'=>'nullable|date','patient_id'=>'nullable|uuid']);
        $items=FollowUpAppointment::with(['patient','clinic'])
            ->where('status','scheduled')
            ->when($data['patient_id']??null,fn($q,$v)=>$q->where('patient_id',$v),fn($q)=>$q->whereDate('appointment_date',$data['date']??today()))
            ->orderBy('appointment_date')
            ->get();
        return response()->json(['data'=>$items->map(fn($x)=>array_merge($resource->appointment($x),[
            'patient'=>['id'=>$x->patient->id,'fullName'=>$x->patient->full_name,'medicalSerial'=>$x->patient->medical_serial,'idNumber'=>$x->patient->id_number,'phone'=>$x->patient->phone],
            'clinic'=>['id'=>$x->clinic?->id,'nameAr'=>$x->clinic?->name_ar,'nameEn'=>$x->clinic?->name_en,'code'=>$x->clinic?->code],
        ]))]);
    }

    public function doctorFollowUps(Request $request, ApiResourceService $resource)
    {
        $doctor=$request->user()->doctor; abort_unless($doctor,403);
        $data=$request->validate(['date'=>'nullable|date']);
        $items=FollowUpAppointment::with(['patient','clinic'])
            ->where('doctor_id',$doctor->id)
            ->whereIn('status',['scheduled','booked','completed'])
            ->when($data['date']??null,fn($q,$v)=>$q->whereDate('appointment_date',$v),fn($q)=>$q->whereDate('appointment_date','>=',today()->subDays(30))->whereDate('appointment_date','<=',today()->addDays(60)))
            ->orderByDesc('appointment_date')->get();
        return response()->json(['data'=>$items->map(fn($x)=>array_merge($resource->appointment($x),[
            'patient'=>['id'=>$x->patient->id,'fullName'=>$x->patient->full_name,'medicalSerial'=>$x->patient->medical_serial,'idNumber'=>$x->patient->id_number,'phone'=>$x->patient->phone],
            'clinic'=>['id'=>$x->clinic?->id,'nameAr'=>$x->clinic?->name_ar,'nameEn'=>$x->clinic?->name_en,'code'=>$x->clinic?->code],
        ]))]);
    }

    public function finish(Request $request, Visit $visit, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $doctor=$request->user()->doctor; abort_unless($doctor && $doctor->id===$visit->doctor_id,403); abort_if($visit->status==='completed',422,'Visit is already completed.');
        $data=$request->validate([
            'diagnosis'=>'required|string|max:20000',
            'follow_up_mode'=>'nullable|in:week,custom,none',
            'follow_up_date'=>'nullable|date|after_or_equal:today',
            'follow_up_notes'=>'nullable|string|max:5000',
        ]);

        $mode=$data['follow_up_mode'] ?? 'week';
        abort_if($mode==='custom' && empty($data['follow_up_date']),422,'Follow-up date is required.');
        $followDate=$mode==='none' ? null : ($mode==='custom' ? $data['follow_up_date'] : today()->addDays(7)->toDateString());
        $appointment=null;

        DB::transaction(function()use($visit,$request,$activity,$data,$mode,$followDate,&$appointment){
            if($visit->appointment_id) FollowUpAppointment::whereKey($visit->appointment_id)->update(['status'=>'completed']);

            if($followDate){
                $appointment=FollowUpAppointment::create([
                    'patient_id'=>$visit->patient_id,'doctor_id'=>$visit->doctor_id,'clinic_id'=>$visit->clinic_id,
                    'source_visit_id'=>$visit->id,'appointment_date'=>$followDate,'status'=>'scheduled',
                    'reason'=>$data['follow_up_notes'] ?? ($mode==='week'?'مراجعة تلقائية بعد أسبوع':'مراجعة مجدولة حسب قرار الطبيب'),
                    'created_by'=>$request->user()->id,
                ]);
            }

            $visit->update([
                'status'=>'completed','completed_at'=>now(),'diagnosis'=>$data['diagnosis'],
                'follow_up_date'=>$followDate,'follow_up_notes'=>$data['follow_up_notes'] ?? null,
            ]);
            $visit->queueItem()?->update(['status'=>'completed','updated_by'=>$request->user()->id]);

            DoctorNote::create([
                'doctor_id'=>$visit->doctor_id,'patient_id'=>$visit->patient_id,'visit_id'=>$visit->id,
                'content'=>'تشخيص الزيارة: '.$data['diagnosis'].($followDate ? "\nالمراجعة: {$followDate}" : "\nلا توجد مراجعة مطلوبة"),
            ]);

            $summary='تم إنهاء الحالة وتسجيل التشخيص.';
            if($followDate) $summary.=' وتم جدولة مراجعة بتاريخ '.$followDate.'.';
            else $summary.=' ولا توجد مراجعة لاحقة.';
            $activity->event($visit->patient_id,'visit','إنهاء الحالة وتسجيل التشخيص',$summary,'completed','visit',$visit->id,$request->user()->id);
            if($followDate){
                $activity->event($visit->patient_id,'visit','مراجعة مجدولة',$data['follow_up_notes'] ?: 'مراجعة متابعة لدى الطبيب بتاريخ '.$followDate,'scheduled','follow_up',$appointment?->id,$request->user()->id);
                $activity->notify('visits.create',$visit->patient_id,'info','مراجعة مجدولة للمريض','تم تحديد مراجعة بتاريخ '.$followDate.' وستظهر لموظف التسجيل عند فتح المريض.','/registration');
            }
        });

        $fresh=$visit->fresh();
        $audit->record($request,'visit.finished','visit',$visit->id,['follow_up_date'=>$fresh->follow_up_date?->format('Y-m-d'),'has_follow_up'=>(bool)$appointment]);
        $payload=$resource->visit($fresh);
        $payload['appointment']=$appointment?$resource->appointment($appointment):null;
        return response()->json(['data'=>$payload]);
    }
}
