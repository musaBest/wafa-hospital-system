<?php

namespace App\Services\CivilRegistry;

class MockCivilRegistryLookupService implements CivilRegistryLookupServiceInterface
{
    /**
     * Mock database of official civil registry records in Palestine.
     */
    private array $registry = [
        '902263925' => [
            'national_id' => '902263925',
            'first_name' => 'ندى',
            'father_name' => 'مروان',
            'grandfather_name' => 'بدر',
            'family_name' => 'ابو حماش',
            'gender' => 'female',
            'birth_date' => '1996-12-22',
            'marital_status' => 'single',
            'region' => 'رفح',
            'city_or_area' => 'حي تل السلطان',
            'refugee_status' => 'refugee',
            'source' => 'السجل المدني الفلسطيني (محاكاة رسمية)',
        ],
        '800414070' => [
            'national_id' => '800414070',
            'first_name' => 'ادهم',
            'father_name' => 'ماهر',
            'grandfather_name' => 'مطر',
            'family_name' => 'ابولبده',
            'gender' => 'male',
            'birth_date' => '1984-12-21',
            'marital_status' => 'married',
            'region' => 'غزة',
            'city_or_area' => 'حي السرايا',
            'refugee_status' => 'refugee',
            'source' => 'السجل المدني الفلسطيني (محاكاة رسمية)',
        ],
        '951902148' => [
            'national_id' => '951902148',
            'first_name' => 'صفاء',
            'father_name' => 'علي',
            'grandfather_name' => 'عبد الرحمن',
            'family_name' => 'ابو ليله',
            'gender' => 'female',
            'birth_date' => '1971-04-15',
            'marital_status' => 'married',
            'region' => 'غزة',
            'city_or_area' => 'حي الرمال الجنوبي',
            'refugee_status' => 'citizen',
            'source' => 'السجل المدني الفلسطيني (محاكاة رسمية)',
        ],
        '922505193' => [
            'national_id' => '922505193',
            'first_name' => 'عايشة',
            'father_name' => 'عبدالرحمن',
            'grandfather_name' => 'مصطفى',
            'family_name' => 'حسونة',
            'gender' => 'female',
            'birth_date' => '1968-08-10',
            'marital_status' => 'married',
            'region' => 'غزة',
            'city_or_area' => 'مخيم الشاطئ',
            'refugee_status' => 'refugee',
            'source' => 'السجل المدني الفلسطيني (محاكاة رسمية)',
        ],
        '972395750' => [
            'national_id' => '972395750',
            'first_name' => 'رسميه',
            'father_name' => 'حسن',
            'grandfather_name' => 'إبراهيم',
            'family_name' => 'طافش',
            'gender' => 'female',
            'birth_date' => '1952-03-01',
            'marital_status' => 'divorced',
            'region' => 'الوسطى',
            'city_or_area' => 'مخيم النصيرات',
            'refugee_status' => 'refugee',
            'source' => 'السجل المدني الفلسطيني (محاكاة رسمية)',
        ],
        '940602411' => [
            'national_id' => '940602411',
            'first_name' => 'جميل',
            'father_name' => 'كامل',
            'grandfather_name' => 'عبد الله',
            'family_name' => 'راجح',
            'gender' => 'male',
            'birth_date' => '1964-07-14',
            'marital_status' => 'married',
            'region' => 'غزة',
            'city_or_area' => 'حي التفاح - الشعف',
            'refugee_status' => 'refugee',
            'source' => 'السجل المدني الفلسطيني (محاكاة رسمية)',
        ],
    ];

    /**
     * Look up citizen by 9-digit ID.
     */
    public function lookupByNationalId(string $nationalId): ?array
    {
        $cleanId = trim($nationalId);

        // Check pre-registered sample registry
        if (isset($this->registry[$cleanId])) {
            return $this->registry[$cleanId];
        }

        // If not in the sample registry, return null (triggers manual entry fallback)
        return null;
    }
}
