import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import StaffLogin from './pages/Auth/StaffLogin';
import PatientsList from './pages/Patients/PatientsList';
import TransfersList from './pages/Transfers/TransfersList';
import StaffManagementList from './pages/Staff/StaffManagementList';

/**
 * ROLE-BASED MODULE GUARD
 *
 * Determines the default landing module for each role on login, and
 * guards which module is allowed to render based on the authenticated role.
 * This mirrors the Sidebar visibility rules and provides a second
 * frontend layer (alongside backend middleware) of access enforcement.
 *
 * New modules added in future phases must:
 *  1. Register their `moduleId` here with allowed role flags.
 *  2. Add themselves to Sidebar.jsx navSections with matching `visible` flag.
 *  3. Backend route must carry the correct middleware (role / forbid.role).
 */
function resolveDefaultModule(auth) {
  if (auth.isAccountant)        return 'transfers';
  if (auth.isDataLookupClerk)   return 'patients';
  if (auth.isRegistrationClerk) return 'patients';
  if (auth.isDoctor)            return 'patients';
  if (auth.isItAdmin)           return 'staff';
  if (auth.isManagementAdmin)   return 'patients';
  return 'patients';
}

function isModuleAllowed(moduleId, auth) {
  switch (moduleId) {
    case 'patients':
      return auth.canViewPatients;
    case 'transfers':
      return auth.canAccessTransfers;
    case 'staff':
      return auth.canManageStaff;
    // Future modules — add here as built:
    // case 'outpatient_visits':  return auth.canAccessClinical;
    // case 'pt_sessions':        return auth.canAccessPt;
    // case 'lab_orders':         return auth.canAccessLab;
    // case 'radiology_exams':    return auth.canAccessRadiology;
    // case 'social_assistance':  return auth.canAccessSocial;
    // case 'kpi_dashboard':      return auth.canAccessReports;
    default:
      return false;
  }
}

function MainPortal() {
  const auth = useAuth();
  const { user } = auth;

  const [activeModule, setActiveModule] = useState(null);

  // Set default module when user logs in or changes
  useEffect(() => {
    if (user) {
      setActiveModule(resolveDefaultModule(auth));
    }
  }, [user?.role]);

  if (!user) {
    return <StaffLogin />;
  }

  // Guard navigation: if selected module is not allowed for this role, fall back
  const handleSelectModule = (moduleId) => {
    if (isModuleAllowed(moduleId, auth)) {
      setActiveModule(moduleId);
    }
  };

  const currentModule = activeModule && isModuleAllowed(activeModule, auth)
    ? activeModule
    : resolveDefaultModule(auth);

  return (
    <AppLayout activeModule={currentModule} onSelectModule={handleSelectModule}>
      {currentModule === 'patients'   && <PatientsList />}
      {currentModule === 'transfers'  && <TransfersList />}
      {currentModule === 'staff'      && <StaffManagementList />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainPortal />
    </AuthProvider>
  );
}