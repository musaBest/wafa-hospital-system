import React, { useState } from 'react';
import {
  X,
  Printer,
  Edit,
  User,
  HeartPulse,
  MapPin,
  Calendar,
  Phone,
  FileText,
  AlertTriangle,
  Activity,
  FlaskConical,
  Scan,
  Receipt,
  IdCard,
} from 'lucide-react';

export default function PatientDetailsModal({ isOpen, onClose, patient, onEdit }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !patient) return null;

  const getMaritalStatusLabel = (status) => {
    const map = {
      single: 'أعزب / آنسة',
      married: 'متزوج / ة',
      divorced: 'مطلق / ة',
      widowed: 'أرمل / ة',
    };
    return map[status] || status || 'غير محدد';
  };

  const getRefugeeLabel = (status) => {
    return status === 'refugee' ? 'لاجئ (Refugee)' : 'مواطن (Citizen)';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content medical-file-tab"
        style={{ maxWidth: '880px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="modal-header" style={{ backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'var(--hospital-pine)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--hospital-pine-dark)' }}>
                  {patient.full_name}
                </h2>
                <span className="badge badge-pine num-tabular" style={{ fontSize: '13px', fontWeight: '700' }}>
                  ملف رقم: {patient.patient_id}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                سنة الدخول: {patient.admission_year} • الهوية الفلسطينية:{' '}
                <span className="num-tabular">{patient.national_id || 'غير مسجلة'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm" title="طباعة كشف المريض">
              <Printer size={15} />
              <span>طباعة</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(patient);
              }}
              className="btn btn-outline-pine btn-sm"
            >
              <Edit size={15} />
              <span>تعديل الملف</span>
            </button>
            <button onClick={onClose} className="btn-icon" style={{ border: 'none' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Medical Allergy Banner if present */}
        {patient.allergies && patient.allergies.trim() !== '' && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: 'var(--surgical-crimson-bg)',
              borderBottom: '1px solid var(--surgical-crimson-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--surgical-crimson)',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <AlertTriangle size={17} />
            <span>تحذير طبي سريري: {patient.allergies}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-light)',
            padding: '0 24px',
            backgroundColor: '#FFFFFF',
            gap: '16px',
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 4px',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid var(--hospital-pine)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'overview' ? 'var(--hospital-pine)' : 'var(--text-muted)',
              fontWeight: activeTab === 'overview' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            البيانات الأساسية والاجتماعية
          </button>

          <button
            onClick={() => setActiveTab('clinical')}
            style={{
              padding: '12px 4px',
              border: 'none',
              borderBottom: activeTab === 'clinical' ? '2px solid var(--hospital-pine)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'clinical' ? 'var(--hospital-pine)' : 'var(--text-muted)',
              fontWeight: activeTab === 'clinical' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            السجل الطبي والخدمات المرتبطة
          </button>
        </div>

        {/* Tab Body */}
        <div className="modal-body">
          {activeTab === 'overview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Overview Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  backgroundColor: 'var(--bg-parchment)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>الجنس والعمر</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--clinical-slate-dark)' }}>
                    {patient.gender === 'female' ? 'أنثى' : 'ذكر'}{' '}
                    {patient.age !== null && <span className="num-tabular">({patient.age} سنة)</span>}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>تاريخ الميلاد</div>
                  <div className="num-tabular" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--clinical-slate-dark)' }}>
                    {patient.birth_date ? patient.birth_date.split('T')[0] : 'غير مسجل'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>الحالة الاجتماعية</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--clinical-slate-dark)' }}>
                    {getMaritalStatusLabel(patient.marital_status)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>فصيلة الدم</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--surgical-crimson)' }}>
                    {patient.blood_type || 'غير محددة'}
                  </div>
                </div>
              </div>

              {/* Demographics & Residence Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="clinical-card">
                  <div className="clinical-card-header">
                    <div className="clinical-card-title">
                      <MapPin size={16} style={{ color: 'var(--hospital-pine)' }} />
                      <span>السكن والاتصال</span>
                    </div>
                  </div>
                  <div className="clinical-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المحافظة: </span>
                      <strong style={{ fontSize: '13px' }}>{patient.region || 'غير محدد'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>الحي / المخيم: </span>
                      <strong style={{ fontSize: '13px' }}>{patient.city_or_area || 'غير محدد'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>رقم الهاتف / الجوال: </span>
                      <strong className="num-tabular" style={{ fontSize: '13px' }}>
                        {patient.phone || 'غير مسجل'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="clinical-card">
                  <div className="clinical-card-header">
                    <div className="clinical-card-title">
                      <IdCard size={16} style={{ color: 'var(--hospital-pine)' }} />
                      <span>الوضع الاجتماعي والمهنة</span>
                    </div>
                  </div>
                  <div className="clinical-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>صفة المواطنة: </span>
                      <span className="badge badge-slate" style={{ fontSize: '12px' }}>
                        {getRefugeeLabel(patient.refugee_status)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>بطاقة التموين (UNRWA): </span>
                      <strong className="num-tabular" style={{ fontSize: '13px' }}>
                        {patient.ration_card_no || 'غير مسجلة'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المهنة: </span>
                      <strong style={{ fontSize: '13px' }}>{patient.occupation || 'غير محدد'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {patient.notes && (
                <div className="clinical-card">
                  <div className="clinical-card-header">
                    <div className="clinical-card-title">
                      <FileText size={16} style={{ color: 'var(--hospital-pine)' }} />
                      <span>الملاحظات السريرية الأولية</span>
                    </div>
                  </div>
                  <div className="clinical-card-body" style={{ fontSize: '13.5px', color: 'var(--clinical-slate-dark)' }}>
                    {patient.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Clinical History & Connected Modules Preview */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--hospital-pine-light)',
                  borderRadius: '6px',
                  border: '1px solid var(--hospital-pine-border)',
                  fontSize: '13px',
                  color: 'var(--hospital-pine-dark)',
                }}
              >
                يتم ربط جميع العمليات السريرية، جلسات العلاج الطبيعي، التحاليل المخبرية، وفواتير الصندوق تلقائياً برقم هذا الملف (
                <strong className="num-tabular">{patient.patient_id}</strong>).
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div className="stat-item" style={{ padding: '12px 16px' }}>
                  <div className="stat-content">
                    <div className="stat-label">جلسات العلاج الطبيعي</div>
                    <div className="stat-value">0</div>
                  </div>
                  <div className="stat-icon-wrapper">
                    <Activity size={20} />
                  </div>
                </div>

                <div className="stat-item" style={{ padding: '12px 16px' }}>
                  <div className="stat-content">
                    <div className="stat-label">الفحوصات المخبرية</div>
                    <div className="stat-value">0</div>
                  </div>
                  <div className="stat-icon-wrapper amber">
                    <FlaskConical size={20} />
                  </div>
                </div>

                <div className="stat-item" style={{ padding: '12px 16px' }}>
                  <div className="stat-content">
                    <div className="stat-label">تقارير الأشعة</div>
                    <div className="stat-value">0</div>
                  </div>
                  <div className="stat-icon-wrapper slate">
                    <Scan size={20} />
                  </div>
                </div>

                <div className="stat-item" style={{ padding: '12px 16px' }}>
                  <div className="stat-content">
                    <div className="stat-label">رصيد الحساب المالي</div>
                    <div className="stat-value">0 ₪</div>
                  </div>
                  <div className="stat-icon-wrapper crimson">
                    <Receipt size={20} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
