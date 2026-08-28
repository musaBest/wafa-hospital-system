import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import StaffLogin from './pages/Auth/StaffLogin';
import PatientsList from './pages/Patients/PatientsList';
import TransfersList from './pages/Transfers/TransfersList';
import StaffManagementList from './pages/Staff/StaffManagementList';

function MainPortal() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('patients');

  if (!user) {
    return <StaffLogin />;
  }

  return (
    <AppLayout activeModule={activeModule} onSelectModule={setActiveModule}>
      {activeModule === 'patients' && <PatientsList />}
      {activeModule === 'transfers' && <TransfersList />}
      {activeModule === 'staff' && <StaffManagementList />}
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