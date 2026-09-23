# WAFA Hospital System v4.3.71

Hotfix: registration search + doctor queue linkage persistence.

## Fixes
- Registration search now looks in the central patient file and the receptionist workflow cases.
- Recent registered visits can be selected from search even after refresh.
- Patient registration date now uses the local browser date, not UTC, preventing visits after midnight from being saved as yesterday.
- Doctor dashboard repairs and displays paid cases even if older workflow rows were linked by doctor name/staff id or saved with a UTC date around midnight.
- Workflow cases are reconciled with real patient, clinic, doctor, visit, and queue records through a data repair migration.

## Required after unzip
cd wafa-api
php artisan migrate --force
php artisan optimize:clear


## v4.3.72 Hotfix
- PDF export no longer hides or replaces the current screen.
- Standard buttons no longer submit/reload pages accidentally.
- Receipt printing uses explicit A5 page size.
- English UI translation refreshed for activity, doctor, and registration pages.
- Registration search and paid-case doctor queue linking are repaired and persistent after refresh.

After extracting, run inside `wafa-api`:

```powershell
php artisan migrate --force
php artisan optimize:clear
```

## Update v4.3.75 - Dental Clinic Special Module
- Added a dedicated Dental Clinic page in the sidebar with visit registration, waitlist, statistics, and Excel export.
- Added dental services list with an Other/custom service field.
- Added paid, remaining, total, and notes fields, linked to finance workflow and doctor dashboard visibility.
- Seeded dental doctors: Dr.Naji_AlTaweel, Dr.Mohammed_AlKurdi, Dr.Mohammed_Shamieh (password: Dental@2026).
- Eng.Mohammed_Moqbil has full visibility and dental doctor management; mohammed.shukri can view/export financial dental statistics.

## v4.3.76 Build Fix
- تم إصلاح أخطاء TypeScript التي ظهرت أثناء تشغيل 01-SETUP-WINDOWS.bat.
- شغّل ملف الإعداد من جديد ثم ملف التشغيل الكامل.

## v4.3.77 Print / Export / Layout / Social Attachment
- إضافة العمر ومدة المبيت إلى سند الإقرار المالي وظهورهما داخل نص الإقرار بدل القيم الافتراضية.
- تحسين جذري لآلية التصدير بحيث تبقى عناصر التصدير خارج الشاشة ولا تترك شاشة بيضاء مزعجة.
- إصلاح قص النصوص في بطاقة توليد رقم المريض وشاشات واجهة المبيت والعلاج الطبيعي.
- تحسين طباعة الإيصال وإضافة إعدادات قياس الإيصال من شاشة المحصل المالي: عرض الورق، طول الورق، الهامش، وحجم الخط.
- إضافة مرفق صورة في واجهة الخدمة الاجتماعية/النفسية وطباعته داخل التقرير.
- مراجعة CSS الخاصة بالتقارير والواجهات لتكون أوضح وأكثر استجابة للأجهزة المختلفة.

## v4.3.78
- إضافة خيارات تنسيق مرنة عند إنشاء تقارير التأهيل: اللون، الخط، حجم النص، سماكة الخط، وستايل القالب.
- إضافة شاشة مباشرة تعرض الاحتياجات المختارة في تقرير الاحتياجات.
- إضافة فروع ومقاسات للاحتياجات الخاصة مثل الكراسي، العكازات، القساطر، أكياس البول، الحفاضات، الشاش، وأنبوب التغذية.

## v4.3.81
- إصلاح جذري لمشكلة الشاشة البيضاء عند إنشاء التقارير.
- تنظيف تلقائي لأي عناصر مؤقتة تخص html2canvas بعد التصدير.
- جعل إنشاء التقرير لا يغير الشاشة الحالية ولا يغلق نافذة التصدير تلقائياً.


## v4.3.81
- Added elderly care residents module with registration, resident list, final/temporary exit management, statistics, Excel export, and section user.
- Preserves v4.3.80 silent report generation/no white overlay fixes.

## v4.3.82
- Patient inquiries now works as a hospital-wide read-only directory for outpatient clinic patients, inpatients, and elderly-care residents.
- All users land on the main dashboard after login, while feature access remains controlled by permissions.
- Added final responsive layout hardening for tables, forms, side navigation, buttons, and icons across device sizes.
- Completed additional Arabic/English translations for navigation and inquiry labels.
- Preserves v4.3.80 no-white-report-overlay fixes and v4.3.81 elderly-care module.

## v4.3.83
- Replaced the collapsed sidebar rail with a clean floating menu button; the sidebar now opens/closes smoothly without the ugly narrow vertical state.
- Added immediate language switching refresh hardening: pages remount their content on language change and the DOM translator applies without requiring browser refresh.
- Strengthened theme/color modes so dark, light, aurora, and pearl have visibly distinct palettes and shared components follow the selected mode consistently.
- Preserved v4.3.80 no-white-report-overlay behavior, v4.3.81 elderly care, and v4.3.82 unified inquiries/responsive improvements.

## v4.3.85
- Removed distracting icon ghost/halo effects and made app chrome cleaner.
- Improved collapsed menu button, top-bar wrapping, and page layout polish.
- Redesigned the startup/refresh splash experience with a more professional logo presentation.
- Added site-wide Enter-key action support for forms, modals, command search, and focused buttons.
- Added subtle non-shifting animations and strengthened theme consistency across screens.

## v4.3.86 — واجهة متحركة ومتناسقة
- شاشة بداية جديدة بتسلسل إقلاع حركي (شعار + مسح ضوئي + مؤشر حيوي + خطوات تهيئة).
- طبقة حركة موحّدة `src/styles.motion.css` تغطي كل الشاشات: دخول اللوحات، تفاعل الأزرار والحقول والجداول، النوافذ والتنبيهات.
- قائمة جانبية مقسّمة إلى مجموعات عمل مع حقل تصفية فوري ومؤشر للعنصر النشط.
- `src/utils/motion.ts`: أثر نقر على الأزرار وشريط تقدّم للتمرير.
- احترام كامل لتفضيل تقليل الحركة، وتعطيل الحركة عند الطباعة والتصدير.

## v4.3.87 — لوحة قوائم جديدة وحركة أوسع
- إعادة تصميم القائمة الجانبية: مجموعات داخل لوحات مستقلة، بلاطات أيقونات، وعنصر نشط بتدرج لوني.
- إلغاء كل الظلال خلف النصوص في النظام.
- حركة داخل الواجهات: عدّ تصاعدي للأرقام، نمو الأعمدة والمقاييس، دخول متتابع لصفوف الجداول.
- شاشة الدخول: حركة تتبع المؤشر، توهج الحقول، شريط تحميل للزر، واهتزاز رسالة الخطأ.

## v4.3.88 — إصلاح خيال القائمة وخلفيات متحركة
- إصلاح ازدواج النص في القائمة الجانبية (حقل التصفية اللاصق بخلفية شفافة).
- خلفية ضوئية متحركة وشبكة تقنية خفيفة خلف كل واجهات النظام.
- شاشة الدخول: خلفية حية، شريط ضوئي متحرك على البطاقة، حلقة نبض للشعار، ولمعة على بطاقات المزايا.

## v4.3.89 — إعادة تصميم شاشة تسجيل الدخول
- تقسيم كامل الارتفاع: لوحة هوية على اليمين وبطاقة دخول مركزة على اليسار.
- عنوان صلب بدل التدرج اللوني، وشريط قدرات بصف واحد بدل البطاقات المربعة.
- شريط حالة سفلي مع الساعة والتاريخ ومؤشر اتصال الأقسام.
- حركة: ظهور متسلسل، شعاعان ضوئيان، parallax، شريط ضوئي على البطاقة، وتفاعل كامل للحقول والزر.

## v4.3.90 — توسعة الترجمة وانضباط الخط والأيقونات
- تشخيص تداخل اللغات: التغطية كانت 11.5% من 2160 نصاً؛ أُضيفت ~330 ترجمة فصارت 34.1%.
- مقاسات أيقونات موحّدة ومنع انكماشها داخل الصفوف المزدحمة.
- سلّم خطوط موحّد عبر كل الواجهات ورفع تباين اللون الباهت.

## v4.3.91 — تغطية ترجمة كاملة
- تغطية 100% (2468 نصاً): انتهى تداخل اللغات نهائياً.
- قوالب المستندات المطبوعة تبقى بالعربية عمداً (وثائق رسمية).
- حارس تغطية: `npm run check:i18n` يكشف أي نص جديد بلا ترجمة.

## v4.3.92 — إصلاح الخيال وتحسين القائمة والدخول
- خلفية معتمة لكل سطح لاصق أو طافٍ: انتهى ظهور النص المزدوج خلف الشريط العلوي وقوائم البحث.
- قائمة جانبية أهدأ: بلا صناديق متداخلة، حالة نشطة واحدة واضحة.
- شاشة دخول باتجاه جديد: عمود مبني في الصفحة بدل بطاقة عائمة، بطباعة أكبر.

## v4.3.94 — إصلاح شبكة المبيت وشاشة دخول جديدة
- إصلاح تمدد بطاقات شاشة المبيت خارج الحدود وقص الأيقونات (min-width + شبكة متجاوبة).
- شاشة تسجيل دخول جديدة: تكوين مركزي بشعار وعنوان رئيسي وفاصل نابض مرتبط بشاشة الإقلاع.

## v4.3.95 — إصلاح تشوّه النص المختلط
- إلغاء الاستبدال كلمة بكلمة الذي كان ينتج نصاً مشوّهاً مختلط اللغتين.
- ترجمة شظايا النص الملاصقة للإقحام {} داخل JSX، وتوسيع الحارس ليكشفها.
- إزالة شارة الإصدار من رأس شاشة ملف المقيم/ة.

## v4.3.96 — فحص شامل وإصلاحات بنيوية
- فحص الأنواع: 0 أخطاء | الترجمة: 2505 نصاً بتغطية 100% | المسارات: 28/28.
- حماية 287 شبكة من التمدد خارج الحدود (نفس خلل شاشة المبيت، عولج بنيوياً).
- شمول حركة الدخول لـ18 حاوية كانت ساكنة، وتوحيد رؤوس الأقسام الفرعية.
- حسم 12 ترجمة متعارضة حسب السياق الطبي (الدخول → Admission لا Login).

## v4.4.0 — نظام تصميم موحّد
- خط عربي احترافي (IBM Plex Sans Arabic) بدل Tahoma، وأرقام Inter بعرض ثابت.
- مقياس طباعي ومسافات وزوايا وظل محسوبة، مطبّقة عبر كل الشاشات من طبقة واحدة.
- أسطح صلبة بخطوط شعرية بدل الزجاج، وجداول أوسع تنفّساً.
- حالات تفاعل وتركيز موحّدة، ومؤشر منزلق للتبويبات.

## v4.4.1 — قابلية القراءة عبر كل الواجهات
- رفع 128 قاعدة نص كانت أصغر من 10px (بعضها 8px) إلى حدّ أدنى مقروء.
- فحص: 0 أنماط مضمّنة متجاوزة، 29/29 صفحة متسقة البنية، 0 جدول بلا حالة فارغة.

## v4.4.2 — زر القائمة والأوضاع
- زر القائمة عند الإخفاء صار أيقونة داخل صف الشريط العلوي بدل زر عائم يغطي البحث.
- إصلاح البطاقة النشطة في اختيار الأوضاع (كانت نصاً داكناً على خلفية داكنة).
- تمييز الأوضاع الأربعة بخلفيات وهويات لونية مستقلة، مع انتقال ناعم عند التبديل.

## v4.4.3 — جداول المراقبة والألوان
- إصلاح جداول شاشة المراقبة التي كانت تستخدم ألواناً ثابتة لا تتبع الوضع.
- رفع تباين رؤوس الجداول في كل النظام.
- مجموعة ألوان هوية كاملة لكل وضع تظهر في الأزرار والشارات والقائمة.

## v4.5.0 — الإيصال والتشخيصات والشعار
- ترويسة تقارير موحّدة بالشعار، ورُبطت بكل وحدة كانت ناقصة (4/11 → كل التقارير).
- إيصال القبض بالقالب الرسمي، مع زر طباعة وزر تصدير PDF.
- وحدة قياس الإيصال قابلة للاختيار (مم/سم/بوصة).
- قوائم تشخيصات معتمدة للعلاج الطبيعي والمبيت، مع Others وإدارة بالصلاحيات.

## v4.5.1 — رقم الدور وكشف الإيرادات
- رقم الدور صار يُحجز حسب العيادة لا الطبيب، فلا يتكرر رقمان لنفس رمز العيادة.
- كشف الإيرادات اليومية صار يحمل الترويسة الرسمية بالشعار، بنفس القالب المعتمد.

## v4.5.4 — التحصيل والمبيت ومحرك التصدير
- معاينة قالب إيصال القبض مع شعار الوفاء وخياري الطباعة/PDF، مع اعتماد رقم الإيصال وترتيب الدور حسب رمز العيادة.
- إزالة زر القائمة المكرر ومنع شريط البحث من تغطية المحتوى أثناء التمرير.
- إصلاح شاشة تسجيل المبيت الفارغة واستعادة نموذج البيانات والتشخيصات.
- إصلاح PDF كشف حالات الصحة وتحسين إدراج الشعار وملاءمة A4.
- إصلاح مركزي لمحرك التصدير الصامت لمنع Canvas/PDF الفارغ والشاشة البيضاء في التقارير.
