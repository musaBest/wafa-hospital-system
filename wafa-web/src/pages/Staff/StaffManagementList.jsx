import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Building,
  KeyRound,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../services/api';

const ROLES_OPTIONS = [
  { value: 'it_admin', label: 'مدير تكنولوجيا المعلومات (IT Admin - أحمد)' },
  { value: 'management_admin', label: 'إدارة المستشفى (Management Admin)' },
  { value: 'accountant', label: 'المحاسب المالي (Accountant)' },
  { value: 'doctor', label: 'طبيب معالج (Physician)' },
  { value: 'registration_clerk', label: 'كاتب التسجيل والاستقبال (Registration Clerk)' },
  { value: 'data_lookup_clerk', label: 'كاتب الاستعلامات والبحث (Lookup Clerk - قراءة فقط)' },
  { value: 'lab_technician', label: 'فني المختبر والتحاليل (Lab Tech)' },
  { value: 'pt_specialist', label: 'أخصائي العلاج الطبيعي (PT Specialist)' },
  { value: 'radiologist', label: 'فني الأشعة والتصوير (Radiologist)' },
  { value: 'social_worker', label: 'الأخصائي الاجتماعي (Social Worker)' },
];

export default function StaffManagementList() {
  const { user, canManageStaff } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    department: 'العيادات الخارجية',
    employee_id: '',
    phone: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!canManageStaff) return;
    try {
      setLoading(true);
      const res = await staffApi.list({
        search: searchTerm,
        role: filterRole,
      });
      if (res.success) {
        setStaffList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  }, [canManageStaff, searchTerm, filterRole]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'doctor',
      department: 'العيادات الخارجية',
      employee_id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      phone: '',
      is_active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      password: '',
      role: staff.role || 'doctor',
      department: staff.department || '',
      employee_id: staff.employee_id || '',
      phone: staff.phone || '',
      is_active: Boolean(staff.is_active),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      let res;
      if (editingStaff) {
        res = await staffApi.update(editingStaff.id, formData);
      } else {
        res = await staffApi.create(formData);
      }

      if (res.success) {
        setFeedbackMessage(res.message);
        setIsModalOpen(false);
        fetchStaff();
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors({ general: err.message || 'فشل حفظ بيانات الموظف' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staff) => {
    if (staff.id === user?.id) {
      alert('لا يمكنك حذف حسابك الشخصي النشط.');
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف حساب الموظف: ${staff.name}؟`)) {
      try {
        const res = await staffApi.delete(staff.id);
        if (res.success) {
          setFeedbackMessage(res.message);
          fetchStaff();
          setTimeout(() => setFeedbackMessage(null), 4000);
        }
      } catch (err) {
        alert(err.message || 'فشل حذف الحساب');
      }
    }
  };

  if (!canManageStaff) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto', textAlign: 'center' }}>
        <div className="clinical-card medical-file-tab tab-crimson" style={{ padding: '32px' }}>
          <Lock size={36} style={{ color: 'var(--surgical-crimson)', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--surgical-crimson)' }}>
            الصلاحية مقيدة: إدارة المستخدمين والأدوار
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
            تتطلب هذه الصفحة صلاحية مدير النظام (IT Admin) أو إدارة المستشفى.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
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
            <Shield size={24} style={{ color: 'var(--hospital-pine)' }} />
            <span>إدارة الكادر الطبي ومصفوفة الصلاحيات (Staff & RBAC)</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            تسجيل الكادر الطبي، توزيع الأدوار، وتفعيل حسابات الموظفين المركزية
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary">
          <UserPlus size={17} />
          <span>إضافة كادر طبي / إداري جديد</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="alert-banner alert-pine">
          <CheckCircle size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="clinical-card" style={{ marginBottom: '20px', padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
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
              placeholder="ابحث بالاسم، البريد الإلكتروني، الرقم الوظيفي، أو الهاتف..."
              className="form-control"
              style={{ paddingRight: '36px' }}
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="form-select"
            style={{ width: '220px' }}
          >
            <option value="">جميع الأدوار والصلاحيات</option>
            {ROLES_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="table-responsive">
        <table className="clinical-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>الرقم الوظيفي</th>
              <th>اسم الموظف</th>
              <th>البريد الإلكتروني</th>
              <th>الدور والصلاحيات (RBAC)</th>
              <th>القسم / العيادة</th>
              <th style={{ width: '110px' }}>الحالة</th>
              <th style={{ width: '100px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  جاري تحميل بيانات الكادر الطبي...
                </td>
              </tr>
            ) : staffList.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  لم يتم العثور على حسابات مطابقة
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="medical-file-tab">
                  <td>
                    <span className="badge badge-slate num-tabular" style={{ fontWeight: '700' }}>
                      {staff.employee_id || `EMP-${staff.id}`}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--clinical-slate-dark)' }}>{staff.name}</div>
                    {staff.phone && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }} className="num-tabular">
                        {staff.phone}
                      </div>
                    )}
                  </td>

                  <td className="num-tabular" style={{ fontSize: '13px', color: 'var(--text-body)' }}>
                    {staff.email}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        staff.role === 'it_admin'
                          ? 'badge-crimson'
                          : staff.role === 'accountant'
                          ? 'badge-amber'
                          : staff.role === 'doctor'
                          ? 'badge-pine'
                          : 'badge-slate'
                      }`}
                      style={{ fontSize: '12px', fontWeight: '600' }}
                    >
                      {ROLES_OPTIONS.find((r) => r.value === staff.role)?.label.split('(')[0] || staff.role}
                    </span>
                  </td>

                  <td style={{ fontSize: '13px' }}>{staff.department || 'عام'}</td>

                  <td>
                    {staff.is_active ? (
                      <span className="badge badge-green">نشط ومفعل</span>
                    ) : (
                      <span className="badge badge-crimson">معطل</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="btn-icon"
                        title="تعديل الحساب والصلاحيات"
                        style={{ color: 'var(--hospital-pine)' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(staff)}
                        className="btn-icon"
                        title="حذف الحساب"
                        style={{ color: 'var(--surgical-crimson)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Staff Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Shield size={20} style={{ color: 'var(--hospital-pine)' }} />
                <span>{editingStaff ? `تعديل حساب: ${editingStaff.name}` : 'تسجيل وتعيين كادر طبي جديد'}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon" style={{ border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="modal-body">
                {formErrors.general && (
                  <div className="alert-banner alert-crimson">
                    <AlertCircle size={18} />
                    <span>{formErrors.general}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    <span className="required-star">*</span> اسم الموظف الرباعي
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className={`form-control ${formErrors.name ? 'error' : ''}`}
                    placeholder="الاسم الكامل مع اللقب"
                  />
                  {formErrors.name && <div className="form-error-msg">{formErrors.name}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      <span className="required-star">*</span> البريد الإلكتروني (تسجيل الدخول)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className={`form-control num-tabular ${formErrors.email ? 'error' : ''}`}
                      placeholder="name@wafa.hospital"
                    />
                    {formErrors.email && <div className="form-error-msg">{formErrors.email}</div>}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      {editingStaff ? 'كلمة المرور (اتركها فارغة للإبقاء)' : <><span className="required-star">*</span> كلمة المرور</>}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingStaff}
                      className={`form-control ${formErrors.password ? 'error' : ''}`}
                      placeholder="••••••••"
                    />
                    {formErrors.password && <div className="form-error-msg">{formErrors.password}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      <span className="required-star">*</span> الدور والصلاحية السريرية (RBAC)
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="form-select"
                    >
                      {ROLES_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">القسم / العيادة</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="form-control"
                      placeholder="مثال: المختبر، الاستقبال..."
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">الرقم الوظيفي / الشارة</label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="form-control num-tabular"
                      placeholder="EMP-..."
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">رقم الهاتف / الجوال</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-control num-tabular"
                      placeholder="059XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={submitting}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Save size={16} />
                  <span>{submitting ? 'جاري الحفظ...' : editingStaff ? 'تحديث الصلاحيات' : 'إنشاء وتعيين الموظف'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
