BEGIN TRANSACTION;;
CREATE TABLE admission_requests (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            source_visit_id VARCHAR,
            preferred_ward VARCHAR,
            diagnosis TEXT NOT NULL,
            priority VARCHAR(30) NOT NULL DEFAULT 'routine',
            report_refs TEXT,
            status VARCHAR NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','cancelled')),
            requested_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            requested_at DATETIME NOT NULL,
            resolved_at DATETIME,
            admission_id VARCHAR,
            created_at DATETIME,
            updated_at DATETIME
        , deleted_at DATETIME);;
CREATE TABLE admissions (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, ward VARCHAR NOT NULL, diagnosis TEXT NOT NULL, admission_date DATE NOT NULL, coverage_entity_id VARCHAR REFERENCES sponsors(id) ON DELETE SET NULL, contribution_pct NUMERIC NOT NULL DEFAULT 0, status VARCHAR NOT NULL DEFAULT 'admitted' CHECK(status IN ('admitted','discharged')), discharged_at DATETIME, admitted_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, discharged_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, room VARCHAR, bed VARCHAR, admission_time DATETIME, expected_discharge_date DATE, responsible_user_id VARCHAR, attending_doctor_id VARCHAR, daily_rate NUMERIC NOT NULL DEFAULT 0, source_visit_id VARCHAR, request_id VARCHAR, ward_type VARCHAR(20), marital_status VARCHAR(80), address VARCHAR(500), referral_hospital VARCHAR(180), referring_doctor VARCHAR(180), deleted_at DATETIME);;
CREATE TABLE audit_logs (id VARCHAR PRIMARY KEY, user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL, action VARCHAR NOT NULL, entity_type VARCHAR NOT NULL, entity_id VARCHAR, ip_address VARCHAR, metadata TEXT, created_at DATETIME NOT NULL);;
CREATE TABLE cache (key VARCHAR PRIMARY KEY, value TEXT NOT NULL, expiration INTEGER NOT NULL);;
CREATE TABLE cache_locks (key VARCHAR PRIMARY KEY, owner VARCHAR NOT NULL, expiration INTEGER NOT NULL);;
CREATE TABLE clinic_doctor (id INTEGER PRIMARY KEY AUTOINCREMENT, clinic_id VARCHAR NOT NULL REFERENCES clinics(id) ON DELETE CASCADE, doctor_id VARCHAR NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, created_at DATETIME, updated_at DATETIME, UNIQUE(clinic_id,doctor_id));;
CREATE TABLE clinics (id VARCHAR PRIMARY KEY, key VARCHAR NOT NULL UNIQUE, name_ar VARCHAR NOT NULL, name_en VARCHAR NOT NULL, visit_fee NUMERIC NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME, kind VARCHAR(30) NOT NULL DEFAULT 'outpatient', daily_rate NUMERIC NOT NULL DEFAULT 0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000001','general','العيادة العامة','General clinic',15,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000002','ortho','عيادة العظام','Orthopedics',25,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000003','neuro','المخ والأعصاب','Neurology',30,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000004','dental','عيادة الأسنان','Dental clinic',20,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000005','pt','العلاج الطبيعي','Physical therapy',18,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000006','eye','عيادة العيون','Ophthalmology',22,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000007','derma','الجلدية','Dermatology',20,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000008','ent','أنف وأذن وحنجرة','ENT',20,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000009','peds','عيادة الأطفال','Pediatrics',15,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000010','internal','الباطنة','Internal medicine',20,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000011','cardio','القلبية','Cardiology',30,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000012','obgyn','النسائية والتوليد','Obstetrics & gynecology',25,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000013','surgery','الجراحة العامة','General surgery',30,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000014','rehab','التأهيل الطبي','Medical rehabilitation',18,1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL,'outpatient',0);;
INSERT INTO "clinics" VALUES('20000000-0000-4000-8000-000000000099','inpatient','قسم المبيت الداخلي','Inpatient Department',0,1,'2026-09-11 11:54:00','2026-09-11 11:54:00',NULL,'inpatient',120);;
CREATE TABLE deleted_items (
        id VARCHAR PRIMARY KEY NOT NULL,
        user_id VARCHAR NULL REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(120) NOT NULL,
        entity_id VARCHAR(120) NULL,
        entity_label VARCHAR(255) NULL,
        payload TEXT NULL,
        metadata TEXT NULL,
        deleted_at DATETIME NOT NULL,
        restored_at DATETIME NULL
    );;
CREATE TABLE diagnostic_services (id VARCHAR PRIMARY KEY, type VARCHAR NOT NULL CHECK(type IN ('lab','radiology')), name_ar VARCHAR NOT NULL, name_en VARCHAR NOT NULL, category VARCHAR NOT NULL, price NUMERIC NOT NULL, tests TEXT, active INTEGER NOT NULL DEFAULT 1, created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000001','lab','تحليل الكيمياء السريرية','Clinical Chemistry','clinicalChemistry',35,'[{"test": "F.B.S", "reference_range": "70 - 110 mg/dL"}, {"test": "Urea", "reference_range": "10 - 45 mg/dL"}, {"test": "Creatinine", "reference_range": "0.6 - 1.2 mg/dL"}]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000002','lab','فحص تعداد الدم الكامل','Complete Blood Count','hematology',30,'[{"test": "WBC", "reference_range": "4 - 11 x10³/µL"}, {"test": "Hemoglobin", "reference_range": "12 - 17 g/dL"}, {"test": "Platelets", "reference_range": "150 - 450 x10³/µL"}]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000003','lab','فحص وظائف الغدة الدرقية','Thyroid Function Test','endocrinology',45,'[{"test": "Free T4", "reference_range": "0.8 - 1.8 ng/dL"}, {"test": "T.S.H", "reference_range": "0.5 - 5.0 µIU/mL"}]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000004','lab','زراعة وحساسية','Culture & Sensitivity','microbiology',55,'[{"test": "Organism", "reference_range": "No growth"}, {"test": "Culture", "reference_range": "Negative"}]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000005','lab','تحليل البول','Urinalysis','urinalysis',20,'[{"test": "Color", "reference_range": "Yellow"}, {"test": "Protein", "reference_range": "Negative"}, {"test": "Glucose", "reference_range": "Negative"}]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000006','radiology','صورة أشعة سينية','X-Ray','xray',50,'[]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000007','radiology','تصوير بالموجات فوق الصوتية','Ultrasound','ultrasound',80,'[]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "diagnostic_services" VALUES('30000000-0000-4000-8000-000000000008','radiology','تصوير طبقي محوري','CT Scan','ct',220,'[]',1,'00000000-0000-4000-8000-000000000004','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
CREATE TABLE doctor_notes (id VARCHAR PRIMARY KEY, doctor_id VARCHAR NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, visit_id VARCHAR REFERENCES visits(id) ON DELETE SET NULL, content TEXT NOT NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
CREATE TABLE doctors (id VARCHAR PRIMARY KEY, user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, staff_id VARCHAR NOT NULL UNIQUE, name VARCHAR NOT NULL, phone VARCHAR, specialty VARCHAR, active INTEGER NOT NULL DEFAULT 1, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
CREATE TABLE failed_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid VARCHAR NOT NULL UNIQUE, connection TEXT NOT NULL, queue TEXT NOT NULL, payload TEXT NOT NULL, exception TEXT NOT NULL, failed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);;
CREATE TABLE findings (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, region VARCHAR NOT NULL, note TEXT NOT NULL, finding_date DATE NOT NULL, created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
CREATE TABLE follow_up_appointments (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, doctor_id VARCHAR NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, clinic_id VARCHAR NOT NULL REFERENCES clinics(id) ON DELETE CASCADE, source_visit_id VARCHAR REFERENCES visits(id) ON DELETE CASCADE, appointment_date DATE NOT NULL, status VARCHAR NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','booked','completed','cancelled')), booked_visit_id VARCHAR REFERENCES visits(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
CREATE TABLE inpatient_notes (
            id VARCHAR PRIMARY KEY,
            admission_id VARCHAR NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
            patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL DEFAULT 'administrative',
            note TEXT NOT NULL,
            authored_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            noted_at DATETIME NOT NULL,
            created_at DATETIME,
            updated_at DATETIME
        , deleted_at DATETIME);;
CREATE TABLE inpatient_reports (
            id VARCHAR PRIMARY KEY,
            admission_id VARCHAR NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
            patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            type VARCHAR(80) NOT NULL DEFAULT 'progress',
            title VARCHAR NOT NULL,
            summary TEXT NOT NULL,
            authored_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            report_date DATE NOT NULL,
            created_at DATETIME,
            updated_at DATETIME
        , deleted_at DATETIME);;
CREATE TABLE inpatient_transactions (
            id VARCHAR PRIMARY KEY,
            admission_id VARCHAR NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
            patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            type VARCHAR NOT NULL CHECK(type IN ('charge','payment')),
            category VARCHAR(30) NOT NULL DEFAULT 'service',
            amount NUMERIC NOT NULL,
            occurred_at DATETIME NOT NULL,
            description VARCHAR NOT NULL,
            method VARCHAR,
            receipt_number VARCHAR UNIQUE,
            created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            created_at DATETIME,
            updated_at DATETIME
        , deleted_at DATETIME);;
CREATE TABLE invoices (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, service VARCHAR NOT NULL, unit_price NUMERIC NOT NULL, coverage_ratio NUMERIC NOT NULL DEFAULT 0, payable_amount NUMERIC NOT NULL, payment_method VARCHAR NOT NULL CHECK(payment_method IN ('cash','app')), sender_phone VARCHAR, sender_name VARCHAR, transfer_source VARCHAR, issued_at DATETIME NOT NULL, receipt_number VARCHAR NOT NULL UNIQUE, created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
INSERT INTO "invoices" VALUES('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','إيداع رصيد افتتاحي',100,0,100,'cash',NULL,NULL,NULL,'2026-09-07 17:28:22','RCP-2026-00001','00000000-0000-4000-8000-000000000002','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
CREATE TABLE job_batches (id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL, total_jobs INTEGER NOT NULL, pending_jobs INTEGER NOT NULL, failed_jobs INTEGER NOT NULL, failed_job_ids TEXT NOT NULL, options TEXT, cancelled_at INTEGER, created_at INTEGER NOT NULL, finished_at INTEGER);;
CREATE TABLE jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, queue VARCHAR NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL, reserved_at INTEGER, available_at INTEGER NOT NULL, created_at INTEGER NOT NULL);;
CREATE TABLE lab_orders (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, service_id VARCHAR REFERENCES diagnostic_services(id) ON DELETE SET NULL, doctor_id VARCHAR REFERENCES doctors(id) ON DELETE SET NULL, category VARCHAR NOT NULL, price NUMERIC NOT NULL DEFAULT 0, ordered_at DATETIME NOT NULL, status VARCHAR NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','done','cancelled')), result TEXT, result_rows TEXT, notes TEXT, completed_at DATETIME, completed_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, report_number VARCHAR UNIQUE, created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
CREATE TABLE migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, migration VARCHAR NOT NULL, batch INTEGER NOT NULL);;
INSERT INTO "migrations" VALUES(1,'2026_08_30_000000_create_wafaa_hospital_schema',1);;
INSERT INTO "migrations" VALUES(2,'2026_09_01_000000_create_dynamic_permissions_schema',2);;
INSERT INTO "migrations" VALUES(3,'2026_09_02_000000_add_laboratory_workflow',3);;
INSERT INTO "migrations" VALUES(4,'2026_09_07_000000_make_user_roles_customizable',4);;
INSERT INTO "migrations" VALUES(5,'2026_09_07_210000_integrate_inpatient_queue_notifications',5);;
INSERT INTO "migrations" VALUES(6,'2026_09_09_220000_extend_inpatient_administrative_profile',5);;
INSERT INTO "migrations" VALUES(7,'2026_09_09_230000_repair_user_permission_persistence',5);;
INSERT INTO "migrations" VALUES(8,'2026_09_10_000000_make_permission_customizations_effective_for_all_users',5);;
INSERT INTO "migrations" VALUES(9,'2026_09_10_120000_split_patient_sequences_by_gender',5);;
INSERT INTO "migrations" VALUES(10,'2026_09_11_090000_create_outpatient_physical_therapy_schema',5);;
INSERT INTO "migrations" VALUES(11,'2026_09_11_130000_sync_hospital_permission_catalog',5);;
INSERT INTO "migrations" VALUES(12,'2026_09_11_150000_streamline_outpatient_pt_and_add_pt_head',6);;
INSERT INTO "migrations" VALUES(13,'2026_09_11_180000_engineer_activity_trash_and_pt_waitlist',7);;
INSERT INTO "migrations" VALUES(14,'2026_09_11_190000_extend_engineer_trash_restore_for_pt_sessions',8);;
INSERT INTO "migrations" VALUES(15,'2026_09_11_200000_extend_global_soft_delete_and_notifications',9);;
CREATE TABLE outpatient_pt_cases (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
            pt_number VARCHAR(9) NOT NULL UNIQUE,
            patient_group VARCHAR NOT NULL CHECK(patient_group IN ('men','women_children')),
            case_date DATE NOT NULL,
            diagnosis TEXT NOT NULL,
            coverage_entity_id VARCHAR REFERENCES sponsors(id) ON DELETE SET NULL,
            marital_status VARCHAR(80),
            treatment_department VARCHAR(120),
            referral_source VARCHAR(160),
            treating_doctor VARCHAR(160),
            insurance_class VARCHAR(120),
            employee_name VARCHAR(160),
            relationship VARCHAR(120),
            decision_link VARCHAR(255),
            change_specialist VARCHAR(160),
            session_fee NUMERIC NOT NULL DEFAULT 10,
            status VARCHAR NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
            created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            created_at DATETIME,
            updated_at DATETIME
        , coverage_covers_cost INTEGER NOT NULL DEFAULT 0, deleted_at DATETIME NULL);;
CREATE TABLE outpatient_pt_sequences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            patient_group VARCHAR NOT NULL CHECK(patient_group IN ('men','women_children')),
            last_number INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME,
            updated_at DATETIME,
            UNIQUE(year, patient_group)
        );;
CREATE TABLE outpatient_pt_sessions (
            id VARCHAR PRIMARY KEY,
            case_id VARCHAR NOT NULL REFERENCES outpatient_pt_cases(id) ON DELETE CASCADE,
            patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            session_number INTEGER NOT NULL,
            session_date DATE NOT NULL,
            appointment_at DATETIME,
            therapist VARCHAR(160),
            specialist VARCHAR(160),
            treatments TEXT,
            notes TEXT,
            created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            created_at DATETIME,
            updated_at DATETIME, deleted_at DATETIME,
            UNIQUE(case_id, session_number)
        );;
CREATE TABLE outpatient_pt_waitlist (
        id VARCHAR PRIMARY KEY NOT NULL,
        patient_id VARCHAR NULL REFERENCES patients(id) ON DELETE SET NULL,
        case_id VARCHAR NULL REFERENCES outpatient_pt_cases(id) ON DELETE SET NULL,
        full_name VARCHAR(180) NOT NULL,
        id_number VARCHAR(40) NULL,
        phone VARCHAR(40) NULL,
        patient_group VARCHAR NOT NULL DEFAULT 'men',
        requested_date DATE NOT NULL,
        appointment_at DATETIME NULL,
        queue_number INTEGER NOT NULL DEFAULT 1,
        daily_limit INTEGER NULL,
        status VARCHAR NOT NULL DEFAULT 'waiting',
        urgent INTEGER NOT NULL DEFAULT 0,
        notes TEXT NULL,
        received_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_by VARCHAR NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by VARCHAR NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        deleted_at DATETIME NULL
    );;
CREATE TABLE password_reset_tokens (email VARCHAR PRIMARY KEY, token VARCHAR NOT NULL, created_at DATETIME);;
CREATE TABLE patient_events (
            id VARCHAR PRIMARY KEY,
            patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            type VARCHAR(60) NOT NULL,
            title VARCHAR NOT NULL,
            description TEXT,
            status VARCHAR(60),
            reference_type VARCHAR(60),
            reference_id VARCHAR,
            occurred_at DATETIME NOT NULL,
            created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            created_at DATETIME,
            updated_at DATETIME
        );;
CREATE TABLE patient_sequences (year INTEGER PRIMARY KEY, last_number INTEGER NOT NULL DEFAULT 1101, male_last_number INTEGER NOT NULL DEFAULT 0, female_last_number INTEGER NOT NULL DEFAULT 0);;
INSERT INTO "patient_sequences" VALUES(2026,1,1,1);;
CREATE TABLE patients (id VARCHAR PRIMARY KEY, medical_serial VARCHAR(9) NOT NULL UNIQUE, full_name VARCHAR NOT NULL, id_number VARCHAR NOT NULL UNIQUE, dob DATE NOT NULL, gender VARCHAR NOT NULL CHECK(gender IN ('male','female')), phone VARCHAR NOT NULL, city VARCHAR, area VARCHAR, coverage_entity_id VARCHAR REFERENCES sponsors(id) ON DELETE SET NULL, registered_at DATE NOT NULL, wallet_balance NUMERIC NOT NULL DEFAULT 0, civil_registry_verified_at DATETIME, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
INSERT INTO "patients" VALUES('40000000-0000-4000-8000-000000000001','120261102','محمد أحمد أبو حسن','402918374','1994-05-12','male','0599123456','gaza','الرمال','10000000-0000-4000-8000-000000000004','2026-09-07',100,'2026-09-07 17:28:22','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "patients" VALUES('40000000-0000-4000-8000-000000000002','220261103','سارة محمود النجار','409218375','2001-09-21','female','0568123456','gaza','النصر','10000000-0000-4000-8000-000000000002','2026-09-07',0,'2026-09-07 17:28:22','2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
CREATE TABLE permissions (key VARCHAR PRIMARY KEY, module VARCHAR NOT NULL, action VARCHAR NOT NULL, name_ar VARCHAR NOT NULL, name_en VARCHAR NOT NULL, is_financial INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0);;
INSERT INTO "permissions" VALUES('dashboard.view','dashboard','view','عرض لوحة القيادة','View dashboard',0,1);;
INSERT INTO "permissions" VALUES('patients.view','patients','view','عرض المرضى','View patients',0,2);;
INSERT INTO "permissions" VALUES('patients.create','patients','create','إضافة مريض','Create patients',0,3);;
INSERT INTO "permissions" VALUES('patients.update','patients','update','تعديل بيانات المريض','Update patients',0,4);;
INSERT INTO "permissions" VALUES('visits.view','visits','view','عرض الزيارات','View visits',0,6);;
INSERT INTO "permissions" VALUES('visits.create','visits','create','تسجيل زيارة','Create visits',0,7);;
INSERT INTO "permissions" VALUES('visits.update','visits','update','تعديل حالة الزيارة','Update visits',0,8);;
INSERT INTO "permissions" VALUES('queue.view','queue','view','عرض الطابور','View queue',0,9);;
INSERT INTO "permissions" VALUES('queue.update','queue','update','إدارة الطابور','Manage queue',0,10);;
INSERT INTO "permissions" VALUES('admissions.view','admissions','view','عرض المبيت','View admissions',0,11);;
INSERT INTO "permissions" VALUES('admissions.create','admissions','create','إضافة حالة مبيت','Create admissions',0,12);;
INSERT INTO "permissions" VALUES('admissions.update','admissions','update','تعديل وخروج المبيت','Update/discharge',0,13);;
INSERT INTO "permissions" VALUES('diagnostics.view','diagnostics','view','عرض التشخيص والفحوصات','View diagnostics',0,39);;
INSERT INTO "permissions" VALUES('diagnostics.create','diagnostics','create','إضافة فحص أو صورة','Create diagnostics',0,40);;
INSERT INTO "permissions" VALUES('diagnostics.update','diagnostics','update','تعديل نتائج الفحوصات','Update diagnostics',0,41);;
INSERT INTO "permissions" VALUES('laboratory.view','laboratory','view','عرض بوابة المختبر','View laboratory portal',0,42);;
INSERT INTO "permissions" VALUES('laboratory.update','laboratory','update','إدخال واعتماد النتائج','Enter and approve results',0,43);;
INSERT INTO "permissions" VALUES('diagnostic_catalog.manage','diagnostic_catalog','fee','تعديل أسعار الفحوصات والأشعة','Manage diagnostic prices',1,48);;
INSERT INTO "permissions" VALUES('billing.create','billing','create','إصدار فاتورة وإيداع','Issue invoices',1,49);;
INSERT INTO "permissions" VALUES('billing.view','billing','view','عرض جميع الفواتير','View all invoices',1,50);;
INSERT INTO "permissions" VALUES('patient_finance.view','patient_finance','view','عرض الملف المالي للمريض','View patient finance',1,51);;
INSERT INTO "permissions" VALUES('patient_finance.update','patient_finance','update','تعديل حساب المريض','Update patient finance',1,52);;
INSERT INTO "permissions" VALUES('transfers.view','transfers','view','عرض الحوالات المالية','View transfers',1,53);;
INSERT INTO "permissions" VALUES('doctors.view','doctors','view','عرض الأطباء','View doctors',0,54);;
INSERT INTO "permissions" VALUES('doctors.create','doctors','create','إضافة طبيب','Create doctors',0,55);;
INSERT INTO "permissions" VALUES('doctors.update','doctors','update','تعديل طبيب','Update doctors',0,56);;
INSERT INTO "permissions" VALUES('doctors.delete','doctors','delete','إزالة طبيب','Remove doctors',0,57);;
INSERT INTO "permissions" VALUES('clinics.view','clinics','view','عرض العيادات','View clinics',0,58);;
INSERT INTO "permissions" VALUES('clinics.create','clinics','create','إضافة عيادة','Create clinics',0,59);;
INSERT INTO "permissions" VALUES('clinics.update','clinics','update','تعديل عيادة','Update clinics',0,60);;
INSERT INTO "permissions" VALUES('clinics.delete','clinics','delete','إزالة عيادة','Remove clinics',0,61);;
INSERT INTO "permissions" VALUES('clinics.fee_update','clinics','fee','تعديل رسوم الزيارات','Update visit fees',1,62);;
INSERT INTO "permissions" VALUES('reports.view','reports','view','عرض تقارير المرضى','View patient reports',0,63);;
INSERT INTO "permissions" VALUES('reports.print','reports','print','طباعة التقارير','Print reports',0,64);;
INSERT INTO "permissions" VALUES('reports.export','reports','export','تصدير التقارير','Export reports',0,65);;
INSERT INTO "permissions" VALUES('sponsors.manage','reports','update','إدارة جهات التغطية','Manage sponsors',0,66);;
INSERT INTO "permissions" VALUES('settings.view','settings','view','عرض الإعدادات','View settings',0,67);;
INSERT INTO "permissions" VALUES('settings.update','settings','update','تعديل إعدادات النظام','Update settings',0,68);;
INSERT INTO "permissions" VALUES('users.view','users','view','عرض المستخدمين','View users',0,69);;
INSERT INTO "permissions" VALUES('users.create','users','create','إضافة مستخدم','Create users',0,70);;
INSERT INTO "permissions" VALUES('users.update','users','update','تعديل مستخدم وصلاحياته','Update users',0,71);;
INSERT INTO "permissions" VALUES('users.delete','users','delete','تعطيل أو حذف مستخدم','Disable/delete users',0,72);;
INSERT INTO "permissions" VALUES('finance.view','finance','view','عرض التقارير المالية','View financial reports',1,73);;
INSERT INTO "permissions" VALUES('finance.print','finance','print','طباعة التقارير المالية','Print financial reports',1,74);;
INSERT INTO "permissions" VALUES('finance.export','finance','export','تصدير التقارير المالية','Export financial reports',1,75);;
INSERT INTO "permissions" VALUES('doctor_portal.view','doctor_portal','view','عرض بوابة الطبيب','View doctor portal',0,76);;
INSERT INTO "permissions" VALUES('doctor_portal.update','doctor_portal','update','إدارة الحالات والملاحظات','Manage clinical cases',0,77);;
INSERT INTO "permissions" VALUES('patients.delete','patients','delete','حذف المريض وملفه','Delete patients',0,5);;
INSERT INTO "permissions" VALUES('inpatient_rehab.view','inpatient_rehab','view','عرض ملف التأهيل الطبي','View inpatient rehab',0,14);;
INSERT INTO "permissions" VALUES('inpatient_rehab.update','inpatient_rehab','update','إدارة ملف التأهيل الطبي','Manage inpatient rehab',0,15);;
INSERT INTO "permissions" VALUES('inpatient_rehab.print','inpatient_rehab','print','طباعة تقارير التأهيل','Print rehab reports',0,16);;
INSERT INTO "permissions" VALUES('inpatient_rehab.export','inpatient_rehab','export','تصدير تقارير التأهيل','Export rehab reports',0,17);;
INSERT INTO "permissions" VALUES('inpatient_social.view','inpatient_social','view','عرض الخدمة الاجتماعية والنفسية','View social & psych service',0,18);;
INSERT INTO "permissions" VALUES('inpatient_social.update','inpatient_social','update','تعبئة وحفظ دراسة الحالة','Manage social assessments',0,19);;
INSERT INTO "permissions" VALUES('inpatient_social.print','inpatient_social','print','طباعة دراسة الحالة','Print social assessments',0,20);;
INSERT INTO "permissions" VALUES('inpatient_social.export','inpatient_social','export','تصدير دراسة الحالة','Export social assessments',0,21);;
INSERT INTO "permissions" VALUES('inpatient_pt.view','inpatient_pt','view','عرض العلاج الطبيعي الداخلي','View internal physical therapy',0,22);;
INSERT INTO "permissions" VALUES('inpatient_pt.update','inpatient_pt','update','توزيع ومتابعة جلسات العلاج الطبيعي الداخلي','Manage internal PT assignments',0,23);;
INSERT INTO "permissions" VALUES('inpatient_pt.print','inpatient_pt','print','طباعة تقارير العلاج الطبيعي الداخلي','Print internal PT reports',0,24);;
INSERT INTO "permissions" VALUES('inpatient_pt.export','inpatient_pt','export','تصدير تقارير العلاج الطبيعي الداخلي','Export internal PT reports',0,25);;
INSERT INTO "permissions" VALUES('outpatient_pt.view','outpatient_pt','view','عرض العلاج الطبيعي الخارجي','View outpatient physical therapy',0,26);;
INSERT INTO "permissions" VALUES('outpatient_pt.update','outpatient_pt','update','إدارة التسجيل والحالات والجلسات للعلاج الطبيعي الخارجي','Manage outpatient PT cases and sessions',0,27);;
INSERT INTO "permissions" VALUES('outpatient_pt.print','outpatient_pt','print','طباعة تقارير العلاج الطبيعي الخارجي','Print outpatient PT reports',0,28);;
INSERT INTO "permissions" VALUES('outpatient_pt.export','outpatient_pt','export','تصدير تقارير العلاج الطبيعي الخارجي','Export outpatient PT reports',0,29);;
INSERT INTO "permissions" VALUES('inpatient_finance.view','inpatient_finance','view','عرض مالية المبيت','View inpatient finance',1,30);;
INSERT INTO "permissions" VALUES('inpatient_finance.update','inpatient_finance','update','إدارة حركات التغطية والمطالبات','Manage inpatient finance',1,31);;
INSERT INTO "permissions" VALUES('inpatient_finance.print','inpatient_finance','print','طباعة مطالبات وتقارير المبيت','Print inpatient finance',1,32);;
INSERT INTO "permissions" VALUES('inpatient_finance.export','inpatient_finance','export','تصدير مطالبات وتقارير المبيت','Export inpatient finance',1,33);;
INSERT INTO "permissions" VALUES('moh_portal.view','moh_portal','view','عرض بوابة وزارة الصحة','View MOH portal',0,34);;
INSERT INTO "permissions" VALUES('moh_portal.create','moh_portal','create','إضافة مرضى وقائمة انتظار للوزارة','Add MOH patients/waiting',0,35);;
INSERT INTO "permissions" VALUES('moh_portal.update','moh_portal','update','إدارة قوائم وزارة الصحة','Manage MOH portal',0,36);;
INSERT INTO "permissions" VALUES('moh_portal.print','moh_portal','print','طباعة تقارير وزارة الصحة','Print MOH reports',0,37);;
INSERT INTO "permissions" VALUES('moh_portal.export','moh_portal','export','تصدير تقارير وزارة الصحة','Export MOH reports',0,38);;
INSERT INTO "permissions" VALUES('diagnostic_catalog.view','diagnostic_catalog','view','عرض دليل الفحوصات والأشعة','View diagnostic catalog',0,44);;
INSERT INTO "permissions" VALUES('diagnostic_catalog.create','diagnostic_catalog','create','إضافة نوع فحص أو أشعة','Create diagnostic services',0,45);;
INSERT INTO "permissions" VALUES('diagnostic_catalog.update','diagnostic_catalog','update','تعديل أنواع الفحوصات والأشعة','Update diagnostic services',0,46);;
INSERT INTO "permissions" VALUES('diagnostic_catalog.delete','diagnostic_catalog','delete','حذف أنواع الفحوصات والأشعة','Delete diagnostic services',0,47);;
INSERT INTO "permissions" VALUES('engineer_activity.view','engineer_activity','view','عرض شاشة نشاط المستخدمين','View user activity monitor',0,900);;
INSERT INTO "permissions" VALUES('trash_bin.view','trash_bin','view','عرض سلة المحذوفات الخاصة','View private trash bin',0,901);;
INSERT INTO "permissions" VALUES('trash_bin.restore','trash_bin','update','استعادة عناصر المحذوفات','Restore deleted items',0,902);;
INSERT INTO "permissions" VALUES('patients.global_search','patients','view','بحث عام عن المرضى حسب الصلاحيات','Global patient search by allowed scope',0,95);;
CREATE TABLE personal_access_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, tokenable_type VARCHAR NOT NULL, tokenable_id VARCHAR NOT NULL, name TEXT NOT NULL, token VARCHAR(64) NOT NULL UNIQUE, abilities TEXT, last_used_at DATETIME, expires_at DATETIME, created_at DATETIME, updated_at DATETIME);;
CREATE TABLE queue_items (id VARCHAR PRIMARY KEY, visit_id VARCHAR NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, clinic_id VARCHAR NOT NULL REFERENCES clinics(id), doctor_id VARCHAR NOT NULL REFERENCES doctors(id), queue_date DATE NOT NULL, queue_number INTEGER NOT NULL, status VARCHAR NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','exam','completed')), added_at DATETIME NOT NULL, created_at DATETIME, updated_at DATETIME, priority INTEGER NOT NULL DEFAULT 3, triage_note TEXT, updated_by VARCHAR, deleted_at DATETIME, UNIQUE(doctor_id,queue_date,queue_number));;
CREATE TABLE radiology_orders (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, service_id VARCHAR REFERENCES diagnostic_services(id) ON DELETE SET NULL, doctor_id VARCHAR REFERENCES doctors(id) ON DELETE SET NULL, exam VARCHAR NOT NULL, price NUMERIC NOT NULL DEFAULT 0, ordered_at DATETIME NOT NULL, status VARCHAR NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','done','cancelled')), result TEXT, completed_at DATETIME, created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
CREATE TABLE role_permissions (role VARCHAR NOT NULL, permission_key VARCHAR NOT NULL REFERENCES permissions(key) ON DELETE CASCADE, PRIMARY KEY(role,permission_key));;
INSERT INTO "role_permissions" VALUES('admin','dashboard.view');;
INSERT INTO "role_permissions" VALUES('admin','patients.view');;
INSERT INTO "role_permissions" VALUES('admin','visits.view');;
INSERT INTO "role_permissions" VALUES('admin','queue.view');;
INSERT INTO "role_permissions" VALUES('admin','admissions.view');;
INSERT INTO "role_permissions" VALUES('admin','diagnostics.view');;
INSERT INTO "role_permissions" VALUES('admin','laboratory.view');;
INSERT INTO "role_permissions" VALUES('admin','doctors.view');;
INSERT INTO "role_permissions" VALUES('admin','clinics.view');;
INSERT INTO "role_permissions" VALUES('admin','reports.view');;
INSERT INTO "role_permissions" VALUES('admin','reports.print');;
INSERT INTO "role_permissions" VALUES('admin','reports.export');;
INSERT INTO "role_permissions" VALUES('admin','settings.view');;
INSERT INTO "role_permissions" VALUES('doctor','doctor_portal.view');;
INSERT INTO "role_permissions" VALUES('doctor','doctor_portal.update');;
INSERT INTO "role_permissions" VALUES('doctor','queue.update');;
INSERT INTO "role_permissions" VALUES('doctor','diagnostics.view');;
INSERT INTO "role_permissions" VALUES('doctor','diagnostics.create');;
INSERT INTO "role_permissions" VALUES('doctor','diagnostics.update');;
INSERT INTO "role_permissions" VALUES('lab_technician','laboratory.view');;
INSERT INTO "role_permissions" VALUES('lab_technician','laboratory.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','patients.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','admissions.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','admissions.create');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','admissions.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','patient_finance.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','patient_finance.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','reports.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','reports.print');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','reports.export');;
INSERT INTO "role_permissions" VALUES('cashier','dashboard.view');;
INSERT INTO "role_permissions" VALUES('cashier','patients.view');;
INSERT INTO "role_permissions" VALUES('cashier','patients.create');;
INSERT INTO "role_permissions" VALUES('cashier','patients.update');;
INSERT INTO "role_permissions" VALUES('cashier','visits.view');;
INSERT INTO "role_permissions" VALUES('cashier','visits.create');;
INSERT INTO "role_permissions" VALUES('cashier','visits.update');;
INSERT INTO "role_permissions" VALUES('cashier','queue.view');;
INSERT INTO "role_permissions" VALUES('cashier','clinics.view');;
INSERT INTO "role_permissions" VALUES('cashier','doctors.view');;
INSERT INTO "role_permissions" VALUES('cashier','diagnostics.view');;
INSERT INTO "role_permissions" VALUES('cashier','diagnostics.create');;
INSERT INTO "role_permissions" VALUES('cashier','laboratory.view');;
INSERT INTO "role_permissions" VALUES('cashier','billing.view');;
INSERT INTO "role_permissions" VALUES('cashier','billing.create');;
INSERT INTO "role_permissions" VALUES('treasurer','dashboard.view');;
INSERT INTO "role_permissions" VALUES('treasurer','patients.view');;
INSERT INTO "role_permissions" VALUES('treasurer','patients.create');;
INSERT INTO "role_permissions" VALUES('treasurer','patients.update');;
INSERT INTO "role_permissions" VALUES('treasurer','visits.view');;
INSERT INTO "role_permissions" VALUES('treasurer','visits.create');;
INSERT INTO "role_permissions" VALUES('treasurer','visits.update');;
INSERT INTO "role_permissions" VALUES('treasurer','queue.view');;
INSERT INTO "role_permissions" VALUES('treasurer','queue.update');;
INSERT INTO "role_permissions" VALUES('treasurer','admissions.view');;
INSERT INTO "role_permissions" VALUES('treasurer','admissions.create');;
INSERT INTO "role_permissions" VALUES('treasurer','admissions.update');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostics.view');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostics.create');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostics.update');;
INSERT INTO "role_permissions" VALUES('treasurer','laboratory.view');;
INSERT INTO "role_permissions" VALUES('treasurer','laboratory.update');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostic_catalog.manage');;
INSERT INTO "role_permissions" VALUES('treasurer','billing.create');;
INSERT INTO "role_permissions" VALUES('treasurer','billing.view');;
INSERT INTO "role_permissions" VALUES('treasurer','patient_finance.view');;
INSERT INTO "role_permissions" VALUES('treasurer','patient_finance.update');;
INSERT INTO "role_permissions" VALUES('treasurer','transfers.view');;
INSERT INTO "role_permissions" VALUES('treasurer','doctors.view');;
INSERT INTO "role_permissions" VALUES('treasurer','doctors.create');;
INSERT INTO "role_permissions" VALUES('treasurer','doctors.update');;
INSERT INTO "role_permissions" VALUES('treasurer','doctors.delete');;
INSERT INTO "role_permissions" VALUES('treasurer','clinics.view');;
INSERT INTO "role_permissions" VALUES('treasurer','clinics.create');;
INSERT INTO "role_permissions" VALUES('treasurer','clinics.update');;
INSERT INTO "role_permissions" VALUES('treasurer','clinics.delete');;
INSERT INTO "role_permissions" VALUES('treasurer','clinics.fee_update');;
INSERT INTO "role_permissions" VALUES('treasurer','reports.view');;
INSERT INTO "role_permissions" VALUES('treasurer','reports.print');;
INSERT INTO "role_permissions" VALUES('treasurer','reports.export');;
INSERT INTO "role_permissions" VALUES('treasurer','sponsors.manage');;
INSERT INTO "role_permissions" VALUES('treasurer','settings.view');;
INSERT INTO "role_permissions" VALUES('treasurer','settings.update');;
INSERT INTO "role_permissions" VALUES('treasurer','users.view');;
INSERT INTO "role_permissions" VALUES('treasurer','users.create');;
INSERT INTO "role_permissions" VALUES('treasurer','users.update');;
INSERT INTO "role_permissions" VALUES('treasurer','users.delete');;
INSERT INTO "role_permissions" VALUES('treasurer','finance.view');;
INSERT INTO "role_permissions" VALUES('treasurer','finance.print');;
INSERT INTO "role_permissions" VALUES('treasurer','finance.export');;
INSERT INTO "role_permissions" VALUES('treasurer','doctor_portal.view');;
INSERT INTO "role_permissions" VALUES('treasurer','doctor_portal.update');;
INSERT INTO "role_permissions" VALUES('it_head','dashboard.view');;
INSERT INTO "role_permissions" VALUES('it_head','patients.view');;
INSERT INTO "role_permissions" VALUES('it_head','patients.create');;
INSERT INTO "role_permissions" VALUES('it_head','patients.update');;
INSERT INTO "role_permissions" VALUES('it_head','visits.view');;
INSERT INTO "role_permissions" VALUES('it_head','visits.create');;
INSERT INTO "role_permissions" VALUES('it_head','visits.update');;
INSERT INTO "role_permissions" VALUES('it_head','queue.view');;
INSERT INTO "role_permissions" VALUES('it_head','queue.update');;
INSERT INTO "role_permissions" VALUES('it_head','admissions.view');;
INSERT INTO "role_permissions" VALUES('it_head','admissions.create');;
INSERT INTO "role_permissions" VALUES('it_head','admissions.update');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostics.view');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostics.create');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostics.update');;
INSERT INTO "role_permissions" VALUES('it_head','laboratory.view');;
INSERT INTO "role_permissions" VALUES('it_head','laboratory.update');;
INSERT INTO "role_permissions" VALUES('it_head','doctors.view');;
INSERT INTO "role_permissions" VALUES('it_head','doctors.create');;
INSERT INTO "role_permissions" VALUES('it_head','doctors.update');;
INSERT INTO "role_permissions" VALUES('it_head','doctors.delete');;
INSERT INTO "role_permissions" VALUES('it_head','clinics.view');;
INSERT INTO "role_permissions" VALUES('it_head','clinics.create');;
INSERT INTO "role_permissions" VALUES('it_head','clinics.update');;
INSERT INTO "role_permissions" VALUES('it_head','clinics.delete');;
INSERT INTO "role_permissions" VALUES('it_head','reports.view');;
INSERT INTO "role_permissions" VALUES('it_head','reports.print');;
INSERT INTO "role_permissions" VALUES('it_head','reports.export');;
INSERT INTO "role_permissions" VALUES('it_head','sponsors.manage');;
INSERT INTO "role_permissions" VALUES('it_head','settings.view');;
INSERT INTO "role_permissions" VALUES('it_head','settings.update');;
INSERT INTO "role_permissions" VALUES('it_head','users.view');;
INSERT INTO "role_permissions" VALUES('it_head','users.create');;
INSERT INTO "role_permissions" VALUES('it_head','users.update');;
INSERT INTO "role_permissions" VALUES('it_head','users.delete');;
INSERT INTO "role_permissions" VALUES('it_head','doctor_portal.view');;
INSERT INTO "role_permissions" VALUES('it_head','doctor_portal.update');;
INSERT INTO "role_permissions" VALUES('admin','patients.create');;
INSERT INTO "role_permissions" VALUES('admin','patients.update');;
INSERT INTO "role_permissions" VALUES('admin','patients.delete');;
INSERT INTO "role_permissions" VALUES('admin','visits.create');;
INSERT INTO "role_permissions" VALUES('admin','visits.update');;
INSERT INTO "role_permissions" VALUES('admin','queue.update');;
INSERT INTO "role_permissions" VALUES('admin','admissions.create');;
INSERT INTO "role_permissions" VALUES('admin','admissions.update');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_rehab.view');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_rehab.update');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_rehab.print');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_rehab.export');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_social.view');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_social.update');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_social.print');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_social.export');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('admin','inpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('admin','outpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('admin','outpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('admin','outpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('admin','outpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('admin','diagnostics.create');;
INSERT INTO "role_permissions" VALUES('admin','diagnostics.update');;
INSERT INTO "role_permissions" VALUES('admin','laboratory.update');;
INSERT INTO "role_permissions" VALUES('admin','diagnostic_catalog.view');;
INSERT INTO "role_permissions" VALUES('admin','diagnostic_catalog.create');;
INSERT INTO "role_permissions" VALUES('admin','diagnostic_catalog.update');;
INSERT INTO "role_permissions" VALUES('admin','diagnostic_catalog.delete');;
INSERT INTO "role_permissions" VALUES('admin','doctors.create');;
INSERT INTO "role_permissions" VALUES('admin','doctors.update');;
INSERT INTO "role_permissions" VALUES('admin','doctors.delete');;
INSERT INTO "role_permissions" VALUES('admin','clinics.create');;
INSERT INTO "role_permissions" VALUES('admin','clinics.update');;
INSERT INTO "role_permissions" VALUES('admin','clinics.delete');;
INSERT INTO "role_permissions" VALUES('admin','sponsors.manage');;
INSERT INTO "role_permissions" VALUES('admin','settings.update');;
INSERT INTO "role_permissions" VALUES('admin','users.view');;
INSERT INTO "role_permissions" VALUES('admin','users.create');;
INSERT INTO "role_permissions" VALUES('admin','users.update');;
INSERT INTO "role_permissions" VALUES('admin','users.delete');;
INSERT INTO "role_permissions" VALUES('it_head','patients.delete');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_rehab.view');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_rehab.update');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_rehab.print');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_rehab.export');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_social.view');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_social.update');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_social.print');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_social.export');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('it_head','inpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('it_head','outpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('it_head','outpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('it_head','outpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('it_head','outpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('it_head','moh_portal.view');;
INSERT INTO "role_permissions" VALUES('it_head','moh_portal.create');;
INSERT INTO "role_permissions" VALUES('it_head','moh_portal.update');;
INSERT INTO "role_permissions" VALUES('it_head','moh_portal.print');;
INSERT INTO "role_permissions" VALUES('it_head','moh_portal.export');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostic_catalog.view');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostic_catalog.create');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostic_catalog.update');;
INSERT INTO "role_permissions" VALUES('it_head','diagnostic_catalog.delete');;
INSERT INTO "role_permissions" VALUES('treasurer','patients.delete');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_rehab.view');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_rehab.update');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_rehab.print');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_rehab.export');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_social.view');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_social.update');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_social.print');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_social.export');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('treasurer','outpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('treasurer','outpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('treasurer','outpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('treasurer','outpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_finance.view');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_finance.update');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_finance.print');;
INSERT INTO "role_permissions" VALUES('treasurer','inpatient_finance.export');;
INSERT INTO "role_permissions" VALUES('treasurer','moh_portal.view');;
INSERT INTO "role_permissions" VALUES('treasurer','moh_portal.create');;
INSERT INTO "role_permissions" VALUES('treasurer','moh_portal.update');;
INSERT INTO "role_permissions" VALUES('treasurer','moh_portal.print');;
INSERT INTO "role_permissions" VALUES('treasurer','moh_portal.export');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostic_catalog.view');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostic_catalog.create');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostic_catalog.update');;
INSERT INTO "role_permissions" VALUES('treasurer','diagnostic_catalog.delete');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostics.view');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostics.create');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostics.update');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostic_catalog.view');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostic_catalog.create');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostic_catalog.update');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostic_catalog.delete');;
INSERT INTO "role_permissions" VALUES('lab_technician','diagnostic_catalog.manage');;
INSERT INTO "role_permissions" VALUES('receptionist','patients.view');;
INSERT INTO "role_permissions" VALUES('receptionist','patients.create');;
INSERT INTO "role_permissions" VALUES('receptionist','patients.update');;
INSERT INTO "role_permissions" VALUES('receptionist','visits.view');;
INSERT INTO "role_permissions" VALUES('receptionist','visits.create');;
INSERT INTO "role_permissions" VALUES('receptionist','visits.update');;
INSERT INTO "role_permissions" VALUES('receptionist','queue.view');;
INSERT INTO "role_permissions" VALUES('receptionist','clinics.view');;
INSERT INTO "role_permissions" VALUES('receptionist','doctors.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','dashboard.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','patients.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','visits.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','queue.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','queue.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_rehab.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_rehab.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_rehab.print');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_rehab.export');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_social.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_social.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_social.print');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_social.export');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('inpatient_manager','inpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('rehab_specialist','inpatient_rehab.view');;
INSERT INTO "role_permissions" VALUES('rehab_specialist','inpatient_rehab.update');;
INSERT INTO "role_permissions" VALUES('rehab_specialist','inpatient_rehab.print');;
INSERT INTO "role_permissions" VALUES('rehab_specialist','inpatient_rehab.export');;
INSERT INTO "role_permissions" VALUES('social_worker','inpatient_social.view');;
INSERT INTO "role_permissions" VALUES('social_worker','inpatient_social.update');;
INSERT INTO "role_permissions" VALUES('social_worker','inpatient_social.print');;
INSERT INTO "role_permissions" VALUES('social_worker','inpatient_social.export');;
INSERT INTO "role_permissions" VALUES('inpatient_pt','inpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('inpatient_pt','inpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('inpatient_pt','inpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('inpatient_pt','inpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('outpatient_pt','outpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('outpatient_pt','outpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('outpatient_pt','outpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('outpatient_pt','outpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('inpatient_finance','inpatient_finance.view');;
INSERT INTO "role_permissions" VALUES('inpatient_finance','inpatient_finance.update');;
INSERT INTO "role_permissions" VALUES('inpatient_finance','inpatient_finance.print');;
INSERT INTO "role_permissions" VALUES('inpatient_finance','inpatient_finance.export');;
INSERT INTO "role_permissions" VALUES('moh_user','moh_portal.view');;
INSERT INTO "role_permissions" VALUES('moh_user','moh_portal.create');;
INSERT INTO "role_permissions" VALUES('moh_user','moh_portal.update');;
INSERT INTO "role_permissions" VALUES('moh_user','moh_portal.print');;
INSERT INTO "role_permissions" VALUES('moh_user','moh_portal.export');;
INSERT INTO "role_permissions" VALUES('pt_head','outpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('pt_head','outpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('pt_head','outpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('pt_head','outpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('pt_head','inpatient_pt.view');;
INSERT INTO "role_permissions" VALUES('pt_head','inpatient_pt.update');;
INSERT INTO "role_permissions" VALUES('pt_head','inpatient_pt.print');;
INSERT INTO "role_permissions" VALUES('pt_head','inpatient_pt.export');;
INSERT INTO "role_permissions" VALUES('treasurer','engineer_activity.view');;
INSERT INTO "role_permissions" VALUES('treasurer','trash_bin.view');;
INSERT INTO "role_permissions" VALUES('treasurer','trash_bin.restore');;
INSERT INTO "role_permissions" VALUES('treasurer','patients.global_search');;
CREATE TABLE sessions (id VARCHAR PRIMARY KEY, user_id VARCHAR, ip_address VARCHAR(45), user_agent TEXT, payload TEXT NOT NULL, last_activity INTEGER NOT NULL);;
CREATE TABLE sponsors (id VARCHAR PRIMARY KEY, code VARCHAR NOT NULL UNIQUE, name_ar VARCHAR NOT NULL, name_en VARCHAR NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
INSERT INTO "sponsors" VALUES('10000000-0000-4000-8000-000000000001','moh','وزارة الصحة','Ministry of Health',1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "sponsors" VALUES('10000000-0000-4000-8000-000000000002','unrwa','وكالة الغوث (الأونروا)','UNRWA',1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "sponsors" VALUES('10000000-0000-4000-8000-000000000003','private','تأمين خاص','Private insurance',1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "sponsors" VALUES('10000000-0000-4000-8000-000000000004','self','مساهمة ذاتية / حالة إنسانية','Self-funded / humanitarian',1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "sponsors" VALUES('10000000-0000-4000-8000-000000000005','charity','جمعيات خيرية','Charitable organizations',1,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
CREATE TABLE system_notifications (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
            permission_key VARCHAR,
            patient_id VARCHAR REFERENCES patients(id) ON DELETE CASCADE,
            type VARCHAR(60) NOT NULL DEFAULT 'info',
            title VARCHAR NOT NULL,
            body TEXT,
            link VARCHAR,
            read_at DATETIME,
            created_at DATETIME,
            updated_at DATETIME
        , module VARCHAR(120), muted_by TEXT);;
CREATE TABLE user_permissions (user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE, permission_key VARCHAR NOT NULL REFERENCES permissions(key) ON DELETE CASCADE, PRIMARY KEY(user_id,permission_key));;
CREATE TABLE user_session_logs (
        id VARCHAR PRIMARY KEY NOT NULL,
        user_id VARCHAR NULL REFERENCES users(id) ON DELETE SET NULL,
        token_id INTEGER NULL,
        device_name VARCHAR(120) NULL,
        ip_address VARCHAR NULL,
        user_agent TEXT NULL,
        login_at DATETIME NULL,
        logout_at DATETIME NULL,
        last_seen_at DATETIME NULL,
        metadata TEXT NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL
    );;
CREATE TABLE users (id VARCHAR PRIMARY KEY, username VARCHAR NOT NULL UNIQUE, display_name VARCHAR NOT NULL, password VARCHAR NOT NULL, role VARCHAR(120) NOT NULL, active INTEGER NOT NULL DEFAULT 1, permissions_customized INTEGER NOT NULL DEFAULT 0, created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL, last_login_at DATETIME, remember_token VARCHAR, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000001','Dr.Fouad_Najm','Dr. Fouad Najm','$2y$12$ykPiKKLejN7tYsKMsJRaSuvmpRIo1NSfnHoxb6AktOaXkafsRzeAq','admin',1,0,NULL,NULL,NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000002','cashier','Cashier','$2y$12$9ZQQ8SeXXrXyNCOZaKwO1eRa5Tc/JscbQ9J4Gj05Kj1RKu5snOlVm','cashier',1,0,NULL,NULL,NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000003','Eng.Ahmed_Jaber','Eng. Ahmed Jaber','$2y$12$AXv9mYUtgLNMzQ2HADwqLugm7xX3rAuySQ5Z1ld8.417aV..C/P2W','it_head',1,0,NULL,NULL,NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000004','Eng.Mohammed_Moqbil','Eng. Mohammed Moqbil','$2y$12$dKJMQqHyZI/u1A.U9Kx2J.Wg3heYYQxtZMRCg1n7o3nAiD.L1c5xW','treasurer',1,0,NULL,NULL,NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000005','laboratory','Laboratory Technician','$2y$12$3H7dcsc/USZ1M/rTE0mmhe5rCnfcSaCEgh7T5ZeeDRtF9JoMe6Fhu','lab_technician',1,0,NULL,NULL,NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000006','inpatient','مسؤول المبيت','$2y$12$WCtouVQqxr2ag2ozMXX8RuSoDoN0G4jgc/eOfx0C1Grt8PELcu7Nm','inpatient_manager',1,0,NULL,NULL,NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
INSERT INTO "users" VALUES('00000000-0000-4000-8000-000000000009','physical.therapy.head','رئيس قسم العلاج الطبيعي','$2y$12$Gqc9gnwhx37yLM/KMzK.TOxy7y.Ore8Y21W3DbHibwI5ZDkGq.dfW','pt_head',1,0,NULL,NULL,NULL,'2026-09-11 12:33:32','2026-09-11 12:33:32',NULL);;
CREATE TABLE visits (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, clinic_id VARCHAR NOT NULL REFERENCES clinics(id), doctor_id VARCHAR NOT NULL REFERENCES doctors(id), fee NUMERIC NOT NULL, visit_date DATE NOT NULL, notes TEXT, queue_number INTEGER NOT NULL, status VARCHAR NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','exam','completed','cancelled')), completed_at DATETIME, follow_up_date DATE, appointment_id VARCHAR REFERENCES follow_up_appointments(id) ON DELETE SET NULL, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME, UNIQUE(doctor_id,visit_date,queue_number));;
CREATE TABLE wallet_transactions (id VARCHAR PRIMARY KEY, patient_id VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE, type VARCHAR NOT NULL CHECK(type IN ('credit','debit')), occurred_at DATETIME NOT NULL, service VARCHAR NOT NULL, amount NUMERIC NOT NULL, method VARCHAR NOT NULL, receipt_number VARCHAR NOT NULL UNIQUE, reference_type VARCHAR, reference_id VARCHAR, metadata TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME);;
INSERT INTO "wallet_transactions" VALUES('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','credit','2026-09-07 17:28:22','إيداع رصيد افتتاحي',100,'cash','RCP-2026-00001','invoice','50000000-0000-4000-8000-000000000001',NULL,'2026-09-07 17:28:22','2026-09-07 17:28:22',NULL);;
CREATE INDEX users_role_index ON users(role);;
CREATE INDEX personal_access_tokens_tokenable_index ON personal_access_tokens(tokenable_type,tokenable_id);;
CREATE INDEX permissions_module_index ON permissions(module);;
CREATE INDEX permissions_financial_index ON permissions(is_financial);;
CREATE INDEX patients_full_name_index ON patients(full_name);;
CREATE INDEX patients_registered_at_index ON patients(registered_at);;
CREATE INDEX follow_up_appointments_date_index ON follow_up_appointments(appointment_date);;
CREATE INDEX visits_date_index ON visits(visit_date);;
CREATE INDEX queue_items_date_index ON queue_items(queue_date);;
CREATE INDEX invoices_issued_at_index ON invoices(issued_at);;
CREATE INDEX wallet_transactions_patient_date_index ON wallet_transactions(patient_id,occurred_at);;
CREATE INDEX admissions_status_index ON admissions(status);;
CREATE INDEX admissions_date_index ON admissions(admission_date);;
CREATE INDEX doctor_notes_doctor_patient_index ON doctor_notes(doctor_id,patient_id);;
CREATE INDEX diagnostic_services_type_index ON diagnostic_services(type);;
CREATE INDEX diagnostic_services_category_index ON diagnostic_services(category);;
CREATE INDEX diagnostic_services_active_index ON diagnostic_services(active);;
CREATE INDEX audit_logs_action_index ON audit_logs(action);;
CREATE INDEX audit_logs_created_at_index ON audit_logs(created_at);;
CREATE INDEX jobs_queue_index ON jobs(queue);;
CREATE INDEX sessions_user_index ON sessions(user_id);;
CREATE INDEX sessions_activity_index ON sessions(last_activity);;
CREATE INDEX clinics_kind_index ON clinics (kind);;
CREATE INDEX admission_requests_source_visit_id_index ON admission_requests (source_visit_id);;
CREATE INDEX admission_requests_priority_index ON admission_requests (priority);;
CREATE INDEX admission_requests_status_index ON admission_requests (status);;
CREATE INDEX admission_requests_requested_at_index ON admission_requests (requested_at);;
CREATE INDEX admission_requests_admission_id_index ON admission_requests (admission_id);;
CREATE INDEX admissions_responsible_user_id_index ON admissions (responsible_user_id);;
CREATE INDEX admissions_attending_doctor_id_index ON admissions (attending_doctor_id);;
CREATE INDEX admissions_source_visit_id_index ON admissions (source_visit_id);;
CREATE INDEX admissions_request_id_index ON admissions (request_id);;
CREATE INDEX inpatient_transactions_occurred_at_index ON inpatient_transactions (occurred_at);;
CREATE INDEX inpatient_notes_noted_at_index ON inpatient_notes (noted_at);;
CREATE INDEX inpatient_reports_report_date_index ON inpatient_reports (report_date);;
CREATE INDEX patient_events_type_index ON patient_events (type);;
CREATE INDEX patient_events_status_index ON patient_events (status);;
CREATE INDEX patient_events_occurred_at_index ON patient_events (occurred_at);;
CREATE INDEX patient_events_patient_occurred_index ON patient_events (patient_id, occurred_at);;
CREATE INDEX system_notifications_permission_key_index ON system_notifications (permission_key);;
CREATE INDEX system_notifications_read_at_index ON system_notifications (read_at);;
CREATE INDEX queue_items_priority_index ON queue_items (priority);;
CREATE INDEX queue_items_updated_by_index ON queue_items (updated_by);;
CREATE INDEX admissions_ward_type_index ON admissions (ward_type);;
CREATE INDEX admissions_referral_hospital_index ON admissions (referral_hospital);;
CREATE INDEX outpatient_pt_cases_patient_group_index ON outpatient_pt_cases (patient_group);;
CREATE INDEX outpatient_pt_cases_case_date_index ON outpatient_pt_cases (case_date);;
CREATE INDEX outpatient_pt_cases_status_index ON outpatient_pt_cases (status);;
CREATE INDEX outpatient_pt_cases_patient_case_date_index ON outpatient_pt_cases (patient_id, case_date);;
CREATE INDEX outpatient_pt_sessions_session_date_index ON outpatient_pt_sessions (session_date);;
CREATE INDEX outpatient_pt_sessions_appointment_at_index ON outpatient_pt_sessions (appointment_at);;
CREATE INDEX outpatient_pt_sessions_therapist_index ON outpatient_pt_sessions (therapist);;
CREATE INDEX outpatient_pt_sessions_patient_session_date_index ON outpatient_pt_sessions (patient_id, session_date);;
CREATE INDEX user_session_logs_user_id_index ON user_session_logs(user_id);;
CREATE INDEX user_session_logs_token_id_index ON user_session_logs(token_id);;
CREATE INDEX user_session_logs_login_at_index ON user_session_logs(login_at);;
CREATE INDEX user_session_logs_logout_at_index ON user_session_logs(logout_at);;
CREATE INDEX user_session_logs_last_seen_at_index ON user_session_logs(last_seen_at);;
CREATE INDEX deleted_items_user_id_index ON deleted_items(user_id);;
CREATE INDEX deleted_items_entity_type_index ON deleted_items(entity_type);;
CREATE INDEX deleted_items_entity_id_index ON deleted_items(entity_id);;
CREATE INDEX deleted_items_deleted_at_index ON deleted_items(deleted_at);;
CREATE INDEX deleted_items_restored_at_index ON deleted_items(restored_at);;
CREATE INDEX outpatient_pt_waitlist_patient_id_index ON outpatient_pt_waitlist(patient_id);;
CREATE INDEX outpatient_pt_waitlist_case_id_index ON outpatient_pt_waitlist(case_id);;
CREATE INDEX outpatient_pt_waitlist_id_number_index ON outpatient_pt_waitlist(id_number);;
CREATE INDEX outpatient_pt_waitlist_patient_group_index ON outpatient_pt_waitlist(patient_group);;
CREATE INDEX outpatient_pt_waitlist_requested_date_index ON outpatient_pt_waitlist(requested_date);;
CREATE INDEX outpatient_pt_waitlist_appointment_at_index ON outpatient_pt_waitlist(appointment_at);;
CREATE INDEX outpatient_pt_waitlist_queue_number_index ON outpatient_pt_waitlist(queue_number);;
CREATE INDEX outpatient_pt_waitlist_status_index ON outpatient_pt_waitlist(status);;
CREATE INDEX outpatient_pt_waitlist_urgent_index ON outpatient_pt_waitlist(urgent);;
CREATE INDEX outpatient_pt_waitlist_received_at_index ON outpatient_pt_waitlist(received_at);;
CREATE INDEX outpatient_pt_waitlist_completed_at_index ON outpatient_pt_waitlist(completed_at);;
CREATE INDEX outpatient_pt_waitlist_created_by_index ON outpatient_pt_waitlist(created_by);;
CREATE INDEX outpatient_pt_waitlist_updated_by_index ON outpatient_pt_waitlist(updated_by);;
CREATE INDEX outpatient_pt_waitlist_deleted_at_index ON outpatient_pt_waitlist(deleted_at);;
CREATE INDEX outpatient_pt_waitlist_requested_date_patient_group_status_index ON outpatient_pt_waitlist(requested_date, patient_group, status);;
CREATE INDEX idx_sponsors_deleted_at ON sponsors(deleted_at);;
CREATE INDEX idx_visits_deleted_at ON visits(deleted_at);;
CREATE INDEX idx_queue_items_deleted_at ON queue_items(deleted_at);;
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);;
CREATE INDEX idx_admissions_deleted_at ON admissions(deleted_at);;
CREATE INDEX idx_admission_requests_deleted_at ON admission_requests(deleted_at);;
CREATE INDEX idx_lab_orders_deleted_at ON lab_orders(deleted_at);;
CREATE INDEX idx_radiology_orders_deleted_at ON radiology_orders(deleted_at);;
CREATE INDEX idx_findings_deleted_at ON findings(deleted_at);;
CREATE INDEX idx_doctor_notes_deleted_at ON doctor_notes(deleted_at);;
CREATE INDEX idx_inpatient_notes_deleted_at ON inpatient_notes(deleted_at);;
CREATE INDEX idx_inpatient_reports_deleted_at ON inpatient_reports(deleted_at);;
CREATE INDEX idx_inpatient_transactions_deleted_at ON inpatient_transactions(deleted_at);;
CREATE INDEX idx_wallet_transactions_deleted_at ON wallet_transactions(deleted_at);;
CREATE INDEX idx_follow_up_appointments_deleted_at ON follow_up_appointments(deleted_at);;
CREATE INDEX idx_system_notifications_module ON system_notifications(module);;
DELETE FROM "sqlite_sequence";;
INSERT INTO "sqlite_sequence" VALUES('migrations',15);;
COMMIT;;
