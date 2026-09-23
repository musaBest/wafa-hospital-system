# إعداد API السجل المدني الرسمي

الإصدار الحالي مربوط مع شكل الطلب والاستجابة اللذين تم اختبارهما. جميع قيم البروتوكول وحقول JSON مثبتة، ولا يحتاج المستخدم إلا إلى إدخال ثلاث قيم رسمية.

## مكان القيم الثلاث

لا تضع الأسرار داخل React أو GitHub. أنشئ الملف `wafa-api/.env` عن طريق نسخ `wafa-api/.env.example`، ثم عدّل المفاتيح التالية داخل `.env` فقط:

```env
CIVIL_REGISTRY_TOKEN_URL="ضع رابط token.php الكامل هنا"
CIVIL_REGISTRY_CITIZEN_ID_URL="ضع رابط citizen/id بدون رقم الهوية هنا"
CIVIL_REGISTRY_CLIENT_SECRET="ضع client_secret الجديد هنا"
```

مثال رابط المواطن: إذا كان الطلب النهائي ينتهي بـ `/citizen/id/123456789`، ضع في المتغير الرابط حتى `/citizen/id` فقط. سيضيف Laravel رقم الهوية تلقائيًا.

لا تعدّل `.env.example` بالقيم الحقيقية؛ فهو قالب آمن قابل للرفع إلى GitHub. ملف `.env` مستثنى من Git أصلًا.

## القيم المثبتة مسبقًا

تم تثبيت الإعدادات التالية بناءً على نموذج PHP والاستجابة الناجحة:

```env
CIVIL_REGISTRY_CLIENT_ID="MAIN_WAFFA_HOSPITAL"
CIVIL_REGISTRY_TOKEN_KEY=access_token
CIVIL_REGISTRY_AUTH_HEADER=x-sso-authorization
CIVIL_REGISTRY_USER_IP="931684898"
CIVIL_REGISTRY_MOCK=false
CIVIL_REGISTRY_STATUS_PATH=status
CIVIL_REGISTRY_SUCCESS_VALUE=success
CIVIL_REGISTRY_DATA_PATH=data.basic
CIVIL_REGISTRY_FULL_NAME_KEY=FULLNAME
CIVIL_REGISTRY_DOB_KEY=BIRTH_DT
CIVIL_REGISTRY_GENDER_KEY=SEX_CD
CIVIL_REGISTRY_CITY_KEY=CI_REGION
CIVIL_REGISTRY_AREA_KEY=STREET_ARB
```

رقم الهوية لا يعود داخل JSON الرسمي؛ لذلك يأخذه Laravel تلقائيًا من رقم الهوية المستخدم في الطلب. كما يحول تاريخ الميلاد تلقائيًا من `DD/MM/YYYY` إلى `YYYY-MM-DD`.

## Cookie وUser-Agent

`CIVIL_REGISTRY_USER_AGENT` فارغ عمدًا، لأن Laravel يأخذ User-Agent من الطلب ويستخدم قيمة تعريف ثابتة عند عدم وجوده.

`CIVIL_REGISTRY_COOKIE` فارغ عمدًا. لا يجوز حفظ PHPSESSID داخل المشروع لأنه مؤقت وحساس. إذا أكدت الجهة أن Cookie إلزامي، ضعه داخل `wafa-api/.env` فقط ولا ترفعه إلى GitHub.

## شهادة HTTPS على Windows

اترك:

```env
CIVIL_REGISTRY_VERIFY_SSL=true
```

إذا كان ملف الشهادات موجودًا في مسار مخصص، يمكن وضعه داخل `.env`:

```env
CIVIL_REGISTRY_CA_BUNDLE="C:\php\extras\ssl\cacert.pem"
```

تحقق منه بواسطة:

```powershell
php -r "var_dump(ini_get('curl.cainfo'), is_readable(ini_get('curl.cainfo')));"
```

يجب أن تكون النتيجة الأخيرة `bool(true)`. لا تستخدم تعطيل SSL في بيئة المستشفى.

## تفعيل الإعدادات

بعد حفظ القيم الثلاث داخل `wafa-api/.env` نفذ:

```powershell
cd wafa-api
php artisan optimize:clear
```

ثم أوقف الباك وشغله من جديد:

```powershell
php -S 127.0.0.1:18088 -t public public/index.php
```

بعد تسجيل الدخول اختبر من شاشة تسجيل مريض باستخدام رقم هوية مصرحًا به.

## ملفات الربط

| الملف | الوظيفة |
|---|---|
| `wafa-api/.env` | مكان الروابط والسر الحقيقي محليًا أو على السيرفر |
| `wafa-api/.env.example` | قالب يحتوي الخانات الثلاث المطلوب تعبئتها |
| `wafa-api/config/services.php` | إعدادات البروتوكول وmapping الاستجابة |
| `wafa-api/app/Services/CivilRegistryService.php` | طلب التوكن، جلب المواطن، تحويل التاريخ، وتوحيد البيانات |
| `wafa-api/app/Http/Controllers/Api/CivilRegistryController.php` | المسار المحمي الذي تستدعيه React |
| `wafa-api/app/Http/Controllers/Api/PatientController.php` | يعيد التحقق من السجل الرسمي عند حفظ المريض |
| `wafa-web/src/services/civilRegistry.service.ts` | اتصال React مع Laravel فقط دون أسرار |

## ملاحظات أمنية

- اطلب تغيير أي client secret أو PHPSESSID تم نشره أو مشاركته في محادثة.
- لا ترفع ملف `.env` إلى GitHub.
- التوكن محفوظ مؤقتًا في Cache لمدة 50 دقيقة.
- سجل التدقيق يخزن hash لعبارة البحث ولا يخزن استجابة المواطن.
- الخدمة الرسمية المتاحة حاليًا تبحث برقم الهوية. البحث بالاسم يحتاج endpoint منفصلًا من الجهة.
