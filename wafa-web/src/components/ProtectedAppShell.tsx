import { AppShell } from './AppShell';
import { HospitalProvider } from '../context/HospitalContext';

export function ProtectedAppShell() {
  return <HospitalProvider><AppShell /></HospitalProvider>;
}
