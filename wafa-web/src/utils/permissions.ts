import type { SessionUser } from '../types';

// The protected financial owner is Eng. Mohammed Moqbil (Treasurer / أمين الصندوق).
export const PRIMARY_TREASURER_ID = '00000000-0000-4000-8000-000000000004';
export const CASHIER_ID = '00000000-0000-4000-8000-000000000002';
export const IT_HEAD_ID = '00000000-0000-4000-8000-000000000003';

// Backward-compatible name used by older screens: it now points to Eng. Mohammed.
export const PRIMARY_CASHIER_ID = PRIMARY_TREASURER_ID;

export const isPrimaryCashier = (user?: SessionUser | null) =>
  Boolean(user && (user.id === PRIMARY_TREASURER_ID || user.username.toLowerCase() === 'eng.mohammed_moqbil'));

export const isBillingCashier = (user?: SessionUser | null) =>
  Boolean(user && (user.id === CASHIER_ID || user.username.toLowerCase() === 'cashier'));

export const isItHead = (user?: SessionUser | null) =>
  Boolean(user && (user.id === IT_HEAD_ID || user.username.toLowerCase() === 'eng.ahmed_jaber'));

export const hasPermission = (user: SessionUser | null | undefined, permission: string) =>
  user?.permissions.includes(permission) ?? false;

export const canEditClinicalData = (user?: SessionUser | null) =>
  hasPermission(user, 'patients.update');

export const canManageHospitalStructure = (user?: SessionUser | null) =>
  hasPermission(user, 'doctors.create') || hasPermission(user, 'clinics.create');

// Financial branch access follows explicit permissions. Only the protected treasury owner can grant
// financial permissions from Users & Permissions, so branch users remain least-privilege.
export const canViewPatientFinance = (user?: SessionUser | null) =>
  hasPermission(user, 'patient_finance.view');

export const canRegisterVisits = (user?: SessionUser | null) =>
  hasPermission(user, 'visits.create');

export const canUseBilling = (user?: SessionUser | null) =>
  hasPermission(user, 'billing.view') || hasPermission(user, 'billing.create');

export const canViewFinancialReports = (user?: SessionUser | null) =>
  hasPermission(user, 'finance.view');

export const canEditVisitFees = (user?: SessionUser | null) =>
  hasPermission(user, 'clinics.fee_update');

export const canManageFinancialCatalog = (user?: SessionUser | null) =>
  hasPermission(user, 'diagnostic_catalog.manage');
