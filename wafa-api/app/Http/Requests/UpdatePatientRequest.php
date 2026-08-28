<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $patientId = $this->route('patient') ? $this->route('patient')->id : null;

        return [
            'patient_id' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('patients', 'patient_id')->ignore($patientId),
            ],
            'admission_year' => ['nullable', 'integer', 'min:1990', 'max:2099'],
            'national_id' => ['nullable', 'string', 'max:20'],
            'first_name' => ['sometimes', 'required', 'string', 'max:100'],
            'father_name' => ['sometimes', 'required', 'string', 'max:100'],
            'grandfather_name' => ['sometimes', 'required', 'string', 'max:100'],
            'family_name' => ['sometimes', 'required', 'string', 'max:100'],
            'gender' => ['sometimes', 'required', 'in:male,female'],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'marital_status' => ['nullable', 'in:single,married,divorced,widowed'],
            'refugee_status' => ['nullable', 'in:citizen,refugee'],
            'ration_card_no' => ['nullable', 'string', 'max:50'],
            'occupation' => ['nullable', 'string', 'max:150'],
            'region' => ['nullable', 'string', 'max:100'],
            'city_or_area' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'blood_type' => ['nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'allergies' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Custom Arabic attribute names.
     */
    public function attributes(): array
    {
        return [
            'patient_id' => 'رقم المريض',
            'admission_year' => 'سنة الدخول',
            'national_id' => 'رقم الهوية',
            'first_name' => 'الاسم الشخصي',
            'father_name' => 'اسم الأب',
            'grandfather_name' => 'اسم الجد',
            'family_name' => 'اسم العائلة',
            'gender' => 'الجنس',
            'birth_date' => 'تاريخ الميلاد',
            'marital_status' => 'الحالة الاجتماعية',
            'refugee_status' => 'الوضع الاجتماعي (مواطن/لاجئ)',
            'ration_card_no' => 'رقم بطاقة التموين',
            'occupation' => 'المهنة',
            'region' => 'المنطقة/المحافظة',
            'city_or_area' => 'المدينة أو الحي',
            'phone' => 'رقم الهاتف/الجوال',
            'blood_type' => 'فصيلة الدم',
            'allergies' => 'التحذيرات والحساسية الطبية',
            'notes' => 'الملاحظات الطبية',
        ];
    }

    /**
     * Custom validation messages in Arabic.
     */
    public function messages(): array
    {
        return [
            'first_name.required' => 'يرجى إدخال الاسم الأول للمريض',
            'father_name.required' => 'يرجى إدخال اسم الأب',
            'grandfather_name.required' => 'يرجى إدخال اسم الجد',
            'family_name.required' => 'يرجى إدخال اسم العائلة',
            'gender.required' => 'يرجى تحديد جنس المريض (ذكر/أنثى)',
            'patient_id.unique' => 'رقم المريض هذا مستخدم بالفعل في النظام',
            'birth_date.before_or_equal' => 'تاريخ الميلاد لا يمكن أن يكون في المستقبل',
        ];
    }
}
