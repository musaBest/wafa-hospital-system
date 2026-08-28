<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'patient_id',
        'target_role',
        'type',
        'title',
        'message',
        'action_url',
        'priority',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    public function scopeForUserOrRole(Builder $query, ?int $userId, ?string $role = null): Builder
    {
        return $query->where(function ($q) use ($userId, $role) {
            if ($userId) {
                $q->where('user_id', $userId);
            }
            if ($role) {
                $q->orWhere('target_role', $role)
                  ->orWhere('target_role', 'all_staff');
            }
        });
    }

    /**
     * Helper to quickly dispatch a system alert.
     */
    public static function send(array $data): self
    {
        return static::create([
            'user_id' => $data['user_id'] ?? null,
            'patient_id' => $data['patient_id'] ?? null,
            'target_role' => $data['target_role'] ?? 'all_staff',
            'type' => $data['type'] ?? 'system_alert',
            'title' => $data['title'],
            'message' => $data['message'],
            'action_url' => $data['action_url'] ?? null,
            'priority' => $data['priority'] ?? 'normal',
            'is_read' => false,
        ]);
    }
}
