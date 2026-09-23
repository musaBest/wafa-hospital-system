<?php

namespace App\Services;

use App\Models\DeletedItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class TrashService
{
    public function capture(Request $request, Model $model, string $entityType, ?string $label = null, array $metadata = []): DeletedItem
    {
        $payload = $model->getAttributes();
        foreach ($model->getRelations() as $name => $relation) {
            $payload['_relations'][$name] = is_object($relation) && method_exists($relation, 'toArray') ? $relation->toArray() : $relation;
        }

        return DeletedItem::create([
            'user_id' => $request->user()?->id,
            'entity_type' => $entityType,
            'entity_id' => (string) $model->getKey(),
            'entity_label' => $label ?: $this->labelFor($model),
            'payload' => $payload,
            'metadata' => array_merge([
                'table' => $model->getTable(),
                'model' => get_class($model),
                'path' => $request->path(),
                'message' => 'مرجع خاص بمهندس محمد - يمكن الاستعادة إلى المكان السابق.',
            ], $metadata),
            'deleted_at' => now(),
        ]);
    }

    public function restore(DeletedItem $item): bool
    {
        $modelClass = Arr::get($item->metadata ?? [], 'model');
        $table = Arr::get($item->metadata ?? [], 'table');
        $payload = $item->payload ?? [];
        $id = $item->entity_id;

        if ($modelClass && class_exists($modelClass) && is_subclass_of($modelClass, Model::class)) {
            /** @var Model $model */
            $model = new $modelClass;
            $query = method_exists($modelClass, 'withTrashed') ? $modelClass::withTrashed() : $modelClass::query();
            $found = $query->whereKey($id)->first();
            if ($found) {
                if (method_exists($found, 'restore')) $found->restore();
                $this->reactivate($found);
                return true;
            }

            if ($table && Schema::hasTable($table)) {
                $attrs = collect($payload)->reject(fn($v, $k) => str_starts_with((string)$k, '_'))->all();
                unset($attrs['deleted_at']);
                if (!isset($attrs[$model->getKeyName()]) && $id) $attrs[$model->getKeyName()] = $id;
                $modelClass::query()->create($attrs);
                $created = $modelClass::query()->whereKey($id)->first();
                if ($created) $this->reactivate($created);
                return true;
            }
        }

        return false;
    }

    private function reactivate(Model $model): void
    {
        $patch = [];
        if (array_key_exists('active', $model->getAttributes())) $patch['active'] = true;
        if ($model->getTable() === 'users') $patch['active'] = true;
        if ($patch) $model->update($patch);
    }

    public function labelFor(Model $model): string
    {
        foreach (['full_name','name','display_name','name_ar','title','service','exam','category','username','staff_id','medical_serial','receipt_number'] as $key) {
            $value = $model->getAttribute($key);
            if ($value !== null && $value !== '') return (string) $value;
        }
        return Str::headline(class_basename($model)).' #'.$model->getKey();
    }
}
