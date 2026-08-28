import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  HeartPulse,
  IdCard,
  Building,
  UserCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { patientsApi } from '../../services/api';
import PatientFormModal from './PatientFormModal';
import PatientDetailsModal from './PatientDetailsModal';

export default function PatientsList() {
  const { user, canManagePatients, isReadOnly } = useAuth();
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    current_page: 1,
    per_page: 15,
    total_pages: 1,
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterRefugee, setFilterRefugee] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Fetch Patients List
  const fetchPatients = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await patientsApi.list({
        page,
        per_page: 15,
        search: searchTerm,
        region: filterRegion,
        gender: filterGender,
        refugee_status: filterRefugee,
      });

      if (res.success) {
        setPatients(res.data || []);
        setPagination(res.pagination || {});
      }
    } catch (err) {
      console.error('Failed to load patients list:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterRegion, filterGender, filterRefugee]);

  // Fetch Statistics
  const fetchStats = async () => {
    try {
      const res = await patientsApi.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchPatients(1);
    fetchStats();
  }, [fetchPatients]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRegion('');
    setFilterGender('');
    setFilterRefugee('');
  };

  const handleCreate = () => {
    if (isReadOnly) return;
    setSelectedPatientForEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (patient) => {
    if (isReadOnly) return;
    setSelectedPatientForEdit(patient);
    setIsFormOpen(true);
  };

  const handleView = (patient) => {
    setSelectedPatientForDetails(patient);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (patient) => {
    if (isReadOnly) return;
    if (
      window.confirm(
        `هل أنت متأكد من رغبتك في أرشفة وحذف ملف المريض: ${patient.full_name} (${patient.patient_id})؟`
      )
    ) {
      try {
        const res = await patientsApi.delete(patient.id);
        if (res.success) {
          setFeedbackMessage(res.message);
          fetchPatients(pagination.current_page);
          fetchStats();
          setTimeout(() => setFeedbackMessage(null), 4000);
        }
      } catch (err) {
        alert(err.message || 'فشل حذف المريض');
      }
    }
  };

  const handleFormSuccess = (message) => {
    setFeedbackMessage(message);
    fetchPatients(pagination.current_page);
    fetchStats();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div>
      {/* Page Title Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: '800',
              color: 'var(--hospital-pine-dark)',
              lineHeight: '1.3',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Users size={24} style={{ color: 'var(--hospital-pine)' }} />
            <span>سجل وملفات المرضى (Patients Registry)</span>
            {isReadOnly && (
              <span className="badge badge-slate" style={{ fontSize: '11px', fontWeight: '600' }}>
                وضع الاستعلام والقراءة فقط
              </span>
            )}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            إدارة وتوثيق السجلات والملفات الطبية المركزية لمستشفى الوفاء
          </p>
        </div>

        {canManagePatients && (
          <button onClick={handleCreate} className="btn btn-primary">
            <UserPlus size={17} />
            <span>تسجيل مريض جديد (فتح ملف)</span>
          </button>
        )}
      </div>

      {/* Success / Feedback Alert */}
      {feedbackMessage && (
        <div className="alert-banner alert-pine">
          <UserCheck size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* KPI STATISTICS RIBBON */}
      <div className="stats-grid">
        <div className="stat-item medical-file-tab">
          <div className="stat-content">
            <div className="stat-label">إجمالي المرضى المسجلين</div>
            <div className="stat-value">{stats?.total_patients ?? '—'}</div>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={22} />
          </div>
        </div>

        <div className="stat-item medical-file-tab tab-slate">
          <div className="stat-content">
            <div className="stat-label">دخول العام الحالي (2026)</div>
            <div className="stat-value">{stats?.this_year_patients ?? '—'}</div>
          </div>
          <div className="stat-icon-wrapper slate">
            <Building size={22} />
          </div>
        </div>

        <div className="stat-item medical-file-tab tab-amber">
          <div className="stat-content">
            <div className="stat-label">التوزيع حسب الجنس</div>
            <div className="stat-value" style={{ fontSize: '18px' }}>
              <span style={{ color: 'var(--hospital-pine)' }}>{stats?.gender?.male ?? 0} ذكر</span>
              {' / '}
              <span style={{ color: 'var(--clinical-slate)' }}>{stats?.gender?.female ?? 0} أنثى</span>
            </div>
          </div>
          <div className="stat-icon-wrapper amber">
            <HeartPulse size={22} />
          </div>
        </div>

        <div className="stat-item medical-file-tab tab-crimson">
          <div className="stat-content">
            <div className="stat-label">الوضع الديموغرافي</div>
            <div className="stat-value" style={{ fontSize: '18px' }}>
              <span style={{ color: 'var(--clinical-slate-dark)' }}>{stats?.refugee_status?.refugee ?? 0} لاجئ</span>
              {' / '}
              <span style={{ color: 'var(--text-muted)' }}>{stats?.refugee_status?.citizen ?? 0} مواطن</span>
            </div>
          </div>
          <div className="stat-icon-wrapper crimson">
            <IdCard size={22} />
          </div>
        </div>
      </div>

      {/* SEARCH & MULTI-FILTER TOOLBAR */}
      <div
        className="clinical-card"
        style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 2fr) repeat(auto-fit, minmax(150px, 1fr)) auto',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
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
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهوية (9 أرقام)، رقم المريض، أو الجوال..."
                className="form-control"
                style={{ paddingRight: '36px' }}
              />
            </div>

            {/* Region Filter */}
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="form-select"
            >
              <option value="">كل المحافظات</option>
              <option value="غزة">محافظة غزة</option>
              <option value="الشمال">محافظة الشمال</option>
              <option value="الوسطى">محافظة الوسطى</option>
              <option value="خانيونس">محافظة خانيونس</option>
              <option value="رفح">محافظة رفح</option>
            </select>

            {/* Gender Filter */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="form-select"
            >
              <option value="">كل الجنسين</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>

            {/* Refugee Status Filter */}
            <select
              value={filterRefugee}
              onChange={(e) => setFilterRefugee(e.target.value)}
              className="form-select"
            >
              <option value="">الكل (مواطن / لاجئ)</option>
              <option value="refugee">لاجئ</option>
              <option value="citizen">مواطن</option>
            </select>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary btn-sm">
                <Search size={14} />
                <span>بحث</span>
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary btn-sm"
                title="إعادة التعيين"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CLINICAL DATA TABLE */}
      <div className="table-responsive">
        <table className="clinical-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>رقم المريض</th>
              <th style={{ width: '130px' }}>رقم الهوية</th>
              <th>الاسم الرباعي للمريض</th>
              <th style={{ width: '120px' }}>الجنس والعمر</th>
              <th style={{ width: '150px' }}>المحافظة والحي</th>
              <th style={{ width: '120px' }}>الهاتف / الجوال</th>
              <th style={{ width: '110px' }}>الوضع الاجتماعي</th>
              <th style={{ width: '140px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  جاري تحميل السجلات الطبية...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={36} style={{ color: 'var(--border-medium)', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--clinical-slate-dark)' }}>
                    لم يتم العثور على سجلات مطابقة
                  </div>
                  <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    تأكد من صحة مصطلح البحث أو الفلاتر المحددة.
                  </p>
                </td>
              </tr>
            ) : (
              patients.map((patient) => {
                const hasAllergy = patient.allergies && patient.allergies.trim() !== '';

                return (
                  <tr key={patient.id} className="medical-file-tab">
                    <td>
                      <span className="badge badge-pine num-tabular" style={{ fontWeight: '700' }}>
                        {patient.patient_id}
                      </span>
                    </td>

                    <td className="num-tabular" style={{ fontWeight: '600', color: 'var(--clinical-slate-dark)' }}>
                      {patient.national_id || '—'}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--clinical-slate-dark)' }}>
                          {patient.full_name}
                        </span>
                        {hasAllergy && (
                          <span
                            className="badge badge-crimson"
                            style={{ fontSize: '10px', padding: '1px 5px' }}
                            title={`تحذير طبي: ${patient.allergies}`}
                          >
                            حساسية
                          </span>
                        )}
                      </div>
                      {patient.blood_type && (
                        <span style={{ fontSize: '11px', color: 'var(--surgical-crimson)', fontWeight: '600' }}>
                          فصيلة الدم: {patient.blood_type}
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '13px' }}>
                        {patient.gender === 'female' ? 'أنثى' : 'ذكر'}
                      </div>
                      {patient.age !== null && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }} className="num-tabular">
                          {patient.age} سنة
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{patient.region || '—'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {patient.city_or_area || ''}
                      </div>
                    </td>

                    <td className="num-tabular" style={{ fontSize: '13px', color: 'var(--clinical-slate)' }}>
                      {patient.phone || '—'}
                    </td>

                    <td>
                      <span
                        className={`badge ${patient.refugee_status === 'refugee' ? 'badge-slate' : 'badge-pine'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {patient.refugee_status === 'refugee' ? 'لاجئ' : 'مواطن'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          onClick={() => handleView(patient)}
                          className="btn-icon"
                          title="عرض الملف الطبي الكامل"
                          style={{ color: 'var(--hospital-pine)' }}
                        >
                          <Eye size={15} />
                        </button>
                        {canManagePatients && (
                          <>
                            <button
                              onClick={() => handleEdit(patient)}
                              className="btn-icon"
                              title="تعديل بيانات المريض"
                              style={{ color: 'var(--clinical-slate)' }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(patient)}
                              className="btn-icon"
                              title="أرشفة / حذف السجل"
                              style={{ color: 'var(--surgical-crimson)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {pagination.total_pages > 1 && (
          <div className="pagination-wrapper">
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              إجمالي السجلات: <strong className="num-tabular">{pagination.total}</strong> | الصفحة{' '}
              <strong className="num-tabular">{pagination.current_page}</strong> من{' '}
              <strong className="num-tabular">{pagination.total_pages}</strong>
            </div>

            <div className="pagination-pages">
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => fetchPatients(pageNum)}
                  className={`page-num-btn num-tabular ${
                    pagination.current_page === pageNum ? 'active' : ''
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Patient Create / Edit Modal */}
      {canManagePatients && (
        <PatientFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          patient={selectedPatientForEdit}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Patient Details Folder Modal */}
      <PatientDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        patient={selectedPatientForDetails}
        onEdit={(p) => handleEdit(p)}
      />
    </div>
  );
}
