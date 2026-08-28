import React, { useState, useRef, useEffect } from 'react';
import { Building2, Calendar, UserCheck, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

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
        flexShrink: 0,
      }}
    >
      {/* Hospital Identity */}
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
            flexShrink: 0,
          }}
        >
          <Building2 size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--hospital-pine-dark)', lineHeight: '1.2' }}>
            مستشفى الوفاء للتأهيل الطبي والجراحة التخصصية
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>غزة — فلسطين</span>
            <span>•</span>
            <span>النظام الطبي والمعلوماتي الموحد</span>
          </p>
        </div>
      </div>

      {/* Right: Date, Notifications, User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Date */}
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

        {/* Notifications */}
        <NotificationDropdown />

        {/* User Account Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 12px 4px 6px',
              backgroundColor: 'var(--hospital-pine-light)',
              borderRadius: '24px',
              border: '1px solid var(--hospital-pine-border)',
              cursor: 'pointer',
            }}
          >
            {/* Avatar circle */}
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
                flexShrink: 0,
              }}
            >
              <UserCheck size={16} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--hospital-pine-dark)', lineHeight: '1.2', whiteSpace: 'nowrap' }}>
                {user?.name?.split(' ')[0] || 'المستخدم'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--clinical-slate)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={11} />
                <span style={{ whiteSpace: 'nowrap' }}>{user?.role_label || user?.role}</span>
              </div>
            </div>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--hospital-pine-dark)',
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                minWidth: '240px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-clinical-lg)',
                border: '1px solid var(--border-medium)',
                zIndex: 1100,
                overflow: 'hidden',
              }}
            >
              {/* User info block — display only */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--hospital-pine-light)',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--hospital-pine-dark)', marginBottom: '2px' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--clinical-slate)', marginBottom: '2px' }}>
                  {user?.email}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--hospital-pine)',
                    backgroundColor: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid var(--hospital-pine-border)',
                    marginTop: '4px',
                  }}
                >
                  <ShieldCheck size={11} />
                  <span>{user?.role_label || user?.role}</span>
                </div>
                {user?.department && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {user.department}
                  </div>
                )}
              </div>

              {/* Logout action */}
              <div style={{ padding: '6px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--surgical-crimson)',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    textAlign: 'right',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surgical-crimson-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={16} />
                  <span>تسجيل الخروج من النظام</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
