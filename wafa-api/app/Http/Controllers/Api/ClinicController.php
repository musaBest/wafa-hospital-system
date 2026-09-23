<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Services\{ApiResourceService,AuditService,TrashService};
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClinicController extends Controller {
 public function index(ApiResourceService $r){return response()->json(['data'=>Clinic::withTrashed()->get()->map(fn($x)=>$r->clinic($x))]);}

 public function store(Request $q,ApiResourceService $r,AuditService $a){
  $d=$q->validate([
   'name_ar'=>'required|string|max:150','name_en'=>'required|string|max:150','code'=>'nullable|string|max:12',
   'visit_fee'=>'nullable|numeric|min:0|max:999999','kind'=>'nullable|in:outpatient,inpatient,mixed',
   'daily_rate'=>'nullable|numeric|min:0|max:999999'
  ]);
  $kind=$d['kind']??'outpatient';
  $canEditFees=$q->user()->isPrimaryCashier();
  $visitFee=$canEditFees && $kind!=='inpatient' ? (float)($d['visit_fee']??0) : 0;
  $dailyRate=$canEditFees && $kind!=='outpatient' ? (float)($d['daily_rate']??0) : 0;
  $x=Clinic::create([
   'key'=>Str::slug($d['name_en']).'-'.Str::lower(Str::random(5)),
   'code'=>strtoupper(preg_replace('/[^A-Za-z0-9]/','', $d['code'] ?? substr($d['name_en'],0,3))) ?: 'CLN',
   'name_ar'=>$d['name_ar'],'name_en'=>$d['name_en'],'visit_fee'=>$visitFee,
   'kind'=>$kind,'daily_rate'=>$dailyRate,'active'=>true
  ]);
  $a->record($q,'clinic.created','clinic',$x->id,['kind'=>$kind]);
  return response()->json(['data'=>$r->clinic($x)],201);
 }

 public function update(Request $q,Clinic $clinic,ApiResourceService $r,AuditService $a){
  $d=$q->validate(['name_ar'=>'sometimes|string|max:150','name_en'=>'sometimes|string|max:150','code'=>'sometimes|nullable|string|max:12','kind'=>'sometimes|in:outpatient,inpatient,mixed','active'=>'sometimes|boolean']);
  $clinic->update($d);
  $a->record($q,'clinic.updated','clinic',$clinic->id);
  return response()->json(['data'=>$r->clinic($clinic)]);
 }

 public function updateFee(Request $q,Clinic $clinic,ApiResourceService $r,AuditService $a){
  $d=$q->validate(['visit_fee'=>'nullable|numeric|min:0|max:999999','daily_rate'=>'nullable|numeric|min:0|max:999999']);
  abort_if(!array_key_exists('visit_fee',$d) && !array_key_exists('daily_rate',$d),422,'At least one fee is required.');
  $patch=[];
  if(array_key_exists('visit_fee',$d))$patch['visit_fee']=$d['visit_fee'];
  if(array_key_exists('daily_rate',$d))$patch['daily_rate']=$d['daily_rate'];
  $clinic->update($patch);
  $a->record($q,'clinic.fee.updated','clinic',$clinic->id,$patch);
  return response()->json(['data'=>$r->clinic($clinic)]);
 }

 public function destroy(Request $q,Clinic $clinic,AuditService $a,TrashService $trash){
  $trash->capture($q,$clinic,'clinic',$clinic->name_ar ?: $clinic->name_en,['section'=>'clinics']);
  $clinic->update(['active'=>false]);$clinic->delete();
  $a->record($q,'clinic.deleted','clinic',$clinic->id);
  return response()->noContent();
 }
}
