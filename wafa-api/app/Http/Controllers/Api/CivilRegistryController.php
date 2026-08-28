<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CivilRegistry\CivilRegistryLookupServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CivilRegistryController extends Controller
{
    protected CivilRegistryLookupServiceInterface $civilRegistryService;

    public function __construct(CivilRegistryLookupServiceInterface $civilRegistryService)
    {
        $this->civilRegistryService = $civilRegistryService;
    }

    /**
     * Look up Palestinian citizen record by national ID.
     */
    public function lookup(Request $request, string $nationalId): JsonResponse
    {
        $cleanId = trim($nationalId);

        if (!preg_match('/^\d{9}$/', $cleanId)) {
            return response()->json([
                'success' => false,
                'message' => 'رقم الهوية الفلسطينية يجب أن يتكون من 9 أرقام بالضبط',
            ], 422);
        }

        $record = $this->civilRegistryService->lookupByNationalId($cleanId);

        if (!$record) {
            return response()->json([
                'success' => false,
                'found' => false,
                'message' => 'لم يتم العثور على سجل مسبق برقم الهوية في قاعدة بيانات السجل المدني. يرجى إدخال البيانات يدوياً.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'found' => true,
            'message' => 'تم استرجاع بيانات المواطن من السجل المدني بنجاح',
            'data' => $record,
        ]);
    }
}
