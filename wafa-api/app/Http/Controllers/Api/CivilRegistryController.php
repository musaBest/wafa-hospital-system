<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\CivilRegistryService;
use Illuminate\Http\Request;
use Throwable;

class CivilRegistryController extends Controller
{
    public function __invoke(Request $request, CivilRegistryService $registry, AuditService $audit)
    {
        $data=$request->validate(['query'=>'required|string|min:2|max:150']);
        try {
            $record=$registry->lookup($data['query']);
            $audit->record($request,'civil_registry.lookup','civil_registry',null,['query_hash'=>hash('sha256',$data['query']),'success'=>true]);
            return response()->json(['success'=>true,'data'=>$record]);
        } catch(Throwable $error) {
            report($error);
            $audit->record($request,'civil_registry.lookup','civil_registry',null,['query_hash'=>hash('sha256',$data['query']),'success'=>false]);
            return response()->json(['success'=>false,'code'=>'CIVIL_REGISTRY_LOOKUP_FAILED','message'=>'Civil Registry lookup failed.'],502);
        }
    }
}
