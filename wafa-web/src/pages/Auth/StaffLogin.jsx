import React, { useState } from 'react';
import { Building2, Lock, Mail, ShieldAlert, KeyRound, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';

export default function StaffLogin() {
  const { login, switchDemoRole, loading } = useAuth();
  const [email, setEmail] = useState('admin@wafa.hospital');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const res = await login(email, password);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMessage('');
    const res = await switchDemoRole(demoEmail);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-parchment)',
        padding: '24px',
      }}
    >
      <div
        className="clinical-card medical-file-tab"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-clinical-lg)',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'var(--hospital-pine)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(20, 77, 67, 0.3)',
              marginBottom: '14px',
            }}
          >
            <Building2 size={30} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--hospital-pine-dark)', lineHeight: '1.3' }}>
            مستشفى الوفاء للتأهيل الطبي والجراحة التخصصية
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            بوابة تسجيل دخول الكادر الطبي والإداري الموحدة (Staff Portal)
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-banner alert-crimson" style={{ marginBottom: '20px' }}>
            <ShieldAlert size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">البريد الإلكتروني المهني / اسم المستخدم</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-control"
                placeholder="name@wafa.hospital"
                style={{ paddingRight: '36px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-control"
                placeholder="••••••••"
                style={{ paddingRight: '36px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '11px', fontSize: '15px', fontWeight: '700', marginTop: '6px' }}
          >
            <KeyRound size={17} />
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
          </button>
        </form>

        {/* Quick Demo Role Switcher for Testing & Evaluation */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--clinical-slate)',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>اختبار الأدوار السريرية (RBAC Demo Accounts):</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>كلمة المرور: password123</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                className={`badge badge-${acc.color}`}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid var(--border-medium)',
                  transition: 'all 0.15s ease',
                }}
                title={`تسجيل الدخول كـ: ${acc.email}`}
              >
                <UserCheck size={12} />
                <span>{acc.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
