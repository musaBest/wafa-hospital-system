<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{CashierWorkflowCase, Patient, Sponsor};
use App\Services\{ApiResourceService, AuditService, CivilRegistryService, PatientSerialService, TrashService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PatientController extends Controller
{
    public function registrationLookup(Request $request, ApiResourceService $resource)
    {
        $data = $request->validate(['search' => 'required|string|min:1|max:150']);
        $needle = trim($data['search']);

        $workflowCases = CashierWorkflowCase::query()
            ->where(function ($q) use ($needle) {
                $q->where('patient_name', 'like', "%{$needle}%")
                    ->orWhere('id_number', 'like', "%{$needle}%")
                    ->orWhere('medical_serial', 'like', "%{$needle}%")
                    ->orWhere('patient_phone', 'like', "%{$needle}%");
            })
            ->latest('registered_at')
            ->limit(100)
            ->get();

        $workflowPatientIds = $workflowCases->pluck('patient_id')->filter()->unique()->values();

        $patients = Patient::with(['sponsor','appointments'])
            ->where(function ($q) use ($needle, $workflowPatientIds) {
                $q->where('full_name', 'like', "%{$needle}%")
                    ->orWhere('id_number', 'like', "%{$needle}%")
                    ->orWhere('medical_serial', 'like', "%{$needle}%")
                    ->orWhere('phone', 'like', "%{$needle}%");
                if ($workflowPatientIds->isNotEmpty()) {
                    $q->orWhereIn('id', $workflowPatientIds);
                }
            })
            ->latest('registered_at')
            ->limit(50)
            ->get();

        $rows = $patients->map(fn ($patient) => $resource->patient($patient, $request->user()))->values();
        $seen = $rows->pluck('id')->filter()->values()->all();

        foreach ($workflowCases as $case) {
            if ($case->patient_id && in_array($case->patient_id, $seen, true)) continue;
            $rows->push([
                'id' => $case->patient_id ?: 'workflow-'.$case->id,
                'medicalSerial' => $case->medical_serial ?: '—',
                'fullName' => $case->patient_name ?: 'مريض غير مسمى',
                'idNumber' => $case->id_number ?: '',
                'dob' => $case->patient_dob?->format('Y-m-d') ?: '',
                'gender' => in_array($case->patient_gender, ['male','female'], true) ? $case->patient_gender : 'male',
                'phone' => $case->patient_phone ?: '',
                'city' => $case->patient_city ?: '',
                'area' => $case->patient_area ?: '',
                'coverageEntity' => $case->coverage_entity ?: 'self',
                'regDate' => $case->visit_date?->format('Y-m-d') ?: $case->registered_at?->format('Y-m-d') ?: today()->toDateString(),
                'findings' => [],
                'walletBalance' => 0,
                'ledger' => [],
                'appointments' => [],
            ]);
        }

        return response()->json(['data' => $rows->values()]);
    }

    public function index(Request $request, ApiResourceService $resource)
    {
        $data=$request->validate(['search'=>'nullable|string|max:150','sponsor'=>'nullable|string','age_min'=>'nullable|integer|min:0|max:120','age_max'=>'nullable|integer|min:0|max:120','per_page'=>'nullable|integer|min:1|max:100']);
        $query=Patient::with(['sponsor','findings','appointments'])->latest('registered_at');
        $query->when($data['search']??null,fn($q,$v)=>$q->where(fn($x)=>$x->where('full_name','like',"%$v%")->orWhere('id_number','like',"%$v%")->orWhere('medical_serial','like',"%$v%")));
        $query->when($data['sponsor']??null,fn($q,$v)=>$q->whereHas('sponsor',fn($x)=>$x->where('id',$v)->orWhere('code',$v)));
        if(isset($data['age_min']))$query->whereDate('dob','<=',now()->subYears($data['age_min'])->toDateString());
        if(isset($data['age_max']))$query->whereDate('dob','>=',now()->subYears($data['age_max']+1)->addDay()->toDateString());
        $page=$query->paginate($data['per_page']??25);
        return response()->json(['data'=>$page->getCollection()->map(fn($p)=>$resource->patient($p,$request->user())),'meta'=>['current_page'=>$page->currentPage(),'last_page'=>$page->lastPage(),'total'=>$page->total()]]);
    }

    public function store(Request $request, CivilRegistryService $registry, PatientSerialService $serial, ApiResourceService $resource, AuditService $audit)
    {
        $input=$request->validate(['identity_or_name'=>'required|string|min:2|max:150','phone'=>'required|string|min:7|max:30','registry_data'=>'nullable|array']);
        $record=config('services.civil_registry.mock') === false
            ? $registry->lookup($input['identity_or_name'])
            : ($input['registry_data']??$registry->lookup($input['identity_or_name']));
        $record=Validator::make($record,['fullName'=>'required|string|max:150','idNumber'=>'required|string|max:30|unique:patients,id_number','dob'=>'required|date|before_or_equal:today','gender'=>'required|in:male,female','city'=>'nullable|string|max:100','area'=>'nullable|string|max:150','coverageEntity'=>'nullable|string|max:100'])->validate();
        $patient=DB::transaction(function()use($record,$input,$serial){
            $sponsor=Sponsor::where('id',$record['coverageEntity']??'')->orWhere('code',$record['coverageEntity']??'self')->first() ?? Sponsor::where('code','self')->first();
            return Patient::create(['medical_serial'=>$serial->next($record['gender'],(int)date('Y')),'full_name'=>$record['fullName'],'id_number'=>$record['idNumber'],'dob'=>$record['dob'],'gender'=>$record['gender'],'phone'=>$input['phone'],'city'=>$record['city']??null,'area'=>$record['area']??null,'coverage_entity_id'=>$sponsor?->id,'registered_at'=>today(),'wallet_balance'=>0,'civil_registry_verified_at'=>now()]);
        });
        $audit->record($request,'patient.created','patient',$patient->id);
        return response()->json(['data'=>$resource->patient($patient->load(['sponsor','findings','appointments','ledger']),$request->user())],201);
    }

    public function show(Request $request, Patient $patient, ApiResourceService $resource)
    {
        $patient->load([
            'sponsor','findings','appointments','events',
            'admissionRequests.patient','admissionRequests.requester',
            'admissions.sponsor','admissions.transactions','admissions.notes.author','admissions.reports.author','admissions.responsible','admissions.doctor',
            'labOrders.service','labOrders.doctor','radiologyOrders.service','radiologyOrders.doctor',
        ]);
        if($request->user()->hasPermission('patient_finance.view'))$patient->load('ledger');
        $data = $resource->patient($patient,$request->user());
        $data['admissionRequests'] = $patient->admissionRequests->map(fn($item)=>$resource->admissionRequest($item))->values();
        $data['admissions'] = $patient->admissions->map(fn($item)=>$resource->admission($item))->values();
        $data['labReports'] = $patient->labOrders->map(fn($order)=>['id'=>$order->id,'serviceId'=>$order->service_id,'serviceName'=>$order->service?->name_ar ?? $order->category,'doctorId'=>$order->doctor_id,'doctorName'=>$order->doctor?->name,'date'=>$order->ordered_at?->toISOString(),'status'=>$order->status,'resultRows'=>$order->result_rows,'notes'=>$order->notes,'completedAt'=>$order->completed_at?->toISOString(),'reportNumber'=>$order->report_number]);
        $data['radiologyFiles'] = $patient->radiologyOrders->map(fn($order)=>['id'=>$order->id,'serviceId'=>$order->service_id,'exam'=>$order->service?->name_ar ?? $order->exam,'doctorId'=>$order->doctor_id,'doctorName'=>$order->doctor?->name,'date'=>$order->ordered_at?->toISOString(),'status'=>$order->status,'result'=>$order->result,'completedAt'=>$order->completed_at?->toISOString()]);
        return response()->json(['data'=>$data]);
    }

    public function update(Request $request, Patient $patient, ApiResourceService $resource, AuditService $audit)
    {
        $data=$request->validate([
            'full_name'=>'sometimes|required|string|max:150','id_number'=>'sometimes|required|string|max:30|unique:patients,id_number,'.$patient->id,
            'dob'=>'sometimes|required|date|before_or_equal:today','gender'=>'sometimes|required|in:male,female','phone'=>'sometimes|required|string|min:7|max:30',
            'city'=>'nullable|string|max:100','area'=>'nullable|string|max:150','sponsor_id'=>'nullable|string',
        ]);
        if(array_key_exists('sponsor_id',$data)){
            $sponsor=Sponsor::where('id',$data['sponsor_id'])->orWhere('code',$data['sponsor_id'])->first();
            $data['coverage_entity_id']=$sponsor?->id; unset($data['sponsor_id']);
        }
        $patient->update($data);
        $audit->record($request,'patient.updated','patient',$patient->id,array_keys($data));
        return response()->json(['data'=>$resource->patient($patient->fresh()->load(['sponsor','findings','appointments']),$request->user())]);
    }

    public function destroy(Request $request, Patient $patient, AuditService $audit, TrashService $trash)
    {
        abort_if($request->user()?->isPrimaryCashier(), 422, 'لا يمكن حذف ملف المريض المرجعي من حساب مهندس محمد.');
        $patient->load(['sponsor','findings','admissions','visits','invoices','labOrders','radiologyOrders']);
        $trash->capture($request, $patient, 'patient', $patient->full_name.' · '.$patient->medical_serial, [
            'medical_serial'=>$patient->medical_serial,
            'id_number'=>$patient->id_number,
            'section'=>'patients',
        ]);
        $audit->record($request,'patient.deleted','patient',$patient->id,['medical_serial'=>$patient->medical_serial,'id_number'=>$patient->id_number]);
        $patient->delete();
        return response()->json(['ok'=>true]);
    }

    public function updateCoverage(Request $request, Patient $patient, ApiResourceService $resource, AuditService $audit)
    {
        $data=$request->validate(['sponsor_id'=>'required|string']);
        $sponsor=Sponsor::where('id',$data['sponsor_id'])->orWhere('code',$data['sponsor_id'])->firstOrFail();
        $patient->update(['coverage_entity_id'=>$sponsor->id]);
        $audit->record($request,'patient.coverage.updated','patient',$patient->id,['sponsor_id'=>$sponsor->id]);
        return response()->json(['data'=>$resource->patient($patient->fresh()->load(['sponsor','findings','appointments']),$request->user())]);
    }

    public function addFinding(Request $request, Patient $patient, AuditService $audit)
    {
        $data=$request->validate(['region'=>'required|string|max:150','note'=>'required|string|max:5000','date'=>'nullable|date']);
        $finding=$patient->findings()->create(['region'=>$data['region'],'note'=>$data['note'],'finding_date'=>$data['date']??today(),'created_by'=>$request->user()->id]);
        $audit->record($request,'patient.finding.created','finding',$finding->id,['patient_id'=>$patient->id]);
        return response()->json(['data'=>['id'=>$finding->id,'region'=>$finding->region,'note'=>$finding->note,'date'=>$finding->finding_date->format('Y-m-d')]],201);
    }

    public function ledger(Request $request, Patient $patient, ApiResourceService $resource)
    {
        return response()->json(['data'=>['patientId'=>$patient->id,'balance'=>(float)$patient->wallet_balance,'transactions'=>$patient->ledger()->get()->map(fn($x)=>$resource->ledger($x))]]);
    }
}
