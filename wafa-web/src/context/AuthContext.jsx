import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wafa_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('wafa_auth_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we have a token but no user object (e.g. page refresh), re-fetch the profile
    if (token && !user) {
      authApi.me()
        .then((res) => {
          if (res.success) {
            setUser(res.user);
            localStorage.setItem('wafa_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          logout();
        });
    }
  }, [token, user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('wafa_auth_token', res.token);
        localStorage.setItem('wafa_user', JSON.stringify(res.user));
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        message: err.message || 'فشل تسجيل الدخول. يرجى مراجعة البيانات المدخلة.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout().catch(() => {});
      }
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('wafa_auth_token');
      localStorage.removeItem('wafa_user');
    }
  };

  // ── Role identity flags ────────────────────────────────────────────────────
  const isItAdmin          = user?.role === 'it_admin';
  const isManagementAdmin  = user?.role === 'management_admin';
  const isAccountant       = user?.role === 'accountant';
  const isDoctor           = user?.role === 'doctor';
  const isRegistrationClerk = user?.role === 'registration_clerk';
  const isDataLookupClerk  = user?.role === 'data_lookup_clerk';
  const isLabTech          = user?.role === 'lab_technician';
  const isPtSpecialist     = user?.role === 'pt_specialist';
  const isRadiologist      = user?.role === 'radiologist';
  const isSocialWorker     = user?.role === 'social_worker';

  // ── Feature-level access flags ─────────────────────────────────────────────
  // These are the ONLY gates used by Sidebar, components, and App route guards.
  // Never check role strings directly outside this file.
  const canAccessTransfers  = isAccountant;
  const canManageStaff      = isItAdmin || isManagementAdmin;
  const canManageSystem     = isItAdmin;
  const canManagePatients   = isItAdmin || isManagementAdmin || isRegistrationClerk;
  const canViewPatients     = isItAdmin || isManagementAdmin || isRegistrationClerk || isDataLookupClerk || isDoctor;
  const isReadOnly          = isDataLookupClerk;

  const canAccessClinical   = isManagementAdmin || isDoctor || isItAdmin;
  const canAccessLab        = isManagementAdmin || isLabTech || isItAdmin;
  const canAccessPt         = isManagementAdmin || isPtSpecialist || isDoctor || isItAdmin;
  const canAccessRadiology  = isManagementAdmin || isRadiologist || isItAdmin;
  const canAccessSocial     = isManagementAdmin || isSocialWorker || isItAdmin;
  const canAccessInpatient  = isManagementAdmin || isDoctor || isRegistrationClerk || isItAdmin;
  const canAccessReports    = isManagementAdmin || isItAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        // Role identity
        isItAdmin,
        isManagementAdmin,
        isAccountant,
        isDoctor,
        isRegistrationClerk,
        isDataLookupClerk,
        isLabTech,
        isPtSpecialist,
        isRadiologist,
        isSocialWorker,
        // Feature-level access
        canAccessTransfers,
        canManageStaff,
        canManageSystem,
        canManagePatients,
        canViewPatients,
        isReadOnly,
        canAccessClinical,
        canAccessLab,
        canAccessPt,
        canAccessRadiology,
        canAccessSocial,
        canAccessInpatient,
        canAccessReports,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
