import { lazy, ReactNode, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';

const ProtectedAppShell = lazy(() => import('./components/ProtectedAppShell').then(module => ({ default: module.ProtectedAppShell })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const PatientsPage = lazy(() => import('./pages/PatientsPage').then(module => ({ default: module.PatientsPage })));
const RegistrationDeskPage = lazy(() => import('./pages/RegistrationDeskPage').then(module => ({ default: module.RegistrationDeskPage })));
const PatientInquiriesPage = lazy(() => import('./pages/PatientInquiriesPage').then(module => ({ default: module.PatientInquiriesPage })));
const ArchivePage = lazy(() => import('./pages/ArchivePage').then(module => ({ default: module.ArchivePage })));
const OperationAdmissionPage = lazy(() => import('./pages/OperationAdmissionPage').then(module => ({ default: module.OperationAdmissionPage })));
const PatientProfilePage = lazy(() => import('./pages/PatientsPage').then(module => ({ default: module.PatientProfilePage })));
const QueuePage = lazy(() => import('./pages/OperationsPages').then(module => ({ default: module.QueuePage })));
const AdmissionsPage = lazy(() => import('./pages/InpatientPage').then(module => ({ default: module.AdmissionsPage })));
const DiagnosticsPage = lazy(() => import('./pages/DiagnosticsPage').then(module => ({ default: module.DiagnosticsPage })));
const LaboratoryPage = lazy(() => import('./pages/LaboratoryPage').then(module => ({ default: module.LaboratoryPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then(module => ({ default: module.BillingPage })));
const FinanceReportsPage = lazy(() => import('./pages/FinanceReportsPage').then(module => ({ default: module.FinanceReportsPage })));
const PaymentAuditPage = lazy(() => import('./pages/CashierWorkflowPages').then(module => ({ default: module.PaymentAuditPage })));
const FinancialCollectorPage = lazy(() => import('./pages/CashierWorkflowPages').then(module => ({ default: module.FinancialCollectorPage })));
const FinancialAuditorPage = lazy(() => import('./pages/CashierWorkflowPages').then(module => ({ default: module.FinancialAuditorPage })));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage').then(module => ({ default: module.DoctorDashboardPage })));
const UsersAccessPage = lazy(() => import('./pages/UsersAccessPage').then(module => ({ default: module.UsersAccessPage })));
const EngineerActivityPage = lazy(() => import('./pages/EngineerActivityPage').then(module => ({ default: module.EngineerActivityPage })));
const TrashBinPage = lazy(() => import('./pages/TrashBinPage').then(module => ({ default: module.TrashBinPage })));
const OutpatientPhysicalTherapyPage = lazy(() => import('./pages/OutpatientPhysicalTherapyPage').then(module => ({ default: module.OutpatientPhysicalTherapyPage })));
const DentalClinicPage = lazy(() => import('./pages/DentalClinicPage'));
const ElderlyCarePage = lazy(() => import('./pages/ElderlyCarePage').then(module => ({ default: module.ElderlyCarePage })));
const DoctorsPage = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.DoctorsPage })));
const ClinicsPage = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.ClinicsPage })));
const ReportsPage = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.NotFoundPage })));

import type { SessionUser } from './types';
import { canUseBilling } from './utils/permissions';

const isDoctorPortalUser = (user?: SessionUser | null) => Boolean(user?.role === 'doctor' && user.doctorId && user.permissions.includes('doctor_portal.view'));

const homeFor = (_user: SessionUser) => '/';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequirePermission({ permissions, children }: { permissions: string[]; children: ReactNode }) {
  const { user, canAny } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return canAny(...permissions) ? children : <Navigate to={homeFor(user)} replace />;
}



function RequireNotRegistrationCashier({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'cashier' ? <Navigate to="/registration-desk" replace /> : children;
}


function RequireDoctorPortal({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return isDoctorPortalUser(user) ? children : <Navigate to={homeFor(user)} replace />;
}

function RequireEngineer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const ok = user.id === '00000000-0000-4000-8000-000000000004' || user.username.toLowerCase().trim() === 'eng.mohammed_moqbil';
  return ok ? children : <Navigate to={homeFor(user)} replace />;
}

function RequireBillingOperator({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return canUseBilling(user) ? children : <Navigate to={homeFor(user)} replace />;
}

const protectedPage = (permissions: string[], page: ReactNode) => <RequirePermission permissions={permissions}>{page}</RequirePermission>;

export default function App() {
  return <BrowserRouter><Suspense fallback={<div className="route-loading" role="status" aria-live="polite">جارٍ تحميل الوحدة...</div>}><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<RequireAuth><ProtectedAppShell/></RequireAuth>}>
      <Route index element={<DashboardPage/>}/>
      <Route path="registration-desk" element={protectedPage(['patients.create','visits.create'], <RegistrationDeskPage/>)}/>
      <Route path="inquiries" element={protectedPage(['patient_inquiries.view'], <PatientInquiriesPage/>)} />
      <Route path="archive" element={protectedPage(['archive.view'], <ArchivePage/>)} />
      <Route path="operations" element={protectedPage(['operations.view'], <OperationAdmissionPage/>)} />
      <Route path="patients" element={<RequireNotRegistrationCashier>{protectedPage(['patients.view'], <PatientsPage/>)}</RequireNotRegistrationCashier>}/>
      <Route path="patients/:id" element={<RequireNotRegistrationCashier>{protectedPage(['patients.view'], <PatientProfilePage/>)}</RequireNotRegistrationCashier>}/>
      <Route path="queue" element={protectedPage(['queue.view'], <QueuePage/>)}/>
      <Route path="outpatient-physical-therapy" element={protectedPage(['outpatient_pt.view'], <OutpatientPhysicalTherapyPage/>)}/>
      <Route path="dental-clinic" element={protectedPage(['dental.view','financial_audit.view'], <DentalClinicPage/>)} />
      <Route path="elderly-care" element={protectedPage(['elderly.view'], <ElderlyCarePage/>)} />
      <Route path="admissions" element={protectedPage(['admissions.view','inpatient_rehab.view','inpatient_social.view','inpatient_pt.view','inpatient_finance.view','moh_portal.view'], <AdmissionsPage/>)}/>
      <Route path="diagnostics" element={protectedPage(['diagnostics.view'], <DiagnosticsPage/>)}/>
      <Route path="laboratory" element={protectedPage(['laboratory.view'], <LaboratoryPage/>)}/>
      <Route path="billing" element={<RequireBillingOperator>{protectedPage(['billing.view','billing.create'], <BillingPage/>)}</RequireBillingOperator>}/>
      <Route path="finance-reports" element={protectedPage(['finance.view'], <FinanceReportsPage/>)}/>
      <Route path="payment-audit" element={protectedPage(['cashier_payment.view'], <PaymentAuditPage/>)}/>
      <Route path="financial-collector" element={protectedPage(['cashier_collection.view'], <FinancialCollectorPage/>)}/>
      <Route path="financial-audit" element={protectedPage(['financial_audit.view'], <FinancialAuditorPage/>)}/>

      <Route path="doctors" element={protectedPage(['doctors.view'], <DoctorsPage/>)}/>
      <Route path="clinics" element={protectedPage(['clinics.view'], <ClinicsPage/>)}/>
      <Route path="reports" element={protectedPage(['reports.view'], <ReportsPage/>)}/>
      <Route path="settings" element={protectedPage(['settings.view'], <SettingsPage/>)}/>
      <Route path="user-access" element={protectedPage(['users.view'], <UsersAccessPage/>)}/>
      <Route path="engineer-activity" element={<RequireEngineer>{protectedPage(['engineer_activity.view'], <EngineerActivityPage/>)}</RequireEngineer>}/>
      <Route path="trash-bin" element={<RequireEngineer>{protectedPage(['trash_bin.view'], <TrashBinPage/>)}</RequireEngineer>}/>
      <Route path="doctor-dashboard" element={<RequireDoctorPortal>{protectedPage(['doctor_portal.view'], <DoctorDashboardPage/>)}</RequireDoctorPortal>}/>
      <Route path="*" element={<NotFoundPage/>}/>
    </Route>
  </Routes></Suspense></BrowserRouter>;
}
