<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $keys=$request->user()->effectivePermissionKeys();
        $items=SystemNotification::query()
            ->when(!$request->user()->isPrimaryCashier(), function($query) use ($request, $keys) {
                $query->where(function($q)use($request,$keys){
                    $q->where('user_id',$request->user()->id)
                      ->orWhere(function($x)use($keys){$x->whereNull('user_id')->whereNotNull('permission_key')->whereIn('permission_key',$keys);});
                });
            })
            ->latest()->limit(100)->get()
            ->reject(fn($x) => is_array($x->muted_by) && in_array($request->user()->id, $x->muted_by, true))
            ->values();
        return response()->json(['data'=>$items->map(fn($x)=>[
            'id'=>$x->id,'type'=>$x->type,'title'=>$x->title,'body'=>$x->body,'patientId'=>$x->patient_id,'link'=>$x->link,
            'read'=>!is_null($x->read_at),'permissionKey'=>$x->permission_key,'module'=>$x->module,'createdAt'=>$x->created_at?->toISOString(),
        ])]);
    }

    public function read(Request $request, SystemNotification $systemNotification)
    {
        $keys=$request->user()->effectivePermissionKeys();
        abort_unless($systemNotification->user_id===$request->user()->id || (is_null($systemNotification->user_id) && ($request->user()->isPrimaryCashier() || ($systemNotification->permission_key && in_array($systemNotification->permission_key,$keys,true)))),403);
        $systemNotification->update(['read_at'=>now()]);
        return response()->json(['data'=>['id'=>$systemNotification->id,'read'=>true]]);
    }

    public function readAll(Request $request)
    {
        $keys=$request->user()->effectivePermissionKeys();
        SystemNotification::query()->whereNull('read_at')->where(function($q)use($request,$keys){
            $q->where('user_id',$request->user()->id)->orWhere(function($x)use($keys){$x->whereNull('user_id')->whereNotNull('permission_key')->whereIn('permission_key',$keys);});
        })->update(['read_at'=>now()]);
        return response()->json(['message'=>'Notifications marked as read.']);
    }

    public function clear(Request $request)
    {
        $keys=$request->user()->effectivePermissionKeys();
        SystemNotification::query()->where(function($q)use($request,$keys){
            $q->where('user_id',$request->user()->id)->orWhere(function($x)use($keys){$x->whereNull('user_id')->whereNotNull('permission_key')->whereIn('permission_key',$keys);});
        })->update(['read_at'=>now()]);
        return response()->json(['message'=>'Notifications cleared.']);
    }

    public function mute(Request $request, SystemNotification $systemNotification)
    {
        $keys=$request->user()->effectivePermissionKeys();
        abort_unless($request->user()->isPrimaryCashier() || $systemNotification->user_id===$request->user()->id || (is_null($systemNotification->user_id) && $systemNotification->permission_key && in_array($systemNotification->permission_key,$keys,true)),403);
        $muted = $systemNotification->muted_by ?: [];
        if (!is_array($muted)) $muted = [];
        if (!in_array($request->user()->id, $muted, true)) $muted[] = $request->user()->id;
        $systemNotification->update(['muted_by'=>$muted,'read_at'=>now()]);
        return response()->json(['data'=>['id'=>$systemNotification->id,'muted'=>true]]);
    }
}
