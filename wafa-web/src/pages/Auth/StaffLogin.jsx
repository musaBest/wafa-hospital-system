import React, { useState } from 'react';
import { Building2, Lock, Mail, ShieldAlert, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StaffLogin() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const res = await login(email, password);
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
          maxWidth: '480px',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-clinical-lg)',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: 'var(--hospital-pine)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(20, 77, 67, 0.3)',
              marginBottom: '16px',
            }}
          >
            <Building2 size={32} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--hospital-pine-dark)', lineHeight: '1.3' }}>
            مستشفى الوفاء للتأهيل الطبي والجراحة التخصصية
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            بوابة تسجيل دخول الكادر الطبي والإداري المعتمد
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">البريد الإلكتروني المهني</label>
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
                className="form-control num-tabular"
                placeholder="name@wafa.hospital"
                style={{ paddingRight: '36px' }}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">كلمة المرور السرية</label>
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
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: '700', marginTop: '6px' }}
          >
            <KeyRound size={17} />
            <span>{loading ? 'جاري التحقق والمصادقة...' : 'تسجيل الدخول للنظام'}</span>
          </button>
        </form>

        {/* Security Notice Footer */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '18px',
            borderTop: '1px solid var(--border-light)',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={14} style={{ color: 'var(--hospital-pine)' }} />
          <span>نظام محمي ومشفر — يتم تسجيل وتدقيق كافة عمليات الدخول</span>
        </div>
      </div>
    </div>
  );
}
