<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Invoice, Patient, WalletTransaction};
use App\Services\{ApiResourceService, AuditService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    private const SOURCES=['wallet','bank','jawwalPay','jawwal_pay_wallet','bank_of_palestine','arab_islamic_bank','bank_of_jerusalem','islamic_arab_bank','cairo_amman_bank'];
    public function index(Request $request, ApiResourceService $resource){$data=$request->validate(['patient_id'=>'nullable|uuid','from'=>'nullable|date','to'=>'nullable|date','method'=>'nullable|in:cash,app']);$q=Invoice::latest('issued_at');$q->when($data['patient_id']??null,fn($x,$v)=>$x->where('patient_id',$v))->when($data['from']??null,fn($x,$v)=>$x->whereDate('issued_at','>=',$v))->when($data['to']??null,fn($x,$v)=>$x->whereDate('issued_at','<=',$v))->when($data['method']??null,fn($x,$v)=>$x->where('payment_method',$v));return response()->json(['data'=>$q->limit(500)->get()->map(fn($x)=>$resource->invoice($x))]);}
    public function store(Request $request, ApiResourceService $resource, AuditService $audit)
    {
        $data=$request->validate(['patient_id'=>'required|uuid|exists:patients,id','service'=>'required|string|max:200','unit_price'=>'required|numeric|min:0.01|max:9999999','coverage_ratio'=>'required|numeric|min:0|max:100','payment_method'=>'required|in:cash,app','transfer'=>'nullable|array','transfer.sender_phone'=>'required_if:payment_method,app|nullable|string|max:30','transfer.sender_name'=>'required_if:payment_method,app|nullable|string|max:150','transfer.source'=>['required_if:payment_method,app','nullable',Rule::in(self::SOURCES)]]);
        $invoice=DB::transaction(function()use($data,$request){
            $patient=Patient::whereKey($data['patient_id'])->lockForUpdate()->firstOrFail();
            $payable=round((float)$data['unit_price']*(1-(float)$data['coverage_ratio']/100),2);
            $sequence=Invoice::whereYear('issued_at',now()->year)->lockForUpdate()->count()+1;
            $receipt='RCP-'.now()->year.'-'.str_pad((string)$sequence,5,'0',STR_PAD_LEFT);
            $transfer=$data['transfer']??[];
            $invoice=Invoice::create(['patient_id'=>$patient->id,'service'=>$data['service'],'unit_price'=>$data['unit_price'],'coverage_ratio'=>$data['coverage_ratio'],'payable_amount'=>$payable,'payment_method'=>$data['payment_method'],'sender_phone'=>$transfer['sender_phone']??null,'sender_name'=>$transfer['sender_name']??null,'transfer_source'=>$transfer['source']??null,'issued_at'=>now(),'receipt_number'=>$receipt,'created_by'=>$request->user()->id]);
            $patient->increment('wallet_balance',$payable);
            WalletTransaction::create(['patient_id'=>$patient->id,'type'=>'credit','occurred_at'=>now(),'service'=>$data['service'],'amount'=>$payable,'method'=>$data['payment_method']==='cash'?'cash':$transfer['source'],'receipt_number'=>$receipt,'reference_type'=>'invoice','reference_id'=>$invoice->id,'metadata'=>$data['payment_method']==='app'?['sender_phone'=>$transfer['sender_phone'],'sender_name'=>$transfer['sender_name']]:null]);
            return $invoice;
        });
        $audit->record($request,'invoice.created','invoice',$invoice->id,['amount'=>(float)$invoice->payable_amount,'method'=>$invoice->payment_method]);
        return response()->json(['data'=>$resource->invoice($invoice)],201);
    }
}
