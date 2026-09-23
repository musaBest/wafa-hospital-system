<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Sponsor;
use App\Services\{ApiResourceService,AuditService,TrashService};
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class SponsorController extends Controller {
 public function index(ApiResourceService $r){return response()->json(['data'=>Sponsor::where('active',true)->get()->map(fn($x)=>$r->sponsor($x))]);}
 public function store(Request $q,ApiResourceService $r,AuditService $a){$d=$q->validate(['name_ar'=>'required|string|max:150','name_en'=>'required|string|max:150','code'=>'nullable|string|max:50|unique:sponsors,code']);$x=Sponsor::create(['code'=>$d['code']??Str::slug($d['name_en']).'-'.Str::lower(Str::random(4)),'name_ar'=>$d['name_ar'],'name_en'=>$d['name_en'],'active'=>true]);$a->record($q,'sponsor.created','sponsor',$x->id);return response()->json(['data'=>$r->sponsor($x)],201);}
 public function destroy(Request $q,Sponsor $sponsor,AuditService $a,TrashService $trash){$trash->capture($q,$sponsor,'sponsor',$sponsor->name_ar ?: $sponsor->name_en,['section'=>'sponsors']);$sponsor->update(['active'=>false]);$sponsor->delete();$a->record($q,'sponsor.deleted','sponsor',$sponsor->id);return response()->noContent();}
}
