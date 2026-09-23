<?php

use App\Http\Controllers\Api\{AdmissionController,ArchiveController,AuthController,CashierWorkflowController,CivilRegistryController,ClinicController,DashboardController,DentalClinicController,DiagnosticController,ElderlyCareController,DoctorController,DoctorNoteController,InvoiceController,NotificationController,OutpatientPhysicalTherapyController,OperationCaseController,EngineerConsoleController,PatientController,PatientInquiryController,ReportController,SponsorController,UserController,VisitController};
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class,'login'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class,'me']);
        Route::post('/auth/logout', [AuthController::class,'logout']);

        Route::get('/dashboard', DashboardController::class);
        Route::get('/cashier-workflow', [CashierWorkflowController::class,'index'])->middleware('permission:cashier_payment.view,cashier_collection.view,financial_audit.view');
        Route::get('/registration/visits', [CashierWorkflowController::class,'registrationRecent'])->middleware('permission:visits.create');
        Route::post('/cashier-workflow', [CashierWorkflowController::class,'store'])->middleware('permission:visits.create');
        Route::post('/cashier-workflow/manual', [CashierWorkflowController::class,'manual'])->middleware('permission:financial_audit.create');
        Route::post('/cashier-workflow/{cashierWorkflowCase}/payment', [CashierWorkflowController::class,'payment'])->middleware('permission:cashier_payment.update');
        Route::post('/cashier-workflow/{cashierWorkflowCase}/collect', [CashierWorkflowController::class,'collect'])->middleware('permission:cashier_collection.update');
        Route::patch('/cashier-workflow/{cashierWorkflowCase}', [CashierWorkflowController::class,'update'])->middleware('permission:financial_audit.update');
        Route::delete('/cashier-workflow/{cashierWorkflowCase}', [CashierWorkflowController::class,'destroy'])->middleware('permission:financial_audit.delete');

        Route::get('/patient-inquiries', [PatientInquiryController::class,'index'])->middleware('permission:patient_inquiries.view');
        Route::get('/archive/discharged', [ArchiveController::class,'discharged'])->middleware('permission:archive.view');
        Route::get('/registration/patients', [PatientController::class,'registrationLookup'])->middleware('permission:patients.create,visits.create');
        Route::get('/patients', [PatientController::class,'index'])->middleware('permission:patients.view');
        Route::get('/patients/{patient}', [PatientController::class,'show'])->middleware('permission:patients.view');
        Route::post('/patients', [PatientController::class,'store'])->middleware('permission:patients.create,moh_portal.create,outpatient_pt.update,dental.update');
        Route::patch('/patients/{patient}', [PatientController::class,'update'])->middleware('permission:patients.update');
        Route::delete('/patients/{patient}', [PatientController::class,'destroy'])->middleware('permission:patients.delete');
        Route::patch('/patients/{patient}/coverage', [PatientController::class,'updateCoverage'])->middleware('permission:patients.update');
        Route::post('/patients/{patient}/findings', [PatientController::class,'addFinding'])->middleware('permission:patients.update');
        Route::get('/civil-registry/lookup', CivilRegistryController::class)->middleware('permission:patients.create,admissions.create,moh_portal.create,moh_portal.update,outpatient_pt.update,dental.update');

        Route::prefix('operations')->group(function () {
            Route::get('/cases', [OperationCaseController::class,'index'])->middleware('permission:operations.view');
            Route::get('/lookup', [OperationCaseController::class,'lookup'])->middleware('permission:operations.view,operations.create');
            Route::post('/cases', [OperationCaseController::class,'store'])->middleware('permission:operations.create');
        });

        Route::get('/visits', [VisitController::class,'index'])->middleware('permission:visits.view');
        Route::post('/visits', [VisitController::class,'store'])->middleware('permission:visits.create');
        Route::get('/follow-ups/due', [VisitController::class,'dueFollowUps'])->middleware('permission:visits.create');
        Route::get('/queue', [VisitController::class,'queue'])->middleware('permission:queue.view');
        Route::patch('/queue/{queueItem}', [VisitController::class,'updateQueue'])->middleware('permission:queue.update');

        Route::get('/clinics', [ClinicController::class,'index'])->middleware('permission:clinics.view,visits.create');
        Route::post('/clinics', [ClinicController::class,'store'])->middleware('permission:clinics.create');
        Route::patch('/clinics/{clinic}', [ClinicController::class,'update'])->middleware('permission:clinics.update');
        Route::delete('/clinics/{clinic}', [ClinicController::class,'destroy'])->middleware('permission:clinics.delete');
        Route::patch('/clinics/{clinic}/fee', [ClinicController::class,'updateFee'])->middleware('permission:clinics.fee_update');

        Route::get('/doctors', [DoctorController::class,'index'])->middleware('permission:doctors.view,visits.create');
        Route::post('/doctors', [DoctorController::class,'store'])->middleware('permission:doctors.create');
        Route::patch('/doctors/{doctor}', [DoctorController::class,'update'])->middleware('permission:doctors.update');
        Route::delete('/doctors/{doctor}', [DoctorController::class,'destroy'])->middleware('permission:doctors.delete');


        Route::prefix('elderly-care')->group(function () {
            Route::get('/disabilities', [ElderlyCareController::class,'disabilities'])->middleware('permission:elderly.view,elderly.update');
            Route::get('/lookup', [ElderlyCareController::class,'lookup'])->middleware('permission:elderly.view,elderly.update');
            Route::get('/residents', [ElderlyCareController::class,'index'])->middleware('permission:elderly.view');
            Route::post('/residents', [ElderlyCareController::class,'store'])->middleware('permission:elderly.update');
            Route::patch('/residents/{elderlyResident}', [ElderlyCareController::class,'update'])->middleware('permission:elderly.update');
            Route::patch('/residents/{elderlyResident}/status', [ElderlyCareController::class,'status'])->middleware('permission:elderly.update');
        });

        Route::prefix('dental')->group(function () {
            Route::get('/services', [DentalClinicController::class,'services'])->middleware('permission:dental.view,dental.update,visits.create');
            Route::get('/patient-lookup', [DentalClinicController::class,'lookupPatient'])->middleware('permission:dental.view,dental.update,visits.create');
            Route::get('/visits', [DentalClinicController::class,'index'])->middleware('permission:dental.view,financial_audit.view');
            Route::post('/visits', [DentalClinicController::class,'store'])->middleware('permission:dental.update,visits.create');
            Route::patch('/visits/{dentalVisit}', [DentalClinicController::class,'update'])->middleware('permission:dental.update,financial_audit.update');
            Route::delete('/visits/{dentalVisit}', [DentalClinicController::class,'destroy'])->middleware('permission:dental.manage');
            Route::get('/waitlist', [DentalClinicController::class,'waitlist'])->middleware('permission:dental.view,dental.update,visits.create');
            Route::post('/waitlist', [DentalClinicController::class,'storeWaitlist'])->middleware('permission:dental.update,visits.create');
            Route::patch('/waitlist/{dentalWaitlistItem}', [DentalClinicController::class,'updateWaitlist'])->middleware('permission:dental.update,visits.create');
            Route::delete('/waitlist/{dentalWaitlistItem}', [DentalClinicController::class,'destroyWaitlist'])->middleware('permission:dental.manage');
        });


        Route::get('/admissions', [AdmissionController::class,'index'])->middleware('permission:admissions.view,inpatient_rehab.view,inpatient_social.view,inpatient_pt.view,inpatient_finance.view,moh_portal.view');
        Route::get('/admission-requests', [AdmissionController::class,'requests'])->middleware('permission:admissions.view,inpatient_rehab.view,inpatient_social.view,inpatient_pt.view,inpatient_finance.view,moh_portal.view');
        Route::post('/admission-requests', [AdmissionController::class,'requestAdmission'])->middleware('permission:admissions.create');
        Route::post('/admission-requests/{admissionRequest}/cancel', [AdmissionController::class,'cancelRequest'])->middleware('permission:admissions.update');
        Route::post('/admissions', [AdmissionController::class,'store'])->middleware('permission:admissions.create');
        Route::post('/admissions/{admission}/notes', [AdmissionController::class,'addNote'])->middleware('permission:admissions.update');
        Route::post('/admissions/{admission}/reports', [AdmissionController::class,'addReport'])->middleware('permission:admissions.update,inpatient_rehab.update,inpatient_social.update');
        Route::post('/admissions/{admission}/transactions', [AdmissionController::class,'addTransaction'])->middleware('permission:patient_finance.update');
        Route::post('/admissions/{admission}/sync-charges', [AdmissionController::class,'syncCharges'])->middleware('permission:patient_finance.update');
        Route::post('/admissions/{admission}/discharge', [AdmissionController::class,'discharge'])->middleware('permission:admissions.update');

        Route::get('/notifications', [NotificationController::class,'index']);
        Route::patch('/notifications/{systemNotification}/read', [NotificationController::class,'read']);
        Route::patch('/notifications/{systemNotification}/mute', [NotificationController::class,'mute']);
        Route::post('/notifications/read-all', [NotificationController::class,'readAll']);
        Route::delete('/notifications', [NotificationController::class,'clear']);

        Route::get('/sponsors', [SponsorController::class,'index'])->middleware('permission:patients.view,reports.view,admissions.view,inpatient_rehab.view,inpatient_social.view,inpatient_finance.view,moh_portal.view,outpatient_pt.view');
        Route::post('/sponsors', [SponsorController::class,'store'])->middleware('permission:sponsors.manage');

        Route::prefix('outpatient-physical-therapy')->group(function () {
            Route::get('/patients/find', [OutpatientPhysicalTherapyController::class,'findPatient'])->middleware('permission:outpatient_pt.view');
            Route::get('/cases', [OutpatientPhysicalTherapyController::class,'index'])->middleware('permission:outpatient_pt.view');
            Route::post('/cases', [OutpatientPhysicalTherapyController::class,'store'])->middleware('permission:outpatient_pt.update');
            Route::patch('/cases/{outpatientPtCase}', [OutpatientPhysicalTherapyController::class,'update'])->middleware('permission:outpatient_pt.update');
            Route::delete('/cases/{outpatientPtCase}', [OutpatientPhysicalTherapyController::class,'destroy'])->middleware('permission:outpatient_pt.update');
            Route::post('/cases/{outpatientPtCase}/sessions', [OutpatientPhysicalTherapyController::class,'storeSession'])->middleware('permission:outpatient_pt.update');
            Route::patch('/sessions/{outpatientPtSession}', [OutpatientPhysicalTherapyController::class,'updateSession'])->middleware('permission:outpatient_pt.update');
            Route::delete('/sessions/{outpatientPtSession}', [OutpatientPhysicalTherapyController::class,'destroySession'])->middleware('permission:outpatient_pt.update');
            Route::post('/coverage-entities', [OutpatientPhysicalTherapyController::class,'addCoverage'])->middleware('permission:outpatient_pt.update');
            Route::get('/waitlist', [OutpatientPhysicalTherapyController::class,'waitlist'])->middleware('permission:outpatient_pt.view');
            Route::post('/waitlist', [OutpatientPhysicalTherapyController::class,'storeWaitlist'])->middleware('permission:outpatient_pt.update');
            Route::patch('/waitlist/{waitlist}', [OutpatientPhysicalTherapyController::class,'updateWaitlist'])->middleware('permission:outpatient_pt.update');
            Route::delete('/waitlist/{waitlist}', [OutpatientPhysicalTherapyController::class,'destroyWaitlist'])->middleware('permission:outpatient_pt.update');
        });

        Route::prefix('engineer-console')->group(function () {
            Route::get('/activity', [EngineerConsoleController::class,'activity']);
            Route::get('/trash', [EngineerConsoleController::class,'trash']);
            Route::post('/trash/{deletedItem}/restore', [EngineerConsoleController::class,'restoreTrash']);
        });
        Route::delete('/sponsors/{sponsor}', [SponsorController::class,'destroy'])->middleware('permission:sponsors.manage');

        Route::get('/diagnostics/services', [DiagnosticController::class,'services'])->middleware('permission:diagnostics.view,laboratory.view,diagnostic_catalog.view,diagnostic_catalog.manage');
        Route::post('/diagnostics/services', [DiagnosticController::class,'storeService'])->middleware('permission:diagnostic_catalog.create,diagnostic_catalog.manage');
        Route::patch('/diagnostics/services/{diagnosticService}', [DiagnosticController::class,'updateService'])->middleware('permission:diagnostic_catalog.update,diagnostic_catalog.manage');
        Route::delete('/diagnostics/services/{diagnosticService}', [DiagnosticController::class,'destroyService'])->middleware('permission:diagnostic_catalog.delete,diagnostic_catalog.manage');
        Route::get('/diagnostics/labs', [DiagnosticController::class,'labs'])->middleware('permission:diagnostics.view,laboratory.view');
        Route::post('/diagnostics/labs', [DiagnosticController::class,'storeLab'])->middleware('permission:diagnostics.create');
        Route::patch('/diagnostics/labs/{labOrder}', [DiagnosticController::class,'updateLab'])->middleware('permission:laboratory.update');
        Route::post('/diagnostics/labs/{labOrder}/complete', [DiagnosticController::class,'completeLab'])->middleware('permission:laboratory.update');
        Route::get('/diagnostics/radiology', [DiagnosticController::class,'radiology'])->middleware('permission:diagnostics.view');
        Route::post('/diagnostics/radiology', [DiagnosticController::class,'storeRadiology'])->middleware('permission:diagnostics.create');
        Route::patch('/diagnostics/radiology/{radiologyOrder}', [DiagnosticController::class,'updateRadiology'])->middleware('permission:diagnostics.update');

        Route::get('/reports/patients', [ReportController::class,'patients'])->middleware('permission:reports.view');
        Route::get('/reports/finance', [ReportController::class,'finance'])->middleware('permission:finance.view');
        Route::get('/invoices', [InvoiceController::class,'index'])->middleware('permission:billing.view');
        Route::post('/invoices', [InvoiceController::class,'store'])->middleware('permission:billing.create');
        Route::get('/patients/{patient}/ledger', [PatientController::class,'ledger'])->middleware('permission:patient_finance.view');

        Route::get('/access/permissions', [UserController::class,'permissions'])->middleware('permission:users.view');
        Route::get('/users', [UserController::class,'index'])->middleware('permission:users.view');
        Route::post('/users', [UserController::class,'store'])->middleware('permission:users.create');
        Route::patch('/users/{user}', [UserController::class,'update'])->middleware('permission:users.update');
        Route::delete('/users/{user}', [UserController::class,'destroy'])->middleware('permission:users.delete');

        Route::middleware('permission:doctor_portal.view')->group(function () {
            Route::get('/doctor/queue/today', [VisitController::class,'doctorToday']);
            Route::get('/doctor/visits/past', [VisitController::class,'doctorPast']);
            Route::get('/doctor/follow-ups', [VisitController::class,'doctorFollowUps']);
            Route::get('/doctor/patients/{patient}/notes', [DoctorNoteController::class,'index']);
        });
        Route::middleware('permission:doctor_portal.update')->group(function () {
            Route::patch('/doctor/queue/{queueItem}', [VisitController::class,'updateQueue']);
            Route::post('/visits/{visit}/finish', [VisitController::class,'finish']);
            Route::post('/doctor/patients/{patient}/notes', [DoctorNoteController::class,'store']);
        });
    });
});
