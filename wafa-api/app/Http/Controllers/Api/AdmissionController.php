<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Admission, AdmissionRequest, InpatientNote, InpatientReport, InpatientTransaction, Patient, Sponsor};
use App\Services\{ApiResourceService, AuditService, PatientActivityService};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdmissionController extends Controller
{
    public function index(Request $request, ApiResourceService $resource)
    {
        $items = Admission::with(['patient','sponsor','transactions','notes.author','reports.author','responsible','doctor'])
            ->when($request->string('status')->toString(), fn($q,$status)=>$q->where('status',$status))
            ->latest('admission_date')->limit(500)->get();
        return response()->json(['data'=>$items->map(fn($item)=>array_merge($resource->admission($item),[
            'patient'=>['id'=>$item->patient->id,'fullName'=>$item->patient->full_name,'medicalSerial'=>$item->patient->medical_serial],
        ]))]);
    }

    public function requests(Request $request, ApiResourceService $resource)
    {
        $items = AdmissionRequest::with(['patient','visit','requester'])->when($request->string('status')->toString(),fn($q,$s)=>$q->where('status',$s))->latest('requested_at')->limit(500)->get();
        return response()->json(['data'=>$items->map(fn($item)=>$resource->admissionRequest($item))]);
    }

    public function requestAdmission(Request $request, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate([
            'patient_id'=>'required|uuid|exists:patients,id','source_visit_id'=>'nullable|uuid|exists:visits,id',
            'preferred_ward'=>'nullable|string|max:150','diagnosis'=>'required|string|max:5000','priority'=>'nullable|in:routine,urgent,emergency',
            'report_refs'=>'nullable|array','report_refs.*'=>'array',
            'report_refs.*.id'=>'required|string|max:150','report_refs.*.kind'=>'required|in:lab,radiology',
            'report_refs.*.title'=>'required|string|max:255','report_refs.*.date'=>'required|string|max:50',
        ]);
        abort_if(Admission::where('patient_id',$data['patient_id'])->where('status','admitted')->exists(),422,'Patient is already admitted.');
        abort_if(AdmissionRequest::where('patient_id',$data['patient_id'])->where('status','pending')->exists(),422,'Patient already has a pending admission request.');
        $item=AdmissionRequest::create([
            ...$data,'priority'=>$data['priority']??'routine','status'=>'pending','requested_by'=>$request->user()->id,'requested_at'=>now(),
        ]);
        $activity->event($item->patient_id,'admission_request','طلب تحويل للمبيت','تم تحويل المريض للمبيت. التشخيص: '.$item->diagnosis,'pending','admission_request',$item->id,$request->user()->id);
        $activity->notify('admissions.view',$item->patient_id,'admission_request','طلب مبيت جديد','يوجد مريض بانتظار قبول المبيت.','/admissions');
        $audit->record($request,'admission.requested','admission_request',$item->id,['patient_id'=>$item->patient_id,'report_refs'=>$item->report_refs]);
        return response()->json(['data'=>$resource->admissionRequest($item->load(['patient','visit']))],201);
    }

    public function cancelRequest(Request $request, AdmissionRequest $admissionRequest, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        abort_unless($admissionRequest->status==='pending',422,'Admission request is already resolved.');
        $admissionRequest->update(['status'=>'cancelled','resolved_at'=>now()]);
        $activity->event($admissionRequest->patient_id,'admission_request','إلغاء طلب المبيت','تم إلغاء طلب التحويل للمبيت.','cancelled','admission_request',$admissionRequest->id,$request->user()->id);
        $audit->record($request,'admission.request.cancelled','admission_request',$admissionRequest->id);
        return response()->json(['data'=>$resource->admissionRequest($admissionRequest)]);
    }

    public function store(Request $request, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate([
            'patient_id'=>'required|uuid|exists:patients,id','ward'=>'required|string|max:150','ward_type'=>'nullable|in:male,female','room'=>'nullable|string|max:80','bed'=>'nullable|string|max:80',
            'diagnosis'=>'required|string|max:5000','admission_date'=>'required|date','admission_time'=>'nullable|date','expected_discharge_date'=>'nullable|date',
            'coverage_entity'=>'nullable|string','contribution_pct'=>'required|numeric|min:0|max:100','daily_rate'=>'nullable|numeric|min:0',
            'marital_status'=>'nullable|string|max:80','address'=>'nullable|string|max:500','referral_hospital'=>'nullable|string|max:180','referring_doctor'=>'nullable|string|max:180',
            'responsible_user_id'=>'nullable|uuid|exists:users,id','attending_doctor_id'=>'nullable|uuid|exists:doctors,id',
            'source_visit_id'=>'nullable|uuid|exists:visits,id','request_id'=>'nullable|uuid|exists:admission_requests,id',
        ]);
        abort_if(Admission::where('patient_id',$data['patient_id'])->where('status','admitted')->exists(),422,'Patient is already admitted.');
        $admission=DB::transaction(function()use($data,$request,$activity){
            $patient=Patient::whereKey($data['patient_id'])->lockForUpdate()->firstOrFail();
            $s=isset($data['coverage_entity'])?Sponsor::where('id',$data['coverage_entity'])->orWhere('code',$data['coverage_entity'])->first():null;
            $item=Admission::create([
                'patient_id'=>$patient->id,'ward'=>$data['ward'],'ward_type'=>$data['ward_type']??null,'room'=>$data['room']??null,'bed'=>$data['bed']??null,'diagnosis'=>$data['diagnosis'],
                'admission_date'=>$data['admission_date'],'admission_time'=>$data['admission_time']??now(),'expected_discharge_date'=>$data['expected_discharge_date']??null,
                'coverage_entity_id'=>$s?->id,'contribution_pct'=>$data['contribution_pct'],'daily_rate'=>$data['daily_rate']??0,'status'=>'admitted',
                'admitted_by'=>$request->user()->id,'responsible_user_id'=>$data['responsible_user_id']??$request->user()->id,'attending_doctor_id'=>$data['attending_doctor_id']??null,
                'marital_status'=>$data['marital_status']??null,'address'=>$data['address']??null,'referral_hospital'=>$data['referral_hospital']??null,'referring_doctor'=>$data['referring_doctor']??null,
                'source_visit_id'=>$data['source_visit_id']??null,'request_id'=>$data['request_id']??null,
            ]);
            $share=round((float)$item->daily_rate*((float)$item->contribution_pct/100),2);
            if($share>0){
                $receipt='ADM-'.now()->format('YmdHis').'-'.substr((string)Str::uuid(),0,8);
                InpatientTransaction::create(['admission_id'=>$item->id,'patient_id'=>$patient->id,'type'=>'charge','category'=>'daily','amount'=>$share,'occurred_at'=>now(),'description'=>'رسوم أول يوم مبيت - '.$item->ward,'method'=>'wallet','receipt_number'=>$receipt,'created_by'=>$request->user()->id]);
                $activity->wallet($patient,'debit',$share,'مبيت: '.$item->ward,'wallet','admission',$item->id,$receipt,['category'=>'daily','day'=>1]);
            }
            if(!empty($data['request_id'])) AdmissionRequest::whereKey($data['request_id'])->where('status','pending')->update(['status'=>'accepted','resolved_at'=>now(),'admission_id'=>$item->id]);
            $activity->event($patient->id,'admission','بدء المبيت','تم إدخال المريض إلى '.$item->ward.($item->room?'، الغرفة '.$item->room:'').($item->bed?'، السرير '.$item->bed:''),'admitted','admission',$item->id,$request->user()->id);
            return $item;
        });
        $activity->notify('admissions.view',$admission->patient_id,'admission','تم إدخال مريض للمبيت','تم فتح حالة مبيت جديدة.','/admissions');
        $audit->record($request,'admission.created','admission',$admission->id);
        return response()->json(['data'=>$resource->admission($admission->load(['sponsor','transactions','notes','reports','responsible','doctor']))],201);
    }

    public function addTransaction(Request $request, Admission $admission, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate(['type'=>'required|in:charge,payment','category'=>'nullable|in:daily,service,payment','amount'=>'required|numeric|min:0.01','description'=>'required|string|max:255','method'=>'nullable|string|max:80']);
        $tx=DB::transaction(function()use($data,$admission,$request,$activity){
            $patient=Patient::whereKey($admission->patient_id)->lockForUpdate()->firstOrFail();
            $receipt='IPT-'.now()->format('YmdHis').'-'.substr((string)Str::uuid(),0,8);
            $tx=InpatientTransaction::create(['admission_id'=>$admission->id,'patient_id'=>$patient->id,'type'=>$data['type'],'category'=>$data['category']??($data['type']==='payment'?'payment':'service'),'amount'=>$data['amount'],'occurred_at'=>now(),'description'=>$data['description'],'method'=>$data['method']??'wallet','receipt_number'=>$receipt,'created_by'=>$request->user()->id]);
            $direction=$data['type']==='charge'?'debit':'credit';
            $activity->wallet($patient,$direction,(float)$data['amount'],$data['description'],$data['method']??'wallet','admission',$admission->id,$receipt,['inpatient_transaction_id'=>$tx->id]);
            $activity->event($patient->id,'finance',$data['type']==='charge'?'حركة مالية مبيت - خصم':'حركة مالية مبيت - دفعة',$data['description'].' - '.number_format((float)$data['amount'],2),'posted','admission',$admission->id,$request->user()->id);
            return $tx;
        });
        $audit->record($request,'admission.transaction.created','inpatient_transaction',$tx->id);
        return response()->json(['data'=>$resource->inpatientTransaction($tx)],201);
    }

    public function addNote(Request $request, Admission $admission, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate(['category'=>'nullable|string|max:50','note'=>'required|string|max:10000']);
        $note=InpatientNote::create(['admission_id'=>$admission->id,'patient_id'=>$admission->patient_id,'category'=>$data['category']??'administrative','note'=>$data['note'],'authored_by'=>$request->user()->id,'noted_at'=>now()]);
        $activity->event($admission->patient_id,'note','ملاحظة مبيت',$note->note,'recorded','admission',$admission->id,$request->user()->id);
        $audit->record($request,'admission.note.created','inpatient_note',$note->id);
        return response()->json(['data'=>$resource->inpatientNote($note->load('author'))],201);
    }

    public function addReport(Request $request, Admission $admission, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        $data=$request->validate(['type'=>'nullable|string|max:80','title'=>'required|string|max:200','summary'=>'required|string|max:20000','report_date'=>'nullable|date']);
        $report=InpatientReport::create(['admission_id'=>$admission->id,'patient_id'=>$admission->patient_id,'type'=>$data['type']??'progress','title'=>$data['title'],'summary'=>$data['summary'],'authored_by'=>$request->user()->id,'report_date'=>$data['report_date']??today()]);
        $activity->event($admission->patient_id,'report',$report->title,$report->summary,'filed','inpatient_report',$report->id,$request->user()->id);
        $activity->notify('admissions.view',$admission->patient_id,'report','تقرير مبيت جديد',$report->title,'/patients/'.$admission->patient_id);
        $audit->record($request,'admission.report.created','inpatient_report',$report->id);
        return response()->json(['data'=>$resource->inpatientReport($report->load('author'))],201);
    }

    public function syncCharges(Request $request, Admission $admission, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        abort_unless($admission->status==='admitted',422,'Patient is discharged.');
        $this->applyMissingDailyCharges($admission,$request->user()->id,$activity);
        $audit->record($request,'admission.daily_charges.synced','admission',$admission->id);
        return response()->json(['data'=>$resource->admission($admission->fresh()->load(['sponsor','transactions','notes','reports','responsible','doctor']))]);
    }

    public function discharge(Request $request, Admission $admission, ApiResourceService $resource, AuditService $audit, PatientActivityService $activity)
    {
        abort_unless($admission->status==='admitted',422,'Patient is already discharged.');
        DB::transaction(function()use($admission,$request,$activity){
            $this->applyMissingDailyCharges($admission,$request->user()->id,$activity);
            $admission->update(['status'=>'discharged','discharged_at'=>now(),'discharged_by'=>$request->user()->id]);
            $activity->event($admission->patient_id,'discharge','خروج من المبيت','تم إنهاء حالة المبيت والخروج من '.$admission->ward.'.','completed','admission',$admission->id,$request->user()->id);
        });
        $activity->notify('admissions.view',$admission->patient_id,'discharge','تم خروج مريض من المبيت','تم إغلاق حالة المبيت.','/admissions');
        $audit->record($request,'admission.discharged','admission',$admission->id);
        return response()->json(['data'=>$resource->admission($admission->fresh()->load(['sponsor','transactions','notes','reports','responsible','doctor']))]);
    }

    private function applyMissingDailyCharges(Admission $admission, ?string $userId, PatientActivityService $activity): void
    {
        $admission->refresh();
        $start=Carbon::parse($admission->admission_date)->startOfDay();
        $days=max(1,$start->diffInDays(now()->startOfDay())+1);
        $charged=(int)$admission->transactions()->where('type','charge')->where('category','daily')->count();
        $share=round((float)$admission->daily_rate*((float)$admission->contribution_pct/100),2);
        if($share<=0||$charged >= $days) return;
        $patient=Patient::whereKey($admission->patient_id)->lockForUpdate()->firstOrFail();
        for($day=$charged+1;$day<=$days;$day++){
            $receipt='ADM-'.now()->format('YmdHis').'-'.$day.'-'.substr((string)Str::uuid(),0,6);
            $description='رسوم مبيت - اليوم '.$day.' - '.$admission->ward;
            InpatientTransaction::create(['admission_id'=>$admission->id,'patient_id'=>$patient->id,'type'=>'charge','category'=>'daily','amount'=>$share,'occurred_at'=>now(),'description'=>$description,'method'=>'wallet','receipt_number'=>$receipt,'created_by'=>$userId]);
            $activity->wallet($patient,'debit',$share,$description,'wallet','admission',$admission->id,$receipt,['category'=>'daily','day'=>$day]);
        }
        $activity->event($patient->id,'finance','تحديث رسوم المبيت','تم احتساب رسوم المبيت حتى اليوم.','posted','admission',$admission->id,$userId);
    }
}
