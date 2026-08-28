import React, { useState } from 'react';
import { Building2, Calendar, UserCheck, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const { user, logout, switchDemoRole } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-clinical-sm)',
      }}
    >
      {/* Hospital Identity Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: 'var(--hospital-pine)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 4px rgba(20, 77, 67, 0.25)',
          }}
        >
          <Building2 size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--hospital-pine-dark)', lineHeight: '1.2' }}>
            مستشفى الوفاء للتأهيل الطبي والجراحة التخصصية
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>غزة - فلسطين</span>
            <span>•</span>
            <span>النظام الطبي والمعلوماتي الموحد</span>
          </p>
        </div>
      </div>

      {/* Right Side Utilities: Date, Notifications, Staff Profile & Role Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Date Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--clinical-slate)',
            backgroundColor: 'var(--bg-subtle)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-light)',
          }}
        >
          <Calendar size={15} style={{ color: 'var(--hospital-pine)' }} />
          <span>{currentDate}</span>
        </div>

        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* Staff Profile & Role Switcher Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 12px 4px 6px',
              backgroundColor: 'var(--hospital-pine-light)',
              borderRadius: '24px',
              border: '1px solid var(--hospital-pine-border)',
              cursor: 'pointer',
              textAlign: 'right',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--hospital-pine-dark)', lineHeight: '1.2' }}>
                {user?.name || 'كادر طبي'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--clinical-slate)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={11} />
                <span>{user?.role_label || user?.role || 'مستخدم'}</span>
              </div>
            </div>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--hospital-pine)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={16} />
            </div>
            <ChevronDown size={14} style={{ color: 'var(--hospital-pine-dark)' }} />
          </button>

          {/* Role Switcher Menu */}
          {showRoleSwitcher && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '300px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-clinical-lg)',
                border: '1px solid var(--border-medium)',
                zIndex: 1100,
                padding: '8px',
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                تبديل الدور للتجربة (RBAC Switcher):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 0' }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    onClick={() => {
                      switchDemoRole(acc.email);
                      setShowRoleSwitcher(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: user?.role === acc.role ? 'var(--hospital-pine-light)' : 'transparent',
                      color: user?.role === acc.role ? 'var(--hospital-pine-dark)' : 'var(--text-body)',
                      fontWeight: user?.role === acc.role ? '700' : '400',
                      fontSize: '12.5px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{acc.label}</span>
                    {user?.role === acc.role && <span className="badge badge-pine" style={{ fontSize: '10px' }}>الحالي</span>}
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    logout();
                    setShowRoleSwitcher(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--surgical-crimson)',
                    fontSize: '13px',
                    fontWeight: '600',
                    textAlign: 'right',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <LogOut size={15} />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
