<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{DoctorNote,Patient};
use App\Services\AuditService;
use Illuminate\Http\Request;
class DoctorNoteController extends Controller {
 public function index(Request $q,Patient $patient){$doctor=$q->user()->doctor;abort_unless($doctor,403);return response()->json(['data'=>DoctorNote::where('doctor_id',$doctor->id)->where('patient_id',$patient->id)->latest()->get()->map(fn($x)=>['id'=>$x->id,'doctorId'=>$x->doctor_id,'patientId'=>$x->patient_id,'visitId'=>$x->visit_id,'text'=>$x->content,'createdAt'=>$x->created_at->toISOString()])]);}
 public function store(Request $q,Patient $patient,AuditService $a){$doctor=$q->user()->doctor;abort_unless($doctor,403);$d=$q->validate(['text'=>'required|string|max:20000','visit_id'=>'nullable|uuid|exists:visits,id']);if(!empty($d['visit_id']))abort_unless($doctor->visits()->whereKey($d['visit_id'])->where('patient_id',$patient->id)->exists(),403);$x=DoctorNote::create(['doctor_id'=>$doctor->id,'patient_id'=>$patient->id,'visit_id'=>$d['visit_id']??null,'content'=>$d['text']]);$a->record($q,'doctor_note.created','doctor_note',$x->id,['patient_id'=>$patient->id]);return response()->json(['data'=>['id'=>$x->id,'doctorId'=>$x->doctor_id,'patientId'=>$x->patient_id,'visitId'=>$x->visit_id,'text'=>$x->content,'createdAt'=>$x->created_at->toISOString()]],201);}
}
