import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { role: 'it_admin', label: 'أحمد IT (مدير النظام)', email: 'admin@wafa.hospital', color: 'pine' },
  { role: 'accountant', label: 'المحاسب المالي (التحويلات)', email: 'accountant@wafa.hospital', color: 'amber' },
  { role: 'doctor', label: 'د. كمال النملة (طبيب معالج)', email: 'doctor.kamal@wafa.hospital', color: 'slate' },
  { role: 'registration_clerk', label: 'كاتب التسجيل وفتح الملفات', email: 'registration@wafa.hospital', color: 'green' },
  { role: 'data_lookup_clerk', label: 'كاتب الاستعلامات (قراءة فقط)', email: 'lookup@wafa.hospital', color: 'crimson' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wafa_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('wafa_auth_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we have token but no user, fetch me
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

  const switchDemoRole = async (email) => {
    return login(email, 'password123');
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

  // Helper flags
  const isItAdmin = user?.role === 'it_admin';
  const isManagementAdmin = user?.role === 'management_admin';
  const isAccountant = user?.role === 'accountant';
  const isDoctor = user?.role === 'doctor';
  const isRegistrationClerk = user?.role === 'registration_clerk';
  const isDataLookupClerk = user?.role === 'data_lookup_clerk';

  const canAccessTransfers = isAccountant;
  const canManageStaff = isItAdmin || isManagementAdmin;
  const canManageSystem = isItAdmin;
  const canManagePatients = isItAdmin || isManagementAdmin || isRegistrationClerk;
  const isReadOnly = isDataLookupClerk;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchDemoRole,
        isItAdmin,
        isManagementAdmin,
        isAccountant,
        isDoctor,
        isRegistrationClerk,
        isDataLookupClerk,
        canAccessTransfers,
        canManageStaff,
        canManageSystem,
        canManagePatients,
        isReadOnly,
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
