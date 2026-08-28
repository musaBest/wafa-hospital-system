<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get recent notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $role = $request->input('role', 'all_staff');
        $userId = $request->user() ? $request->user()->id : null;

        $notifications = Notification::query()
            ->forUserOrRole($userId, $role)
            ->latest()
            ->limit(30)
            ->get();

        $unreadCount = Notification::query()
            ->forUserOrRole($userId, $role)
            ->unread()
            ->count();

        return response()->json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Notification $notification): JsonResponse
    {
        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تعيين الإشعار كمقروء',
            'data' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $role = $request->input('role', 'all_staff');
        $userId = $request->user() ? $request->user()->id : null;

        Notification::query()
            ->forUserOrRole($userId, $role)
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تعيين جميع الإشعارات كمقروءة',
        ]);
    }

    /**
     * Get unread notifications count.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $role = $request->input('role', 'all_staff');
        $userId = $request->user() ? $request->user()->id : null;

        $count = Notification::query()
            ->forUserOrRole($userId, $role)
            ->unread()
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $count,
        ]);
    }
}
