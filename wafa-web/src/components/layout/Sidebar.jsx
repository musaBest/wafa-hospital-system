import React, { useState } from 'react';
import {
  Users,
  BedDouble,
  Stethoscope,
  Activity,
  FlaskConical,
  Scan,
  HeartHandshake,
  Receipt,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hospital,
  Shield,
  Laptop,
  Eye,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * ROLE-BASED NAVIGATION STANDARD (document for all future phases):
 *
 * Each navSection declares a `visible` flag evaluated from AuthContext helpers.
 * A section is shown ONLY when `visible === true`. Items within a section can
 * also be individually gated with `visible`. New modules added in future phases
 * MUST follow this pattern — declare which roles can see the section/item using
 * the feature-level flags exported from AuthContext (e.g. `canAccessLab`,
 * `canAccessClinical`), NOT by checking role strings directly in this file.
 *
 * This ensures:
 * 1. Each staff member sees ONLY their scoped modules — no locked/greyed items.
 * 2. Role changes propagate automatically from AuthContext without touching JSX.
 * 3. Backend middleware remains the authoritative security boundary (defense-in-depth).
 */

export default function Sidebar({ activeModule = 'patients', onSelectModule }) {
  const auth = useAuth();
  const {
    canViewPatients,
    canManagePatients,
    canAccessTransfers,
    canManageStaff,
    canManageSystem,
    canAccessClinical,
    canAccessLab,
    canAccessPt,
    canAccessRadiology,
    canAccessSocial,
    canAccessInpatient,
    canAccessReports,
    isManagementAdmin,
    isItAdmin,
    isAccountant,
    isDataLookupClerk,
    isRegistrationClerk,
    isReadOnly,
    user,
  } = auth;

  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NAV SECTIONS — each section declares `visible` and each item may too.
  // Sections with visible: false are not rendered at all.
  // ─────────────────────────────────────────────────────────────────────────
  const navSections = [

    // ── PATIENTS / SECRETARIAT ──────────────────────────────────────────
    {
      key: 'secretariat',
      title: isDataLookupClerk ? 'استعلام وبحث السجلات (قراءة فقط)' : 'السكرتاريا الطبية وسجل المرضى',
      icon: <Users size={18} />,
      visible: canViewPatients,
      items: [
        {
          id: 'patients',
          label: isDataLookupClerk ? 'بحث واستعلام ملفات المرضى' : 'سجل وملفات المرضى (Patients Registry)',
          visible: true,
          badge: isReadOnly ? { text: 'قراءة فقط', color: 'slate' } : null,
        },
        {
          id: 'inpatient',
          label: 'مرضى المبيت (Inpatient Admissions)',
          visible: canAccessInpatient,
          disabled: true,
          tag: 'Phase 2',
        },
        {
          id: 'urodynamics',
          label: 'ديناميكية التبول (Urodynamic)',
          visible: isManagementAdmin || isItAdmin,
          disabled: true,
          tag: 'Phase 2',
        },
      ],
    },

    // ── OUTPATIENT CLINICS ───────────────────────────────────────────────
    {
      key: 'clinics',
      title: 'العيادات الطبية الخارجية',
      icon: <Stethoscope size={18} />,
      visible: canAccessClinical,
      items: [
        { id: 'outpatient_visits', label: 'العيادات الطبية الخارجية', visible: true, disabled: true, tag: 'Phase 2' },
        { id: 'dental', label: 'عيادة الأسنان (Dental Clinic)', visible: true, disabled: true, tag: 'Phase 2' },
      ],
    },

    // ── PHYSICAL THERAPY ─────────────────────────────────────────────────
    {
      key: 'therapy',
      title: 'علاج طبيعي وتأهيل (PT)',
      icon: <Activity size={18} />,
      visible: canAccessPt,
      items: [
        { id: 'pt_sessions', label: 'ملف وجلسات العلاج الطبيعي', visible: true, disabled: true, tag: 'Phase 2' },
        { id: 'pt_exemptions', label: 'إعفاءات العلاج الطبيعي', visible: true, disabled: true, tag: 'Phase 2' },
      ],
    },

    // ── LABORATORY ───────────────────────────────────────────────────────
    {
      key: 'lab',
      title: 'المختبرات والتحاليل الطبية',
      icon: <FlaskConical size={18} />,
      visible: canAccessLab,
      items: [
        { id: 'lab_orders', label: 'الفحوصات والتحاليل الطبية', visible: true, disabled: true, tag: 'Phase 3' },
        { id: 'lab_microbiology', label: 'الميكروبيولوجيا وحساسية المضادات', visible: true, disabled: true, tag: 'Phase 3' },
      ],
    },

    // ── RADIOLOGY ────────────────────────────────────────────────────────
    {
      key: 'radiology',
      title: 'الأشعة والتصوير الطبي',
      icon: <Scan size={18} />,
      visible: canAccessRadiology,
      items: [
        { id: 'radiology_exams', label: 'فحوصات وتقارير الأشعة', visible: true, disabled: true, tag: 'Phase 4' },
      ],
    },

    // ── SOCIAL SERVICES ──────────────────────────────────────────────────
    {
      key: 'social',
      title: 'الخدمات الاجتماعية والمساعدات',
      icon: <HeartHandshake size={18} />,
      visible: canAccessSocial,
      items: [
        { id: 'social_assistance', label: 'مساهمات ومساعدات الأجهزة الطبية', visible: true, disabled: true, tag: 'Phase 4' },
      ],
    },

    // ── FINANCIAL (ACCOUNTANT ONLY) ───────────────────────────────────────
    {
      key: 'billing',
      title: 'صندوق التحويلات والمدفوعات',
      icon: <Receipt size={18} />,
      visible: canAccessTransfers,      // ONLY rendered for accountant role
      items: [
        { id: 'transfers', label: 'التحويلات والدفعات (Cashier & Receipts)', visible: true },
        { id: 'account_statement', label: 'كشف حساب المريض المطبوع', visible: true, disabled: true, tag: 'Phase 4' },
      ],
    },

    // ── STAFF & SYSTEM ADMIN ──────────────────────────────────────────────
    {
      key: 'computer',
      title: 'إدارة الكادر والنظام',
      icon: <Laptop size={18} />,
      visible: canManageStaff,
      items: [
        {
          id: 'staff',
          label: 'إدارة حسابات وصلاحيات الكادر',
          visible: true,
          badge: isItAdmin ? { text: 'مدير النظام', color: 'pine' } : null,
        },
        {
          id: 'system_settings',
          label: 'إعدادات وضبط النظام',
          visible: canManageSystem,     // IT Admin only
          disabled: true,
          tag: 'Phase 5',
        },
        {
          id: 'clinic_config',
          label: 'إدارة العيادات والأقسام',
          visible: canManageSystem,     // IT Admin only
          disabled: true,
          tag: 'Phase 5',
        },
      ],
    },

    // ── REPORTS & ANALYTICS ───────────────────────────────────────────────
    {
      key: 'reports',
      title: 'الاستعلامات والتقارير والإحصاء',
      icon: <BarChart3 size={18} />,
      visible: canAccessReports,
      items: [
        { id: 'general_queries', label: 'استعلامات وبحث شامل', visible: true, disabled: true, tag: 'Phase 5' },
        { id: 'kpi_dashboard', label: 'لوحة المؤشرات السريرية (KPIs)', visible: true, disabled: true, tag: 'Phase 5' },
      ],
    },
  ];

  // Filter out hidden sections and items
  const visibleSections = navSections
    .filter((s) => s.visible)
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.visible !== false),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: 'var(--shadow-clinical-sm)',
        transition: 'width 0.2s ease',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Hospital Brand Bar */}
      <div
        style={{
          padding: collapsed ? '16px 8px' : '14px 16px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          backgroundColor: '#F8FAFC',
          flexShrink: 0,
        }}
      >
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'var(--hospital-pine)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Hospital size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--hospital-pine-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                مستشفى الوفاء
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                بوابة الكادر الطبي الموحدة
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--hospital-pine)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Hospital size={18} />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-icon"
          style={{ padding: '4px', border: 'none', background: 'transparent', flexShrink: 0 }}
          title={collapsed ? 'توسيع القائمة الجانبية' : 'تصغير القائمة الجانبية'}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Role Badge */}
      {!collapsed && user && (
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: 'var(--hospital-pine-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            flexShrink: 0,
          }}
        >
          <Shield size={13} style={{ color: 'var(--hospital-pine)' }} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--hospital-pine-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.role_label || user.role} — {user.name?.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '10px 6px' : '10px 8px' }}>
        {visibleSections.map((section) => {
          const isExpanded = expandedSections[section.key] !== false; // default open
          const hasActiveChild = section.items.some((i) => i.id === activeModule);

          return (
            <div key={section.key} style={{ marginBottom: '4px' }}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: hasActiveChild ? 'var(--hospital-pine-light)' : 'transparent',
                  color: hasActiveChild ? 'var(--hospital-pine-dark)' : 'var(--clinical-slate)',
                  fontWeight: hasActiveChild ? '700' : '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'background-color 0.15s ease',
                }}
                title={collapsed ? section.title : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ color: hasActiveChild ? 'var(--hospital-pine)' : 'var(--text-muted)', flexShrink: 0 }}>
                    {section.icon}
                  </span>
                  {!collapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {section.title}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={13}
                    style={{
                      flexShrink: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'var(--text-muted)',
                    }}
                  />
                )}
              </button>

              {/* Section Items */}
              {!collapsed && isExpanded && (
                <div
                  style={{
                    margin: '2px 0 4px 10px',
                    paddingRight: '12px',
                    borderRight: '2px solid var(--border-light)',
                  }}
                >
                  {section.items.map((item) => {
                    const isActive = item.id === activeModule;
                    return (
                      <button
                        key={item.id}
                        onClick={() => !item.disabled && onSelectModule && onSelectModule(item.id)}
                        disabled={item.disabled}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          margin: '1px 0',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: isActive ? 'var(--hospital-pine)' : 'transparent',
                          color: isActive ? '#FFFFFF' : item.disabled ? 'var(--text-muted)' : 'var(--clinical-slate-dark)',
                          fontSize: '12.5px',
                          fontWeight: isActive ? '600' : '400',
                          cursor: item.disabled ? 'not-allowed' : 'pointer',
                          textAlign: 'right',
                          opacity: item.disabled ? 0.6 : 1,
                          transition: 'background-color 0.1s ease',
                          gap: '6px',
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.label}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          {item.badge && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--hospital-pine-light)',
                                color: isActive ? '#FFFFFF' : 'var(--hospital-pine-dark)',
                                border: isActive ? 'none' : '1px solid var(--hospital-pine-border)',
                                fontWeight: '600',
                              }}
                            >
                              {item.badge.text}
                            </span>
                          )}
                          {item.tag && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                                color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                                border: '1px solid var(--border-light)',
                              }}
                            >
                              {item.tag}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: '#F8FAFC',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span>الإصدار 2.0 (Modernized)</span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '3px',
              backgroundColor: 'var(--hospital-pine-light)',
              color: 'var(--hospital-pine-dark)',
              fontWeight: '600',
            }}
          >
            مستشفى الوفاء
          </span>
        </div>
      )}
    </aside>
  );
}
