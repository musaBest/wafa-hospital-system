# Wafaa HIS REST API v1

Base URL: `http://127.0.0.1:18088/api/v1`

## المصادقة

```http
POST /auth/login
Content-Type: application/json

{"username":"cashier","password":"Cashier@2026","device_name":"wafaa-web"}
```

استخدم التوكن الناتج:

```http
Authorization: Bearer TOKEN
Accept: application/json
```

## المسارات الأساسية

| Method | Path | الاستخدام |
|---|---|---|
| POST | `/auth/login` | تسجيل الدخول |
| GET | `/auth/me` | المستخدم الحالي |
| GET | `/civil-registry/lookup?query=...` | السجل المدني |
| GET/POST | `/patients` | عرض/تسجيل المرضى |
| GET | `/patients/{id}` | ملف المريض |
| GET | `/patients/{id}/ledger` | المحفظة والسجل المالي |
| POST | `/patients/{id}/findings` | إضافة تشخيص عام |
| POST | `/invoices` | فاتورة وإضافة رصيد |
| GET | `/invoices` | سجل الفواتير والحوالات |
| POST | `/visits` | تسجيل زيارة وخصم الرسم |
| GET | `/queue` | الطابور اليومي |
| PATCH | `/queue/{id}` | تحديث حالة الدور |
| POST | `/visits/{id}/finish` | إنهاء الحالة وإنشاء مراجعة +7 أيام |
| GET | `/doctor/queue/today` | مرضى الطبيب اليوم |
| GET | `/doctor/visits/past` | المرضى السابقون |
| GET | `/follow-ups/due` | المراجعات المستحقة للكاشير |
| GET | `/doctor/follow-ups` | مواعيد مراجعة الطبيب |
| GET/POST | `/doctor/patients/{id}/notes` | ملاحظات الطبيب الخاصة |
| GET/POST | `/admissions` | قائمة/إدخال المبيت |
| POST | `/admissions/{id}/discharge` | إخراج المريض |
| GET/POST | `/clinics` | العيادات |
| PATCH | `/clinics/{id}/fee` | تعديل رسم الزيارة بواسطة الإدارة فقط |
| GET/POST | `/doctors` | الأطباء وحساباتهم |
| GET/POST | `/diagnostics/services` | دليل فحوصات المختبر والأشعة وأسعارها |
| PATCH/DELETE | `/diagnostics/services/{id}` | تعديل أو أرشفة فحص بواسطة أمين الصندوق |
| GET/POST | `/diagnostics/labs` | عرض/طلب فحص مع الخصم من محفظة المريض |
| POST | `/diagnostics/labs/{id}/complete` | اعتماد بنود النتيجة وإصدار رقم التقرير |
| GET/POST | `/diagnostics/radiology` | الأشعة |
| GET | `/reports/patients` | تقرير المرضى الديناميكي |
| GET | `/reports/finance` | التقرير المالي لأمين الصندوق |
| GET | `/access/permissions` | الصلاحيات التي يستطيع المستخدم الحالي منحها |
| GET/POST | `/users` | عرض وإضافة مستخدمي النظام |
| PATCH/DELETE | `/users/{id}` | تعديل الصلاحيات أو حذف المستخدم نهائياً |

## تسجيل مريض

```json
{
  "identity_or_name": "402918374",
  "phone": "0599123456"
}
```

Laravel يستدعي السجل المدني، ينشئ الرقم الطبي بالشكل `120261102`، ثم يحفظ الملف.

## إنشاء فاتورة

```json
{
  "patient_id": "UUID",
  "service": "دفعة زيارة",
  "unit_price": 50,
  "coverage_ratio": 20,
  "payment_method": "app",
  "transfer": {
    "sender_phone": "0599000000",
    "sender_name": "محمد أحمد",
    "source": "bank_of_palestine"
  }
}
```

مصادر التحويل المدعومة: `jawwal_pay_wallet`, `bank_of_palestine`, `arab_islamic_bank`, `bank_of_jerusalem`, `islamic_arab_bank`, `cairo_amman_bank`، إضافة إلى القيم العامة الموجودة في الفرونت.

## Outpatient Physical Therapy (v4.3.42)
All endpoints are under `/api/v1/outpatient-physical-therapy` and require Sanctum authentication.

- `GET /patients/find?identity=...` — resolve an existing patient by national ID.
- `GET /cases` — list outpatient PT case files with patient demographics and sessions.
- `POST /cases` — create a PT file and generate its 9-digit department/year sequence.
- `PATCH /cases/{case}` / `DELETE /cases/{case}` — update or remove a PT file.
- `POST /cases/{case}/sessions` — append a numbered session with appointment, therapist, modalities and notes.
- `PATCH /sessions/{session}` / `DELETE /sessions/{session}` — maintain a saved session.
- `POST /coverage-entities` — add a new coverage entity directly from the PT case screen.

Permissions: `outpatient_pt.view`, `outpatient_pt.update`, `outpatient_pt.print`, `outpatient_pt.export`.
