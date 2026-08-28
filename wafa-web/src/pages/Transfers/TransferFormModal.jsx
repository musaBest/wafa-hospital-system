import React, { useState, useEffect } from 'react';
import { X, Receipt, Save, CreditCard, Banknote, UserCheck, AlertCircle, Building } from 'lucide-react';
import { transfersApi, patientsApi } from '../../services/api';

export default function TransferFormModal({ isOpen, onClose, onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    amount: '',
    currency: 'ILS',
    payment_method: 'digital_transfer',
    sender_name: '',
    reference_number: '',
    transfer_platform: 'Jawwal Pay',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      // Fetch patients for selection
      patientsApi.list({ per_page: 50 }).then((res) => {
        if (res.success) {
          setPatients(res.data || []);
          if (res.data && res.data.length > 0 && !formData.patient_id) {
            setFormData((prev) => ({ ...prev, patient_id: res.data[0].id }));
          }
        }
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.patient_id) errs.patient_id = 'يرجى اختيار المريض';
    if (!formData.amount || Number(formData.amount) <= 0) errs.amount = 'يرجى إدخال مبلغ صحيح';

    if (formData.payment_method === 'digital_transfer') {
      if (!formData.sender_name.trim()) errs.sender_name = 'اسم الشخص أو الجهة المحولة مطلوب للحوالات الرقمية';
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

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="modal-body">
            {errors.general && (
              <div className="alert-banner alert-crimson">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Patient Selection */}
            <div className="form-group">
              <label className="form-label">
                <span className="required-star">*</span> المريض صاحب المعاملة
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                className={`form-select ${errors.patient_id ? 'error' : ''}`}
              >
                <option value="">اختر المريض...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} — (ملف: {p.patient_id}) — [هوية: {p.national_id || 'بدون'}]
                  </option>
                ))}
              </select>
              {errors.patient_id && <div className="form-error-msg">{errors.patient_id}</div>}
            </div>

            {/* Amount & Method Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span className="required-star">*</span> المبلغ المسدد (شيكل ₪)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`form-control num-tabular ${errors.amount ? 'error' : ''}`}
                  placeholder="0.00"
                  style={{ fontSize: '16px', fontWeight: '700' }}
                />
                {errors.amount && <div className="form-error-msg">{errors.amount}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">طريقة السداد</label>
                <div style={{ display: 'flex', gap: '8px', height: '42px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, payment_method: 'digital_transfer' }))}
                    className={`btn ${formData.payment_method === 'digital_transfer' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '13px' }}
                  >
                    <CreditCard size={15} />
                    <span>حوالة / إلكتروني</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, payment_method: 'cash' }))}
                    className={`btn ${formData.payment_method === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '13px' }}
                  >
                    <Banknote size={15} />
                    <span>نقدي (كاش)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Digital Transfer Details Section */}
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
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--hospital-pine-dark)', marginBottom: '10px' }}>
                  تفاصيل وبيانات الحوالة الإلكترونية:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
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
                    <option value="Other">حوالة بنكية أخرى</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ملاحظات وسند الإيداع</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="form-textarea"
                placeholder="أية تفاصيل إضافية عن نوع الخدمة المسددة..."
              />
            </div>
          </div>

          {/* Modal Footer */}
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
  );
}
