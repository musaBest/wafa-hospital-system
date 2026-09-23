<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{AuditLog, DeletedItem, UserSessionLog};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\TrashService;
use Illuminate\Validation\Rule;

class EngineerConsoleController extends Controller
{
    private function authorizeEngineer(Request $request): void
    {
        abort_unless($request->user()?->isPrimaryCashier(), 403, 'هذه الشاشة خاصة بمهندس محمد فقط.');
    }

    public function activity(Request $request)
    {
        $this->authorizeEngineer($request);
        $data = $request->validate([
            'from'=>'nullable|date','to'=>'nullable|date','user_id'=>'nullable|uuid','search'=>'nullable|string|max:150',
        ]);
        $from = $data['from'] ?? now()->subDays(7)->toDateString();
        $to = $data['to'] ?? now()->toDateString();
        $search = $data['search'] ?? null;

        $logs = AuditLog::query()->with('user')
            ->whereDate('created_at','>=',$from)->whereDate('created_at','<=',$to)
            ->when($data['user_id'] ?? null, fn($q,$v)=>$q->where('user_id',$v))
            ->when($search, function($q,$value){
                $q->where(function($inner) use ($value){
                    $inner->where('action','like',"%{$value}%")
                        ->orWhere('entity_type','like',"%{$value}%")
                        ->orWhere('entity_id','like',"%{$value}%")
                        ->orWhere('metadata','like',"%{$value}%")
                        ->orWhereHas('user', fn($u)=>$u->where('username','like',"%{$value}%")->orWhere('display_name','like',"%{$value}%"));
                });
            })
            ->latest('created_at')->limit(800)->get();

        $sessions = UserSessionLog::query()->with('user')
            ->whereDate('login_at','>=',$from)->whereDate('login_at','<=',$to)
            ->when($data['user_id'] ?? null, fn($q,$v)=>$q->where('user_id',$v))
            ->when($search, fn($q,$value)=>$q->whereHas('user', fn($u)=>$u->where('username','like',"%{$value}%")->orWhere('display_name','like',"%{$value}%")))
            ->latest('login_at')->limit(300)->get();

        $users = DB::table('users')->select('id','username','display_name','role','active','last_login_at')->orderBy('display_name')->get();

        return response()->json(['data'=>[
            'users'=>$users->map(fn($user)=>[
                'id'=>$user->id,'username'=>$user->username,'displayName'=>$user->display_name,'role'=>$user->role,'active'=>(bool)$user->active,'lastLoginAt'=>$user->last_login_at,
            ])->values(),
            'logs'=>$logs->map(fn($log)=>$this->auditResource($log))->values(),
            'sessions'=>$sessions->map(fn($session)=>$this->sessionResource($session))->values(),
            'summary'=>[
                'logs'=>$logs->count(),
                'sessions'=>$sessions->count(),
                'openSessions'=>$sessions->whereNull('logout_at')->count(),
                'usersActive'=>$sessions->pluck('user_id')->filter()->unique()->count(),
            ],
        ]]);
    }

    public function trash(Request $request)
    {
        $this->authorizeEngineer($request);
        $data = $request->validate([
            'type'=>['nullable','string','max:120'],
            'search'=>'nullable|string|max:150',
        ]);
        $items = DeletedItem::query()->with('user')
            ->whereNull('restored_at')
            ->when(($data['type'] ?? 'all') !== 'all', fn($q)=>$q->where('entity_type',$data['type']))
            ->when($data['search'] ?? null, fn($q,$v)=>$q->where(fn($inner)=>$inner->where('entity_label','like',"%{$v}%")->orWhere('entity_id','like',"%{$v}%")->orWhere('payload','like',"%{$v}%")))
            ->latest('deleted_at')->limit(500)->get();
        return response()->json(['data'=>$items->map(fn($item)=>$this->trashResource($item))->values()]);
    }

    public function restoreTrash(Request $request, DeletedItem $deletedItem, TrashService $trash)
    {
        $this->authorizeEngineer($request);
        abort_if($deletedItem->restored_at, 422, 'تمت استعادة هذا العنصر سابقاً.');
        $restored = $trash->restore($deletedItem);
        abort_unless($restored, 422, 'تعذر استعادة هذا العنصر تلقائياً. البيانات المرجعية ما زالت محفوظة للمراجعة.');
        $deletedItem->update(['restored_at'=>now(),'metadata'=>array_merge($deletedItem->metadata ?? [], ['restored_by'=>$request->user()?->username])]);
        AuditLog::create([
            'user_id'=>$request->user()?->id,
            'action'=>'trash.restore',
            'entity_type'=>$deletedItem->entity_type,
            'entity_id'=>$deletedItem->entity_id,
            'ip_address'=>$request->ip(),
            'metadata'=>['label'=>$deletedItem->entity_label, 'restored'=>true],
            'created_at'=>now(),
        ]);
        return response()->json(['data'=>$this->trashResource($deletedItem->fresh('user'))]);
    }

    private function auditResource(AuditLog $log): array
    {
        return [
            'id'=>$log->id,
            'userId'=>$log->user_id,
            'username'=>$log->user?->username ?? 'system',
            'displayName'=>$log->user?->display_name ?? 'النظام',
            'action'=>$log->action,
            'actionAr'=>$this->actionLabel($log->action),
            'entityType'=>$log->entity_type,
            'entityId'=>$log->entity_id,
            'ipAddress'=>$log->ip_address,
            'metadata'=>$log->metadata ?? [],
            'createdAt'=>$log->created_at?->toISOString(),
            'date'=>$log->created_at?->format('Y-m-d'),
            'time'=>$log->created_at?->format('h:i:s A'),
            'day'=>$log->created_at?->locale('ar')->dayName,
        ];
    }

    private function sessionResource(UserSessionLog $session): array
    {
        return [
            'id'=>$session->id,
            'userId'=>$session->user_id,
            'username'=>$session->user?->username ?? 'system',
            'displayName'=>$session->user?->display_name ?? 'النظام',
            'deviceName'=>$session->device_name,
            'ipAddress'=>$session->ip_address,
            'loginAt'=>$session->login_at?->toISOString(),
            'logoutAt'=>$session->logout_at?->toISOString(),
            'lastSeenAt'=>$session->last_seen_at?->toISOString(),
            'date'=>$session->login_at?->format('Y-m-d'),
            'loginTime'=>$session->login_at?->format('h:i:s A'),
            'logoutTime'=>$session->logout_at?->format('h:i:s A'),
            'day'=>$session->login_at?->locale('ar')->dayName,
            'durationSeconds'=>$session->logout_at && $session->login_at ? abs($session->login_at->diffInSeconds($session->logout_at, false)) : null,
        ];
    }

    private function trashResource(DeletedItem $item): array
    {
        return [
            'id'=>$item->id,
            'entityType'=>$item->entity_type,
            'entityId'=>$item->entity_id,
            'entityLabel'=>$item->entity_label,
            'deletedBy'=>$item->user?->display_name ?? $item->user?->username ?? 'مستخدم غير معروف',
            'deletedAt'=>$item->deleted_at?->toISOString(),
            'date'=>$item->deleted_at?->format('Y-m-d'),
            'time'=>$item->deleted_at?->format('h:i:s A'),
            'day'=>$item->deleted_at?->locale('ar')->dayName,
            'payload'=>$item->payload ?? [],
            'metadata'=>$item->metadata ?? [],
        ];
    }

    private function actionLabel(string $action): string
    {
        return [
            'auth.login'=>'تسجيل دخول', 'auth.logout'=>'تسجيل خروج',
            'patient.created'=>'إنشاء ملف مريض', 'patient.updated'=>'تعديل ملف مريض', 'patient.deleted'=>'حذف ملف مريض',
            'doctor.created'=>'إنشاء طبيب', 'doctor.updated'=>'تعديل طبيب', 'doctor.deleted'=>'حذف طبيب',
            'clinic.created'=>'إنشاء قسم/عيادة', 'clinic.updated'=>'تعديل قسم/عيادة', 'clinic.deleted'=>'حذف قسم/عيادة',
            'diagnostic_service.created'=>'إنشاء خدمة تشخيص', 'diagnostic_service.updated'=>'تعديل خدمة تشخيص', 'diagnostic_service.deleted'=>'حذف خدمة تشخيص',
            'sponsor.created'=>'إنشاء جهة تغطية', 'sponsor.deleted'=>'حذف جهة تغطية',
            'user.created'=>'إنشاء مستخدم', 'user.updated'=>'تعديل مستخدم', 'user.deleted'=>'حذف مستخدم',
            'visit.created'=>'تسجيل زيارة', 'visit.finished'=>'إنهاء زيارة', 'queue.updated'=>'تحديث الطابور',
            'admission.created'=>'تسجيل مبيت', 'admission.discharged'=>'خروج مبيت', 'admission.transaction.created'=>'حركة مالية مبيت',
            'outpatient_pt.case.created'=>'إنشاء حالة علاج طبيعي خارجي', 'outpatient_pt.case.updated'=>'تعديل حالة علاج طبيعي خارجي', 'outpatient_pt.case.deleted'=>'حذف حالة علاج طبيعي خارجي',
            'outpatient_pt.session.created'=>'حفظ جلسة علاج طبيعي', 'outpatient_pt.session.updated'=>'تعديل جلسة علاج طبيعي', 'outpatient_pt.session.deleted'=>'حذف جلسة علاج طبيعي',
            'outpatient_pt.waitlist.created'=>'إضافة لقائمة الانتظار', 'outpatient_pt.waitlist.updated'=>'تحديث قائمة الانتظار', 'outpatient_pt.waitlist.deleted'=>'حذف من قائمة الانتظار',
            'trash.restore'=>'استعادة من سلة المحذوفات',
        ][$action] ?? $action;
    }
}
