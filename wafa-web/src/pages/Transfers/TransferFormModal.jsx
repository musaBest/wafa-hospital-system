import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Save,
  CreditCard,
  Banknote,
  UserPlus,
  AlertCircle,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { transfersApi, patientsApi } from '../../services/api';
import PatientFormModal from '../Patients/PatientFormModal';

export default function TransferFormModal({ isOpen, onClose, onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    amount: '',
    currency: 'ILS',
    payment_method: 'cash', // Default to cash for simplicity
    sender_name: '',
    reference_number: '',
    transfer_platform: 'Jawwal Pay',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadPatients = async (searchTerm = '') => {
    try {
      const res = await patientsApi.list({ search: searchTerm, per_page: 50 });
      if (res.success) {
        setPatients(res.data || []);
        if (res.data && res.data.length > 0 && !formData.patient_id) {
          setFormData((prev) => ({ ...prev, patient_id: res.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      loadPatients();
    }
  }, [isOpen]);

  const handlePatientSearchChange = (e) => {
    const term = e.target.value;
    setPatientSearch(term);
    loadPatients(term);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.patient_id) errs.patient_id = 'يرجى اختيار المريض صاحب المعاملة المالية';
    if (!formData.amount || Number(formData.amount) <= 0) errs.amount = 'يرجى إدخال مبلغ صحيح أكبر من 0';

    if (formData.payment_method === 'digital_transfer') {
      if (!formData.sender_name.trim()) errs.sender_name = 'اسم المحول أو الجهة المحولة مطلوب للحوالات الرقمية';
      if (!formData.reference_number.trim()) errs.reference_number = 'رقم مرجع الحوالة البنكية/المحفظة مطلوب';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await transfersApi.create(formData);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      }
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'فشل توثيق الدفعة المالية' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatientCreated = (msg) => {
    loadPatients().then(() => {
      // Patients list refreshed
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-content medical-file-tab"
          style={{ maxWidth: '660px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <div className="modal-title">
              <Receipt size={20} style={{ color: 'var(--hospital-pine)' }} />
              <span>توثيق دفعة / حوالة مالية (سند قبض مالي)</span>
            </div>
            <button onClick={onClose} className="btn-icon" style={{ border: 'none' }}>
              <X size={18} />
            </button>
          </div>

          {/* Form with clean flex column and scrollable body */}
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-body">
              {errors.general && (
                <div className="alert-banner alert-crimson">
                  <AlertCircle size={18} />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Patient Selection & Shortcut to Register */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    <span className="required-star">*</span> المريض صاحب المعاملة
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="btn-ghost"
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: 'var(--hospital-pine)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                    }}
                  >
                    <UserPlus size={13} />
                    <span>لا تجد المريض؟ سجله الآن</span>
                  </button>
                </div>

                {/* Patient Search & Dropdown */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ position: 'relative', width: '180px' }}>
                    <Search
                      size={14}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={handlePatientSearchChange}
                      placeholder="تصفية المريض..."
                      className="form-control"
                      style={{ paddingRight: '28px', fontSize: '12.5px', height: '38px' }}
                    />
                  </div>

                  <select
                    name="patient_id"
                    value={formData.patient_id}
                    onChange={handleChange}
                    className={`form-select ${errors.patient_id ? 'error' : ''}`}
                    style={{ flex: 1, height: '38px' }}
                  >
                    <option value="">اختر المريض من القائمة...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} — (ملف: {p.patient_id}) — [هوية: {p.national_id || 'بدون'}]
                      </option>
                    ))}
                  </select>
                </div>
                {errors.patient_id && <div className="form-error-msg">{errors.patient_id}</div>}
              </div>

              {/* Payment Method Switcher */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">طريقة السداد</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, payment_method: 'cash' }))}
                    className={`btn ${formData.payment_method === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: '600' }}
                  >
                    <Banknote size={17} />
                    <span>نقدي مباشر (كاش)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, payment_method: 'digital_transfer' }))}
                    className={`btn ${formData.payment_method === 'digital_transfer' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: '600' }}
                  >
                    <CreditCard size={17} />
                    <span>حوالة إلكترونية / بنكية</span>
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div className="form-group">
                <label className="form-label">
                  <span className="required-star">*</span> المبلغ المسدد (شيكل ₪)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`form-control num-tabular ${errors.amount ? 'error' : ''}`}
                  placeholder="0.00"
                  style={{ fontSize: '17px', fontWeight: '800', color: 'var(--hospital-pine-dark)' }}
                />
                {errors.amount && <div className="form-error-msg">{errors.amount}</div>}
              </div>

              {/* Dynamic Fields: Digital Transfer ONLY */}
              {formData.payment_method === 'digital_transfer' && (
                <div
                  style={{
                    backgroundColor: 'var(--hospital-pine-light)',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid var(--hospital-pine-border)',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--hospital-pine-dark)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CreditCard size={15} />
                    <span>بيانات الحوالة والجهة المحولة:</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <span className="required-star">*</span> اسم المحول / الجهة المحولة
                      </label>
                      <input
                        type="text"
                        name="sender_name"
                        value={formData.sender_name}
                        onChange={handleChange}
                        className={`form-control ${errors.sender_name ? 'error' : ''}`}
                        placeholder="اسم الشخص أو المؤسسة"
                      />
                      {errors.sender_name && <div className="form-error-msg">{errors.sender_name}</div>}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <span className="required-star">*</span> رقم المرجع / إشعار الحوالة
                      </label>
                      <input
                        type="text"
                        name="reference_number"
                        value={formData.reference_number}
                        onChange={handleChange}
                        className={`form-control num-tabular ${errors.reference_number ? 'error' : ''}`}
                        placeholder="مثال: REF-99201"
                      />
                      {errors.reference_number && <div className="form-error-msg">{errors.reference_number}</div>}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">منصة / بنك التحويل</label>
                    <select
                      name="transfer_platform"
                      value={formData.transfer_platform}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="Jawwal Pay">محفظة جوال باي (Jawwal Pay)</option>
                      <option value="PalPay">محفظة بال باي (PalPay - Mahfazti)</option>
                      <option value="Bank of Palestine">بنك فلسطين (BOP)</option>
                      <option value="Islamic Arab Bank">البنك الإسلامي العربي (AIB)</option>
                      <option value="Refah">شركة الرفاه للتمويل</option>
                      <option value="Other">حوالة مصرفية أخرى</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes Field (Visible in both Cash & Digital Transfer) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ملاحظات وسند الإيداع (اختياري)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="form-textarea"
                  placeholder={
                    formData.payment_method === 'cash'
                      ? 'ملاحظات الدفعة النقدية أو رقم السند اليدوي...'
                      : 'أية تفاصيل إضافية عن الحوالة الرقمية...'
                  }
                />
              </div>
            </div>

            {/* Pinned Modal Footer (Always fully visible) */}
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Save size={16} />
                <span>{submitting ? 'جاري التوثيق...' : 'توثيق الدفعة وإصدار السند'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Patient Registration Flow */}
      <PatientFormModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={(msg) => {
          handlePatientCreated(msg);
        }}
      />
    </>
  );
}
