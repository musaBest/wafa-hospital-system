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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeModule = 'patients', onSelectModule }) {
  const { user, isAccountant, canManageStaff } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    secretariat: true,
    clinics: false,
    therapy: false,
    lab: false,
    radiology: false,
    social: false,
    billing: true,
    computer: true,
    reports: false,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const navModules = [
    {
      key: 'secretariat',
      title: 'السكرتاريا الطبية',
      icon: <Users size={18} />,
      items: [
        { id: 'patients', label: 'سجل وملفات المرضى (Patients)', activeId: 'patients' },
        { id: 'inpatient', label: 'مرضى المبيت (Inpatient Admissions)', disabled: true, tag: 'قريباً' },
        { id: 'urodynamics', label: 'ديناميكية التبول (Urodynamic)', disabled: true, tag: 'قريباً' },
      ],
    },
    {
      key: 'billing',
      title: 'صندوق الفواتير والحسابات',
      icon: <Receipt size={18} />,
      items: [
        {
          id: 'transfers',
          label: 'التحويلات والدفعات (Transfers & Cashier)',
          activeId: 'transfers',
          tag: isAccountant ? 'متاح للمحاسب' : 'مقيد للمحاسب فقط',
        },
        { id: 'account_statement', label: 'كشف حساب المريض المطبوع', disabled: true, tag: 'Phase 4' },
      ],
    },
    {
      key: 'computer',
      title: 'الحاسوب وتكنولوجيا المعلومات',
      icon: <Laptop size={18} />,
      items: [
        {
          id: 'staff',
          label: 'إدارة الكادر والصلاحيات (Staff & RBAC)',
          activeId: 'staff',
          tag: canManageStaff ? 'صلاحيات الإدارة' : 'مدير النظام فقط',
        },
      ],
    },
    {
      key: 'clinics',
      title: 'عيادات خارجية',
      icon: <Stethoscope size={18} />,
      items: [
        { id: 'outpatient_visits', label: 'العيادات الطبية الخارجية', disabled: true, tag: 'Phase 2' },
        { id: 'dental', label: 'عيادة الأسنان (Dental Clinic)', disabled: true, tag: 'Phase 2' },
      ],
    },
    {
      key: 'therapy',
      title: 'علاج طبيعي وتأهيل',
      icon: <Activity size={18} />,
      items: [
        { id: 'pt_sessions', label: 'ملف وجلسات العلاج الطبيعي', disabled: true, tag: 'Phase 2' },
        { id: 'pt_exemptions', label: 'تسجيل إعفاءات العلاج الطبيعي', disabled: true, tag: 'Phase 2' },
      ],
    },
    {
      key: 'lab',
      title: 'المختبرات والتحاليل',
      icon: <FlaskConical size={18} />,
      items: [
        { id: 'lab_orders', label: 'الفحوصات والتحاليل الطبية', disabled: true, tag: 'Phase 3' },
        { id: 'lab_microbiology', label: 'زراعة الميكروبيولوجي والحساسية', disabled: true, tag: 'Phase 3' },
      ],
    },
    {
      key: 'radiology',
      title: 'قسم الأشعة والتصوير',
      icon: <Scan size={18} />,
      items: [
        { id: 'radiology_exams', label: 'فحوصات وتقارير الأشعة', disabled: true, tag: 'Phase 4' },
      ],
    },
    {
      key: 'social',
      title: 'خدمات طبية واجتماعية',
      icon: <HeartHandshake size={18} />,
      items: [
        { id: 'social_assistance', label: 'مساعدات ومساهمات الأجهزة الطبية', disabled: true, tag: 'Phase 4' },
      ],
    },
    {
      key: 'reports',
      title: 'الاستعلامات والتقارير',
      icon: <BarChart3 size={18} />,
      items: [
        { id: 'general_queries', label: 'استعلامات وبحث شامل', disabled: true, tag: 'Phase 5' },
        { id: 'kpi_dashboard', label: 'لوحة المؤشرات السريرية (KPIs)', disabled: true, tag: 'Phase 5' },
      ],
    },
  ];

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
      }}
    >
      {/* Hospital System Brand Bar */}
      <div
        style={{
          padding: collapsed ? '16px 8px' : '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          backgroundColor: '#F8FAFC',
        }}
      >
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--hospital-pine-dark)' }}>
                مستشفى الوفاء
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
          style={{ padding: '4px', border: 'none', background: 'transparent' }}
          title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 6px' : '12px' }}>
        {navModules.map((module) => {
          const isExpanded = expandedSections[module.key];
          const hasActiveChild = module.items.some((i) => i.id === activeModule);

          return (
            <div key={module.key} style={{ marginBottom: '8px' }}>
              {/* Module Header Button */}
              <button
                onClick={() => toggleSection(module.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: hasActiveChild ? 'var(--hospital-pine-light)' : 'transparent',
                  color: hasActiveChild ? 'var(--hospital-pine-dark)' : 'var(--clinical-slate)',
                  fontWeight: hasActiveChild ? '700' : '600',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.15s ease',
                }}
                title={collapsed ? module.title : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: hasActiveChild ? 'var(--hospital-pine)' : 'var(--text-muted)' }}>
                    {module.icon}
                  </span>
                  {!collapsed && <span>{module.title}</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'var(--text-muted)',
                    }}
                  />
                )}
              </button>

              {/* Sub-items */}
              {!collapsed && isExpanded && (
                <div style={{ margin: '4px 0 6px 12px', paddingRight: '14px', borderRight: '2px solid var(--border-light)' }}>
                  {module.items.map((item) => {
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
                          margin: '2px 0',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: isActive ? 'var(--hospital-pine)' : 'transparent',
                          color: isActive
                            ? '#FFFFFF'
                            : item.disabled
                            ? 'var(--text-muted)'
                            : 'var(--clinical-slate-dark)',
                          fontSize: '12.5px',
                          fontWeight: isActive ? '600' : '400',
                          cursor: item.disabled ? 'not-allowed' : 'pointer',
                          textAlign: 'right',
                          opacity: item.disabled ? 0.7 : 1,
                          position: 'relative',
                        }}
                      >
                        <span>{item.label}</span>
                        {item.tag && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                              color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                              border: '1px solid var(--border-light)',
                            }}
                          >
                            {item.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: '#F8FAFC',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>الإصدار 2.0 (Modernized)</span>
          <span className="badge badge-pine" style={{ fontSize: '10px' }}>
            مستشفى الوفاء
          </span>
        </div>
      )}
    </aside>
  );
}
