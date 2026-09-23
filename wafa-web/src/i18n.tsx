import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Language } from './types';

const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);
const normalizeUiText = (value: string) => value.replace(/\s+/g, ' ').trim();

const staticEnglishPhrases: Record<string, string> = {
  'مستشفى الوفاء': 'Wafaa Hospital',
  'مستشفى الوفاء للتأهيل الطبي والجراحة التخصصية': 'Wafaa Hospital for Medical Rehabilitation and Specialized Surgery',
  'التأهيل الطبي والرعاية التخصصية': 'Medical rehabilitation and specialized care',
  'نظام معلومات مستشفى متكامل': 'Integrated Hospital Information System',
  'رعاية متكاملة، إدارة أكثر وضوحاً، وتجربة رقمية موحّدة لخدمات المستشفى.': 'Integrated care, clearer management, and one digital experience for hospital services.',
  'إدارة المرضى': 'Patient Management',
  'ملف طبي موحّد': 'Unified medical record',
  'العمليات السريرية': 'Clinical Operations',
  'عيادات وفرز ومختبر': 'Clinics, triage, and laboratory',
  'إدارة سرير ومتابعة': 'Bed management and follow-up',
  'دخول آمن': 'Secure Access',
  'صلاحيات دقيقة لكل مستخدم': 'Precise permissions for each user',
  'النظام متصل وآمن': 'System secure and online',
  'مرحبا بعودتك': 'Welcome back',
  'مرحباً بعودتك': 'Welcome back',
  'أدخل بياناتك للوصول إلى مساحة العمل الخاصة بك': 'Enter your credentials to access your workspace',
  'اسم المستخدم': 'Username',
  'كلمة المرور': 'Password',
  'إظهار كلمة المرور': 'Show password',
  'إخفاء كلمة المرور': 'Hide password',
  'الوضع النهاري': 'Day mode',
  'الوضع الليلي': 'Night mode',
  'وضع الشفق': 'Twilight mode',
  'وضع اللؤلؤ': 'Pearl mode',
  'تبديل الوضع': 'Switch theme',
  'العربية': 'Arabic',
  'English': 'English',
  'الإشعارات': 'Notifications',
  'غير مقروء': 'unread',
  'تحديد الكل كمقروء': 'Mark all as read',
  'مسح': 'Clear',
  'لا توجد إشعارات': 'No notifications',
  'ستظهر هنا طلبات المبيت والنتائج والحالات المكتملة.': 'Admission requests, results, and completed cases will appear here.',
  'الاستقبال والمرضى': 'Reception and patients',
  'العيادات والأطباء': 'Clinics and doctors',
  'المختبر والتشخيص والأشعة': 'Laboratory, diagnostics, and radiology',
  'المحاسبة والفواتير': 'Accounting and invoices',
  'إدارة النظام': 'System administration',
  'المبيت · الإدارة': 'Inpatient · Administration',
  'المبيت · التأهيل الطبي': 'Inpatient · Medical Rehabilitation',
  'المبيت · الخدمة الاجتماعية والنفسية': 'Inpatient · Social and Psychological Service',
  'المبيت · العلاج الطبيعي الداخلي': 'Inpatient · Internal Physical Therapy',
  'المبيت · الفرع المالي': 'Inpatient · Financial Branch',
  'المبيت · وزارة الصحة': 'Inpatient · Ministry of Health',
  'القسم الإداري': 'Administrative section',
  'التسجيل والحالات': 'Registration and cases',
  'ملف التأهيل الطبي': 'Medical rehabilitation file',
  'تقارير واحتياجات ومتابعة': 'Reports, needs, and follow-up',
  'الخدمة الاجتماعية': 'Social service',
  'دراسة الحالة والتدخلات': 'Case study and interventions',
  'العلاج الطبيعي الداخلي': 'Internal physical therapy',
  'جلسات وتكليفات وإحصائيات': 'Sessions, assignments, and statistics',
  'القسم المالي': 'Financial section',
  'التغطية والمطالبات والتقارير': 'Coverage, claims, and reports',
  'وزارة الصحة': 'Ministry of Health',
  'المقيمون والانتظار والتقارير': 'Admitted patients, waiting list, and reports',
  'بحث بالاسم، الهوية، الملف، التشخيص...': 'Search by name, ID, file, or diagnosis...',
  'بحث بالاسم أو الهوية أو الملف...': 'Search by name, ID, or file...',
  'ابحث عن مريض مبيت أولاً': 'Search for an admitted patient first',
  'فتح ملف بالهوية': 'Open file by national ID',
  'مرتبط بالإداري': 'Linked to administration',
  'لا توجد حالات مبيت مطابقة': 'No matching admitted cases',
  'ستظهر الحالات هنا تلقائيًا بعد تسجيلها في ملف المبيت الإداري.': 'Cases will appear here automatically after they are registered in the inpatient administrative file.',
  'قائمة مرضى المبيت للعلاج الطبيعي الداخلي': 'Inpatient list for internal physical therapy',
  'قائمة الممرضين / المعالجين': 'Nurses / therapists list',
  'رقم الهوية': 'National ID',
  'الاسم الكامل': 'Full name',
  'اسم الممرض / المعالج': 'Nurse / therapist name',
  'ذكر - قسم الرجال': 'Male - men section',
  'أنثى - نساء وأطفال': 'Female - women and children',
  'المسمى': 'Job title',
  'الهاتف اختياري': 'Phone optional',
  'جلب': 'Fetch',
  'إضافة': 'Add',
  'تعديل': 'Edit',
  'حذف': 'Delete',
  'حفظ': 'Save',
  'إلغاء': 'Cancel',
  'حفظ البيانات': 'Save data',
  'ملف الممرض / المعالج': 'Nurse / therapist profile',
  'تاريخ الميلاد': 'Date of birth',
  'الهاتف': 'Phone',
  'المدينة': 'City',
  'العنوان / المنطقة': 'Address / area',
  'ملاحظات / بيانات إضافية': 'Notes / additional data',
  'أي بيانات إضافية مطلوبة في ملفه': 'Any additional data required in the profile',
  'إضافة بيان جديد للملف': 'Add a new profile field',
  'اسم البيان': 'Field name',
  'القيمة': 'Value',
  'قائمة تشخيصات العلاج الطبيعي': 'Physical therapy diagnosis list',
  'اختيار واحد لكل مريض': 'One selection per patient',
  'اكتب تشخيصًا جديدًا ثم Enter ليضاف للقائمة': 'Type a new diagnosis, then press Enter to add it to the list',
  'القائمة فارغة، أضف التشخيصات التي تستخدمها في القسم.': 'The list is empty. Add the diagnoses used in this section.',
  'أخرى': 'Other',
  'اختر تشخيصًا واحدًا': 'Select one diagnosis',
  'اختيار': 'Select',
  'اسم المريض': 'Patient name',
  'العمر': 'Age',
  'الجنس': 'Gender',
  'القسم': 'Section',
  'تشخيص العلاج الطبيعي': 'Physical therapy diagnosis',
  'تشخيص المبيت': 'Inpatient diagnosis',
  'الجلسات': 'Sessions',
  'الجلسات المطلوبة': 'Required sessions',
  'الجلسات المنجزة': 'Completed sessions',
  'الجلسات المتبقية': 'Remaining sessions',
  'الجلسات المتأخرة': 'Delayed sessions',
  'المتبقي': 'Remaining',
  'المنجزة': 'Completed',
  'المواعيد': 'Appointments',
  'جدولة المواعيد': 'Session schedule',
  'وقت الجلسة': 'Session time',
  'ملاحظات التكليف': 'Assignment notes',
  'ملاحظات عامة للتكليف': 'General assignment notes',
  'السبت والاثنين والأربعاء': 'Saturday, Monday, and Wednesday',
  'الأحد والثلاثاء والخميس': 'Sunday, Tuesday, and Thursday',
  'أيام ومواعيد حسب الحاجة': 'Custom days and appointments',
  'السبت': 'Saturday',
  'الأحد': 'Sunday',
  'الاثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday',
  'حفظ توزيع الحالات': 'Save case assignments',
  'توزيع الحالات': 'Case assignments',
  'فتح نافذة الاختيار والحفظ': 'Open selection and save window',
  'اختر ممرضاً أو معالجاً': 'Select a nurse or therapist',
  'بعد الاختيار ستظهر نافذة الحالات المناسبة له كقائمة Checkbox.': 'After selection, eligible cases will appear as a checkbox list.',
  'التقارير والإحصائيات': 'Reports and statistics',
  'البيانات التي تظهر في التقرير': 'Data shown in the report',
  'حدد الأعمدة والفئة العمرية والفترة المطلوبة، ويمكن إضافة محددات جديدة.': 'Select columns, age group, and period. You can add custom filters.',
  'القالب الافتراضي': 'Default template',
  'تحديد الكل': 'Select all',
  'اسم محدد جديد': 'New filter name',
  'إضافة محدد': 'Add filter',
  'محددات إضافية': 'Additional filters',
  'تصدير تقرير الإحصائيات': 'Export statistics report',
  'تقرير العلاج الطبيعي الداخلي للمبيت': 'Inpatient Internal Physical Therapy Report',
  'تقرير توزيع حالات العلاج الطبيعي الداخلي': 'Internal Physical Therapy Case Assignment Report',
  'جدول تكليف الممرضين والحالات': 'Nurse and case assignment table',
  'طباعة تقرير التوزيع': 'Print assignment report',
  'الممرض / المعالج': 'Nurse / therapist',
  'النطاق': 'Scope',
  'عدد الحالات': 'Number of cases',
  'الحالات المكلف بها': 'Assigned cases',
  'لا توجد حالات مكلف بها': 'No assigned cases',
  'متابعة': 'Follow-up',
  'منتهي': 'Completed',
  'غير مكلف': 'Unassigned',
  'رجال فقط': 'Men only',
  'نساء وأطفال': 'Women and children',
  'رجال': 'Men',
  'نساء': 'Women',
  'أطفال': 'Children',
  'ذكر': 'Male',
  'أنثى': 'Female',
  'كل الفترات': 'All periods',
  'الفترة': 'Period',
  'اليوم': 'Today',
  'الحالة': 'Status',
  'جدولة': 'Schedule',
  'المريض': 'Patient',
  'المرضى': 'Patients',
  'تقييم الحالة والخطة العلاجية': 'Case evaluation and treatment plan',
  'ملاحظة جلسة اليوم': 'Today session note',
  'جلسة علاج طبيعي داخلي منجزة اليوم.': 'Internal physical therapy session completed today.',
  'تم إنهاء جلسة اليوم': "Today's session completed",
  'تم الانتهاء من متابعة هذه الحالة / اعتماد التقييم': 'Case follow-up completed / evaluation approved',
  'حفظ وإرسال لملف المريض': 'Save and send to patient file',
  'متابعة وتقييم حالة العلاج الطبيعي': 'Physical therapy follow-up and evaluation',
  'اختيار صيغة التقرير': 'Choose report format',
  'اختر صيغة التقرير': 'Choose report format',
  'سيتم تصدير نفس البيانات المحددة في التقرير الحالي.': 'The currently selected report data will be exported.',
  'للطباعة': 'For printing',
  'للجداول': 'For spreadsheets',
  'للتعديل': 'For editing',
  'للطباعة والمشاركة': 'For printing and sharing',
  'للتحليل والجداول': 'For analysis and spreadsheets',
  'للتعديل الإداري': 'For administrative editing',
  'جهة التغطية': 'Coverage provider',
  'جميع جهات التغطية': 'All coverage providers',
  'مساهمة ذاتية / حالة إنسانية': 'Self-pay / humanitarian case',
  'وكالة الغوث (الأونروا)': 'UNRWA',
  'تأمين خاص': 'Private insurance',
  'جمعيات خيرية': 'Charities',
  'غير محدد': 'Not specified',
  'الكل': 'All',
  'الجميع': 'All',
  'من تاريخ دخول': 'Admission date from',
  'إلى تاريخ دخول': 'Admission date to',
  'العمر من': 'Age from',
  'العمر إلى': 'Age to',
  'إظهار الأطفال فقط ضمن التقرير': 'Show children only in the report',
  'العنوان': 'Address',
  'رقم الملف': 'File No.',
  'م': 'No.',
  'لا يوجد رقم هوية': 'No national ID',
  'تم حفظ البيانات': 'Data saved',
  'تم تصدير التقرير بنجاح': 'Report exported successfully',
  'تعذر تصدير التقرير': 'Could not export report',
  'اكتب رقم هوية الممرض / المعالج أولاً': 'Enter the nurse / therapist national ID first',
  'اكتب رقم هوية الممرض / المعالج': 'Enter the nurse / therapist national ID',
  'تم جلب بيانات الممرض / المعالج من السجل المدني': 'Nurse / therapist data fetched from the civil registry',
  'تعذر جلب البيانات، يمكنك تعبئتها يدويًا': 'Could not fetch data. You can enter it manually.',
  'اكتب اسم البيان وقيمته': 'Enter the field name and value',
  'اسم الممرض / المعالج مطلوب': 'Nurse / therapist name is required',
  'اكتب اسم الممرض / المعالج': 'Enter the nurse / therapist name',
  'تم تعديل ملف الممرض / المعالج': 'Nurse / therapist profile updated',
  'تم حذف الممرض / المعالج وإنهاء تكليفاته النشطة': 'Nurse / therapist removed and active assignments ended',
  'هذا التشخيص موجود مسبقًا': 'This diagnosis already exists',
  'تمت إضافة التشخيص إلى القائمة': 'Diagnosis added to the list',
  'تم حفظ توزيع الحالات على الممرض / المعالج': 'Case assignments saved for the nurse / therapist',
  'تعذر العثور على الحالة': 'Could not find the case',
  'تم حفظ التقييم وإرساله إلى ملف المريض': 'Evaluation saved and sent to the patient file',
  'اكتب اسم المحدد وقيمته': 'Enter the filter name and value',
  'تمت إضافة الاسم إلى قائمة العلاج الطبيعي الداخلي': 'Name added to the internal physical therapy list',
  'تقييم العلاج الطبيعي الداخلي': 'Internal physical therapy evaluation',
  'جلسة علاج طبيعي داخلي': 'Internal physical therapy session',
  'تاريخ الدخول': 'Admission date',
  'تاريخ الخروج': 'Discharge date',
  'مدة مكوث': 'Length of stay',
  'ملاحظات': 'Notes',
  'خروج': 'Discharged',
  'مقيم': 'Admitted',
  'خرج': 'Discharged',
  'لا توجد بيانات ضمن الفترة المحددة': 'No data in the selected period',
  'مستشفى الوفاء · غزة - فلسطين': 'Wafaa Hospital · Gaza - Palestine'
};

const replacementPhrases: Array<[RegExp, string]> = [
  [/ممرض/g, 'nurse'], [/ممرضة/g, 'nurse'], [/معالج/g, 'therapist'], [/الحالات/g, 'cases'], [/حالات/g, 'cases'], [/حالة/g, 'case'], [/المرضى/g, 'patients'], [/المريض/g, 'patient'], [/المبيت/g, 'inpatient'], [/التأهيل الطبي/g, 'medical rehabilitation'], [/العلاج الطبيعي الداخلي/g, 'internal physical therapy'], [/العلاج الطبيعي/g, 'physical therapy'], [/الخدمة الاجتماعية والنفسية/g, 'social and psychological service'], [/الخدمة الاجتماعية/g, 'social service'], [/وزارة الصحة/g, 'Ministry of Health'], [/رقم الهوية/g, 'national ID'], [/رقم الملف/g, 'file No.'], [/الاسم/g, 'name'], [/العمر/g, 'age'], [/الجنس/g, 'gender'], [/القسم/g, 'section'], [/العنوان/g, 'address'], [/الهاتف/g, 'phone'], [/التاريخ/g, 'date'], [/تاريخ الدخول/g, 'admission date'], [/تاريخ الخروج/g, 'discharge date'], [/تشخيص/g, 'diagnosis'], [/جهة التغطية/g, 'coverage provider'], [/الجلسات المطلوبة/g, 'required sessions'], [/الجلسات المنجزة/g, 'completed sessions'], [/الجلسات المتبقية/g, 'remaining sessions'], [/الجلسات/g, 'sessions'], [/المتبقي/g, 'remaining'], [/المنجزة/g, 'completed'], [/القائمة/g, 'list'], [/تقرير/g, 'report'], [/التقارير/g, 'reports'], [/إحصائيات/g, 'statistics'], [/تصدير/g, 'export'], [/طباعة/g, 'print'], [/حفظ/g, 'save'], [/إضافة/g, 'add'], [/تعديل/g, 'edit'], [/حذف/g, 'delete'], [/إلغاء/g, 'cancel'], [/عرض/g, 'view'], [/بحث/g, 'search'], [/اختيار/g, 'select'], [/اختياري/g, 'optional'], [/ملاحظات/g, 'notes'], [/متابعة/g, 'follow-up'], [/منتهي/g, 'completed'], [/مقيم/g, 'admitted'], [/خروج/g, 'discharged'], [/دخل/g, 'admitted'], [/ذكر/g, 'male'], [/أنثى/g, 'female'], [/رجال/g, 'men'], [/نساء/g, 'women'], [/أطفال/g, 'children'], [/اليوم/g, 'today'], [/كل الفترات/g, 'all periods'], [/الفترة/g, 'period'], [/الكل/g, 'all'], [/الجميع/g, 'all'], [/غير محدد/g, 'not specified'], [/غير مكلف/g, 'unassigned'], [/لا توجد/g, 'no'], [/تم /g, 'done '], [/تم/g, 'done'], [/جارٍ/g, 'loading'], [/مطلوب/g, 'required'], [/محدّد/g, 'selected'], [/محدد/g, 'filter'], [/بيانات/g, 'data'], [/ملف/g, 'file'], [/داخلي/g, 'internal'], [/مالي/g, 'financial'], [/إداري/g, 'administrative'], [/الصلاحيات/g, 'permissions'], [/المستخدمين/g, 'users'], [/المستخدم/g, 'user'], [/العيادات/g, 'clinics'], [/الأطباء/g, 'doctors'], [/المختبر/g, 'laboratory'], [/الأشعة/g, 'radiology'], [/الفواتير/g, 'invoices'], [/المحاسبة/g, 'accounting'], [/السجل المدني/g, 'civil registry'], [/هوية/g, 'ID'], [/الأمراض/g, 'diseases'], [/الشائعة/g, 'common'], [/المرض/g, 'disease'], [/الأخرى/g, 'other'], [/أخرى/g, 'other'], [/نعم/g, 'yes'], [/لا/g, 'no']
];

const ar: Record<string, string> = {
  appName:'الوفاء HIS', appSub:'نظام طبي سحابي تفاعلي', search:'ابحث أو نفّذ أمراً سريعاً...', systemAdmin:'إدارة النظام',
  dashboard:'لوحة القيادة', registrationDesk:'تسجيل المرضى والزيارات', patientInquiries:'الاستعلامات', archive:'الأرشيف', patients:'المرضى', queue:'الطابور والفرز', dentalClinic:'عيادة الأسنان', elderlyCare:'المسنين والمسنات', admissions:'المبيت', diagnostics:'التشخيص', billing:'الفواتير', doctors:'الأطباء', clinics:'العيادات', reports:'التقارير', settings:'الإعدادات',
  overview:'نظرة عامة', dashboardTitle:'لوحة القيادة الحيوية', dashboardSub:'حالة المستشفى لحظياً', liveQueue:'الطابور المباشر', registerPatient:'تسجيل مريض', registeredPatients:'مريض مسجّل في النظام', total:'إجمالي', waiting:'بالانتظار', inExam:'حالة قيد الفحص الآن', today:'اليوم', outpatientVisits:'زيارة عيادات خارجية', collectedTotal:'إجمالي المحصّل من الفواتير', activityIndex:'مؤشر النشاط العام', activitySub:'تدفق حي لعدد الزيارات والفحوصات', busiest:'الأكثر ازدحاماً', visitsPerClinic:'عدد الزيارات لكل عيادة', recentActivity:'آخر النشاطات', noActivity:'لا نشاط بعد', noActivitySub:'ستظهر هنا آخر الزيارات والفواتير والفحوصات فور تسجيلها.', noVisits:'لا توجد زيارات بعد', noVisitsSub:'ابدأ بتسجيل أول زيارة لعرض إحصاءات الازدحام هنا.',
  medicalSecretary:'السكرتارية الطبية', patientRegistry:'سجل المرضى', totalCount:'العدد الكلي', patient:'مريض', newPatient:'تسجيل مريض جديد', patientList:'قائمة المرضى', searchPatient:'ابحث بالاسم أو رقم الهوية...', fullName:'الاسم الكامل', idNumber:'رقم الهوية', gender:'الجنس', city:'المدينة', phone:'الهاتف', viewFile:'عرض الملف', noPatients:'لا يوجد مرضى مسجّلون بعد', noPatientsSub:'ابدأ بإضافة أول ملف مريض ليظهر هنا مع سجله الطبي الكامل.', firstName:'الاسم الشخصي', fatherName:'اسم الأب', familyName:'اسم العائلة', dob:'تاريخ الميلاد', male:'ذكر', female:'أنثى', area:'الحي / المنطقة', savePatient:'حفظ المريض', cancel:'إلغاء', requiredPatient:'يرجى تعبئة الاسم ورقم الهوية على الأقل', savedPatient:'تم تسجيل المريض بنجاح',
  patientFile:'ملف المريض', backToList:'رجوع للقائمة', registerVisit:'تسجيل زيارة', anatomyMap:'الخريطة التشريحية التفاعلية', anatomyHint:'اضغط على منطقة لعرض أو إضافة الملاحظات', clinicalTimeline:'الخط الزمني السريري', noTimeline:'لا توجد أحداث سريرية بعد', regionNotes:'ملاحظات المنطقة', addNote:'إضافة ملاحظة', notePlaceholder:'اكتب الملاحظة السريرية...', saveNote:'حفظ الملاحظة', clinic:'العيادة', doctor:'الطبيب', fee:'الرسوم', date:'التاريخ', notes:'ملاحظات', saveVisit:'حفظ الزيارة', savedVisit:'تم تسجيل الزيارة',
  outpatient:'العيادات الخارجية', queueTitle:'الطابور والفرز الحي', queueSub:'اسحب البطاقات بين الأعمدة لتحديث حالة المريض', addQueue:'إضافة إلى الطابور', waitingList:'قائمة الانتظار', examining:'قيد الفحص', exited:'تم الخروج', noCases:'لا توجد حالات هنا', added:'أُضيف', selectPatient:'اختر مريضاً', addedQueue:'تمت الإضافة إلى الطابور',
  inpatient:'المبيت الداخلي', admissionsTitle:'حالات المبيت', currentCases:'الحالات المسجّلة حالياً', addAdmission:'تسجيل حالة مبيت', admissionRecord:'سجل المبيت', diagnosis:'التشخيص', ward:'القسم', admissionDate:'تاريخ الدخول', coverage:'جهة التغطية', status:'الحالة', admitted:'مدخل', discharged:'مغادر', discharge:'تخريج', noAdmissions:'لا توجد حالات مبيت مسجّلة', noAdmissionsSub:'سجّل أول حالة دخول لعرضها هنا مع تفاصيل التغطية.', contribution:'نسبة المساهمة %', savedAdmission:'تم تسجيل حالة المبيت', dischargedOk:'تم تخريج المريض',
  diagnosticsTitle:'المختبر والأشعة', labRequests:'طلبات مخبرية', xrayExams:'فحوصات أشعة', requestLab:'طلب فحص مخبري', requestXray:'طلب أشعة', laboratory:'المختبر', radiology:'الأشعة', category:'الفئة', processing:'قيد التحليل', done:'منجز', noLabs:'لا توجد طلبات مخبرية', noLabsSub:'أنشئ أول طلب فحص ليظهر هنا مع حالته.', examType:'نوع الفحص', view:'عرض', noXrays:'لا توجد فحوصات أشعة', noXraysSub:'أنشئ أول طلب أشعة ليظهر هنا مع عارض تفاعلي.', imageClarity:'وضوح الصورة', contrast:'التباين', radiationAccuracy:'دقة الجرعة الإشعاعية', brightness:'السطوع', zoom:'التكبير', viewer:'عارض الأشعة', sendRequest:'إرسال الطلب', requestSent:'تم إرسال الطلب',
  accounts:'الحسابات', billingTitle:'الفواتير والمالية', collected:'المحصّل', due:'المستحق', newInvoice:'فاتورة جديدة', invoiceRecord:'سجل الفواتير', service:'الخدمة', gross:'الإجمالي', paid:'المدفوع', remaining:'المتبقي', paymentDistribution:'توزيع السداد', noInvoices:'لا توجد فواتير بعد', noInvoicesSub:'أصدر أول فاتورة لعرض ملخص الدخل والتغطية هنا.', insufficientData:'لا توجد بيانات كافية بعد', quantity:'العدد', unitPrice:'سعر الوحدة (₪)', coverageRatio:'نسبة التغطية %', paymentMethod:'طريقة الدفع', saveInvoice:'حفظ الفاتورة', invoiceSaved:'تم إصدار الفاتورة',
  staff:'الطاقم الطبي', doctorsTitle:'الأطباء', addDoctor:'إضافة طبيب', noDoctors:'لا يوجد أطباء مسجّلون', noDoctorsSub:'أضف أول عضو في الطاقم الطبي ليظهر هنا.', doctorName:'اسم الطبيب', assignedClinics:'العيادات', save:'حفظ', doctorSaved:'تمت إضافة الطبيب', organizational:'الهيكل التنظيمي', clinicsTitle:'العيادات', availableClinics:'عدد العيادات المتاحة', doctorCount:'طبيب', visitCount:'زيارة',
  queries:'الاستعلامات', reportsTitle:'التقارير', reportsSub:'ملخص حي مبني على بيانات النظام الحالية', generalQuery:'استعلام عام', fromDate:'من تاريخ', toDate:'إلى تاريخ', all:'الكل', generateReport:'إنشاء تقرير', reportDemo:'تم إنشاء التقرير (عرض تجريبي)', quickSummary:'ملخص سريع', registered:'مرضى مسجّلون', clinicVisits:'زيارات عيادات', tests:'فحوصات (مختبر + أشعة)', admissionCases:'حالات مبيت',
  system:'النظام', settingsTitle:'الإعدادات', settingsSub:'تفضيلات العرض وإدارة البيانات المحلية', darkMode:'المظهر الداكن', darkModeSub:'تبديل بين الوضع الليلي والنهاري', version:'إصدار النظام', clearData:'مسح جميع البيانات', clearDataSub:'حذف كل السجلات المحلية والبدء من جديد', clear:'مسح', confirmClear:'هل أنت متأكد من حذف جميع البيانات المخزنة محلياً؟', cleared:'تم مسح جميع البيانات', language:'اللغة', languageSub:'التبديل بين العربية والإنجليزية', close:'إغلاق', required:'يرجى تعبئة الحقول المطلوبة',
  gaza:'غزة', shati:'الشاطئ', rimal:'الرمال', nuseirat:'النصيرات', khanyounis:'خان يونس', rafah:'رفح', deirbalah:'دير البلح', zaytoun:'الزيتون',
  moh:'وزارة الصحة', unrwa:'وكالة الغوث (الأونروا)', private:'تأمين خاص', self:'مساهمة ذاتية / حالة إنسانية', charity:'جمعيات خيرية',
  general:'العيادة العامة', ortho:'عيادة العظام', neuro:'المخ والأعصاب', dental:'عيادة الأسنان', pt:'العلاج الطبيعي', eye:'عيادة العيون', derma:'الجلدية', ent:'أنف وأذن وحنجرة', peds:'عيادة الأطفال', internal:'الباطنة', cardio:'القلبية', obgyn:'النسائية والتوليد', surgery:'الجراحة العامة', rehab:'التأهيل الطبي',
  chem:'الكيمياء السريرية', micro:'الميكروبيولوجي', endo:'الغدد الصماء', hema:'أمراض الدم', urine:'تحليل البول', stool:'تحليل البراز',
  head:'الرأس والرقبة', chest:'الصدر', abdomen:'البطن', armLeft:'الذراع الأيسر', armRight:'الذراع الأيمن', legLeft:'الساق اليسرى', legRight:'الساق اليمنى',
  cash:'نقداً', jawwalPay:'محفظة جوال باي', palestineBank:'بنك فلسطين', arabiIslami:'البنك العربي الإسلامي', qudsBank:'بنك القدس', islamicArab:'البنك الإسلامي العربي', cairoAmman:'بنك القاهرة عمان',
};

const en: Record<string, string> = {
  appName:'Wafaa HIS', appSub:'Interactive cloud medical system', search:'Search or run a quick command...', systemAdmin:'System administration',
  dashboard:'Dashboard', registrationDesk:'Registration & visits', patientInquiries:'Patient inquiries', archive:'Archive', patients:'Patients', queue:'Queue & triage', dentalClinic:'Dental Clinic', admissions:'Admissions', diagnostics:'Diagnostics', billing:'Billing', doctors:'Doctors', clinics:'Clinics', reports:'Reports', settings:'Settings',
  overview:'Overview', dashboardTitle:'Vital dashboard', dashboardSub:'Live hospital status', liveQueue:'Live queue', registerPatient:'Register patient', registeredPatients:'patients registered in the system', total:'Total', waiting:'waiting', inExam:'cases currently under examination', today:'Today', outpatientVisits:'outpatient clinic visits', collectedTotal:'total invoice collections', activityIndex:'General activity index', activitySub:'Live flow of visits and tests', busiest:'Busiest clinics', visitsPerClinic:'Visits by clinic', recentActivity:'Recent activity', noActivity:'No activity yet', noActivitySub:'Recent visits, invoices and tests will appear here.', noVisits:'No visits yet', noVisitsSub:'Register the first visit to see clinic statistics.',
  medicalSecretary:'Medical secretary', patientRegistry:'Patient registry', totalCount:'Total count', patient:'patient', newPatient:'Register new patient', patientList:'Patient list', searchPatient:'Search by name or national ID...', fullName:'Full name', idNumber:'National ID', gender:'Gender', city:'City', phone:'Phone', viewFile:'View profile', noPatients:'No patients registered yet', noPatientsSub:'Add the first patient file to display the complete medical record.', firstName:'First name', fatherName:'Father name', familyName:'Family name', dob:'Date of birth', male:'Male', female:'Female', area:'District / area', savePatient:'Save patient', cancel:'Cancel', requiredPatient:'Please enter the name and national ID at minimum', savedPatient:'Patient registered successfully',
  patientFile:'Patient profile', backToList:'Back to list', registerVisit:'Register visit', anatomyMap:'Interactive anatomy map', anatomyHint:'Select a region to view or add notes', clinicalTimeline:'Clinical timeline', noTimeline:'No clinical events yet', regionNotes:'Region notes', addNote:'Add note', notePlaceholder:'Write a clinical note...', saveNote:'Save note', clinic:'Clinic', doctor:'Doctor', fee:'Fee', date:'Date', notes:'Notes', saveVisit:'Save visit', savedVisit:'Visit registered',
  outpatient:'Outpatient clinics', queueTitle:'Live queue and triage', queueSub:'Drag cards between columns to update patient status', addQueue:'Add to queue', waitingList:'Waiting list', examining:'Under examination', exited:'Discharged', noCases:'No cases here', added:'Added', selectPatient:'Select a patient', addedQueue:'Added to queue',
  inpatient:'Inpatient care', admissionsTitle:'Admissions', currentCases:'Current admitted cases', addAdmission:'Register admission', admissionRecord:'Admission record', diagnosis:'Diagnosis', ward:'Ward', admissionDate:'Admission date', coverage:'Coverage entity', status:'Status', admitted:'Admitted', discharged:'Discharged', discharge:'Discharge', noAdmissions:'No admissions registered', noAdmissionsSub:'Register the first admission to view coverage details.', contribution:'Contribution ratio %', savedAdmission:'Admission registered', dischargedOk:'Patient discharged',
  diagnosticsTitle:'Laboratory & radiology', labRequests:'Lab requests', xrayExams:'Radiology exams', requestLab:'Request lab test', requestXray:'Request radiology', laboratory:'Laboratory', radiology:'Radiology', category:'Category', processing:'Processing', done:'Completed', noLabs:'No lab requests', noLabsSub:'Create the first lab request to track its status.', examType:'Exam type', view:'View', noXrays:'No radiology exams', noXraysSub:'Create the first radiology request to use the interactive viewer.', imageClarity:'Image clarity', contrast:'Contrast', radiationAccuracy:'Radiation dose accuracy', brightness:'Brightness', zoom:'Zoom', viewer:'Radiology viewer', sendRequest:'Send request', requestSent:'Request sent',
  accounts:'Accounts', billingTitle:'Billing & finance', collected:'Collected', due:'Due', newInvoice:'New invoice', invoiceRecord:'Invoice record', service:'Service', gross:'Gross', paid:'Paid', remaining:'Remaining', paymentDistribution:'Payment distribution', noInvoices:'No invoices yet', noInvoicesSub:'Issue the first invoice to see income and coverage details.', insufficientData:'Not enough data yet', quantity:'Quantity', unitPrice:'Unit price (₪)', coverageRatio:'Coverage ratio %', paymentMethod:'Payment method', saveInvoice:'Save invoice', invoiceSaved:'Invoice issued',
  staff:'Medical staff', doctorsTitle:'Doctors', addDoctor:'Add doctor', noDoctors:'No doctors registered', noDoctorsSub:'Add the first medical staff member.', doctorName:'Doctor name', assignedClinics:'Clinics', save:'Save', doctorSaved:'Doctor added', organizational:'Organization', clinicsTitle:'Clinics', availableClinics:'Available clinics', doctorCount:'doctors', visitCount:'visits',
  queries:'Queries', reportsTitle:'Reports', reportsSub:'Live summary based on current system data', generalQuery:'General query', fromDate:'From date', toDate:'To date', all:'All', generateReport:'Generate report', reportDemo:'Report generated (demo)', quickSummary:'Quick summary', registered:'Registered patients', clinicVisits:'Clinic visits', tests:'Tests (lab + radiology)', admissionCases:'Admission cases',
  system:'System', settingsTitle:'Settings', settingsSub:'Display preferences and local data management', darkMode:'Dark mode', darkModeSub:'Switch between dark and light modes', version:'System version', clearData:'Clear all data', clearDataSub:'Delete local records and start over', clear:'Clear', confirmClear:'Are you sure you want to delete all locally stored data?', cleared:'All data cleared', language:'Language', languageSub:'Switch between Arabic and English', close:'Close', required:'Please complete the required fields',
  gaza:'Gaza', shati:'Al-Shati', rimal:'Al-Rimal', nuseirat:'Nuseirat', khanyounis:'Khan Younis', rafah:'Rafah', deirbalah:'Deir al-Balah', zaytoun:'Al-Zaytoun',
  moh:'Ministry of Health', unrwa:'UNRWA', private:'Private insurance', self:'Self-funded / humanitarian', charity:'Charitable organizations',
  general:'General clinic', ortho:'Orthopedics', neuro:'Neurology', dental:'Dental clinic', pt:'Physical therapy', eye:'Ophthalmology', derma:'Dermatology', ent:'ENT', peds:'Pediatrics', internal:'Internal medicine', cardio:'Cardiology', obgyn:'Obstetrics & gynecology', surgery:'General surgery', rehab:'Medical rehabilitation',
  chem:'Clinical chemistry', micro:'Microbiology', endo:'Endocrinology', hema:'Hematology', urine:'Urinalysis', stool:'Stool analysis',
  head:'Head & neck', chest:'Chest', abdomen:'Abdomen', armLeft:'Left arm', armRight:'Right arm', legLeft:'Left leg', legRight:'Right leg',
  cash:'Cash', jawwalPay:'Jawwal Pay wallet', palestineBank:'Bank of Palestine', arabiIslami:'Arab Islamic Bank', qudsBank:'Al-Quds Bank', islamicArab:'Palestine Islamic Bank', cairoAmman:'Cairo Amman Bank',
};

Object.assign(ar, {
  loginSubtitle:'بوابة الدخول الآمنة لنظام المستشفى',username:'اسم المستخدم أو رقم الطبيب',password:'كلمة المرور',login:'تسجيل الدخول',invalidCredentials:'اسم المستخدم أو كلمة المرور غير صحيحة',credentialsHidden:'بيانات الدخول لا تُعرض على الواجهة. تُنشأ حسابات الأطباء من رئيس قسم IT أو أمين الصندوق.',logout:'تسجيل الخروج',admin:'الإدارة',cashier:'موظف تسجيل المرضى والزيارات',inquiry_clerk:'موظف الاستعلامات',it_head:'رئيس قسم IT',treasurer:'أمين الصندوق',doctorDashboard:'لوحة الطبيب',
  activeCases:'حالات نشطة عند الأطباء',walletCredits:'إجمالي المبالغ المضافة للمحافظ',activeAdmissions:'مرضى المبيت الحاليون',todayVisits:'زيارات اليوم',
  nameOrId:'رقم الهوية أو الاسم الكامل',nameOrIdHint:'أدخل رقم الهوية أو الاسم',identityPhoneRequired:'أدخل رقم الهوية أو الاسم ورقم الهاتف',civilRegistryIntegration:'تكامل السجل المدني',civilRegistryPlaceholder:'موضع مهيأ لربط API السجل المدني الرسمي لاحقاً',fetchRegistry:'جلب البيانات من السجل المدني',fetching:'جارٍ جلب البيانات...',registryFetched:'تم جلب البيانات الديموغرافية',registryFailed:'تعذر جلب بيانات السجل المدني',verifiedDemographics:'بيانات موثقة من السجل المدني',confirmRegistration:'تأكيد تسجيل المريض',medicalSerial:'رقم المريض الموحد',
  visitRegistered:'تم تسجيل الزيارة ورقم الدور',availableBalance:'الرصيد المتاح',visitFee:'رسم الزيارة',cashierFeeHint:'رسوم الزيارة للقراءة فقط. يمكن لأمين الصندوق تعديلها من صفحة العيادات.',insufficientWallet:'الرصيد غير كافٍ لتسجيل الزيارة. أضف دفعة للمحفظة أولاً.',selectDoctorClinic:'اختر عيادة وطبيباً صحيحين',
  demographics:'البيانات الديموغرافية',registrationDate:'تاريخ التسجيل الأول',patientWallet:'محفظة المريض',walletBalance:'رصيد المحفظة',walletRule:'تُخصم رسوم الزيارات تلقائياً، وتُضاف الدفعات من الفواتير.',financialLedger:'السجل المالي الكامل',transactions:'عملية',timestamp:'وقت العملية',transactionType:'نوع العملية',amount:'المبلغ',method:'الطريقة',receipt:'رقم الوصل',credit:'إيداع',debit:'خصم',wallet:'محفظة',noTransactions:'لا توجد حركات مالية',noTransactionsSub:'ستظهر هنا جميع الدفعات ورسوم الزيارات مع الوقت والخدمة.',followUpAppointments:'مواعيد المراجعة',noAppointments:'لا توجد مواعيد مراجعة',noAppointmentsSub:'يُنشأ موعد المراجعة بعد إنهاء الطبيب للحالة.',visitHistory:'سجل الزيارات',scheduled:'مجدولة',booked:'تم الحجز',completed:'مكتملة',
  todayFollowUps:'مراجعات اليوم',cashierAssignHint:'تحتاج إلى تعيين رقم دور من الكاشير',assignQueueNumber:'تعيين رقم دور',followUpBooked:'تم حجز المراجعة وإعطاء رقم الدور',activeInpatients:'قائمة المرضى المقيمين حالياً',
  patientName:'اسم المريض',appTransfer:'تطبيق / حوالة',senderPhone:'الرقم المحوَّل منه',senderName:'اسم المحوِّل',transferSource:'مصدر التحويل',bank:'بنك',transferFieldsRequired:'أدخل رقم المحوّل واسمه ومصدر التحويل',invoiceWalletHint:'عند حفظ الفاتورة سيُنشأ وصل دفع ويُضاف صافي المبلغ تلقائياً إلى محفظة المريض.',
  doctorPortal:'بوابة الطبيب الخاصة',todayPatients:'مرضى اليوم',waitingToday:'بانتظار الدخول',underExam:'قيد الفحص',pastPatients:'المرضى السابقون',scheduledFollowUps:'مراجعات مجدولة',todayQueue:'طابور اليوم',searchByVisitDate:'البحث بتاريخ الزيارة',privateClinicalNotes:'الملاحظات السريرية الخاصة',privateNotes:'ملاحظات خاصة',privateNotesWarning:'هذه الملاحظات لا تظهر للكاشير أو الإدارة؛ يراها الطبيب المعالج فقط.',newPrivateNote:'ملاحظة سريرية جديدة',privateNoteSaved:'تم حفظ الملاحظة الخاصة',startCase:'بدء الحالة',finishCase:'إنهاء الحالة',caseFinished:'تم إنهاء الحالة وإزالتها من الدور',followUp:'المراجعة',noTodayPatients:'لا يوجد مرضى في طابور اليوم',noPastPatients:'لا توجد زيارات سابقة مطابقة',doctorQueueEmpty:'ستظهر الحالات هنا بعد تسجيل الكاشير للزيارة وتحديد الطبيب.',
  doctorId:'رقم معرّف الطبيب',doctorCredentialHint:'سلّم رقم الطبيب وكلمة المرور للطبيب بشكل خاص. كلمة المرور لا تظهر بعد الحفظ.',doctorRemoved:'تمت إزالة الطبيب',confirmRemoveDoctor:'هل تريد إزالة هذا الطبيب؟',addClinic:'إضافة عيادة',clinicNameAr:'اسم العيادة بالعربية',clinicNameEn:'اسم العيادة بالإنجليزية',standardVisitFee:'رسم الزيارة القياسي',clinicAdded:'تمت إضافة العيادة',clinicRemoved:'تمت إزالة العيادة',feeUpdated:'تم تحديث رسم الزيارة',confirmRemoveClinic:'هل تريد إزالة هذه العيادة؟',remove:'إزالة',
  addSponsor:'إضافة جهة داعمة',sponsorNameAr:'اسم الجهة بالعربية',sponsorNameEn:'اسم الجهة بالإنجليزية',sponsorAdded:'تمت إضافة الجهة الداعمة',reportBuilder:'منشئ الاستعلام',outputColumns:'أعمدة ملف التقرير',showName:'عرض الاسم',showAge:'عرض العمر',showNationalId:'عرض رقم الهوية',showDob:'عرض تاريخ الميلاد',showGender:'عرض الجنس',showClinicType:'عرض نوع العيادة',showDoctorName:'عرض اسم الطبيب',ageRange:'نطاق العمر',fromAge:'من عمر',toAge:'إلى عمر',age:'العمر',optional:'اختياري',clinicType:'نوع العيادة',generateExcel:'إنشاء ملف Excel',printReport:'طباعة الكشف',reportPreview:'معاينة الكشف',noReportResults:'لا توجد نتائج',adjustFilters:'عدّل محددات التقرير لإظهار نتائج.',excelGenerated:'تم إنشاء ملف Excel',
  treasury:'الخزينة',financialReports:'التقارير المالية',financialReportsSub:'كشف مالي مخصص للحوالات والدفعات مع التصفية والطباعة',totalCollections:'إجمالي التحصيل',cashCollections:'التحصيل النقدي',transferCollections:'الحوالات والتطبيقات',financialTransactions:'سجل العمليات المالية',noFinancialTransactions:'لا توجد عمليات مالية مطابقة',adjustFinanceFilters:'عدّل الفترة أو طريقة الدفع لعرض العمليات المطلوبة.',
  laravelReady:'جاهزية Laravel API',laravelReadySub:'الخدمات والنماذج مفصولة تمهيداً للربط مع REST API في الخطوة القادمة.',cash:'نقداً',app:'تطبيق',jawwalPay:'جوال باي',processing:'قيد التحليل',waiting:'بانتظار',exam:'قيد الفحص',
});

Object.assign(en, {
  loginSubtitle:'Secure hospital system access portal',username:'Username or doctor ID',password:'Password',login:'Sign in',invalidCredentials:'Invalid username or password',credentialsHidden:'Credentials are not displayed on the interface. Doctor accounts are created by the Head of IT or Treasurer.',logout:'Sign out',admin:'Administration',cashier:'Registration clerk',inquiry_clerk:'Inquiry clerk',it_head:'Head of IT',treasurer:'Treasurer',doctorDashboard:'Doctor dashboard',
  activeCases:'Active doctor cases',walletCredits:'Total wallet credits',activeAdmissions:'Current inpatients',todayVisits:"Today's visits",
  nameOrId:'National ID or full name',nameOrIdHint:'Enter the national ID or full name',identityPhoneRequired:'Enter a national ID or name and phone number',civilRegistryIntegration:'Civil Registry integration',civilRegistryPlaceholder:'Prepared connector for the official Civil Registry API',fetchRegistry:'Fetch registry data',fetching:'Fetching data...',registryFetched:'Demographic data fetched',registryFailed:'Civil Registry lookup failed',verifiedDemographics:'Verified Civil Registry data',confirmRegistration:'Confirm patient registration',medicalSerial:'Unified patient number',
  visitRegistered:'Visit registered with queue number',availableBalance:'Available balance',visitFee:'Visit fee',cashierFeeHint:'The visit fee is read-only. The Treasurer can edit it on the Clinics page.',insufficientWallet:'Insufficient wallet balance. Add a payment before registering the visit.',selectDoctorClinic:'Select a valid clinic and doctor',
  demographics:'Demographics',registrationDate:'First registration date',patientWallet:'Patient wallet',walletBalance:'Wallet balance',walletRule:'Visit fees are debited automatically and invoice payments are credited.',financialLedger:'Complete financial ledger',transactions:'transactions',timestamp:'Timestamp',transactionType:'Transaction type',amount:'Amount',method:'Method',receipt:'Receipt number',credit:'Credit',debit:'Debit',wallet:'Wallet',noTransactions:'No financial transactions',noTransactionsSub:'Payments and visit fees will appear here with service and timestamp.',followUpAppointments:'Follow-up appointments',noAppointments:'No follow-up appointments',noAppointmentsSub:'A follow-up is created after the doctor finishes a case.',visitHistory:'Visit history',scheduled:'Scheduled',booked:'Booked',completed:'Completed',
  todayFollowUps:"Today's follow-ups",cashierAssignHint:'Cashier queue assignment is required',assignQueueNumber:'Assign queue number',followUpBooked:'Follow-up booked with queue number',activeInpatients:'Current inpatient list',
  patientName:'Patient name',appTransfer:'App / transfer',senderPhone:'Sender phone number',senderName:'Sender name',transferSource:'Transfer source',bank:'Bank',transferFieldsRequired:'Enter sender phone, sender name and transfer source',invoiceWalletHint:'Saving the invoice creates a receipt and credits the net amount to the patient wallet.',
  doctorPortal:'Private doctor portal',todayPatients:"Today's patients",waitingToday:'Waiting',underExam:'Under examination',pastPatients:'Past patients',scheduledFollowUps:'Scheduled follow-ups',todayQueue:"Today's queue",searchByVisitDate:'Search by visit date',privateClinicalNotes:'Private clinical notes',privateNotes:'Private notes',privateNotesWarning:'These notes are visible only to the attending doctor, never cashiers or administrators.',newPrivateNote:'New clinical note',privateNoteSaved:'Private note saved',startCase:'Start case',finishCase:'Finish case',caseFinished:'Case finished and removed from queue',followUp:'Follow-up',noTodayPatients:'No patients in today’s queue',noPastPatients:'No matching past visits',doctorQueueEmpty:'Cases appear after cashier registration and doctor assignment.',
  doctorId:'Doctor ID',doctorCredentialHint:'Share the doctor ID and password privately. The password is hidden after saving.',doctorRemoved:'Doctor removed',confirmRemoveDoctor:'Remove this doctor?',addClinic:'Add clinic',clinicNameAr:'Arabic clinic name',clinicNameEn:'English clinic name',standardVisitFee:'Standard visit fee',clinicAdded:'Clinic added',clinicRemoved:'Clinic removed',feeUpdated:'Visit fee updated',confirmRemoveClinic:'Remove this clinic?',remove:'Remove',
  addSponsor:'Add sponsoring organization',sponsorNameAr:'Arabic organization name',sponsorNameEn:'English organization name',sponsorAdded:'Sponsoring organization added',reportBuilder:'Report query builder',outputColumns:'Report columns',showName:'Show name',showAge:'Show age',showNationalId:'Show national ID',showDob:'Show date of birth',showGender:'Show gender',showClinicType:'Show clinic type',showDoctorName:'Show doctor name',ageRange:'Age range',fromAge:'From age',toAge:'To age',age:'Age',optional:'Optional',clinicType:'Clinic type',generateExcel:'Generate Excel',printReport:'Print report',reportPreview:'Report preview',noReportResults:'No results',adjustFilters:'Adjust the report filters to show results.',excelGenerated:'Excel file generated',
  treasury:'Treasury',financialReports:'Financial reports',financialReportsSub:'Filtered and printable report for transfers and payments',totalCollections:'Total collections',cashCollections:'Cash collections',transferCollections:'Transfers and app payments',financialTransactions:'Financial transactions',noFinancialTransactions:'No matching financial transactions',adjustFinanceFilters:'Adjust the date range or payment method.',
  laravelReady:'Laravel API readiness',laravelReadySub:'Services and models are separated for REST API integration in the next step.',cash:'Cash',app:'App',jawwalPay:'Jawwal Pay',processing:'Processing',waiting:'Waiting',exam:'Under examination',
});

Object.assign(ar, {
  signingIn:'جارٍ تسجيل الدخول...',userAccess:'المستخدمون والصلاحيات',userAccessTitle:'إدارة المستخدمين والصلاحيات',userAccessSub:'إنشاء الحسابات وتحديد الوصول إلى الصفحات والعمليات من مكان واحد',addUser:'إضافة مستخدم',editUser:'تعديل المستخدم',displayName:'الاسم الظاهر',accountStatus:'حالة الحساب',active:'نشط',inactive:'معطّل',accountTemplate:'قالب الحساب',userType:'نوع المستخدم',userTypePlaceholder:'اكتب نوع المستخدم...',userTypeHint:'يمكنك كتابة أي نوع مستخدم بحرية. القوالب المقترحة اختيارية ولا تقيدك.',newPasswordOptional:'كلمة مرور جديدة (اختياري)',confirmPassword:'تأكيد كلمة المرور',passwordRequired:'كلمة المرور مطلوبة للمستخدم الجديد',passwordMismatch:'كلمتا المرور غير متطابقتين',permissionCeiling:'حماية مستوى الصلاحيات',permissionCeilingSub:'يمكنك منح الصلاحيات التي تمتلكها فقط. الصلاحيات المالية المحجوبة عن حسابك لا تظهر ولا يمكن منحها.',pagePermissions:'صلاحيات الصفحات والعمليات',pagePermissionsSub:'حدّد ما يستطيع المستخدم عرضه أو إضافته أو تعديله أو حذفه',page:'الصفحة',permission_view:'عرض',permission_create:'إضافة',permission_update:'تعديل',permission_delete:'حذف',permission_print:'طباعة',permission_export:'تصدير',permission_fee:'الرسوم',registeredUsers:'إجمالي المستخدمين',activeUsers:'مستخدمون نشطون',grantablePermissions:'صلاحيات متاحة للمنح',usersAndAccess:'حسابات النظام',refresh:'تحديث',loadingUsers:'جارٍ تحميل المستخدمين...',connectionError:'تعذر الاتصال بقاعدة البيانات',retry:'إعادة المحاولة',role:'الدور',permissionCount:'عدد الصلاحيات',lastLogin:'آخر دخول',actions:'الإجراءات',systemUser:'مستخدم نظام',doctorAccount:'حساب طبيب',edit:'تعديل',confirmRemoveUser:'هل تريد حذف هذا المستخدم نهائياً؟ لا يمكن التراجع عن ذلك.',userRemoved:'تم حذف المستخدم نهائياً',userCreated:'تم إنشاء المستخدم وصلاحياته',userUpdated:'تم تحديث المستخدم وصلاحياته',saveFailed:'تعذر حفظ التعديلات',loadFailed:'تعذر تحميل المستخدمين',noUsers:'لا توجد حسابات',noUsersSub:'أضف أول مستخدم للنظام من زر إضافة مستخدم.',
  module_dashboard:'لوحة القيادة',module_patient_inquiries:'استعلامات المرضى',module_patients:'المرضى',module_visits:'الاستقبال والزيارات',module_queue:'الطابور والفرز',module_dental:'عيادة الأسنان',module_admissions:'المبيت · الإدارة',module_inpatient_rehab:'المبيت · التأهيل الطبي',module_inpatient_social:'المبيت · الخدمة الاجتماعية والنفسية',module_inpatient_pt:'المبيت · العلاج الطبيعي الداخلي',module_outpatient_pt:'العلاج الطبيعي الخارجي',module_inpatient_finance:'المبيت · الفرع المالي',module_moh_portal:'المبيت · بوابة وزارة الصحة',module_diagnostics:'التشخيص والأشعة',module_diagnostic_catalog:'دليل الفحوصات والأسعار',module_billing:'الفواتير والإيداعات',module_patient_finance:'الملف المالي للمريض',module_transfers:'الحوالات المالية',module_doctors:'الأطباء',module_clinics:'العيادات',module_reports:'تقارير المرضى',module_settings:'الإعدادات',module_users:'المستخدمون والصلاحيات',module_finance:'التقارير المالية',module_doctor_portal:'بوابة الطبيب',
});

Object.assign(en, {
  signingIn:'Signing in...',userAccess:'Users & access',userAccessTitle:'Users and permissions',userAccessSub:'Create accounts and control page and action access from one place',addUser:'Add user',editUser:'Edit user',displayName:'Display name',accountStatus:'Account status',active:'Active',inactive:'Disabled',accountTemplate:'Account template',userType:'User type',userTypePlaceholder:'Type any user type...',userTypeHint:'You can enter any user type freely. Suggested templates are optional and do not restrict you.',newPasswordOptional:'New password (optional)',confirmPassword:'Confirm password',passwordRequired:'A password is required for a new user',passwordMismatch:'Passwords do not match',permissionCeiling:'Permission ceiling protection',permissionCeilingSub:'You can grant only permissions you already hold. Restricted financial permissions are hidden and cannot be assigned.',pagePermissions:'Pages and actions',pagePermissionsSub:'Choose what this user can view, create, update, delete, print or export',page:'Page',permission_view:'View',permission_create:'Add',permission_update:'Edit',permission_delete:'Delete',permission_print:'Print',permission_export:'Export',permission_fee:'Fees',registeredUsers:'Registered users',activeUsers:'Active users',grantablePermissions:'Grantable permissions',usersAndAccess:'System accounts',refresh:'Refresh',loadingUsers:'Loading users...',connectionError:'Could not connect to the database',retry:'Retry',role:'Role',permissionCount:'Permissions',lastLogin:'Last login',actions:'Actions',systemUser:'System user',doctorAccount:'Doctor account',edit:'Edit',confirmRemoveUser:'Permanently delete this user? This cannot be undone.',userRemoved:'User permanently deleted',userCreated:'User and permissions created',userUpdated:'User and permissions updated',saveFailed:'Could not save changes',loadFailed:'Could not load users',noUsers:'No user accounts',noUsersSub:'Create the first account using Add user.',
  module_dashboard:'Dashboard',module_patient_inquiries:'Patient inquiries',module_patients:'Patients',module_visits:'Reception & visits',module_queue:'Queue & triage',module_dental:'Dental clinic',module_admissions:'Inpatient · administration',module_inpatient_rehab:'Inpatient · medical rehab',module_inpatient_social:'Inpatient · social & psych service',module_inpatient_pt:'Inpatient · internal physical therapy',module_outpatient_pt:'Outpatient physical therapy',module_inpatient_finance:'Inpatient · finance',module_moh_portal:'Inpatient · Ministry of Health portal',module_diagnostics:'Diagnostics & radiology',module_diagnostic_catalog:'Diagnostic catalog & pricing',module_billing:'Invoices & deposits',module_patient_finance:'Patient finance',module_transfers:'Financial transfers',module_doctors:'Doctors',module_clinics:'Clinics',module_reports:'Patient reports',module_settings:'Settings',module_users:'Users & access',module_finance:'Financial reports',module_doctor_portal:'Doctor portal',
});

Object.assign(ar, {
  receptionist:'الاستقبال',lab_technician:'موظف المختبر',inpatient_manager:'مسؤول المبيت',rehab_specialist:'أخصائي التأهيل',social_worker:'الخدمة الاجتماعية والنفسية',inpatient_pt:'العلاج الطبيعي الداخلي',inpatient_finance:'مالية المبيت',moh_user:'وزارة الصحة',custom:'مستخدم مخصص',laboratoryPortal:'بوابة المختبر',pendingAnalysis:'فحوصات قيد التحليل',completedResults:'نتائج مكتملة',laboratoryQueueHint:'تظهر هنا طلبات الفحوصات التي يسجلها الكاشير.',
  addDiagnosticService:'إضافة تشخيص أو فحص',diagnosticServiceAdded:'تمت إضافة الخدمة وسعرها',diagnosticType:'نوع الخدمة',servicePrice:'سعر الخدمة',serviceNameAr:'اسم الخدمة بالعربية',serviceNameEn:'اسم الخدمة بالإنجليزية',defaultTestsHint:'بنود التحليل الافتراضية (كل سطر: Test | Reference Range)',diagnosticFee:'رسوم الفحص',diagnosticService:'الفحص أو التشخيص',requestingDoctor:'الطبيب الطالب للفحص',externalOrNoDoctor:'طبيب خارجي / بدون طبيب',diagnosticWalletHint:'يُخصم سعر الفحص تلقائياً من حساب المريض عند تأكيد الطلب.',confirmDiagnosticOrder:'تأكيد وإرسال الطلب',insufficientDiagnosticBalance:'الرصيد غير كافٍ لرسوم هذا الفحص.',selectDiagnosticService:'اختر المريض والفحص المطلوب',diagnosticOrderCreated:'تم تسجيل الطلب وخصم الرسوم من حساب المريض',diagnosticCatalog:'دليل الفحوصات والأسعار',testItems:'بنود',confirmRemoveService:'هل تريد إزالة هذه الخدمة من الدليل؟',diagnosticServiceRemoved:'تمت إزالة الخدمة',notSpecified:'غير محدد',
  enterLabResults:'إدخال نتيجة التحليل',labResultRequired:'أدخل نتيجة واحدة على الأقل',labCompleted:'تم اعتماد النتيجة وإنشاء تقرير PDF',addTestRow:'إضافة بند تحليل',completeAndCreatePdf:'اعتماد وإنشاء PDF',enterResults:'إدخال النتائج',downloadPdf:'تحميل PDF',noPendingLabOrders:'لا توجد فحوصات قيد التحليل',noCompletedLabOrders:'لا توجد نتائج مكتملة',labResultsAndReports:'التحاليل وملفات النتائج',radiologyFiles:'ملفات وصور الأشعة',noLabReports:'لا توجد نتائج تحاليل',noLabReportsSub:'ستظهر النتائج المعتمدة هنا بصيغة PDF.',noRadiologyFiles:'لا توجد ملفات أشعة',noRadiologyFilesSub:'ستظهر طلبات وصور الأشعة الخاصة بالمريض هنا.',doctorLabResultsEmpty:'تظهر هنا نتائج التحاليل التي طلبها هذا الطبيب.',
  module_laboratory:'المختبر والنتائج',module_diagnostic_catalog:'دليل الفحوصات والأسعار',
});

Object.assign(en, {
  receptionist:'Reception',lab_technician:'Laboratory employee',inpatient_manager:'Inpatient manager',rehab_specialist:'Rehab specialist',social_worker:'Social & psychological service',inpatient_pt:'Internal physical therapy',inpatient_finance:'Inpatient finance',moh_user:'Ministry of Health',custom:'Custom user',laboratoryPortal:'Laboratory portal',pendingAnalysis:'Tests in progress',completedResults:'Completed results',laboratoryQueueHint:'Tests ordered by the cashier appear here.',
  addDiagnosticService:'Add diagnostic service',diagnosticServiceAdded:'Service and price added',diagnosticType:'Service type',servicePrice:'Service price',serviceNameAr:'Arabic service name',serviceNameEn:'English service name',defaultTestsHint:'Default test rows (one per line: Test | Reference Range)',diagnosticFee:'Test fee',diagnosticService:'Test or diagnostic service',requestingDoctor:'Requesting doctor',externalOrNoDoctor:'External / no doctor',diagnosticWalletHint:'The service price is debited automatically from the patient wallet when confirmed.',confirmDiagnosticOrder:'Confirm and send order',insufficientDiagnosticBalance:'The patient wallet does not have enough balance for this test.',selectDiagnosticService:'Select a patient and diagnostic service',diagnosticOrderCreated:'Order registered and fee debited from patient wallet',diagnosticCatalog:'Diagnostic catalog & prices',testItems:'items',confirmRemoveService:'Remove this service from the catalog?',diagnosticServiceRemoved:'Service removed',notSpecified:'Not specified',
  enterLabResults:'Enter laboratory results',labResultRequired:'Enter at least one test result',labCompleted:'Result approved and PDF report generated',addTestRow:'Add test row',completeAndCreatePdf:'Complete & create PDF',enterResults:'Enter results',downloadPdf:'Download PDF',noPendingLabOrders:'No tests in progress',noCompletedLabOrders:'No completed results',labResultsAndReports:'Lab tests & reports',radiologyFiles:'Radiology files & images',noLabReports:'No laboratory reports',noLabReportsSub:'Approved PDF results will appear here.',noRadiologyFiles:'No radiology files',noRadiologyFilesSub:'Patient radiology orders and images will appear here.',doctorLabResultsEmpty:'Results requested by this doctor will appear here.',
  module_laboratory:'Laboratory & results',module_diagnostic_catalog:'Diagnostic catalog & prices',
});


Object.assign(ar, {
  paymentAudit:'التطبيق والتحصيل البنكي والتدقيق', financialCollector:'المحصل المالي', financialAuditor:'المدقق المالي',
  payment_auditor:'موظف التطبيق والتحصيل البنكي', financial_collector:'المحصل المالي', financial_auditor:'أ. محمد الشكري - المدقق المالي',
  module_cashier_payment:'التطبيق والتحصيل البنكي', module_cashier_collection:'المحصل المالي', module_financial_audit:'التدقيق المالي',
});
Object.assign(en, {
  paymentAudit:'Payment & bank collection', financialCollector:'Financial collector', financialAuditor:'Financial auditor',
  payment_auditor:'Payment & bank collection officer', financial_collector:'Financial collector', financial_auditor:'Financial auditor - Mohammed Al-Shukri',
  module_cashier_payment:'Payment & bank collection', module_cashier_collection:'Financial collector', module_financial_audit:'Financial audit',
});



const exactEnglishByArabic = new Map<string, string>();
const exactArabicByEnglish = new Map<string, string>();
const collectExactTranslations = () => {
  exactEnglishByArabic.clear();
  Object.keys(ar).forEach((key) => {
    const source = normalizeUiText(ar[key] || '');
    const target = normalizeUiText(en[key] || '');
    if (source && target && hasArabic(source)) exactEnglishByArabic.set(source, target);
  });
  Object.entries(staticEnglishPhrases).forEach(([source, target]) => exactEnglishByArabic.set(normalizeUiText(source), target));
  exactArabicByEnglish.clear();
  exactEnglishByArabic.forEach((english, arabic) => {
    const key = normalizeUiText(english);
    if (key && !exactArabicByEnglish.has(key)) exactArabicByEnglish.set(key, arabic);
  });
};
collectExactTranslations();

let textOriginals = new WeakMap<Text, string>();
let elementAttrOriginals = new WeakMap<Element, Map<string, string>>();

/* v4.3.93 — السبب الجذري لبقاء الواجهة إنجليزية بعد التحويل للعربية:
   كانت العودة للعربية تعتمد على "استعادة القيمة الأصلية" المحفوظة لكل عقدة نص.
   لكن أي عقدة تُنشأ بينما اللغة إنجليزية تُحفظ قيمتها الإنجليزية كأنها الأصل،
   فتعود إليها عند كل تحويل للعربية وتبقى إنجليزية حتى تحديث الصفحة.
   الحل: ترجمة عكسية بالقاموس (إنجليزي -> عربي) بدل الاستعادة، مع تصفير
   الذاكرة المؤقتة عند كل تبديل حتى لا تبقى أي قيمة قديمة مثبتة. */
export const resetTranslationMemory = () => {
  textOriginals = new WeakMap<Text, string>();
  elementAttrOriginals = new WeakMap<Element, Map<string, string>>();
};
let activeTranslationObserver: MutationObserver | null = null;
let translatingDom = false;
const translatedAttrs = ['placeholder', 'title', 'aria-label', 'alt'];
const skipTranslationSelector = 'script,style,textarea,[contenteditable="true"],[data-no-translate="true"],[data-i18n-skip="true"]';

function restoreTextNode(node: Text) {
  const original = textOriginals.get(node);
  if (original !== undefined && node.nodeValue !== original) node.nodeValue = original;
}

function translateStringToEnglish(value: string) {
  const normalized = normalizeUiText(value);
  if (!normalized || !hasArabic(normalized)) return value;
  const exact = exactEnglishByArabic.get(normalized);
  if (exact) return value.replace(normalized, exact);
  /* v4.3.95 — أُلغي الاستبدال كلمة بكلمة.
     كان يستبدل أجزاء من الجملة العربية بكلمات إنجليزية مفردة (العنوان -> address،
     لا -> no) فينتج نصاً مشوّهاً مختلط اللغتين داخل الجملة الواحدة.
     بعد اكتمال القاموس (تغطية 100%) لم تعد هناك حاجة لأي تخمين:
     ما لا يطابق القاموس مطابقة تامة يبقى بالعربية سليماً بدل أن يُشوَّه. */
  let next = value;
  next = next
    .replace(/،/g, ',')
    .replace(/؛/g, ';')
    .replace(/؟/g, '?')
    .replace(/\s+\/\s+/g, ' / ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return next !== value ? next : value;
}

function translateStringToArabic(value: string) {
  const normalized = normalizeUiText(value);
  if (!normalized || hasArabic(normalized)) return value;
  const exact = exactArabicByEnglish.get(normalized);
  return exact ? value.replace(normalized, exact) : value;
}

function translateTextNode(node: Text, language: Language) {
  const parent = node.parentElement;
  if (!parent || parent.closest(skipTranslationSelector)) return;
  if (language === 'ar') {
    const current = node.nodeValue || '';
    const arabic = translateStringToArabic(current);
    if (arabic !== current) node.nodeValue = arabic;
    return;
  }
  const original = textOriginals.get(node) ?? node.nodeValue ?? '';
  if (!textOriginals.has(node)) textOriginals.set(node, original);
  const translated = translateStringToEnglish(original);
  if (translated !== node.nodeValue) node.nodeValue = translated;
}

function translateElementAttrs(element: Element, language: Language) {
  if (element.closest(skipTranslationSelector)) return;
  for (const attr of translatedAttrs) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    let originals = elementAttrOriginals.get(element);
    if (!originals) { originals = new Map(); elementAttrOriginals.set(element, originals); }
    if (!originals.has(attr)) originals.set(attr, current);
    const original = originals.get(attr) || current;
    const target = language === 'ar'
      ? (hasArabic(original) ? original : translateStringToArabic(current))
      : translateStringToEnglish(original);
    // Never write an unchanged attribute. Rewriting the same placeholder/title
    // used to retrigger MutationObserver forever and could peg Chrome's main thread.
    if (current !== target) element.setAttribute(attr, target);
  }
}

function applyDomLanguage(root: ParentNode, language: Language) {
  if (translatingDom) return;
  translatingDom = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = (node as Text).parentElement;
        if (!parent || parent.closest(skipTranslationSelector)) return NodeFilter.FILTER_REJECT;
        const value = (node as Text).nodeValue || '';
        return value.trim() || textOriginals.has(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    textNodes.forEach((node) => translateTextNode(node, language));
    if (root instanceof Element) translateElementAttrs(root, language);
    (root instanceof Element ? root : document.documentElement)
      .querySelectorAll<HTMLElement>('*')
      .forEach((element) => translateElementAttrs(element, language));
  } finally {
    translatingDom = false;
  }
}

interface I18nValue { language: Language; setLanguage: (value: Language) => void; t: (key: string) => string }
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('wafa_language') as Language) || 'ar');
  const applyLanguageShell = useCallback((value: Language) => {
    localStorage.setItem('wafa_language', value);
    document.documentElement.lang = value;
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.language = value;
  }, []);
  const setLanguage = useCallback((value: Language) => {
    resetTranslationMemory();
    applyLanguageShell(value);
    setLanguageState(value);
    window.requestAnimationFrame(() => {
      applyDomLanguage(document.body, value);
      window.requestAnimationFrame(() => applyDomLanguage(document.body, value));
    });
  }, [applyLanguageShell]);
  useEffect(() => { applyLanguageShell(language); }, [language, applyLanguageShell]);
  // v4.3.90 — التبديل الفوري بلا تحديث للصفحة.
  // React يعيد بناء نصوص الشاشة بعد تغيير اللغة، لذلك نمرّر على المستند عدة مرات
  // بعد اكتمال الرسم حتى تلحق الترجمة كل ما أُعيد بناؤه، في الاتجاهين معاً.
  useEffect(() => {
    const frames: number[] = [];
    const timers: number[] = [];
    const pass = () => applyDomLanguage(document.body, language);
    resetTranslationMemory();
    pass();
    frames.push(window.requestAnimationFrame(() => { pass(); frames.push(window.requestAnimationFrame(pass)); }));
    [90, 260, 600].forEach(delay => timers.push(window.setTimeout(pass, delay)));
    return () => {
      frames.forEach(window.cancelAnimationFrame);
      timers.forEach(window.clearTimeout);
    };
  }, [language]);
  useEffect(() => {
    activeTranslationObserver?.disconnect();
    activeTranslationObserver = null;
    applyDomLanguage(document.body, language);

    // Arabic is the application's native UI language, so there is nothing to
    // continuously translate. Keeping a document-wide MutationObserver active
    // here caused severe input/focus lag on Windows/Chrome.
    if (language === 'ar') return;

    let frame: number | null = null;
    let pending: MutationRecord[] = [];
    const observer = new MutationObserver((mutations) => {
      pending.push(...mutations);
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const batch = pending;
        pending = [];
        batch.forEach((mutation) => {
          if (mutation.type === 'characterData') translateTextNode(mutation.target as Text, language);
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, language);
            if (node.nodeType === Node.ELEMENT_NODE) applyDomLanguage(node as Element, language);
          });
          if (mutation.type === 'attributes' && mutation.target instanceof Element) translateElementAttrs(mutation.target, language);
        });
      });
    });
    activeTranslationObserver = observer;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: translatedAttrs });
    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      pending = [];
      if (activeTranslationObserver === observer) activeTranslationObserver = null;
    };
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: string) => (language === 'ar' ? ar : en)[key] ?? key }), [language, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}


Object.assign(ar, { outpatientPhysicalTherapy:'العلاج الطبيعي الخارجي', outpatient_pt:'العلاج الطبيعي الخارجي', pt_head:'رئيس قسم العلاج الطبيعي', engineerActivity:'مراقبة النشاط', trashBin:'سلة المحذوفات', module_engineer_activity:'مراقبة نشاط المستخدمين', module_trash_bin:'سلة المحذوفات الخاصة' });
Object.assign(en, { outpatientPhysicalTherapy:'Outpatient physical therapy', outpatient_pt:'Outpatient physical therapy', pt_head:'Head of Physical Therapy', engineerActivity:'Activity Monitor', trashBin:'Trash Bin', module_engineer_activity:'User activity monitor', module_trash_bin:'Private trash bin' });

Object.assign(staticEnglishPhrases, {
  'مهندس محمد': 'Engineer Mohammed',
  'خاص بمهندس محمد': 'Engineer Mohammed only',
  'مراقبة نشاط المستخدمين': 'User activity monitor',
  'شاشة خاصة تعرض دخول وخروج المستخدمين وكل العمليات المسجلة بالوقت والتاريخ واليوم.': 'Private screen showing user login/logout and all recorded operations by time, date, and day.',
  'العمليات المسجلة': 'Recorded operations',
  'جلسات الدخول': 'Login sessions',
  'جلسات مفتوحة': 'Open sessions',
  'مستخدمون نشطوا': 'Active users',
  'ملخص المستخدمين داخل الفترة': 'User summary for the period',
  'من تاريخ': 'From date',
  'إلى تاريخ': 'To date',
  'المستخدم': 'User',
  'كل المستخدمين': 'All users',
  'إجراء، اسم مستخدم، ملف، IP...': 'Action, username, file, IP...',
  'عرض النتائج': 'Show results',
  'PDF العمليات': 'Operations PDF',
  'Word العمليات': 'Operations Word',
  'PDF الدخول والخروج': 'Login/logout PDF',
  'Word الدخول والخروج': 'Login/logout Word',
  'أوقات دخول وخروج المستخدمين': 'User login and logout times',
  'لا توجد جلسات ضمن الفترة': 'No sessions in this period',
  'غيّر الفترة أو اضغط تحديث.': 'Change the period or click Refresh.',
  'تفاصيل العمليات': 'Operation details',
  'لا توجد عمليات ضمن الفترة': 'No operations in this period',
  'كل تعديل أو حذف أو حفظ جديد سيظهر هنا.': 'Every new edit, deletion, or save will appear here.',
  'اسم الدخول': 'Username',
  'الدخول': 'Login',
  'الخروج': 'Logout',
  'المدة': 'Duration',
  'الإجراء': 'Action',
  'الكيان': 'Entity',
  'التفاصيل': 'Details',
  'تحديث': 'Refresh',
  'بوابة الطبيب': 'Doctor portal',
  'حالات اليوم المدفوعة': 'Today paid cases',
  'حالات سابقة': 'Past cases',
  'المراجعات': 'Follow-ups',
  'لا توجد حالات جاهزة الآن': 'No ready cases now',
  'لا تظهر الحالة للطبيب إلا بعد استكمال الدفع والتحصيل وطباعة/اعتماد الإيصال.': 'The case appears to the doctor only after payment, collection, and receipt approval are completed.',
  'بانتظار الفحص': 'Waiting for examination',
  'قيد الفحص': 'Under examination',
  'حالات مكتملة': 'Completed cases',
  'مراجعات مجدولة': 'Scheduled follow-ups',
  'تسجيل / فتح مريض بالهوية': 'Register / open patient by ID',
  'البحث عن مريض مسجل': 'Search for a registered patient',
  'لا توجد نتائج': 'No results',
  'جرّب الاسم الكامل أو رقم الهوية.': 'Try the full name or national ID.',
  'آخر الزيارات المسجلة من الاستقبال': 'Latest visits registered by reception',
  'المريض مسجل مسبقاً': 'Patient already registered',
  'بيانات موثقة وجاهزة للتسجيل': 'Verified data ready for registration',
});
collectExactTranslations();

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

Object.assign(ar, { operations:'العمليات', operations_clerk:'موظف العمليات', module_operations:'العمليات', operationCases:'حالات العمليات', operationAdmissionPermit:'إذن دخول مريض' });
Object.assign(en, { operations:'Operations', operations_clerk:'Operations Clerk', module_operations:'Operations', operationCases:'Operation cases', operationAdmissionPermit:'Patient admission permit' });
Object.assign(staticEnglishPhrases, {
  'قسم العمليات':'Operations department',
  'العمليات':'Operations',
  'تسجيل حالات العمليات برقم الهوية، إظهار البيانات تلقائياً، ثم طباعة إذن دخول مريض بنفس القالب المعتمد.':'Register operation cases by national ID, auto-fill the data, then print the approved patient admission permit template.',
  'شاشة تسجيل الحالة':'Case registration screen',
  'رقم الهوية يجلب البيانات من ملف المريض أو API السجل المدني.':'The national ID fetches data from the patient file or civil registry API.',
  'شاشة بيانات الحالة':'Case data screen',
  'هذه البيانات تظهر في إذن دخول المريض.':'These details appear in the patient admission permit.',
  'حالات العمليات المسجلة':'Registered operation cases',
  'محفوظة في قاعدة البيانات ولا تختفي بعد التحديث.':'Saved in the database and will not disappear after refresh.',
  'حفظ وتصدير PDF':'Save and export PDF',
  'جهة التحويل':'Referral entity',
  'إضافة جهة أخرى':'Add another entity',
  'إذن دخول مريض':'Patient admission permit'
});
collectExactTranslations();


Object.assign(ar, { archive:'الأرشيف', archive_clerk:'موظف الأرشيف', module_archive:'الأرشيف' });
Object.assign(en, { archive:'Archive', archive_clerk:'Archive clerk', module_archive:'Archive' });
collectExactTranslations();

// v4.3.82 — translation completion for navigation, inquiries, elderly care, and responsive UI wording.
Object.assign(ar, {
  elderlyCare:'المسنين والمسنات', outpatientPhysicalTherapy:'العلاج الطبيعي الخارجي', operations:'العمليات', paymentAudit:'تدقيق الدفعات', financialCollector:'التحصيل المالي', financialAuditor:'المدقق المالي', userAccess:'المستخدمون والصلاحيات', engineerActivity:'نشاط المهندس', trashBin:'سلة المحذوفات', financialReports:'التقارير المالية', laboratory:'المختبر', doctorDashboard:'صفحة الطبيب',
  allHospitalPatients:'جميع مرضى المستشفى', outpatientPatients:'مرضى العيادات', inpatientPatients:'مرضى المبيت', elderlyResidents:'المسنين والمسنات', sourceFile:'مصدر الملف', currentStatus:'الحالة الحالية', lastEntryDate:'آخر دخول / تسجيل', responsiveLayout:'تنسيق تلقائي حسب الجهاز'
});
Object.assign(en, {
  elderlyCare:'Elderly Care', outpatientPhysicalTherapy:'Outpatient Physical Therapy', operations:'Operations', paymentAudit:'Payment Audit', financialCollector:'Financial Collector', financialAuditor:'Financial Auditor', userAccess:'Users & Access', engineerActivity:'Engineer Activity', trashBin:'Trash Bin', financialReports:'Financial Reports', laboratory:'Laboratory', doctorDashboard:'Doctor Dashboard',
  allHospitalPatients:'All hospital patients', outpatientPatients:'Outpatient patients', inpatientPatients:'Inpatients', elderlyResidents:'Elderly residents', sourceFile:'File source', currentStatus:'Current status', lastEntryDate:'Last entry / registration', responsiveLayout:'Automatic responsive layout',
  'استعلامات المرضى':'Patient inquiries',
  'دليل قراءة شامل لكل من دخل مسار المستشفى: العيادات، المبيت، والمسـنين/المسنات. الواجهة للعرض والاستعلام فقط بدون تعديل أو حذف.':'Read-only directory for everyone who entered the hospital flow: clinics, inpatient care, and elderly care.',
  'إجمالي الأشخاص':'Total people',
  'مرضى عيادات':'Outpatients',
  'مرضى مبيت':'Inpatients',
  'مسنين/مسنات':'Elderly care',
  'مصدر الملف':'File source',
  'الحالة الحالية':'Current status',
  'آخر دخول / تسجيل':'Last entry / registration',
  'ملف مسنين/مسنات مباشر':'Direct elderly-care file',
  'ملف مريض موحّد':'Unified patient file',
  'مسجل في النظام':'Registered in the system',
  'مقيم حالياً':'Currently resident',
  'بإذن مؤقت / زيارة':'Temporary leave / visit',
  'خروج نهائي':'Final discharge',
  'وفاة':'Deceased',
  'ملف مريض':'Patient file',
  'عيادات':'Clinics',
  'مبيت':'Inpatient',
});
collectExactTranslations();

// v4.3.83 — sidebar, live language switching, and theme wording.
Object.assign(ar, {
  menu: 'القائمة',
  openMenu: 'فتح القائمة',
  collapseMenu: 'إخفاء القائمة',
  colorMode: 'وضع الألوان',
  themeApplied: 'تم تطبيق وضع الألوان',
});
Object.assign(en, {
  menu: 'Menu',
  openMenu: 'Open menu',
  collapseMenu: 'Hide menu',
  colorMode: 'Color mode',
  themeApplied: 'Color mode applied',
});
Object.assign(staticEnglishPhrases, {
  'القائمة': 'Menu',
  'فتح القائمة': 'Open menu',
  'إخفاء القائمة': 'Hide menu',
  'وضع الألوان': 'Color mode',
});
collectExactTranslations();

// v4.3.90 — عبارات الشاشات الجديدة (الدخول، القائمة الجانبية، شاشة الإقلاع).
Object.assign(staticEnglishPhrases, {
  'نظام معلومات المستشفى': 'Hospital Information System',
  'مساحة عمل واحدة تجمع الاستقبال والعيادات والمبيت والمختبر والمالية، بسجل موحّد لكل مريض.': 'One workspace joining reception, clinics, inpatient care, laboratory and finance, with a single record for every patient.',
  'جميع الأقسام متصلة': 'All units online',
  'سجّل الدخول للوصول إلى مساحة عملك': 'Sign in to reach your workspace',
  'اتصال آمن': 'Secure connection',
  'ملف المريض': 'Patient file',
  'سجل موحّد': 'Unified record',
  'العيادات': 'Clinics',
  'فرز ومختبر': 'Triage and lab',
  'أسرّة ومتابعة': 'Beds and follow-up',
  'الصلاحيات': 'Permissions',
  'لكل مستخدم': 'Per user',
  'التشغيل اليومي': 'Daily operations',
  'الأقسام السريرية': 'Clinical units',
  'المالية والفواتير': 'Finance and billing',
  'الإدارة والنظام': 'Administration',
  'تصفية القائمة': 'Filter menu',
  'لا توجد شاشة مطابقة': 'No matching screen',
  'التحقق من الجلسة': 'Verifying session',
  'ربط أقسام المستشفى': 'Linking hospital units',
  'مزامنة الصلاحيات': 'Syncing permissions',
  'تجهيز مساحة العمل': 'Preparing workspace',
  'نظام المعلومات الطبي · التأهيل والجراحة التخصصية': 'Medical Information System · Rehabilitation and Specialized Surgery',
});
collectExactTranslations();

/* v4.3.90 — توسعة القاموس: النصوص الأكثر ظهوراً عبر الشاشات. */
Object.assign(staticEnglishPhrases, {
  'تحديث':'Refresh','بحث':'Search','بحث...':'Search...','الاسم':'Name','الاسم الرباعي':'Full name (four parts)',
  'رقم المريض':'Patient number','رقم الجوال':'Mobile number','رقم الهاتف':'Phone number','جوال المريض':'Patient mobile',
  'الحالة الاجتماعية':'Marital status','جارٍ الحفظ...':'Saving...','جارٍ البحث...':'Searching...','جارٍ الجلب...':'Fetching...',
  'جارٍ...':'Working...','جارٍ الجلب':'Fetching','حفظ...':'Saving...','الإجراء':'Action','إجراءات':'Actions',
  'الدخول':'Admission','الخروج':'Discharge','إلى':'To','من':'From','مدة المكوث':'Length of stay','أيام المكوث':'Days of stay',
  'مقيم حالياً':'Currently admitted','المقيمون حالياً':'Currently admitted','جلب البيانات':'Fetch data',
  'تاريخ الزيارة':'Visit date','أدخل رقم الهوية':'Enter the ID number','أدخل رقم الهوية أولاً':'Enter the ID number first',
  'عادي':'Normal','وقت الدخول':'Admission time','المستخدم':'User','مستخدم':'User','مستخدم النظام':'System user',
  'الدور':'Role','رقم الدور':'Queue number','جهة التحويل':'Referring entity','إنشاء التقرير':'Generate report',
  'تصدير Excel':'Export Excel','تصدير PDF':'Export PDF','خاص':'Private','مبيت':'Inpatient','تطبيق':'Apply',
  'ملغية':'Cancelled','ملغي':'Cancelled','ملغى':'Cancelled','طباعة':'Print','مكتملة':'Completed','مكتمل':'Completed',
  'الهوية':'ID number','الأولوية':'Priority','فتح الملف':'Open file','كل الأقسام':'All departments','كل الحالات':'All cases',
  'حفظ التعديل':'Save changes','سبب التحويل':'Referral reason','مراجعة مجدولة':'Scheduled follow-up',
  'بوابة وزارة الصحة':'Ministry of Health portal','المبلغ':'Amount','نقدي':'Cash','عمليات':'Operations','نفسه':'Same',
  'وفاة':'Death','وفيات':'Deaths','ذكور':'Male','إناث':'Female','الصافي':'Net','الموعد':'Appointment','المساعدة':'Assistance',
  'نوع العمل':'Type of work','إقامة يومية':'Daily stay','سنة الميلاد':'Year of birth','الحالة الصحية':'Health status',
  'إذن دخول مريض':'Patient admission permit','الحالة الحالية':'Current status','ملف الإقرار المالي':'Financial declaration file',
  'العلاج الطبيعي الخارجي':'Outpatient physical therapy','علاج طبيعي داخلي':'Inpatient physical therapy',
  'فتح':'Open','الجد':'Grandfather','الأب':'Father','العائلة':'Family','عاجل':'Urgent','طارئ':'Emergency',
  'اختر':'Select','اختر من القائمة':'Select from the list','تفريغ':'Clear','الرقم':'Number','ملف مريض':'Patient file',
  'التاريخ:':'Date:','حتى الآن':'To date','جهة تغطية':'Coverage entity','تم التخريج':'Discharged','رقم الحالة':'Case number',
  'الاحتياجات':'Needs','حفظ الحالة':'Save case','رقم التأمين':'Insurance number','اختر الطبيب':'Select doctor',
  '— اختر الطبيب —':'— Select doctor —','مدة التحويل':'Referral duration','إنشاء الملف':'Create file','رمز العيادة':'Clinic code',
  'اختر الحالة':'Select case','جمعية خيرية':'Charity','عرض النتائج':'Show results','قائمة انتظار':'Waiting list',
  'اسم الأخصائي':'Specialist name','الأخصائي':'Specialist','كشف التجديدات':'Renewals statement','بيانات الحالة':'Case data',
  'لا توجد حالات':'No cases','لا توجد':'None','الإدارة الطبية':'Medical administration','بانتظار الدفع':'Awaiting payment',
  'إضافة خيار جديد':'Add new option','تعذر تسجيل المريض':'Could not register the patient',
  'سند إقرار والتزام':'Acknowledgement and undertaking form','اختر المريض أولاً':'Select the patient first',
  'تعديل بيانات المريض':'Edit patient data','تعذر البحث عن المريض':'Could not search for the patient',
  'إضافة لقائمة الانتظار':'Add to waiting list','إضافة جهة تغطية جديدة':'Add new coverage entity',
  'تعذر جلب بيانات الهوية':'Could not fetch ID data','لا توجد جلسات ضمن الفترة':'No sessions within the period',
  'تعذر تحديث قائمة الانتظار':'Could not update the waiting list','المبيت · الخدمة الاجتماعية':'Inpatient · Social service',
  'اختر حقلاً واحداً على الأقل':'Select at least one field','اختر المريض والعيادة والطبيب':'Select patient, clinic and doctor',
  'تم جلب البيانات من ملف المريض':'Data fetched from the patient file',
  'تم جلب بيانات المريض من السجل المدني':'Patient data fetched from the civil registry',
  'تم جلب البيانات من السجل المدني':'Data fetched from the civil registry',
  'تعذر جلب بيانات السجل المدني':'Could not fetch civil registry data',
  'تعذر إنشاء التقرير، حاول مرة أخرى':'Could not generate the report, try again',
  'تمت إضافة الحالة إلى قائمة الانتظار':'Case added to the waiting list',
  'تم تسجيل زيارة المراجعة':'Follow-up visit recorded','تم إنهاء الحالة تلقائياً':'Case closed automatically',
  'تم حذف السجل':'Record deleted','تعذر حذف السجل':'Could not delete the record',
  'تعذر تصدير PDF':'Could not export PDF','تعذر تصدير Word':'Could not export Word',
  'الرجال':'Men','النساء والأطفال':'Women and children','عدد الأيام':'Number of days','طب الأسنان':'Dentistry',
  'خروج نهائي':'Final discharge','رقم العلاج الطبيعي':'Physical therapy number','لمن يهمه الأمر':'To whom it may concern',
  'قيمة مدفوعة':'Amount paid','عدد الجلسات':'Number of sessions','تاريخ التسجيل':'Registration date',
  'ملك':'Owned','يوم':'Day','إيجار':'Rented','الدفع':'Payment','ملاحظة':'Note','الجوال':'Mobile','المعالج':'Therapist',
  'لم يدخلوا':'Not admitted','لم يدخل':'Not admitted','حصة المريض':'Patient share','اسم المحول':'Referrer name',
  'أمراض أخرى':'Other conditions','مبلغ تغطية':'Coverage amount','مبلغ التغطية':'Coverage amount','قيمة إعفاء':'Exemption amount',
  'رقم الإيصال':'Receipt number','المدير الطبي':'Medical director','اسم المدير الطبي':'Medical director name',
  'عدد التحويلات':'Number of referrals','طريقة التحويل':'Referral method','الحالة الوظيفية':'Employment status',
  'الوضع الوظيفي':'Employment status','الإجمالي المستحق':'Total due','بإذن مؤقت / زيارة':'Temporary permit / visit',
  'الأخصائي الاجتماعي والنفسي':'Social and psychological specialist','لا':'No','نعم':'Yes','عكاز':'Crutch','يعمل':'Employed',
  'لا يعمل':'Unemployed','المدة':'Duration','موجود':'Available','غير موجود':'Not available','الخصم':'Discount','خصم':'Discount',
  'النوع':'Type','الوقت':'Time','العنصر':'Item','حفاضات':'Diapers','حفاضة':'Diaper','المحول':'Referral','المنطقة':'Area',
  'اختياري':'Optional','خروج صحة':'Health discharge','دخول صحة':'Health admission','قسم مبيت':'Inpatient unit',
  'التفاصيل':'Details','تفاصيل':'Details','ت. ميلاد':'Date of birth','شاش معقم':'Sterile gauze','تسجيل خصم':'Record discount',
  'نوع السكن':'Housing type','السكن':'Housing','سكن ملك':'Owned housing','أكياس بول':'Urine bags','تحكم أيسر':'Left control',
  'تحكم أيمن':'Right control','خدمة أخرى':'Other service','مبيت داخلي':'Inpatient stay','اسم الدخول':'Login name',
  'مصدر الملف':'File source','كرسي متحرك':'Wheelchair','كرسي كهربائي':'Electric wheelchair','كرسي ذو ظهر مائل':'Reclining chair',
  'ثمن الجلسة':'Session price','حذف المريض':'Delete patient','تسجيل دفعة':'Record payment','أنبوب تغذية':'Feeding tube',
  'فتح / تعديل':'Open / edit','أيام المبيت':'Inpatient days','أنجز العلاج':'Treatment completed','مسار الكاشير':'Cashier flow',
  'بوابة الطبيب':'Doctor portal','نسبة التغطية':'Coverage rate','حركة التغطية':'Coverage activity','نوع المساعدة':'Assistance type',
  'تفاصيل المساعدة':'Assistance details','فترة الجلسات':'Session period','رقم التحويلة':'Referral number',
  'صيغة التقرير':'Report format','تشخيص الحالة':'Case diagnosis','عيادة خارجية':'Outpatient clinic','عيادات':'Clinics',
  'حسابات المرضى':'Patient accounts','إحصائية شهرية':'Monthly statistics','إحصائية يومية':'Daily statistics',
  'أطباء الأسنان':'Dentists','تصفية القائمة':'Filter menu','طباعة واعتماد':'Print and approve','تاريخ التقرير':'Report date',
  'إجمالي الرسوم':'Total fees','المشفى المحوّل':'Referring hospital','البلدة الأصلية':'Home town',
  'تقرير احتياجات':'Needs report','إجمالي المطلوب':'Total required','المبلغ المطلوب':'Amount required',
  'انتهاء التحويلة':'Referral expiry','الوضع الاجتماعي':'Social status','الوضع الاقتصادي':'Economic status',
  'الأدوات المساعدة':'Assistive devices','قسطرة بولية فولي':'Foley urinary catheter','قسطرة بولية نيلاتون':'Nelaton urinary catheter',
  'تحديد/إلغاء الكل':'Select / clear all','اسم المسن/المسنة':'Resident name','المطالبة المالية':'Financial claim',
  'آخر دخول / تسجيل':'Last login / registration','إضافة قسم / عيادة':'Add department / clinic','المدينة / العنوان':'City / address',
  'التدخلات المقترحة':'Proposed interventions','خروج جميع الحالات':'Discharge all cases','دخول مستشفى الوفاء':'Wafaa Hospital admission',
  'حفظ في ملف التأهيل':'Save to the rehabilitation file','تصدير كشف التجديدات':'Export renewals statement',
  'العلاقات الاجتماعية':'Social relationships','المشكلات والاحتياجات':'Problems and needs',
  'صافي المبالغ المتبقية':'Net remaining amounts','رقم الهوية / رقم الملف':'ID number / file number',
  'قائمة المسنين والمسنات':'Residents list','إجمالي المبالغ المطلوبة':'Total amounts required',
  'قائمة انتظار وزارة الصحة':'Ministry of Health waiting list','إجمالي الجلسات حسب المحددات':'Total sessions by filters',
  'تقرير العلاج الطبيعي الخارجي':'Outpatient physical therapy report',
  'الحالات التي لم تدخل المستشفى':'Cases not admitted to the hospital',
  'اختر احتياجاً واحداً على الأقل':'Select at least one need',
  'لا توجد صلاحية لتصدير التقارير':'No permission to export reports',
  'لا توجد حركات تغطية لهذه الحالة':'No coverage activity for this case',
  'دراسة الحالة الاجتماعية والنفسية':'Social and psychological case study',
  'تم':'Done','تمت':'Done','إبط':'Underarm','دفع':'Payment','فرز':'Triage','كوع':'Elbow','حذفه':'Deleted it',
  'عريض':'Wide','يومي':'Daily','أشعة':'Imaging','مدقق':'Auditor','حالة':'Case','هلال':'Crescent','ثقيل':'Heavy',
  'مخرج':'Discharged','مخصص':'Custom','سنوي':'Annual','جديد':'New','شهري':'Monthly','كلية':'Kidney',
  'سمعية':'Hearing','متوسط':'Medium','نفسية':'Psychological','ذهنية':'Mental','منخفض':'Low','مختبر':'Laboratory',
  'ينتظر':'Waiting','موثّق':'Documented','مشروع':'Project','السنة':'Year','الأصل':'Origin','بصرية':'Visual',
  'السبب':'Reason','إداري':'Administrative','قادمة':'Upcoming','مدفوع':'Paid','مختلط':'Mixed','حكومي':'Governmental',
  'متبقي':'Remaining','محفوظ':'Saved','حركية':'Mobility','مجدول':'Scheduled','سريري':'Clinical','يعملون':'Employed',
  'الأيام':'Days','اعتماد':'Approval','منتهية':'Expired','مستعجل':'Urgent','الغرفة':'Room','فاتورة':'Invoice',
  'الجنس:':'Gender:','القسم:':'Department:','المهنة:':'Occupation:','انتظار':'Waiting','من حذف':'Deleted by',
  'الساعة':'Time','التخصص':'Specialty','السرير':'Bed','الكيان':'Entity','الدوام':'Shift','تفاعلي':'Interactive',
  'أمبواج':'Ambu bag','سبب آخر':'Other reason','الخدمات':'Services','بوفيدين':'Povidone','التكلفة':'Cost',
  'التوقيع':'Signature','بالأيام':'In days','استعادة':'Restore','عرض فقط':'View only','عمليات:':'Operations:',
  'الأدوية':'Medicines','استقبال':'Reception','ر. تغطية':'Coverage no.','الأونروا':'UNRWA','لون النص':'Text colour',
  'مستشفى ناصر':'Nasser Hospital','مستشفى القدس':'Al-Quds Hospital','مستشفى العودة':'Al-Awda Hospital',
  'مستشفى الأقصى':'Al-Aqsa Hospital','مستشفى الشفاء':'Al-Shifa Hospital','مستشفى الأوروبي':'European Hospital',
  'مستشفى الإندونيسي':'Indonesian Hospital','مستشفى كمال عدوان':'Kamal Adwan Hospital',
  'PDF مدمج':'Combined PDF','Word مدمج':'Combined Word','Excel مدمج':'Combined Excel','A4 رسمي':'Official A4',
  'DOCX مطابق للقالب':'Template-matched DOCX','PDF العمليات':'Operations PDF','Word العمليات':'Operations Word',
  'PDF الدخول والخروج':'Admissions and discharges PDF','Word الدخول والخروج':'Admissions and discharges Word',
});
collectExactTranslations();

/* v4.3.91 — الدفعة الثانية من الترجمة. */
Object.assign(staticEnglishPhrases, {
  'مقاس 8':'Size 8','مقاس 10':'Size 10','مقاس 12':'Size 12','مقاس 40':'Size 40','مقاس 42':'Size 42','مقاس 45':'Size 45',
  'مقاس 48':'Size 48','مقاس 50':'Size 50','مقاس 52':'Size 52','مقاس 14 ملم':'Size 14 mm','مقاس 16 ملم':'Size 16 mm',
  'مقاس FR 16':'Size FR 16','مقاس FR 18':'Size FR 18','مقاس FR 20':'Size FR 20','مقاس FR 22':'Size FR 22','مقاس FR 24':'Size FR 24',
  'كيلو 1':'1 kg','كيلو 2':'2 kg','كيلو 3':'3 kg','كيلو 4':'4 kg','كيلو 5':'5 kg',
  'عدد 30 شهرياً':'30 per month','عدد 60 شهرياً':'60 per month','عدد 90 شهرياً':'90 per month',
  'ز.مريض':'Patient visit','تم إنهاء جلسة اليوم':"Today's session ended",
  'اكتب نوع الخدمة في خيار Other':'Type the service under "Other"',
  'صورة مرفقة مع تقرير الخدمة الاجتماعية':'Image attached to the social service report',
  'كتم':'Mute','إلغاء الكتم':'Unmute','دخول':'Admission','· طارئ':'· Emergency','· عاجل':'· Urgent','· اليوم':'· Today',
  '· مستمرة':'· Ongoing','· الإجمالي:':'· Total:','مثال: 7':'Example: 7','مثال: 42':'Example: 42','مثال ENT':'Example: ENT',
  'فحص جديد':'New examination','احتياجات':'Needs','نوع الخط':'Font','سماكة الخط':'Font weight','سعر خدمة':'Service price',
  'كشف حساب':'Account statement','كشف حساب مريض':'Patient account statement','العنوان:':'Address:','طلب مبيت':'Admission request',
  'زيارة من':'Visit from','زيارة إلى':'Visit to','الإعاقات':'Disabilities','نوع الإعاقة':'Disability type','الأمانات':'Deposits',
  'كل الجنس':'All genders','كل السكن':'All housing','إذن مؤقت':'Temporary permit','— اختر —':'— Select —','محوّل من':'Referred from',
  'محوّل من مشفى':'Referred from hospital','الانتظار':'Waiting','المرفقات':'Attachments','شلل نصفي':'Hemiplegia',
  'شلل رباعي':'Quadriplegia','المتبقية':'Remaining','2 - عاجل':'2 - Urgent','4 - عادي':'4 - Normal','3 - متوسط':'3 - Medium',
  '5 - منخفض':'5 - Low','1 - طارئ جداً':'1 - Critical','طارئ جداً':'Critical','النتائج:':'Results:','السمعيات':'Audiology',
  'أشعة صدر':'Chest X-ray','أشعة جديدة':'New imaging','أنواع أشعة':'Imaging types','أشعة مقطعية':'CT scan',
  'دفعة مبيت':'Inpatient payment','بسيط أبيض':'Plain white','قالب رسمي':'Official template','قالب حديث':'Modern template',
  'قالب بسيط':'Simple template','القالب الرسمي':'Official template','ستايل القالب':'Template style','رسمي كلاسيكي':'Classic formal',
  'تقرير طبي':'Medical report','نشط اليوم':'Active today','بدون غرفة':'No room','بدون سرير':'No bed','بعد اليوم':'After today',
  'سعر اليوم':'Daily rate','على الجهة':'On the entity','الفترة من':'Period from','عن الفترة من':'For the period from',
  'إضافة جهة':'Add entity','المطالبات':'Claims','أقل من 18':'Under 18','65 فما فوق':'65 and over','اسم الجهة':'Entity name',
  'حالة مبيت':'Inpatient case','طلب مختبر':'Lab request','وقت الحذف':'Deletion time','سكن إيجار':'Rented housing',
  'نوع القسم':'Department type','قسم مختلط':'Mixed department','وضع العرض':'Display mode','طريقة العرض':'Display method',
  'الموجودون':'Present','غير مجدول':'Unscheduled','كل الجهات':'All entities','حفظ الفرز':'Save triage','كل الفترة':'Full period',
  'دفع مكتمل':'Payment complete','بدء الفحص':'Start examination','نوع الدفع':'Payment type','إضافة سجل':'Add record',
  'أعزب/عزباء':'Single','أعزب / عزباء':'Single','مطلق/مطلقة':'Divorced','مطلق / مطلقة':'Divorced','أرمل/أرملة':'Widowed',
  'أرمل / أرملة':'Widowed','متزوج/متزوجة':'Married','شركة تأمين':'Insurance company','تعديل حالة':'Edit case',
  'قسم العلاج':'Treatment unit','تعديل جلسة':'Edit session','جلسة جديدة':'New session','حفظ الجلسة':'Save session',
  'مسح الحقول':'Clear fields','تفريغ الحقول':'Clear fields','رقم الجلسة':'Session number','دور تفاعلي':'Interactive role',
  'ملخص اليوم':'Daily summary','تصدير Word':'Export Word','اختر اليوم':'Select day','قسم الرجال':'Men’s unit',
  'عدد المرضى':'Number of patients','حسب الفترة':'By period','حركة مالية':'Financial activity','المبلغ فقط':'Amount only',
  'مرضى مبيت:':'Inpatients:','مرضى عيادات:':'Clinic patients:','مسنين/مسنات:':'Residents:','تسجيل خدمة':'Record service',
  'تسجيل الخدمة':'Record service','تمت الخدمة':'Service completed','حفظ الطبيب':'Save doctor','محلول ملحي':'Saline solution',
  'ماسكات وجه':'Face masks','قسم المبيت':'Inpatient unit','نص التقرير':'Report text','نوع الحركة':'Activity type',
  'نسبة تغطية':'Coverage rate','باقي تغطية':'Remaining coverage','اسم المحدد':'Filter name','إلغاء الكل':'Clear all',
  'حالات خروج':'Discharges','التشخيص...':'Diagnosis...','التشخيص مطلوب':'Diagnosis is required','خدمة تشخيص':'Diagnostic service',
  'طابور وفرز':'Queue and triage','ملفات مرضى':'Patient files','ملفات المرضى':'Patient files','علاج طبيعي':'Physical therapy',
  'نوع العنصر':'Item type','إظهار الكل':'Show all','إرجاع مقيم':'Return resident','رقم السرير':'Bed number',
  'مدة المبيت':'Length of stay','وقت الخروج':'Discharge time','إضافة حالة':'Add case','سيختفي ملف':'The file will be hidden',
  'تم الإدخال':'Admitted','إرفاق صورة':'Attach image','وصف الصورة':'Image description','صورة مرفقة':'Attached image',
  'إزالة الصورة':'Remove image','حالة الطلب':'Request status','تيبس مفاصل':'Joint stiffness','معالج رجال':'Male therapist',
  'كل الأطباء':'All doctors','طب الأطفال':'Paediatrics','إلغاء الدور':'Cancel queue number','حفظ التسجيل':'Save registration',
  'موعد الجلسة':'Session appointment','اسم المعالج':'Therapist name','حذف المحددة':'Delete selected','موعد الحضور':'Attendance time',
  'عدد السجلات':'Record count','رقم اختياري':'Optional number','اختر المريض':'Select patient','هوية + جوال':'ID + mobile',
  'عدد الخدمات':'Service count','جهاز تبخيرة':'Nebuliser','مولد أكسجين':'Oxygen concentrator','ميزان حرارة':'Thermometer',
  'قفازات طبية':'Medical gloves','قفازات نايلون':'Nylon gloves','انبوب تغذية':'Feeding tube','سنة التقرير':'Report year',
  'جاهز للطبيب':'Ready for doctor','مدقق مالياً':'Financially audited','وقت التسجيل':'Registration time',
  'تجديد تحويل':'Renew referral','بعد الشهرين':'After two months','حالة المبيت':'Inpatient status','قبل التغطية':'Before coverage',
  'بعد التغطية':'After coverage','ملخص الحالة':'Case summary','بداية تغطية':'Coverage start','نهاية تغطية':'Coverage end',
  'بداية التغطية':'Coverage start','تمديد التغطية':'Extend coverage','بداية الكشف':'Statement start','نهاية الكشف':'Statement end',
  'حسب الخانات':'By fields','بعد الدفعات':'After payments','رجال / نساء':'Men / women','حالة مرتبطة':'Linked case',
  'رقم المريض:':'Patient number:','اسم المريض:':'Patient name:','رقم الهوية:':'ID number:','رقم الهاتف:':'Phone number:',
  'رقم الحالة:':'Case number:','سنة الميلاد:':'Year of birth:','رقم التأمين:':'Insurance number:','جهة التحويل:':'Referring entity:',
  'سبب التحويل:':'Referral reason:','مدة التحويل:':'Referral duration:','موعد الطبيب:':'Doctor appointment:',
  'مواطن / لاجئ:':'Citizen / refugee:','التزام الأهل:':'Family undertaking:','جلسات دخول:':'Login sessions:',
  'قسم / عيادة':'Department / clinic','السلة فارغة':'The bin is empty','قسم الأرشيف':'Archive unit','زيارة مؤقتة':'Temporary visit',
  'زيارات مؤقتة':'Temporary visits','تعبئة يدوية':'Manual entry','جلسة مفتوحة':'Open session','حفظ الإقرار':'Save declaration',
  'تمت الزيارة':'Visit completed','عنوان السكن':'Home address','طبيعة السكن':'Housing type','مستوى الدخل':'Income level',
  'حفظ الدراسة':'Save study','حفظ التحديث':'Save update','أنواع مفعلة':'Enabled types','تقييم داخلي':'Internal assessment',
  'تقديم الدور':'Move queue up','تأخير الدور':'Move queue down','حالات اليوم':"Today's cases",'ملاحظة خاصة':'Private note',
  'كل العيادات':'All clinics','تطبيق / بنك':'App / bank','بحث شامل...':'Search everything...','الطب النفسي':'Psychiatry',
  'تخطيط العصب':'Nerve conduction study','متابعة مبيت':'Inpatient follow-up','إنهاء العلاج':'End treatment',
  'تحديث الحالة':'Update status','تم الاستقبال':'Received','تسجيل الحالة':'Register case','حذف من القسم':'Remove from unit',
  'تاريخ الجلسة':'Session date','تاريخ الجلسات':'Session dates','أدوات الجلسة':'Session tools','تم استقبالهم':'Received',
  'يحتوي على...':'Contains...','جلسات الرجال':"Men's sessions",'إفادات مالية':'Financial statements',
  'مساعدة مالية':'Financial assistance','قيمة العملية':'Procedure value','غير مسجل بعد':'Not registered yet',
  'سجلات الفترة':'Records for the period','ملاحظات أخرى':'Other notes','وسادة هوائية':'Air cushion','مشاية - ووكر':'Walker',
  'مولد كهربائي':'Generator','جهاز فحص سكر':'Glucose meter','جهاز قياس ضغط':'Blood pressure monitor','جهاز شفط بلغم':'Suction device',
  'ذو ثلاث نقاط':'Three-point','جاهز للطباعة':'Ready to print','تسجيل متابعة':'Record follow-up','حفظ المتابعة':'Save follow-up',
  'متابعة الحالة':'Case follow-up','فريق التأهيل':'Rehabilitation team','السجل المدني':'Civil registry',
  'اضغط للفلترة':'Click to filter','أقسام وخدمات':'Departments and services','أهم التفاصيل':'Key details',
  'بيانات الحذف':'Deletion data','مصدر الأرشفة':'Archive source','حالة الأرشيف':'Archive status','يتلقى مساعدة':'Receives assistance',
  'يتلقون مساعدة':'Receive assistance','تخريج الحالة':'Discharge case','اعتماد السبب':'Approve reason',
  'تحكم بالحقول':'Field controls','اختر العيادة':'Select clinic','إرسال للمبيت':'Send to inpatient','تعديل المريض':'Edit patient',
  'ضعف عضلي عام':'General muscle weakness','خشونة الركبة':'Knee osteoarthritis','ملاحظة الفرز':'Triage note',
  'ملاحظة جديدة':'New note','ملاحظة الحركة':'Activity note','واجهة الطبيب':'Doctor view','حفظ القياسات':'Save measurements',
  'جراحة العظام':'Orthopaedic surgery','تاريخ القائمة':'List date','أنجزوا العلاج':'Completed treatment',
  'عنوان التقرير':'Report title','طباعة التقرير':'Print report','تنسيق التقرير':'Report formatting','إلغاء التعديل':'Cancel edit',
  'تم حذف الطبيب':'Doctor deleted','مساهمة المريض':'Patient contribution','حديث بخط واضح':'Modern, clear type',
  'ملف مبيت متاح':'Inpatient file available','إجمالي الخدمة':'Service total','مقيم حتى الآن':'Still admitted',
  'محددات الصافي':'Net filters','توزيع الأعمار':'Age distribution','من تاريخ خروج':'From discharge date',
  'حدد نوع العمل':'Select type of work','ملف إداري فقط':'Administrative file only','مسؤول التسجيل':'Registration officer',
  'عيادات + مبيت':'Clinics + inpatient','مقيمون حالياً':'Currently admitted','حفظ التعديلات':'Save changes',
  'القسم المقترح':'Suggested department','تسليم واستلام':'Handover','الأسرة والسكن':'Family and housing',
  'تقارير للحالة':'Case reports','آخر تقييم':'Last assessment','أ. هاني حلس':'Mr. Hani Helles','أ. زاند بدوي':'Mr. Zand Badawi',
});
collectExactTranslations();

/* v4.3.91 — الدفعة الثالثة. */
Object.assign(staticEnglishPhrases, {
  'شعار مستشفى الوفاء - Wafaa Hospital':'Wafaa Hospital logo','شعار مستشفى الوفاء':'Wafaa Hospital logo',
  'طباعة / تصدير':'Print / export','إصابات رياضية':'Sports injuries','تصدير التقرير':'Export report',
  'قرار المراجعة':'Follow-up decision','استكمال الدفع':'Complete payment','تاريخ الإيصال':'Receipt date',
  'بيانات المريض':'Patient data','الغدد والسكري':'Endocrinology and diabetes','صورة دم كاملة':'Complete blood count',
  'زراعة وحساسية':'Culture and sensitivity','طلب مبيت جديد':'New admission request','استقبال الحالة':'Receive case',
  'تعذر حذف الدور':'Could not delete the queue number','يُنشأ تلقائياً':'Generated automatically',
  'يُنشأ عند الحفظ':'Generated on save','ملاحظات الجلسة':'Session notes','مدينة أو منطقة':'City or area',
  'الحالات النشطة':'Active cases','متابعة النواقص':'Outstanding items','الفترة المحددة':'Selected period',
  'الرصيد المتبقي':'Remaining balance','أسطوانة أكسجين':'Oxygen cylinder','تقرير طبي رسمي':'Official medical report',
  'مراجعات المريض':'Patient follow-ups','سعر يوم المبيت':'Daily inpatient rate','التاريخ المحدد':'Selected date',
  'بداية المطالبة':'Claim start','نهاية المطالبة':'Claim end','المبلغ المستحق':'Amount due','محاسب المستشفى':'Hospital accountant',
  'أ. يوسف الحايك':'Mr. Yousef Al-Hayek','تاريخ التحويل:':'Referral date:','التزامات أخرى:':'Other obligations:',
  'تعذر الاستعادة':'Could not restore','إجمالي العناصر':'Total items','زيارات وفواتير':'Visits and invoices',
  'التاريخ والوقت':'Date and time','التاريخ واليوم':'Date and day','ملاحظات النظام':'System notes',
  'المسؤول/المسجل':'Officer / registrar','إجمالي الحالات':'Total cases','إلى تاريخ خروج':'To discharge date',
  'تعذر حفظ الملف':'Could not save the file','العنوان الحالي':'Current address','ملاحظات إدارية':'Administrative notes',
  'ملاحظات الحالة':'Case notes','إجمالي الملفات':'Total files','جارٍ التحقق...':'Verifying...',
  'متزوج / متزوجة':'Married','منفصل / منفصلة':'Separated','نوع قسم المبيت':'Inpatient unit type',
  'الخروج المتوقع':'Expected discharge','أنواع الفحوصات':'Examination types','الملف / الكيان':'File / entity',
  'بيانات الإقرار':'Declaration data','تقارير التشغيل':'Operational reports','القسم / الغرفة':'Department / room',
  'متابعات المبيت':'Inpatient follow-ups','ديون والتزامات':'Debts and obligations','الإرشاد النفسي':'Psychological counselling',
  'الإرشاد الأسري':'Family counselling','ألم أسفل الظهر':'Lower back pain','الجنس / النطاق':'Gender / range',
  'المسمى الوظيفي':'Job title','إجمالي الجلسات':'Total sessions','تاريخ المراجعة':'Follow-up date','بال باي PalPay':'PalPay',
  'كشف Excel يومي':'Daily Excel statement','فتح ملف المريض':'Open patient file','انتهاء الزيارة':'End visit',
  'تعذر حفظ الخدمة':'Could not save the service','تعذر حذف الخدمة':'Could not delete the service',
  'اسم جهة التغطية':'Coverage entity name','تم تحديث الحالة':'Case updated','تعذر حفظ الحالة':'Could not save the case',
  'تعذر حفظ الجلسة':'Could not save the session','تعذر حذف الجلسة':'Could not delete the session',
  'بدون / غير محدد':'None / unspecified','إضافة جهة جديدة':'Add new entity','التاريخ المرجعي':'Reference date',
  'جلسات شخص بعينه':'Sessions for one person','كل جهات التغطية':'All coverage entities','لم تصل التحويلة':'Referral not received',
  'الرسوم والمدفوع':'Fees and payments','خصم مالي للمبيت':'Inpatient discount','ملاحظات الإجراء':'Procedure notes',
  'كشف حالات الصحة':'Health cases statement','المدينة/المنطقة':'City / area','المدينة / المنطقة':'City / area',
  'المنطقة / العنوان':'Area / address','أدخل اسم الطبيب':'Enter the doctor name','تعذر حفظ الطبيب':'Could not save the doctor',
  'العيادات الخاصة':'Private clinics','مثال: 402918374':'Example: 402918374','اكتب نوع الخدمة':'Type the service',
  'كرسي حمام متحرك':'Mobile shower chair','أنابيب شفط بلغم':'Suction tubes','كرسي متحرك عادي':'Standard wheelchair',
  'معاينة الترويسة':'Preview letterhead','الطبيب / الحكيم':'Doctor / nurse','جدول قابل للفرز':'Sortable table',
  'احتياجات وتأهيل':'Needs and rehabilitation','جارٍ التسجيل...':'Registering...','عدد أيام المبيت':'Inpatient days',
  'إجمالي أيام المبيت':'Total inpatient days','إجمالي أيام المكوث':'Total days of stay','حسب نسب التغطية':'By coverage rate',
  'إضافة محدد جديد':'Add new filter','جلسة علاج طبيعي':'Physical therapy session','أطباء ومستخدمون':'Doctors and users',
  'إجمالي الخارجين':'Total discharged','المرضى الخارجون':'Discharged patients','حدد جهة التغطية':'Select the coverage entity',
  'قسم مبيت الرجال':"Men's inpatient unit",'قسم مبيت النساء':"Women's inpatient unit",'الغرفة / الجناح':'Room / wing',
  'الغرفة / السرير':'Room / bed','فتح حالة المبيت':'Open inpatient case','التكلفة اليومية':'Daily cost',
  'إضافة مريض جديد':'Add new patient','رقم هوية المريض':'Patient ID number','مصدر دخل الأسرة':'Family income source',
  'مدى كفاية الدخل':'Income adequacy','الأمراض المزمنة':'Chronic conditions','الدعم الاجتماعي':'Social support',
  'بانتظار التصوير':'Awaiting imaging','البحث والمحددات':'Search and filters','— اختر المريض —':'— Select patient —',
  '— اختر العيادة —':'— Select clinic —','ملاحظة المراجعة':'Follow-up note','تعيين رقم الدور':'Assign queue number',
  'تعذر بدء الحالة':'Could not start the case','لا توجد مراجعات':'No follow-ups','رقم جوال المحول':'Referrer mobile',
  'جارٍ الإضافة...':'Adding...','الدائرة المالية':'Finance department','بانتظار التدقيق':'Awaiting audit',
  'خصم رسوم المبيت':'Inpatient fee discount','تقرير مبيت جديد':'New inpatient report','تخريج من المبيت':'Discharge from inpatient',
  'الإشعارات مكتومة':'Notifications muted','تعذر تصدير Excel':'Could not export Excel','رقم المريض العام':'General patient number',
  'حفظ تعديل الحالة':'Save case changes','ما زالوا ينتظرون':'Still waiting','الموجودين حالياً':'Currently present',
  'الموجودون حالياً':'Currently present','الموجودون اليوم فقط':'Present today only','حدد تاريخ الخروج':'Select the discharge date',
  'الرصيد بعد الحفظ':'Balance after saving','تعديل خدمة أسنان':'Edit dental service','تسجيل خدمة أسنان':'Record dental service',
  'متاح لمهندس محمد':'Available to Engineer Mohammed','حفاضات مقاس كبير':'Large diapers','إنشاء الملف الآن':'Create the file now',
  'تقرير الاحتياجات':'Needs report','تقارير الاحتياجات':'Needs reports','الاحتياج المطلوب':'Required need',
  'مريض مسجل مسبقاً':'Already registered patient','تحويل من أي مشفى':'Referral from any hospital',
  'حفظ حركة التغطية':'Save coverage entry','نفس قالب الطباعة':'Same print template','البيانات الشخصية':'Personal data',
  'رقم الجوال مطلوب':'Mobile number is required','العناصر المحذوفة':'Deleted items','تعديل ملف مقيم/ة':'Edit resident file',
  'هل يتلقى مساعدة؟':'Receives assistance?','تصدير Excel كامل':'Full Excel export','إنشاء ملف المريض':'Create patient file',
  'الزيارة المرتبطة':'Linked visit','بدون زيارة محددة':'No specific visit','لا يوجد سجل مبيت':'No inpatient record',
  'عدد أفراد الأسرة':'Family size','المتابعة الدورية':'Routine follow-up','الدراسات السابقة':'Previous studies',
  'المكلف بالمتابعة':'Assigned for follow-up','جارٍ الاعتماد...':'Approving...','عرض الورق بالملم':'Paper width (mm)',
  'طول الورق بالملم':'Paper height (mm)','العيادة / الطبيب':'Clinic / doctor','تحاليل الهرمونات':'Hormone tests',
  'ألتراساوند البطن':'Abdominal ultrasound','طلب تحويل للمبيت':'Inpatient referral request','إضافة تكلفة مبيت':'Add inpatient cost',
  'إضافة تقرير مبيت':'Add inpatient report','أدخل سعراً صحيحاً':'Enter a valid price','الجلسات والمواعيد':'Sessions and appointments',
  'شاشة تسجيل المريض':'Patient registration screen','بحث وجلب البيانات':'Search and fetch data',
  'أخصائي علاج طبيعي':'Physical therapist','استثناءات مستعجلة':'Urgent exceptions','عبارة تشخيص ثانية':'Second diagnosis line',
  'السجلات مرتبة حسب':'Records sorted by','تاريخ الخروج يدوي':'Manual discharge date','المطالبات المالية':'Financial claims',
  'خصم للمريض المحدد':'Discount for the selected patient','أدخل مبلغ العملية':'Enter the procedure amount',
  'الرصيد الحالي NET':'Current balance (NET)','حفظ وحساب العملية':'Save and calculate','اختر طبيب الأسنان':'Select the dentist',
  'تظهر للطبيب فوراً':'Shown to the doctor immediately','سرير طبي ذو جوانب':'Medical bed with rails',
  'لون العنوان والخط':'Title and text colour','الملاحظة الختامية':'Closing note','متابعة حالة تأهيل':'Rehabilitation case follow-up',
  'تسجيل زيارة جديدة':'Record new visit','صلاحيات غير مالية':'Non-financial permissions','تعديل جهة التغطية':'Edit coverage entity',
  'تحويل لمستشفى آخر':'Refer to another hospital','عودة من مستشفى آخر':'Return from another hospital',
  'إضافة نسبة بعد...':'Add a rate after...','سجل حركات التغطية':'Coverage activity log','المبلغ المطالب به':'Claimed amount',
  'والجراحة التخصصية':'and Specialized Surgery','فلسطين – قطاع غزة':'Palestine – Gaza Strip',
  'استحقاقات / شيكل:':'Dues / ILS:','رقم التغطية الأول':'First coverage number','معاينة كشف الحساب':'Preview account statement',
  'اعتباراً من تاريخ':'Effective from','تفاصيل ملف المريض':'Patient file details','تعذر تحديث الحالة':'Could not update the case',
  'تسجيل / تعديل ملف':'Create / edit file','أدخل عنوان المريض':'Enter the patient address',
  'أدخل تشخيص الحالة':'Enter the case diagnosis','الطلبات التشخيصية':'Diagnostic requests','مساحة العمل جاهزة':'Workspace ready',
  'تقرير وزارة الصحة':'Ministry of Health report','لا توجد أحداث بعد':'No events yet','اختر ملف صورة فقط':'Select an image file only',
  'الأدوية المستخدمة':'Medications in use','المشكلات الرئيسية':'Main problems','مرفق مصور للتقرير':'Image attachment for the report',
  'ألم الرقبة والكتف':'Neck and shoulder pain','إصابة أعصاب طرفية':'Peripheral nerve injury','شلل دماغي للأطفال':'Cerebral palsy (children)',
  'تأخر حركي للأطفال':'Motor delay (children)','تعذر إنهاء الحالة':'Could not close the case','مسجل / جاهز للفحص':'Registered / ready for examination',
  'إنهاء بدون مراجعة':'Close without follow-up','تم بدء فحص الحالة':'Examination started','واجهة الأطباء فقط':'Doctors view only',
  'فلترة بتاريخ محدد':'Filter by a specific date','تم التحويل للمحصل':'Sent to the collector','الحالة غير موجودة':'Case not found',
  'تم اعتماد التدقيق':'Audit approved','تسجيل زيارة عيادة':'Record clinic visit','تسجيل دفعة للمبيت':'Record inpatient payment',
  'تسوية رسوم المبيت':'Settle inpatient fees','نتيجة مختبر جاهزة':'Lab result ready','جارٍ حفظ الحالة...':'Saving the case...',
  'من تاريخ إلى تاريخ':'From date to date','حسب التاريخ المحدد':'By the selected date','كشف الديون المالية':'Debts statement',
  'تسجيل مساعدة مالية':'Record financial assistance','دفعة للمريض المحدد':'Payment for the selected patient',
  'حفظ بيانات الإجراء':'Save procedure data','لا يوجد مريض مطابق':'No matching patient','لاصق جروح ميكروبور':'Micropore wound tape',
  'سرنجات تغذية 50 مل':'50 ml feeding syringes','سجل تقارير التأهيل':'Rehabilitation report log',
  'إنشاء تقرير متابعة':'Create follow-up report','التقارير والمتابعة':'Reports and follow-up','الوصول حسب التاريخ':'Access by date',
  'مدفوع / عند المحصل':'Paid / with the collector','أدخل رقم هوية صحيح':'Enter a valid ID number',
  'تعذر تسجيل الزيارة':'Could not record the visit','الاستقبال والتسجيل':'Reception and registration',
  'اكتب اسم المريض...':'Type the patient name...','تعديل نسبة التغطية':'Edit coverage rate','المطالبة على الجهة':'Claim on the entity',
  'إنشاء كشف المطالبة':'Create claim statement','كشف حساب مريض مقيم':'Inpatient account statement',
  'نسبة مساهمة المريض':'Patient contribution rate','تعذر تجهيز الطباعة':'Could not prepare printing',
  'جهة التحويل مطلوبة':'Referring entity is required','الزيارات والفواتير':'Visits and invoices',
  'لا توجد حالات خروج':'No discharges','سبب/تفاصيل الزيارة':'Visit reason / details','الإقرارات المحفوظة':'Saved declarations',
  'تعذر إنشاء التقرير':'Could not generate the report','تحويل إلى جهة أخرى':'Refer to another entity',
  'قسم المبيت المقترح':'Suggested inpatient unit','يحدده مسؤول المبيت':'Set by the inpatient officer',
  'ملف المبيت الداخلي':'Inpatient file','قسم المبيت الداخلي':'Inpatient unit','إصابة الحبل الشوكي':'Spinal cord injury',
  'ما بعد جلطة دماغية':'Post-stroke','ما بعد بتر الأطراف':'Post-amputation','معالجة نساء وأطفال':'Female and paediatric therapist',
  'الفرز وتعديل الدور':'Triage and queue order','أدخل المبلغ المحصل':'Enter the collected amount',
  'تطبيق / تحويل بنكي':'App / bank transfer','بحث إيصالات مدفوعة':'Search paid receipts','حسب ماكينة الطباعة':'By printer',
  'تكبير / تصغير الخط':'Increase / decrease font','التصوير التلفزيوني':'Ultrasound imaging',
  'اكتملت خدمة المريض':'Patient service completed','احتساب إقامة يومية':'Charge a daily stay',
  'اعتماد تقرير مختبر':'Approve lab report','لا توجد حالات مسجلة':'No recorded cases','حسب قرار رئيس القسم':'By the head of department decision',
  'قسم النساء والأطفال':'Women and children unit','تم حفظ تاريخ الخروج':'Discharge date saved',
  'تم مسح تاريخ الخروج':'Discharge date cleared','مساعدة مالية للمبيت':'Inpatient financial assistance',
  'الإحصائيات والمالية':'Statistics and finance','إظهار بيانات المريض':'Show patient data',
  'إدارة أطباء الأسنان':'Manage dentists','لا توجد سجلات أسنان':'No dental records','سجلات عيادة الأسنان':'Dental clinic records',
  'البيانات التي ستظهر':'Data to be shown','جارٍ إنشاء الملف...':'Creating the file...','معاينة الكشف الرسمي':'Preview official statement',
  'مباشرة وموحدة.':'direct and unified.','في ملف واحد منظم.':'in one organised file.','حالات اليوم':"Today's cases",
});
collectExactTranslations();

/* v4.3.91 — الدفعة الرابعة. */
Object.assign(staticEnglishPhrases, {
  'تم إنهاء جلسة اليوم':"Today's session ended",'جلسات الرجال':"Men's sessions",
  'الحالات حسب التاريخ':'Cases by date','اختر أو سجّل المريض':'Select or register the patient',
  'رقم الهوية أو الاسم':'ID number or name','بانتظار رقم الهوية أو الاسم':'Awaiting ID number or name',
  'إجمالي تكلفة الخدمة':'Total service cost','مبيت تجاوز 90 يوماً':'Stay over 90 days','القسم المالي للمبيت':'Inpatient finance unit',
  'الأطباء والمستخدمون':'Doctors and users','العلاج الطبيعي كامل':'Full physical therapy','الإحصائيات والتصدير':'Statistics and export',
  'الأمانات عند الدخول':'Deposits at admission','إنشاء إذن دخول مريض':'Create patient admission permit',
  'الملف المالي للمبيت':'Inpatient financial file','بنفس القالب الرسمي.':'in the same official template.',
  'ملفات وتسجيل المرضى':'Patient files and registration','موعد المبيت المتوقع':'Expected admission date',
  'تشخيص / سبب التحويل':'Diagnosis / referral reason','سبب / تشخيص التحويل':'Referral reason / diagnosis',
  'إنشاء ملف بالمستشفى':'Create a hospital file','تدهور الحالة الصحية':'Deterioration of health',
  'رفض المريض / الأسرة':'Patient / family refusal','لا توجد طلبات تحويل':'No referral requests',
  'العلاقات مع الأقارب':'Relations with relatives','العلاقات مع الأصدقاء':'Relations with friends',
  'أنواع فحوصات مخبرية':'Laboratory test types','إنهاء الحالة الطبية':'Close the medical case',
  'لا توجد حالات سابقة':'No previous cases','هامش الطباعة بالملم':'Print margin (mm)',
  'حفظ واعتماد التدقيق':'Save and approve the audit','تعذر اعتماد التدقيق':'Could not approve the audit',
  'الروماتيزم والتأهيل':'Rheumatology and rehabilitation','جارٍ تحميل الوحدة...':'Loading module...',
  'تعديل الفحص / الأشعة':'Edit examination / imaging','لا توجد خدمات مطابقة':'No matching services',
  'مكان السكن / المنطقة':'Place of residence / area','ثمن الجلسة (اختياري)':'Session price (optional)',
  'حالة المبيت / المريض':'Inpatient case / patient','المريض / حالة المبيت':'Patient / inpatient case',
  'مساعدة للمريض المحدد':'Assistance for the selected patient','لا توجد نتائج مطابقة':'No matching results',
  'تم إلغاء سجل الأسنان':'Dental record cancelled','إعداد وتصدير التقرير':'Prepare and export the report',
  'إضافة احتياج جديد...':'Add a new need...','كشف التجديدات للمبيت':'Inpatient renewals statement',
  'تقرير متابعة التأهيل':'Rehabilitation follow-up report','اختر حالة من القائمة':'Select a case from the list',
  'متابعة حالات التأهيل':'Rehabilitation case follow-up','لجنة التأهيل والمبيت':'Rehabilitation and inpatient committee',
  'لا توجد زيارات مسجلة':'No recorded visits','عودة من زيارة منزلية':'Return from a home visit',
  'جهة التغطية الإدارية':'Administrative coverage entity','أدخل نسبة بين 0 و100':'Enter a rate between 0 and 100',
  'ملاحظة / اسم المرحلة':'Note / stage name','مرتبط بالملف الإداري':'Linked to the administrative file',
  'استرجاع الحساب الآلي':'Restore automatic calculation','محددات بيانات المريض':'Patient data filters',
  'من الدخول حتى الخروج':'From admission to discharge','خروج حسب جهة التغطية':'Discharges by coverage entity',
  'لا توجد حالات عمليات':'No operation cases','المبيت وطلبات المبيت':'Inpatient and admission requests',
  'جلسات العلاج الطبيعي':'Physical therapy sessions','قسم المسنين والمسنات':'Elderly care unit',
  'يظهر تلقائياً إن وجد':'Shown automatically if available','تفاصيل الحالة الصحية':'Health status details',
  'الأدوية التي يتلقاها':'Medications received','لا توجد ملفات مطابقة':'No matching files',
  'لا توجد إعاقات مسجلة':'No recorded disabilities','حفظ وفتح حالة المبيت':'Save and open the inpatient case',
  'إدارة المبيت الداخلي':'Inpatient management','تم إلغاء طلب التحويل':'Referral request cancelled',
  'داكن ومريح للمناوبات':'Dark and easy on night shifts','مراجعات اليوم والفرز':"Today's follow-ups and triage",
  'تم جلب بيانات الهوية':'ID data fetched','رقم الهاتف (اختياري)':'Phone number (optional)',
  'طلبات التحويل للمبيت':'Inpatient referral requests','بانتظار مسؤول المبيت':'Awaiting the inpatient officer',
  'مشكلات أسرية إن وجدت':'Family problems, if any','تغيير الصورة المرفقة':'Change the attached image',
  'نتيجة / تقرير الأشعة':'Imaging result / report','صعوبة المشي والاتزان':'Difficulty walking and balancing',
  'بحث بالاسم أو الهوية':'Search by name or ID','بحث بالاسم أو الهوية...':'Search by name or ID...',
  'بحث بالاسم أو رقم الهوية':'Search by name or ID number','جارٍ إنهاء الحالة...':'Closing the case...',
  'تعذر تحميل المراجعات':'Could not load follow-ups','تعذر تجهيز كشف Excel':'Could not prepare the Excel statement',
  'قسم العلاج / العيادة':'Treatment unit / clinic','إعدادات قياس الإيصال':'Receipt size settings',
  'تعذر تجهيز ملف Excel':'Could not prepare the Excel file','لا توجد سجلات مكتملة':'No completed records',
  'تم إدخال مريض للمبيت':'Patient admitted','تم إدخال المريض للمبيت':'Patient admitted',
  'بنود الفحص الافتراضية':'Default examination items','تمت إضافة جهة التغطية':'Coverage entity added',
  'تم حذف الجلسة المحددة':'Selected session deleted','الاستعلامات والتقارير':'Inquiries and reports',
  'حفظ في قائمة الانتظار':'Save to the waiting list','جلسات النساء والأطفال':'Women and children sessions',
  'إضافة سجل / حالة مبيت':'Add record / inpatient case','جهة التحويلة / المشفى':'Referral entity / hospital',
  'تعذر حفظ خدمة الأسنان':'Could not save the dental service','تم تعديل طبيب الأسنان':'Dentist updated',
  'لا توجد مواعيد انتظار':'No waiting appointments','الدوام/ملاحظات الطبيب':'Shift / doctor notes',
  'قسطرة خارجية / كوندوم':'External / condom catheter','جاهز للطباعة والأرشفة':'Ready to print and archive',
  'لا توجد تقارير محفوظة':'No saved reports','اكتب نص التقرير أولاً':'Write the report text first',
  'أخصائي العلاج الطبيعي':'Physical therapist','أخصائي العلاج الوظيفي':'Occupational therapist',
  'جارٍ إنشاء التقرير...':'Generating the report...','تم حفظ متابعة التأهيل':'Rehabilitation follow-up saved',
  'تفاصيل متابعة التأهيل':'Rehabilitation follow-up details','أدخل رقم الجوال أولاً':'Enter the mobile number first',
  'جارٍ تسجيل الزيارة...':'Recording the visit...','مسار الكاشير والتحصيل':'Cashier and collection flow',
  'خروج من مستشفى الوفاء':'Discharge from Wafaa Hospital','اكتب اسم المحدد أولاً':'Enter the filter name first',
  'تصدير كشف حساب المريض':'Export the patient account statement','رئيس قسم خدمات المرضى':'Head of patient services',
  'معاينة التقرير الرسمي':'Preview the official report','التزام الجهة المحولة:':'Referring entity undertaking:',
  'سيتم توليده عند الحفظ':'Will be generated on save','حالة علاج طبيعي خارجي':'Outpatient physical therapy case',
  'تفاصيل العنصر المحذوف':'Deleted item details','لا توجد بيانات مطابقة':'No matching data',
  'قسم الأرشيف - عرض فقط':'Archive unit — view only','جارٍ تحميل الأرشيف...':'Loading the archive...',
  'إنشاء ملف مقيم/ة جديد':'Create a new resident file','العنوان الحالي - ثابت':'Current address — fixed',
  'تاريخ الخروج / الوفاة':'Discharge / death date','حدد تاريخ الخروج/الوفاة':'Select the discharge / death date',
  'حدد الحالة الاجتماعية':'Select the marital status','تسجيل حالة مبيت جديدة':'Register a new inpatient case',
  'التحقق من هوية المريض':'Verify the patient identity','أدخل العنوان بالتفصيل':'Enter the address in detail',
  'المبيت · الملف المالي':'Inpatient · Financial file','معاينة مطابقة للطباعة':'Print-accurate preview',
  'تاريخ الدخول للمستشفى':'Hospital admission date','تم تحديث الفرز والدور':'Triage and queue updated',
  'اعتماد الدفع والتحويل':'Approve payment and referral','بحث في إيصالات مدفوعة':'Search paid receipts',
  'كشف الإيرادات اليومية':'Daily revenue statement','جراحة المسالك البولية':'Urology surgery',
  'جراحة الأوعية الدموية':'Vascular surgery','أكمل اسم الخدمة والفئة':'Complete the service name and category',
  'تعذر إضافة جهة التغطية':'Could not add the coverage entity','جارٍ تحميل البيانات...':'Loading data...',
  'سجل الجلسات حسب الفترة':'Session log by period','تلقائي عند تركه فارغاً':'Automatic if left empty',
  'استثناء / حالة مستعجلة':'Exception / urgent case','اختر حالة المبيت أولاً':'Select the inpatient case first',
  'رقم التحويلة / التجديد':'Referral / renewal number','بحث وربط بالسجل المدني':'Search and link to the civil registry',
  'إحصائيات عيادة الأسنان':'Dental clinic statistics','كرسي متحرك ذو ظهر مائل':'Reclining wheelchair',
  'تعذر جلب بيانات المريض':'Could not fetch patient data','تم تسجيل الزيارة بنجاح':'Visit recorded successfully',
  'بانتظار التحصيل المالي':'Awaiting collection','عدد أيام الفترة الأولى':'Days in the first period',
  'لا توجد حركة تغطية بعد':'No coverage activity yet','تصدير المطالبة المالية':'Export the financial claim',
  'خانات جدول الاستحقاقات':'Dues table columns','تعذر حفظ حالة العمليات':'Could not save the operation case',
  'أعزب / متزوج / لاجئ...':'Single / married / refugee...','أعزب / متزوج / أرمل...':'Single / married / widowed...',
  'تعذر تصدير ملف الأرشيف':'Could not export the archive file','تم تحديث حالة المقيم/ة':'Resident status updated',
  'لا تملك صلاحية التصدير':'You do not have export permission','تفصيل الإعاقات المسجلة':'Recorded disabilities detail',
  'المواعيد / أيام الدوام':'Appointments / working days','التكلفة اليومية للمبيت':'Daily inpatient cost',
  'أقسام وعيادات المستشفى':'Hospital departments and clinics','تعذر تحميل شاشة النشاط':'Could not load the activity screen',
  'تم حذف الإقرار المحفوظ':'Saved declaration deleted','المبلغ الإجمالي (شيكل)':'Total amount (ILS)',
  'وصول مخصص لوزارة الصحة':'Dedicated Ministry of Health access','تم تعديل بيانات المريض':'Patient data updated',
  '— يحدده مسؤول المبيت —':'— Set by the inpatient officer —','ترتيب المريض بين إخوته':'Birth order among siblings',
  'الإحالة إلى جهات مختصة':'Referral to specialised bodies','إجمالي الحالات المكلفة':'Total assigned cases',
  'تعيين دور لمراجع اليوم':"Assign a queue number to today's visitor",'تصدير PDF حسب كل عيادة':'Export PDF per clinic',
  'تمت إضافة السجل المالي':'Financial record added','اكتملت حالة في الطابور':'A queued case was completed',
  'تم حذف الدور من القائمة':'Queue number removed','اتركه فارغاً إن لم يحدد':'Leave empty if not specified',
  'تعذر تحميل قائمة المرضى':'Could not load the patient list','تعذر حفظ قائمة الانتظار':'Could not save the waiting list',
  'اتركها فارغة بدون تغيير':'Leave empty for no change','تم حفظ تقرير الاحتياجات':'Needs report saved',
  'اختر النوع أو المقاس...':'Select the type or size...','نسبة التغطية لأول شهرين':'Coverage rate for the first two months',
  'نهاية التغطية (اختياري)':'Coverage end (optional)','كشف مطالبة مالية للمبيت':'Inpatient financial claim statement',
  'محددات جدول الاستحقاقات':'Dues table filters','النسب والفترات والتحويل':'Rates, periods and referral',
  'اختياري - يولد تلقائياً':'Optional — generated automatically','قائمة انتظار علاج طبيعي':'Physical therapy waiting list',
  'تعذر تجهيز قالب الأرشيف':'Could not prepare the archive template','المسن/المسنة توفى/توفيت':'The resident has passed away',
  'اسم جهة التغطية الجديدة':'New coverage entity name','تم تخريج الحالة إدارياً':'Case discharged administratively',
  'المبيت · الإقرار المالي':'Inpatient · Financial declaration','إدارة الفحوصات والأسعار':'Manage examinations and prices',
  'مدة المبيت / عدد الأيام':'Length of stay / number of days','تصدير تقرير وزارة الصحة':'Export the Ministry of Health report',
  'العنوان من السجل المدني':'Address from the civil registry','تحويل المريض إلى المبيت':'Refer the patient to inpatient',
  'أدخل رقم هوية حالة مبيت':'Enter an inpatient case ID number','الوضع الاجتماعي والأسرة':'Social status and family',
  'قرح فراش ومضاعفات حركية':'Bed sores and mobility complications','تعذر تحميل حالات الطبيب':'Could not load the doctor cases',
  'تعذر إضافة السجل المالي':'Could not add the financial record','تعذر حذف المريض من القسم':'Could not remove the patient from the unit',
  'العدد المسموح لهذا اليوم':'Allowed count for this day','قائمة الانتظار حسب اليوم':'Waiting list by day',
  'واجهة تشغيل مبيت تفاعلية':'Interactive inpatient console','اسم، هوية، جوال، خدمة...':'Name, ID, mobile, service...',
  'تحكم كامل بمحتوى التقرير':'Full control over the report content','الأمراض المصاحبة إن وجدت':'Comorbidities, if any',
  'الاحتياجات المختارة الآن':'Currently selected needs','قالب لجنة التأهيل الرسمي':'Official rehabilitation committee template',
  'اختر حالة من نتائج البحث':'Select a case from the search results','نوع / وصف التغطية يدوياً':'Coverage type / description (manual)',
  'الأعمدة المطابقة للصورة.':'Columns matching the image.','طباعة / تصدير كشف الحساب':'Print / export the account statement',
  'رئيس قسم الدائرة المالية':'Head of the finance department','تقرير رسمي مطابق للنموذج':'Official report matching the form',
  'تعذر تحميل سلة المحذوفات':'Could not load the trash bin','استعادة إلى مكانه السابق':'Restore to its previous place',
  'أدخل رقم هوية صحيح أولاً':'Enter a valid ID number first','البيانات الإدارية للحالة':'Administrative case data',
  'تمت إضافة القسم للمستشفى':'Department added to the hospital','المبيت والأسرة والمتابعة':'Inpatient, family and follow-up',
  'تحقق من رقم الهوية أولاً':'Verify the ID number first','عدم ملاءمة الحالة للمبيت':'Case not suitable for admission',
  'إضافة إلى قائمة الانتظار':'Add to the waiting list','مريض وزارة الصحة بالمشفى':'Ministry of Health patient at the hospital',
  'أكد أنك قرأت تحذير الحذف':'Confirm you have read the deletion warning','إعادة تأهيل بعد العمليات':'Post-operative rehabilitation',
  'عدد الممرضين / المعالجين':'Number of nurses / therapists','مراجعة اليوم · تعيين دور':"Today's follow-up · assign queue number",
  'مراجعة تلقائية بعد أسبوع':'Automatic follow-up after a week','الحساب الحالي ليس طبيباً':'The current account is not a doctor',
  'لا توجد حالات ضمن الفلتر':'No cases within the filter','إضافة سجل للتدقيق المالي':'Add a record for financial audit',
  'الجراحة العامة والمناظير':'General and endoscopic surgery','الاسم الإنجليزي (اختياري)':'English name (optional)',
  'اسم، هوية، رقم علاج طبيعي':'Name, ID, physical therapy number','تم إنشاء كشف الصحة المدمج':'Combined health statement created',
  'جارٍ تحميل جميع المرضى...':'Loading all patients...','لا توجد ملفات مرضى مسجلة.':'No registered patient files.',
  'بيانات منظمة وقابلة للفرز':'Organised, sortable data','الاحتياجات المحددة للمريض':'Needs identified for the patient',
  'القيمة المطلوب البحث عنها':'Value to search for','ربط الملف المالي بالإداري':'Link the financial file to the administrative one',
  'مراجعة تغطية بعد 61 يوماً':'Coverage review after 61 days','تعذر تحميل حالات العمليات':'Could not load the operation cases',
  'البيانات المرجعية الكاملة':'Full reference data','تعذر تحميل بيانات الأرشيف':'Could not load archive data',
  'تم تعديل ملف المسن/المسنة':'Resident file updated','مالية / عينية / علاجية...':'Financial / in-kind / treatment...',
  'تم التحقق من السجل المدني':'Civil registry verified','الطبيب المحوِّل (اختياري)':'Referring doctor (optional)',
  'ألوان جذابة مع تباين عالٍ':'Vivid colours with high contrast','سجل دخول وخروج المستخدمين':'User login and logout log',
  'تم حفظ ملف الإقرار المالي':'Financial declaration file saved','الاسم ورقم الهوية مطلوبان':'Name and ID number are required',
  'تعذر قراءة الصورة المرفقة':'Could not read the attached image','من الهوية إلى خطة التدخل.':'from identity to intervention plan.',
  'الشخص الأكثر دعماً للمريض':'Main source of support','إنهاء الحالة وحفظ التشخيص':'Close the case and save the diagnosis',
  'تم تجهيز كشف Excel اليومي':'Daily Excel statement prepared','تم حفظ التدقيق والتعديلات':'Audit and changes saved',
  'تدقيق وتعديل السجل المالي':'Audit and edit the financial record','إقامة يومية - اليوم الأول':'Daily stay — first day',
  'بحث باسم الفحص أو الفئة...':'Search by examination name or category...','إحصائية حسب التاريخ المحدد':'Statistics by the selected date',
  'اكتب النص الطبي للتقرير...':'Write the medical report text...','صلاحيات كل الأقسام والفروع':'Permissions for all departments and branches',
  'تعذر تجهيز قالب إذن الدخول':'Could not prepare the admission permit template',
  'اسم المشفى / الجهة الجديدة':'New hospital / entity name','اسم الطبيب المحوِّل إن وجد':'Referring doctor name, if any',
  'الملف الإداري لحالة المبيت':'Administrative file of the inpatient case','المبيت · ملف التأهيل الطبي':'Inpatient · Medical rehabilitation file',
  'طلبات تحويل بانتظار القبول':'Referral requests awaiting acceptance','تم إنشاء تقرير وزارة الصحة':'Ministry of Health report created',
  'السجل الزمني الكامل للمريض':'Full patient timeline','تحديث طلب الأشعة / التقرير':'Update the imaging request / report',
  'مراجعة بتاريخ يحدده الطبيب':'Follow-up on a date set by the doctor','تعذر تحميل الحالات السابقة':'Could not load previous cases',
  'تم تحديث بيانات ملف المريض':'Patient file data updated','تم حفظ الجلسة في ملف المريض':'Session saved to the patient file',
  'مغطى بالكامل من جهة التغطية':'Fully covered by the coverage entity','تعذر إنشاء كشف الصحة المدمج':'Could not create the combined health statement',
  'تم تسجيل الخصم وحساب الرصيد':'Discount recorded and balance calculated','فرشة هوائية للسرير مع ماتور':'Air mattress with pump',
  'جهة الاعتماد / المدير الطبي':'Approving authority / medical director','اسم محدد جديد مثل جهة تغطية':'New filter name, such as a coverage entity',
  'البيانات التي تظهر في الكشف':'Data shown in the statement','ملاحظات الاستقبال - اختياري':'Reception notes — optional',
  'مستشفى الوفاء للتأهيل الطبي':'Wafaa Hospital for Medical Rehabilitation',
  'المدينة / المنطقة / العنوان':'City / area / address','اسم الدواء والجرعة والتكرار':'Medicine name, dose and frequency',
  'شاشة مراقبة نشاط المستخدمين':'User activity monitoring screen','رقم الهوية مستخدم لمريض آخر':'The ID number is used by another patient',
  'تقارير المبيت المرسلة للملف':'Inpatient reports sent to the file','الإعاقات أو المشكلات الصحية':'Disabilities or health problems',
  'ملاحظة مختصرة عن جلسة اليوم':"Brief note about today's session",'أضف بند فحص واحداً على الأقل':'Add at least one examination item',
  'اختيار المريض للجلسة الجديدة':'Select the patient for the new session','الخدمات / الإجراءات العلاجية':'Services / treatment procedures',
  'التشخيص يحتوي أيضاً على (أو)':'The diagnosis also contains (or)','تم تسجيل الدفعة وحساب الرصيد':'Payment recorded and balance calculated',
  'دمج كشوف الصحة في تقرير واحد':'Merge health statements into one report','تم تحديث حالة قائمة الانتظار':'Waiting list status updated',
  'لم يتم اختيار أي احتياج بعد.':'No need has been selected yet.','اختر عموداً واحداً على الأقل':'Select at least one column',
  'لا توجد حالات في هذا التاريخ':'No cases on this date','تعذر تحميل العيادات والأطباء':'Could not load clinics and doctors',
  'نسب إضافية بعد الفترة الأولى':'Additional rates after the first period','التغطية، المطالبات والتقارير':'Coverage, claims and reports',
  'حالات العلاج الطبيعي الخارجي':'Outpatient physical therapy cases','كرسي، مشاية، نظارة، سماعة...':'Wheelchair, walker, glasses, hearing aid...',
});
collectExactTranslations();

/* v4.3.91 — الدفعة الخامسة والأخيرة. */
Object.assign(staticEnglishPhrases, {
  'المشفى المحوِّل':'Referring hospital','الطبيب المحوِّل':'Referring doctor','قسم مبيت الرجال':"Men's inpatient unit",
  'قسم مبيت النساء':"Women's inpatient unit",'مراجعات اليوم والفرز':"Today's follow-ups and triage",
  'تعيين دور لمراجع اليوم':"Assign a queue number to today's visitor",'مراجعة اليوم · تعيين دور':"Today's follow-up · assign queue number",
  'الطبيب المحوِّل (اختياري)':'Referring doctor (optional)','اسم الطبيب المحوِّل إن وجد':'Referring doctor name, if any',
  'بانتظار التحقق من رقم الهوية':'Awaiting ID number verification','اختر صورة لتظهر داخل التقرير':'Choose an image to appear in the report',
  'اسم، هوية، رقم ملف، تشخيص...':'Name, ID, file number, diagnosis...','الاسم / رقم المريض / الإيصال':'Name / patient number / receipt',
  'تعذر تجهيز كشف الإيرادات PDF':'Could not prepare the revenue statement PDF',
  'حالات جاهزة للطباعة والتحصيل':'Cases ready for printing and collection','لا توجد حالات بانتظار المحصل':'No cases awaiting the collector',
  'جاري تحميل نظام مستشفى الوفاء':'Loading the Wafaa Hospital system','تم تحديث الجلسة في ملف المريض':'Session updated in the patient file',
  'إضافة حالة إلى قائمة الانتظار':'Add a case to the waiting list','إضافة يدوية أو اختيار مريض...':'Add manually or select a patient...',
  'ملف مرضى المبيت داخل المستشفى':'Inpatient records inside the hospital','أدخل رقم الهوية أو رقم الجوال':'Enter the ID or mobile number',
  'تم ربط المريض من ملف المستشفى':'Patient linked from the hospital file','مثال: معتمد كلياً على الآخرين':'Example: fully dependent on others',
  'لا توجد حالات مطابقة للمحددات':'No cases match the filters','مثال: محمد، 407...، رقم الملف':'Example: Mohammed, 407..., file number',
  'لا يوجد ملف مبيت لفتح التأهيل':'No inpatient file to open rehabilitation','لا توجد بيانات مطالبة للتصدير':'No claim data to export',
  'تمت إضافة جهة التغطية للتقرير':'Coverage entity added to the report','مرتبطة بالملف الإداري مباشرة.':'Linked directly to the administrative file.',
  'تمت إضافة جهة التحويل للقائمة':'Referring entity added to the list','أدخل رقم الهوية لجلب البيانات':'Enter the ID number to fetch the data',
  'فاتح وواضح في الإضاءة العالية':'Light and clear in bright surroundings','مراجعات اليوم · تعيين رقم دور':"Today's follow-ups · assign a queue number",
  'اكتب التشخيص قبل إنهاء الحالة':'Write the diagnosis before closing the case',
  'ملاحظات المراجعة / سبب العودة':'Follow-up notes / reason for return','استكمال الدفع والتحصيل البنكي':'Complete payment and bank collection',
  'اجلب بيانات السجل المدني أولاً':'Fetch the civil registry data first','جارٍ تحميل الملفات والجلسات...':'Loading files and sessions...',
  'جهة التغطية تغطي كامل التكاليف':'The coverage entity covers all costs','تم تسجيل المساعدة وحساب الرصيد':'Assistance recorded and balance calculated',
  'إضافة إلى قائمة انتظار الأسنان':'Add to the dental waiting list','بالاسم أو الهوية أو رقم المريض':'By name, ID or patient number',
  'تسجيل الزيارة وإعطاء رقم الدور':'Record the visit and assign a queue number',
  'اختيار سريع حسب القسم أو الفرع':'Quick selection by department or branch','لا توجد حركة تغطية لهذه الحالة':'No coverage activity for this case',
  'البيانات التي ستظهر في التقرير':'Data that will appear in the report','الأقسام وجهات التغطية والخدمات':'Departments, coverage entities and services',
  'تم تصدير ملف الأرشيف PDF بنجاح':'Archive PDF exported successfully','اكتب نوع العمل عند اختيار يعمل':'Enter the type of work when "Employed" is selected',
  'يجب التحقق من رقم الهوية أولاً':'The ID number must be verified first','المبلغ المستحق لكل ليلة (شيكل)':'Amount due per night (ILS)',
  'حالات الوزارة في مستشفى الوفاء':'Ministry cases at Wafaa Hospital','لا توجد حالات وزارة صحة حالياً':'No Ministry of Health cases currently',
  'المشاركة في الأنشطة الاجتماعية':'Participation in social activities','المدقق المالي - أ. محمد الشكري':'Financial auditor — Mr. Mohammed Al-Shokri',
  'لا توجد حالات انتظار لهذا اليوم':'No waiting cases for this day','تاريخ انتهاء التحويلة / التجديد':'Referral / renewal expiry date',
  'تعذر تحميل بيانات عيادة الأسنان':'Could not load dental clinic data','تعذر إنشاء الملف، حاول مرة أخرى':'Could not create the file, try again',
  'اختر حالة واكتب تفاصيل المتابعة':'Select a case and write the follow-up details',
  'تعذر تحميل آخر الزيارات المسجلة':'Could not load the latest recorded visits',
  'صلاحية مالية خاصة بأمين الصندوق':'Financial permission reserved for the treasurer',
  'المربعات السفلية في كشف الحساب.':'The lower boxes in the account statement.',
  'اختر حالة مبيت بالهوية أو الاسم':'Select an inpatient case by ID or name','تم إنشاء ملف المسن/المسنة بنجاح':'Resident file created successfully',
  'حسب الملفات ضمن الفلاتر الحالية':'Based on files within the current filters','بيانات الهوية تم جلبها تلقائياً':'ID data fetched automatically',
  'نقل الحالة إلى لم تدخل المستشفى':'Move the case to "not admitted"','تم حذف المريض من واجهة المستخدم':'Patient removed from the user view',
  'توزيع ومتابعة جلسات مرضى المبيت':'Assign and follow up inpatient sessions','بدون إعادة إدخال بيانات المريض.':'without re-entering the patient data.',
  'سبب المراجعة أو ملاحظة الفرز...':'Follow-up reason or triage note...','يجب تسجيل أو اختيار المريض أولاً':'The patient must be registered or selected first',
  'استعلامات وتقارير العلاج الطبيعي':'Physical therapy inquiries and reports',
  'عدد الجلسات ضمن المحددات الحالية':'Number of sessions within the current filters',
  'لا توجد صلاحية لتعديل ملف المبيت':'No permission to edit the inpatient file',
  'تحديد الفروع / المقاسات المطلوبة':'Select the required branches / sizes','لون عمود رقم التحويلة في التقرير':'Colour of the referral number column in the report',
  'صافي المبالغ عن فترة مكوث المريض':'Net amounts for the patient stay','تصدير كشف الخروج حسب جهة التغطية':'Export the discharge statement by coverage entity',
  'اسم، رقم ملف، رقم هوية، تشخيص...':'Name, file number, ID, diagnosis...','تفاصيل الجهة، القيمة، الدورية...':'Entity details, amount, frequency...',
  'تقرير وزارة الصحة - حالات المبيت':'Ministry of Health report — inpatient cases',
  'تم تحديث طلب الأشعة وحفظ التقرير':'Imaging request updated and report saved',
  'سيتم إنشاء مراجعة تلقائية بتاريخ':'An automatic follow-up will be created on',
  'تم تحديث نوع الفحص وحفظ التعديلات':'Examination type updated and changes saved',
  'اضغط إلغاء الكتم لعودة التنبيهات.':'Press unmute to restore notifications.',
  'أدخل رقم الهوية ورقم الجوال أولاً':'Enter the ID and mobile number first',
  'حذف الجلسة المحددة من ملف المريض؟':'Delete the selected session from the patient file?',
  'تعذر إضافة الحالة لقائمة الانتظار':'Could not add the case to the waiting list',
  'اختر كشفاً واحداً على الأقل للدمج':'Select at least one statement to merge',
  'تعذر تصدير التقرير، حاول مرة أخرى':'Could not export the report, try again',
  'مثال: وزارة الصحة / مستشفى الشفاء':'Example: Ministry of Health / Al-Shifa Hospital',
  'غيّر كلمات البحث لعرض نتائج أخرى.':'Change the search terms to see other results.',
  'عيادة الأسنان غير معرفة في النظام':'The dental clinic is not defined in the system',
  'خانات بيانات المريض في كشف الحساب':'Patient data fields in the account statement',
  'أرشيف المرضى الخارجين من المستشفى':'Archive of patients discharged from the hospital',
  'تعذر تحميل ملفات المسنين والمسنات':'Could not load the resident files',
  'نوع القسم لا يتوافق مع جنس المريض':'The unit type does not match the patient gender',
  'خاص بمهندس محمد - سجل رقابي مرجعي':'Engineer Mohammed only — reference audit log',
  'تحقق من الهوية وأدخل تشخيص الحالة':'Verify the ID and enter the case diagnosis',
  'إضافة مريض جديد تابع لوزارة الصحة':'Add a new Ministry of Health patient',
  'مرضى وزارة الصحة الموجودون حالياً':'Ministry of Health patients currently present',
  'إخفاء ملف المريض من شاشة المستخدم':'Hide the patient file from the user screen',
  'تم حفظ دراسة الحالة في ملف المبيت':'Case study saved to the inpatient file',
  'تم إنهاء الحالة بدون مراجعة لاحقة':'Case closed without a later follow-up',
  'تم تجهيز ملف Excel للتدقيق المالي':'Excel file prepared for the financial audit',
  'اختيار مريض مسجل في العلاج الطبيعي':'Select a patient registered in physical therapy',
  'لا توجد صلاحية لتعديل تاريخ الخروج':'No permission to edit the discharge date',
  'تم تسجيل الزيارة بدون اشتراط الدفع':'Visit recorded without requiring payment',
  'إضاءة ناعمة بلون لؤلؤي وتباين واضح':'Soft pearl tone with clear contrast',
  'رقم الهوية غير موجود في سجل المرضى':'The ID number is not in the patient register',
  'عزلة اجتماعية أو صعوبات في التواصل':'Social isolation or communication difficulties',
  'تم إنهاء المريض وتسجيل ذلك في ملفه':'The patient was closed and this was recorded in the file',
  'نفس الحقول الظاهرة أعلى كشف الحساب.':'The same fields shown at the top of the account statement.',
  'سجل حالة جديدة أو غيّر كلمات البحث.':'Register a new case or change the search terms.',
  'مركز الوفاء لرعاية المسنين والمسنات':'Wafaa Centre for Elderly Care',
  'تعذر اعتماد الإيصال. حاول مرة أخرى.':'Could not approve the receipt. Try again.',
  'تم حفظ بيانات الإجراء على ملف المبيت':'Procedure data saved to the inpatient file',
  'بحث بالاسم أو الهوية أو رقم الملف...':'Search by name, ID or file number...',
  'اختياري: ملاحظة تظهر داخل ملف الحالة':'Optional: a note shown inside the case file',
  'اجلب بيانات المريض برقم الهوية أولاً':'Fetch the patient data by ID number first',
  'حدد المشفى المحوِّل أو أضف جهة جديدة':'Select the referring hospital or add a new entity',
  'مثال: السبت صباحاً، الاثنين مساءً...':'Example: Saturday morning, Monday evening...',
  'تنبيه: للمريض حالة مبيت نشطة حالياً.':'Note: the patient currently has an active inpatient case.',
  'تم حفظ أبعاد الإيصال للطابعة الحالية':'Receipt dimensions saved for the current printer',
  'تعذر تحميل قسم العلاج الطبيعي الخارجي':'Could not load the outpatient physical therapy unit',
  'أضف حالة جديدة أو غير التاريخ والقسم.':'Add a new case or change the date and unit.',
  'يظهر أسفل بيانات المريض داخل التقرير.':'Shown below the patient data inside the report.',
  'عرض كامل للبيانات المتاحة في الأرشيف.':'A full view of the data available in the archive.',
  'واجهة رعاية المسنين والمسنات المقيمين':'Resident elderly care screen',
  'إضافة إعاقة جديدة / استثنائية إن وجدت':'Add a new / exceptional disability, if any',
  'يمكن إضافة حالات جديدة من هذه الصفحة.':'New cases can be added from this page.',
  'المريض موجود ولكن لا يوجد له ملف مبيت':'The patient exists but has no inpatient file',
  'تم فتح ملف الحالة الاجتماعية والنفسية':'The social and psychological case file was opened',
  'مثال: صورة الحالة الاجتماعية / المرفق':'Example: social case photo / attachment',
  'اكتب تشخيص العلاج الطبيعي لهذه الحالة':'Write the physical therapy diagnosis for this case',
  'اكتب التشخيص أو ملخص الحالة الطبية...':'Write the diagnosis or medical case summary...',
  'بحث باسم المريض أو رقمه أو العيادة...':'Search by patient name, number or clinic...',
  'المريض مسجل مسبقاً وجاهز لتسجيل الحالة':'The patient is already registered and ready for a case',
  'لا توجد جلسات مطابقة للمحددات الحالية.':'No sessions match the current filters.',
  'أُعطي هذا التقرير بناءً على طلب الأهل.':'This report was issued at the family’s request.',
  'مثال: أعطي هذا التقرير بناءً على طلب الأهل':'Example: this report was issued at the family’s request',
  'لا توجد متابعة لتصديرها في هذا التاريخ':'No follow-up to export on this date',
  'يسمح للمريض المذكور أعلاه بالدخول لقسم':'The patient named above is permitted to be admitted to',
  'تعذر جلب بيانات الهوية من السجل المدني':'Could not fetch ID data from the civil registry',
  'خاص بمهندس محمد - أوقات الدخول والخروج':'Engineer Mohammed only — login and logout times',
  'أضف فحصاً أو نوع أشعة جديداً من الأعلى.':'Add a new examination or imaging type from above.',
  'ستظهر هنا تنبيهات القسم المسموح لك فقط.':'Only notifications for your permitted department appear here.',
  'تم تصدير التقرير PDF بنفس تنسيق الطباعة':'Report exported as PDF in the same print layout',
  'تم تصدير التقرير Word بنفس تنسيق الطباعة':'Report exported as Word in the same print layout',
  'تم تصدير التقرير Excel بتنسيق مطابق للتقرير':'Report exported as Excel matching the report layout',
  'اختر جهة تغطية أولاً لتفعيل هذا الخيار.':'Select a coverage entity first to enable this option.',
  'سجّل خدمة أو غيّر الفترة لعرض البيانات.':'Record a service or change the period to see data.',
  'سيتم إدراج الصورة المرفقة داخل التقرير.':'The attached image will be placed inside the report.',
  'ملف رسمي للعرض والتوثيق - مستشفى الوفاء':'Official file for display and documentation — Wafaa Hospital',
  'إضافة حالة إلى قائمة انتظار وزارة الصحة':'Add a case to the Ministry of Health waiting list',
  'التقارير والنتائج المرسلة مع طلب المبيت':'Reports and results sent with the admission request',
  'تعذر اعتماد عملية الدفع. حاول مرة أخرى.':'Could not approve the payment. Try again.',
  'تم استنفاد الأرقام التسلسلية لهذه السنة':'The serial numbers for this year are exhausted',
  'تعديل السعر يحتاج صلاحية أسعار الفحوصات.':'Editing the price requires the examination pricing permission.',
  'المدفوع لا يجوز أن يكون أكبر من الإجمالي':'The paid amount cannot exceed the total',
  'تم تصدير ملف Excel لقسم المسنين والمسنات':'Excel file exported for the elderly care unit',
  'نقود، أوراق، جوال، ملابس، أدوات شخصية...':'Cash, documents, mobile, clothes, personal items...',
  'تم نقل الحالة إلى قائمة لم تدخل المستشفى':'The case was moved to the "not admitted" list',
  'العلامات الحيوية أو سبب أولوية الحالة...':'Vital signs or reason for case priority...',
  'مراجعة اليوم - تعيين دور من شاشة الطابور':"Today's follow-up — assign a queue number from the queue screen",
  'تم تسجيل الحالة وإنشاء رقم العلاج الطبيعي':'Case registered and a physical therapy number created',
  'تمت إضافة المريض إلى قائمة انتظار الأسنان':'Patient added to the dental waiting list',
  'المريض أصبح مسجلاً بالفعل وتم فتح بياناته':'The patient is now registered and their data is open',
  'تم حفظ حركة التغطية وربطها بالملف الإداري':'Coverage entry saved and linked to the administrative file',
  'لا تملك صلاحية تعديل قسم المسنين والمسنات':'You do not have permission to edit the elderly care unit',
  'في حالة يعمل تظهر خانة نوع العمل تلقائياً':'If "Employed" is selected, the type of work field appears automatically',
  'ضع إشارة صح لطباعة الإيصال واعتماد الحالة':'Tick to print the receipt and approve the case',
  'لا توجد سجلات مطابقة للفترة والفلتر المحدد':'No records match the selected period and filter',
  'تم حفظ تقرير لمن يهمه الأمر في ملف التأهيل':'The "to whom it may concern" report was saved to the rehabilitation file',
  'سجّل أول حركة مالية لهذه الحالة لتظهر هنا.':'Record the first financial entry for this case to see it here.',
  'اكتب سبب الحاجة للمبيت والحالة السريرية...':'Write the reason for admission and the clinical condition...',
  'ستصل الحالات هنا بعد اعتماد المحصل المالي.':'Cases arrive here after the collector approves them.',
  'تم إنهاء الزيارة الطبية وتحديد موعد متابعة':'The medical visit was closed and a follow-up appointment set',
  'تم تعديل سجل الأسنان وربطه بالمالية والطبيب':'The dental record was updated and linked to finance and the doctor',
  'أكمل نوع الحركة وجهة التغطية وبداية التغطية':'Complete the activity type, coverage entity and coverage start',
  'تمت استعادة العنصر وإرجاعه إلى مكانه السابق':'The item was restored to its previous place',
  'الاسم ورقم الهوية وتاريخ الدخول حقول مطلوبة':'Name, ID number and admission date are required',
  'لم يتم اختيار أي إعاقة ضمن النتائج الحالية.':'No disability has been selected within the current results.',
  'وتظهر عند موظف التسجيل والطبيب وملف المريض.':'and it appears for the registrar, the doctor and the patient file.',
  'اختر معلومة واحدة على الأقل لتظهر في التقرير':'Select at least one item to appear in the report',
  'أي ملاحظات مرتبطة بالاحتياجات أو التوصيات...':'Any notes related to needs or recommendations...',
  'بحث بالاسم أو الهوية أو رقم المريض أو الطبيب':'Search by name, ID, patient number or doctor',
  'القائمة قراءة فقط ولا تحتوي أي تعديل أو حذف.':'The list is read-only and allows no editing or deletion.',
  'حدد نوع المساعدة عند تفعيل خانة يتلقى مساعدة':'Specify the assistance type when "receives assistance" is enabled',
  'تمت مراجعة الحالة من العلاج الطبيعي الداخلي.':'The case was reviewed by inpatient physical therapy.',
  'اسم المحول ورقم الجوال وطريقة التحويل مطلوبة':'Referrer name, mobile number and referral method are required',
  'تم حذف المريض من قائمة العلاج الطبيعي الخارجي':'The patient was removed from the outpatient physical therapy list',
  'تم تسجيل الحالة وظهرت تلقائياً في صفحة الطبيب':'The case was registered and appeared automatically on the doctor page',
  'أدخل اسم المستخدم وكلمة مرور 8 أحرف على الأقل':'Enter a username and a password of at least 8 characters',
  'اكتب وصف الأشعة، النتيجة والانطباع النهائي...':'Write the imaging description, result and final impression...',
  'اختر المريض وأدخل مبلغاً صحيحاً في خانة المبلغ':'Select the patient and enter a valid amount',
  'اضغط على أي صف من الجدول لعرض تفاصيله الكاملة.':'Click any table row to see its full details.',
  'يمكن اختيار أكثر من نوع وإضافة إعاقة استثنائية':'More than one type can be selected and an exceptional disability added',
  'بحث بالاسم أو الهوية أو رقم الملف أو البلدة...':'Search by name, ID, file number or town...',
  'وحدة إدارية مستقلة لتسجيل ومتابعة حالات المبيت':'An independent administrative unit for registering and following up inpatient cases',
  'المرضى الموجودون حالياً والتابعون لوزارة الصحة':'Patients currently present under the Ministry of Health',
  'جميع المرضى المسجلين ضمن العلاج الطبيعي الخارجي':'All patients registered in outpatient physical therapy',
  'تظهر أعلى القائمة ولا تنتظر ترتيب الدور العادي.':'It appears at the top of the list and skips the normal queue order.',
  'اختر حالة مبيت لفتح ملف التأهيل الطبي الخاص بها':'Select an inpatient case to open its medical rehabilitation file',
  'تم تجهيز نموذج الزيارة حسب موعد المراجعة المحدد':'The visit form was prepared for the selected follow-up appointment',
  'هذه الخانات قابلة للتعبئة والتعديل قبل الطباعة.':'These fields can be filled in and edited before printing.',
  'اسم المريض، الهوية، رقم الملف، الطبيب، القسم...':'Patient name, ID, file number, doctor, department...',
  'ستظهر هنا الحالات التي جهة تغطيتها وزارة الصحة.':'Cases covered by the Ministry of Health will appear here.',
  'بعد إنهاء الحالة تظهر هنا مع التشخيص والمراجعة.':'Once closed, the case appears here with the diagnosis and follow-up.',
  'تم اعتماد الدفع وتحويل الحالة إلى المحصل المالي':'Payment approved and the case sent to the collector',
  'أدخل اسم المريض أو اختره من ملفات العلاج الطبيعي':'Enter the patient name or select it from the physical therapy files',
  'غيّر التاريخ أو طريقة العرض، أو سجّل جلسة جديدة.':'Change the date or view, or record a new session.',
  'ابحث بالاسم، الهوية، رقم الملف، الجوال، القسم...':'Search by name, ID, file number, mobile, department...',
  'اختر عموداً واحداً على الأقل من جدول الاستحقاقات':'Select at least one column from the dues table',
  'تم حفظ حالة العمليات ويمكن الآن طباعة إذن الدخول':'The operation case was saved and the admission permit can now be printed',
  'اكتب التشخيص الرئيسي وسبب إدخال المريض للمبيت...':'Write the main diagnosis and the reason for admission...',
  'حساب مخصص لدراسة الحالات الاجتماعية والنفسية فقط':'An account dedicated to social and psychological case studies only',
  'تم إرسال طلب المبيت وتسجيله مباشرة في ملف المريض':'The admission request was sent and recorded directly in the patient file',
  'هذه البنود تظهر تلقائياً عند إدخال نتيجة المختبر.':'These items appear automatically when the lab result is entered.',
  'تم جلب بيانات المريض المسجلة وربطها بالسجل المدني':'The registered patient data was fetched and linked to the civil registry',
  'تمت إضافة طبيب الأسنان ومنحه صلاحية واجهة الأسنان':'The dentist was added and granted access to the dental screen',
  'مثال: تحويل وزارة الصحة - تأهيل طبي / قرار خاص...':'Example: Ministry of Health referral — medical rehabilitation / special decision...',
  'تم إنشاء التقرير إلكترونيًا من نظام مستشفى الوفاء':'This report was generated electronically by the Wafaa Hospital system',
  'تقييم اجتماعي ونفسي شامل مرتبط مباشرة بملف المبيت':'A full social and psychological assessment linked directly to the inpatient file',
  'انت على وشك حذف هذا الأمر، هل أنت متأكد من الحذف؟':'You are about to delete this item. Are you sure?',
  'اختر وزارة الصحة أو أي جهة أخرى، أو أضف جهة جديدة.':'Select the Ministry of Health or another entity, or add a new one.',
  'سبب الانتظار، تعليمات الموعد، أو ملاحظات رئيس القسم':'Reason for waiting, appointment instructions, or head of department notes',
  'ستظهر البيانات الشخصية تلقائياً بعد فتح ملف المريض.':'Personal data will appear automatically once the patient file is opened.',
  'ابحث باسم المريض أو رقم الهوية أو رقم العلاج الطبيعي':'Search by patient name, ID number or physical therapy number',
  'ابحث عن المريض أو اجلب بياناته من السجل المدني أولاً':'Search for the patient or fetch their data from the civil registry first',
  'أكمل بيانات المبيت والتغطية والتحويل قبل فتح الحالة.':'Complete the admission, coverage and referral data before opening the case.',
  'تعيين الدور فعال للمستخدمين المخولين بتسجيل الزيارات':'Queue assignment is available to users authorised to record visits',
  'اختياري: سبب المراجعة أو تعليمات للطبيب/الاستقبال...':'Optional: reason for follow-up or instructions for the doctor / reception...',
  'ابدأ بتسجيل المريض ثم احفظ أول حالة علاج طبيعي خارجي.':'Start by registering the patient, then save the first outpatient physical therapy case.',
  'اكتب البند واضغط Enter للانتقال تلقائياً للرقم التالي':'Type the item and press Enter to move automatically to the next number',
  'إعداد وطباعة سند الإقرار والالتزام بنفس القالب الرسمي':'Prepare and print the acknowledgement and undertaking form in the same official template',
  'تمت مراجعة بيانات الدفع — اعتماد وتحويل للمحصل المالي':'Payment data reviewed — approved and sent to the collector',
  'الحالات الجديدة ستظهر هنا تلقائياً بعد تسجيل الزيارة.':'New cases will appear here automatically once the visit is recorded.',
  'اكتب التشخيص كاملاً، وسيظهر واضحاً في الجدول والتقارير':'Write the full diagnosis; it will appear clearly in the table and reports',
  'القالب الافتراضي مطابق للصورة مع دخول أزرق وخروج أحمر.':'The default template matches the image, with admission in blue and discharge in red.',
  'راجع نسب التغطية للفترة التالية وأدخل أي تغيير يدوياً.':'Review the coverage rates for the next period and enter any change manually.',
  'تم تجهيز كشف الإيرادات PDF بالقالب المفصل حسب كل عيادة':'The revenue statement PDF was prepared in the detailed per-clinic template',
  'ستظهر هنا شاشة المتابعة الخاصة بالمريض والتاريخ المحدد.':'The follow-up screen for the selected patient and date will appear here.',
  'الصلاحيات المالية مخفية وغير قابلة للمنح من هذا الحساب.':'Financial permissions are hidden and cannot be granted from this account.',
  'تم الحفظ لكن تعذر التحقق من المستخدم في قاعدة البيانات.':'Saved, but the user could not be verified in the database.',
  'اكتب رقم الهوية أو اسم المريض، والبيانات تظهر تلقائياً.':'Type the ID number or patient name and the data appears automatically.',
  'هذا الحساب للعرض فقط ولا يملك صلاحية تعديل دراسة الحالة':'This account is view-only and cannot edit the case study',
  'ستظهر هنا الحالات التي يضيفها الاستقبال أو عيادة الأسنان.':'Cases added by reception or the dental clinic will appear here.',
  'هذه الملاحظات خاصة بالطبيب ولا تظهر كإجراء مالي أو إداري.':'These notes are for the doctor only and are not shown as a financial or administrative action.',
  'ضع إشارة صح لاعتماد الدفع وتحويل الحالة إلى المحصل المالي':'Tick to approve the payment and send the case to the collector',
  'تتحدث هذه الشاشة تلقائياً بمجرد اختيار أو إزالة أي احتياج.':'This screen updates automatically as soon as a need is selected or removed.',
  'تعذر الاتصال بالسجل المدني؛ تم استخدام الملف المحلي الموثق':'Could not reach the civil registry; the verified local file was used',
  'هذه الشاشة تعمل فقط عند الدخول بحساب طبيب مربوط بملف طبيب.':'This screen works only when signed in with a doctor account linked to a doctor file.',
  'يمكنك تعديل أي خلية، والقيم المعدلة تدخل في التقرير مباشرة.':'You can edit any cell, and the edited values go straight into the report.',
  'عند إرسال المريض للمبيت يظهر الطلب هنا مع التقارير المرفقة.':'When a patient is sent for admission, the request appears here with the attached reports.',
  'التقارير الطبية والاحتياجات والمتابعة اليومية لحالات التأهيل':'Medical reports, needs and daily follow-up for rehabilitation cases',
  'بعد اختيار المريض ستظهر هنا العيادات والأطباء وتسجيل الزيارة.':'Once the patient is selected, clinics, doctors and visit registration appear here.',
  'بحاجة إلى موافقة وكيل وزارة الصحة لتجديد فترة المبيت الحالية.':'Approval from the Ministry of Health deputy is required to renew the current stay.',
  'المريض بحاجة الى موافقة وكيل وزارة الصحة لتجديد فترة المبيت الحالية':'The patient needs approval from the Ministry of Health deputy to renew the current stay',
  'ستظهر هنا تلقائياً أسماء المرضى فور تسجيل خروجهم من المستشفى.':'Patient names appear here automatically as soon as their discharge is recorded.',
  'متابعة حالات وزارة الصحة وقوائم الانتظار والتقارير الخاصة بها':'Follow up Ministry of Health cases, waiting lists and their reports',
  'ستظهر هنا ملفات المسنين والمسنات بعد التسجيل أو تغيير الفلاتر.':'Resident files will appear here after registration or when the filters change.',
  'اختياري: ابحث عن مريض لتعبئة الاسم والعمر ومدة المبيت تلقائياً':'Optional: search for a patient to fill the name, age and length of stay automatically',
  'حجم الصورة كبير. اختر صورة أقل من 5MB لتظهر داخل التقرير بسرعة':'The image is too large. Choose one under 5MB so it loads quickly in the report',
  'اختر الوضع المناسب، وسيبقى الكلام والقوائم واضحة في كل الأقسام.':'Choose the mode that suits you; text and menus stay clear across all departments.',
  'اختر أي كشف تريد دمجه: دخول صحة، خروج صحة، أو خروج جميع الحالات.':'Choose which statements to merge: health admissions, health discharges, or all discharges.',
  'اكتب التطورات، الملاحظات، خطة المتابعة أو التوصيات لهذا اليوم...':"Write today's progress, notes, follow-up plan or recommendations...",
  'عند حفظ تقرير لمن يهمه الأمر أو الاحتياجات أو المتابعة سيظهر هنا.':'Once a "to whom it may concern", needs or follow-up report is saved, it appears here.',
  'رقم التحويل، توصية اللجنة، ملاحظات الاعتماد أو أي تفاصيل مالية...':'Referral number, committee recommendation, approval notes or any financial details...',
  'القائمة مبنية على نموذج النظام القديم، ويمكن إضافة أي احتياج جديد.':'The list follows the old system form, and any new need can be added.',
  'اختر تاريخاً آخر للوصول إلى الحالات التي كانت موجودة في ذلك اليوم.':'Choose another date to reach the cases present on that day.',
  'سجّل حركة التغطية أولاً حتى يتم احتساب المطالبة المالية بشكل صحيح.':'Record the coverage entry first so the financial claim is calculated correctly.',
  'وصول سريع لأهم أقسام المستشفى — اضغط على أي بطاقة للانتقال مباشرة.':'Quick access to the main hospital departments — click any card to go straight there.',
  'سجّل حالة مبيت أولاً، وبعدها سيظهر ملف التأهيل الطبي الخاص بها هنا.':'Register an inpatient case first, then its medical rehabilitation file appears here.',
  'سيظهر طلب التحويل فوراً لدى مسؤول المبيت وفي ملف المريض والإشعارات.':'The referral request appears immediately for the inpatient officer, in the patient file and in notifications.',
  'بعد اعتماد الدفع من موظف التحصيل البنكي ستظهر الحالات هنا تلقائياً.':'Once the bank collection officer approves the payment, cases appear here automatically.',
  'القالب الافتراضي مطابق للصورة، ويمكن إضافة/إخفاء أي عمود حسب الحاجة.':'The default template matches the image, and any column can be shown or hidden as needed.',
  'اللون المختار يطبّق على العمود كاملًا في المعاينة والطباعة والتصدير.':'The chosen colour applies to the whole column in the preview, print and export.',
  'اكتب ملخص الحالة الصحية، الأمراض المزمنة، الملاحظات الطبية المهمة...':'Write the health summary, chronic conditions and important medical notes...',
  'تظهر كل الملفات بلا استثناء مع أوامر الخروج النهائي والزيارة المؤقتة':'All files are shown without exception, along with final discharge and temporary visit actions',
  'حركات التغطية والمطالبات والتقارير المالية المرتبطة بالحالة الإدارية':'Coverage entries, claims and financial reports linked to the administrative case',
  'مثال: بعد اليوم 60 تصبح النسبة 80%، وبعد اليوم 90 تحتاج موافقة جديدة.':'Example: after day 60 the rate becomes 80%, and after day 90 a new approval is required.',
  'ابدأ برقم الهوية، والنظام يجلب البيانات الأساسية من API السجل المدني.':'Start with the ID number and the system fetches the basic data from the civil registry API.',
  'تظهر هنا جميع حالات المبيت والتقارير والمتابعات المرتبطة بهذا المريض.':'All inpatient cases, reports and follow-ups linked to this patient appear here.',
  'اكتب تقييم حالة المريض، الاستجابة للجلسات، التوصيات، وخطة المتابعة...':'Write the patient assessment, response to sessions, recommendations and follow-up plan...',
  'لم يتم العثور على بيانات، يمكنك تعبئة الملف يدوياً مع تثبيت رقم الهوية':'No data found; you can fill the file manually while keeping the ID number fixed',
  'لا توجد عيادات خارجية فعالة حالياً. فعّل عيادة من شاشة العيادات أولاً.':'No outpatient clinics are active. Activate a clinic from the clinics screen first.',
  'سيتم استخدام ترويسة مستشفى الوفاء ونفس الحقول الظاهرة في التقرير الحالي.':'The Wafaa Hospital letterhead and the same fields shown in the current report will be used.',
  'ستظهر هنا الزيارات والطابور والمبيت والتقارير والحركات المرتبطة بالمريض.':'Visits, queue, admissions, reports and entries linked to the patient appear here.',
  'عند الحفظ يُمنح المريض رقم الدور التالي تلقائياً ويظهر فوراً في الطابور.':'On save, the patient is given the next queue number automatically and appears in the queue immediately.',
  'تسجيل المرضى والحالات، إدارة الجلسات، والاستعلامات والتقارير من ملف موحد.':'Register patients and cases, manage sessions, and run inquiries and reports from one unified file.',
  'أي زيارة تسجلها ستبقى محفوظة هنا بعد التحديث لأنها مربوطة بقاعدة البيانات.':'Any visit you record stays saved here after refreshing because it is stored in the database.',
  'العناصر التي تُحذف من المستخدمين ستظهر هنا كمرجع خاص وبشكل قابل للاستعادة.':'Items deleted by users appear here as a private, restorable reference.',
  'بعد البحث ستظهر الحالة الإدارية المرتبطة ويمكنك متابعة الملف المالي مباشرة.':'After searching, the linked administrative case appears and you can go straight to the financial file.',
  'توزيع جلسات العلاج الطبيعي ومتابعة حالات المبيت حسب الرجال والنساء والأطفال':'Assign physical therapy sessions and follow up inpatient cases by men, women and children',
  'هذه زيارة مراجعة مرتبطة بموعد سابق وستظهر للطبيب بعد استكمال الدفع والتحصيل.':'This is a follow-up visit linked to an earlier appointment; it appears for the doctor once payment and collection are complete.',
  'لا يوجد طبيب فعّال مربوط بهذه العيادة. اربط طبيباً بالعيادة من شاشة الأطباء.':'No active doctor is linked to this clinic. Link a doctor from the doctors screen.',
  'من القوائم أمام المستخدم، مع بقاء المرجع محفوظاً في النظام الخاص بمهندس محمد.':'from the lists shown to the user, while the reference stays kept in Engineer Mohammed’s system.',
  'هذه المراجعة انتهى موعدها تلقائياً، يمكن تسجيل زيارة جديدة عادية إذا لزم الأمر.':'This follow-up has expired automatically; a normal new visit can be recorded if needed.',
  'لا توجد نسب إضافية. سيبقى تنبيه اليوم 61 ظاهراً حتى تدخل النسبة الجديدة يدوياً.':'There are no additional rates. The day-61 alert stays visible until you enter the new rate manually.',
  'أكمل الاسم والتاريخ والسنة والعمر ومدة الأيام والمبلغ لكل ليلة والمبلغ الإجمالي':'Complete the name, date, year, age, number of days, nightly amount and total amount',
  'اضغط على القسم لمنح أو إزالة كل صلاحياته المتاحة، وبعدها عدّل التفاصيل من الجدول.':'Click a department to grant or remove all its permissions, then adjust the details in the table.',
  'أدخل الاسم والعمر ومدة الأيام والمبالغ، ثم صدّر PDF / Word بدون شاشة بيضاء مزعجة.':'Enter the name, age, number of days and amounts, then export PDF / Word without a blank screen.',
  'انقر على اسم المريض لفتح ملف الحالة. إدخال تاريخ الخروج يتم يدوياً في كشوف الخروج.':'Click the patient name to open the case file. The discharge date is entered manually in the discharge statements.',
  'واجهة مخصصة لمتابعة مرضى وزارة الصحة وقوائم الانتظار والحالات التي لم تدخل المستشفى':'A dedicated screen for following Ministry of Health patients, waiting lists and cases not admitted',
  'البيانات الشخصية تُستدعى من ملف المبيت، ويمكن إرفاق صورة لتظهر داخل التقرير المطبوع.':'Personal data is pulled from the inpatient file, and an image can be attached to appear in the printed report.',
  'اختر الأيقونة، حدّد الفترة، أدخل البيانات المطلوبة، ثم صدّر الكشف PDF / Word / Excel.':'Choose the icon, set the period, enter the required data, then export the statement as PDF / Word / Excel.',
  'تسجيل خدمات الأسنان، قائمة الانتظار، الإحصائيات، وربط تلقائي مع المالية وصفحة الطبيب.':'Record dental services, the waiting list and statistics, with automatic links to finance and the doctor page.',
  'تظهر أي حالة مسجلة في العيادات للطبيب تلقائياً، وتبقى حالة الدفع واضحة بجانب كل مريض.':'Any case registered in the clinics appears automatically for the doctor, with the payment status clear beside each patient.',
  'لا توجد نتائج مكتملة حالياً. يمكن إرسال الطلب بدون مرفقات وإضافة تقارير المبيت لاحقاً.':'No completed results yet. The request can be sent without attachments and inpatient reports added later.',
  'طباعة الإيصال وتذكرة الدور، ثم تحويل الحالة تلقائياً إلى المدقق المالي أ. محمد الشكري.':'Print the receipt and queue ticket, then send the case automatically to the financial auditor, Mr. Mohammed Al-Shokri.',
  'ملف اجتماعي وصحي وإداري متكامل مع قائمة المقيمين والخروج النهائي والزيارات والإحصائيات.':'A complete social, health and administrative file with the resident list, final discharge, visits and statistics.',
  'تظهر الحالات تلقائياً فور تسجيل الزيارة. أدخل بيانات الدفع فقط ثم اعتمدها للمحصل المالي.':'Cases appear automatically once the visit is recorded. Just enter the payment data and approve it for the collector.',
  'تم تجهيز النص الابتدائي من تشخيص حالة المبيت، ويمكنك تعديله بالكامل قبل الحفظ أو التصدير.':'The initial text was drafted from the inpatient diagnosis; you can edit it fully before saving or exporting.',
  'حدّد القسم أو الفرع ثم امنح العرض/الإضافة/التعديل/الحذف/الطباعة/التصدير حسب وظيفة المستخدم.':'Select the department or branch, then grant view / add / edit / delete / print / export according to the user role.',
  'عدّل خانات كشف الحساب من الواجهة، وستظهر نفس القيم في المعاينة والتصدير PDF / Word / Excel.':'Edit the account statement fields in the screen; the same values appear in the preview and in the PDF / Word / Excel export.',
  'يُمنح كل مريض رقماً تلقائياً، ويمكن للمستخدمين أصحاب الصلاحية تعديل الدور والأولوية والحالة.':'Each patient is given a number automatically, and authorised users can change the queue number, priority and status.',
  'عرض المقيمين الحاليين، إدارة قائمة الانتظار، توثيق الحالات التي لم تدخل، وإصدار تقارير مخصصة.':'View current residents, manage the waiting list, document cases not admitted, and issue custom reports.',
  'أي مراجعة يحددها الطبيب تظهر هنا، وإذا مر موعدها بدون تسجيل زيارة تظهر كحالة منتهية تلقائياً.':'Any follow-up set by the doctor appears here; if its date passes without a recorded visit it is shown as expired automatically.',
  'أدخل رقم الهوية ورقم الجوال فقط، ثم يتم جلب الاسم والجنس وتاريخ الميلاد ومكان السكن من الـ API.':'Enter only the ID and mobile number; the name, gender, date of birth and place of residence are fetched from the API.',
  'سجّل الدخول بأحد يوزرات الأطباء مثل schedule.doctor.021 حتى تظهر حالات الطبيب بدون أخطاء صلاحيات.':'Sign in with a doctor username such as schedule.doctor.021 so the doctor cases appear without permission errors.',
  'الحركة تحفظ كسجل مالي مستقل، بينما الاسم والهوية والقسم والتشخيص تبقى مرتبطة مباشرة بالملف الإداري.':'The entry is saved as an independent financial record, while the name, ID, department and diagnosis stay linked directly to the administrative file.',
  'واجهة مرجعية سرية: الحذف يختفي عن المستخدمين فقط، ويبقى هنا للاستعراض أو الاستعادة إلى مكانه السابق.':'A private reference screen: deleted items disappear only for users and stay here for review or restoration to their previous place.',
  'هذه المرحلة لا تنشئ أي رسوم أو حركات مالية. سيتم بناء الملف المالي للمبيت وربطه لاحقاً كمرحلة مستقلة.':'This stage creates no fees or financial entries. The inpatient financial file will be built and linked later as a separate stage.',
  'القيم الافتراضية مناسبة لطابعة 80mm. عدّل العرض والهامش إذا كان الإيصال مقصوصًا من الطرف أو يظهر صغيرًا.':'The defaults suit an 80mm printer. Adjust the width and margin if the receipt is cut off at the edge or prints too small.',
  'لا يشترط دفع الرسوم في هذه المرحلة. تنتقل الحالة مباشرةً إلى موظف التطبيق والتحصيل البنكي لاستكمال الدفع.':'Payment is not required at this stage. The case goes straight to the app and bank collection officer to complete payment.',
  'تصل هنا الحالات بعد إتمام التسجيل والدفع والتحصيل وطباعة الإيصال. يمكنك التعديل والإضافة والحذف والتصدير.':'Cases arrive here after registration, payment, collection and receipt printing are complete. You can edit, add, delete and export.',
  'المستخدم الأول: تسجيل المريض برقم الهوية والجوال ثم إنشاء الزيارة والعيادة والطبيب فقط، بدون اشتراط الدفع.':'First user: register the patient by ID and mobile number, then create the visit, clinic and doctor only, without requiring payment.',
  'تاريخ الخروج يعبئه الموظف المسؤول من الجدول التشغيلي أو لوحة الإدخال أعلاه، ويظهر باللون الأحمر في كشف الصحة.':'The discharge date is filled by the responsible officer from the operational table or the panel above, and appears in red in the health statement.',
  'كل حالة مبيت جديدة تظهر تلقائياً هنا، وتستطيع توزيعها على الممرضين/المعالجين حسب قسم الرجال أو النساء والأطفال.':'Every new inpatient case appears here automatically, and you can assign it to nurses / therapists in the men’s or women and children’s unit.',
  'لا إعادة لإدخال بيانات المريض. ابحث بالهوية أو الاسم، وسجّل حركة التغطية واحسب المطالبة وصدّر كشف الحساب الرسمي.':'No re-entering of patient data. Search by ID or name, record the coverage entry, calculate the claim and export the official account statement.',
  'التقرير سيخرج بنفس معاينة الجدول: رقم التحويلة باللون المختار، الدخول أزرق، انتهاء التحويلة أخضر، ومدة المكوث أحمر.':'The report is produced exactly as previewed: referral number in the chosen colour, admission in blue, referral expiry in green and length of stay in red.',
  'قسم المبيت سيظهر مباشرة في شاشة المبيت ويمكن اختيار المريض وإدخاله إليه. الرسوم المالية تبقى محمية بصلاحيات الصندوق.':'The inpatient unit appears straight away on the inpatient screen and a patient can be selected and admitted. Fees remain protected by the treasury permissions.',
  'واجهة عرض فقط للمرضى الذين خرجوا من المستشفى. تظهر الحالات أولاً بأول بعد تسجيل الخروج الكامل، مع تقرير PDF أنيق للتوثيق.':'A view-only screen for discharged patients. Cases appear as soon as the full discharge is recorded, with a clean PDF report for documentation.',
  'واجهة مستقلة داخل المبيت لإدارة التقارير الطبية، الاحتياجات، والمتابعات اليومية مع ترويسة رسمية وتصدير PDF / Excel / Word.':'An independent screen within inpatient care for managing medical reports, needs and daily follow-ups, with an official letterhead and PDF / Excel / Word export.',
  'يمكنك إنشاء مستخدمين وتوزيع الصلاحيات غير المالية حسب القسم والفرع. الصلاحيات المالية لا يمكن منحها إلا من حساب أمين الصندوق المحمي.':'You can create users and assign non-financial permissions by department and branch. Financial permissions can only be granted from the protected treasurer account.',
  'عند حضور المريض للمراجعة اختر الموعد لتسجيل الزيارة بنفس الطبيب والعيادة. إذا مر موعد المراجعة بدون تسجيل تظهر كحالة منتهية تلقائياً.':'When the patient arrives for a follow-up, select the appointment to record the visit with the same doctor and clinic. If the date passes without a record, it is shown as expired automatically.',
  'ابحث بالهوية أو الاسم، ثم حدد الأعمدة والفلاتر. رقم التحويلة ونهاية التحويلة والملاحظة قابلة للتعديل من الجدول وتحفظ مباشرة على حالة المبيت.':'Search by ID or name, then choose the columns and filters. The referral number, referral end and note can be edited in the table and are saved directly to the inpatient case.',
  'يتم إنشاء المريض في سجل مستشفى الوفاء وتعيين جهة تغطيته إلى وزارة الصحة، وبعد ذلك يمكن إدخاله لقائمة الانتظار أو فتح حالة مبيت من القسم الإداري.':'The patient is created in the Wafaa Hospital register with the Ministry of Health as the coverage entity; they can then be added to the waiting list or an inpatient case opened from the administrative unit.',
  'اضغط على اسم الممرض/المعالج أو على زر فتح النافذة، ثم اختر الحالات المناسبة واحفظ التوزيع. الذكر تظهر له حالات الرجال، والأنثى تظهر لها النساء والأطفال.':'Click the nurse / therapist name or the open button, then choose the appropriate cases and save the assignment. Male staff see men’s cases; female staff see women and children.',
  'يمكنك إنشاء مستخدم لأي فرع في المستشفى وتحديد صلاحياته بالتفصيل، بما فيها فروع المبيت والمالية عند الحاجة. حساب Eng. Mohammed Moqbil يبقى الحساب المالي المحمي.':'You can create a user for any hospital branch and set their permissions in detail, including the inpatient and finance branches when needed. The Eng. Mohammed Moqbil account remains the protected financial account.',
});
collectExactTranslations();

/* v4.3.91 — صيغ تحمل تشكيلاً مختلف الترتيب. */
Object.assign(staticEnglishPhrases, {
  'اسم الطبيب المحوِّل إن وجد':'Referring doctor name, if any',
  'الطبيب المحوِّل (اختياري)':'Referring doctor (optional)',
  'المشفى المحوِّل':'Referring hospital',
  'حدد المشفى المحوِّل أو أضف جهة جديدة':'Select the referring hospital or add a new entity',
});
collectExactTranslations();

Object.assign(staticEnglishPhrases, {
  'الطبيب المحوِّل':'Referring doctor',
});
collectExactTranslations();

Object.assign(staticEnglishPhrases, {
  'مريض جاهز':'Patient ready','مريض جديد':'New patient','طبيب محول':'Referring doctor',
  'الطبيب المحول':'Referring doctor','كرسي كهربائي متحرك':'Electric wheelchair',
});
collectExactTranslations();

/* v4.3.94 — نصوص شاشة الدخول الجديدة. */
Object.assign(staticEnglishPhrases, {
  'للتأهيل الطبي والجراحة التخصصية':'for Medical Rehabilitation and Specialized Surgery',
  'أدخل بياناتك للوصول إلى مساحة عملك':'Enter your credentials to reach your workspace',
  'الأقسام متصلة':'Units online',
  'المالية':'Finance',
});
collectExactTranslations();

/* v4.3.95 — عبارات يقسمها React إلى عقد نصية منفصلة (بسبب {الإقحام}). */
Object.assign(staticEnglishPhrases, {
  'العنوان الحالي ثابت ولا يمكن تغييره:':'The current address is fixed and cannot be changed:',
  'إنشاء ملف مقيم/ة جديد':'Create a new resident file',
  'تعديل ملف مقيم/ة':'Edit resident file',
});
collectExactTranslations();

/* v4.3.95 — شظايا نصية ملاصقة لإقحام {} داخل JSX. */
Object.assign(staticEnglishPhrases, {
  'الجلسة رقم':'Session No.','جلسة':'session','تصدير كشف':'Export statement','سجل':'Log',
  '- إدخال بيانات':'— data entry','النتائج':'Results','دور:':'Queue:','محدد':'selected',
  'حجم العنوان':'Title size','حجم النص':'Text size',
  'حدد بيانات المريض التي تريد ظهورها، ثم اختر صيغة الملف.':'Select the patient data to show, then choose the file format.',
  'من الدخول حتى':'From admission to','يوم مبيت':'inpatient day','حركة':'entry','/يوم':'/day',
  'حالة تجاوزت 90 يوماً':'cases over 90 days','حالة تجاوزت 61 يوماً':'cases over 61 days',
  'تحديث حالة:':'Status update:','ملف':'file','التشخيص:':'Diagnosis:','بواسطة':'by','غرفة':'Room',
  'اختيار حالات':'Select cases','توزيع الحالات على':'Assign cases to','حالات':'cases',
  'لا توجد مراجعات مجدولة لليوم.':'No follow-ups scheduled for today.',
  'ملاحظات الطبيب الخاصة —':'Doctor’s private notes —','إيصال:':'Receipt:',
  '₪ · الحالة: مسجلة ومحوّلة للطبيب':'ILS · Status: registered and sent to the doctor',
  'الدور المحجوز:':'Reserved queue number:','هوية:':'ID:','جوال:':'Mobile:',
});
collectExactTranslations();

/* v4.3.96 — حسم الترجمات المتعارضة.
   12 مفتاحاً كان مترجماً مرتين بترجمتين مختلفتين، والفائز يتحدد بترتيب
   التحميل لا بالمعنى. هذه الكتلة الأخيرة تحسمها بقرار واضح حسب السياق الطبي:
   "الدخول/الخروج" في جداول المستشفى تعني دخول وخروج المريض لا الدخول للنظام،
   بينما زر تسجيل الدخول يستخدم مفتاحاً مستقلاً فلا يتأثر. */
Object.assign(staticEnglishPhrases, {
  'الدخول':'Admission',
  'الخروج':'Discharge',
  'مقيم حالياً':'Currently admitted',
  'جهة التحويل':'Referring entity',
  'وفاة':'Deceased',
  'لا توجد جلسات ضمن الفترة':'No sessions within the period',
  'بإذن مؤقت / زيارة':'Temporary leave / visit',
  'اسم الدخول':'Username',
  'آخر دخول / تسجيل':'Last login / registration',
  'PDF الدخول والخروج':'Admissions and discharges PDF',
  'Word الدخول والخروج':'Admissions and discharges Word',
  'تم إنهاء جلسة اليوم':"Today's session completed",
});
collectExactTranslations();

/* v4.5.0 — نصوص التشخيصات والإيصال. */
Object.assign(staticEnglishPhrases, {
  'بوصة':'Inch','وحدة القياس':'Unit of measure',
  'تم تصدير الإيصال PDF':'Receipt exported as PDF','تعذر تصدير الإيصال PDF':'Could not export the receipt as PDF',
  'طباعة الإيصال واعتماد الحالة':'Print the receipt and approve the case',
  'تصدير الإيصال كملف PDF':'Export the receipt as a PDF file',
  '— اختر التشخيص —':'— Select diagnosis —','التشخيص الجديد':'New diagnosis',
  'اكتب اسم التشخيص الجديد':'Type the new diagnosis name',
  'إدارة قائمة التشخيصات':'Manage the diagnosis list',
  'أضف تشخيصاً جديداً للقائمة':'Add a new diagnosis to the list',
  'الاسم الجديد للتشخيص':'New name for the diagnosis',
  'التشخيصات المعتمدة لا يمكن تعديلها أو حذفها؛ المضافة فقط.':'Approved diagnoses cannot be edited or deleted; only added ones can.',
  'تمت إضافة التشخيص للقائمة':'Diagnosis added to the list',
  'التشخيص فارغ أو موجود مسبقاً':'The diagnosis is empty or already exists',
  'تم تعديل التشخيص':'Diagnosis updated','تم حذف التشخيص من القائمة':'Diagnosis removed from the list',
  'نظام معلومات مستشفى الوفاء':'Wafaa Hospital Information System',
});
collectExactTranslations();


/* v4.5.2 — تسمية شاشة المهندس حسب طلب المستشفى. */
Object.assign(ar, {
  engineerActivity: 'مراقبة المستخدمين',
  module_engineer_activity: 'مراقبة المستخدمين',
});
Object.assign(en, {
  engineerActivity: 'User Monitoring',
  module_engineer_activity: 'User Monitoring',
});
Object.assign(staticEnglishPhrases, {
  'نشاط المهندس': 'User Monitoring',
  'مراقبة النشاط': 'User Monitoring',
  'مراقبة نشاط المستخدمين': 'User Activity Monitoring',
  'مراقبة المستخدمين': 'User Monitoring',
});
collectExactTranslations();
