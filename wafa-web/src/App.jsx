import React, { useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import PatientsList from './pages/Patients/PatientsList';

export default function App() {
  const [activeModule, setActiveModule] = useState('patients');

  return (
    <AppLayout activeModule={activeModule} onSelectModule={setActiveModule}>
      {activeModule === 'patients' && <PatientsList />}
    </AppLayout>
  );
}