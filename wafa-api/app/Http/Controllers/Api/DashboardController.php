<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Admission,Invoice,Patient,QueueItem,Visit};
use Illuminate\Http\Request;
class DashboardController extends Controller { public function __invoke(Request $q){$data=['patients'=>Patient::count(),'todayVisits'=>Visit::whereDate('visit_date',today())->count(),'activeQueue'=>QueueItem::whereDate('queue_date',today())->count(),'admitted'=>Admission::where('status','admitted')->count()];if($q->user()->hasPermission('finance.view'))$data['todayCollected']=(float)Invoice::whereDate('issued_at',today())->sum('payable_amount');return response()->json(['data'=>$data]);} }
