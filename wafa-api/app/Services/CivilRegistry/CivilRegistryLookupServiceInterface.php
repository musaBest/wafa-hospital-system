<?php

namespace App\Services\CivilRegistry;

interface CivilRegistryLookupServiceInterface
{
    /**
     * Look up citizen / resident data by 9-digit Palestinian National ID.
     *
     * @param string $nationalId
     * @return array|null Returns array of citizen demographics or null if not found
     */
    public function lookupByNationalId(string $nationalId): ?array;
}
