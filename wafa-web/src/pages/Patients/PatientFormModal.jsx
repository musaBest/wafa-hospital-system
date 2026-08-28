import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Edit,
  Save,
  AlertCircle,
  IdCard,
  User,
  MapPin,
  HeartPulse,
  Sparkles,
  SearchCode,
  CheckCircle2,
} from 'lucide-react';
import { patientsApi, civilRegistryApi } from '../../services/api';

export default function PatientFormModal({ isOpen, onClose, patient = null, onSuccess }) {
  const isEditing = Boolean(patient && patient.id);

  const initialForm = {
    patient_id: '',
    admission_year: new Date().getFullYear(),
    national_id: '',
    first_name: '',
    father_name: '',
    grandfather_name: '',
    family_name: '',
    gender: 'male',
    birth_date: '',
    marital_status: 'single',
    refugee_status: 'refugee',
    ration_card_no: '',
    occupation: '',
    region: 'غزة',
    city_or_area: '',
    phone: '',
    blood_type: '',
    allergies: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingNextId, setLoadingNextId] = useState(false);
  const [civilLookupLoading, setCivilLookupLoading] = useState(false);
  const [civilNotice, setCivilNotice] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setCivilNotice(null);
      if (isEditing) {
        setFormData({
          patient_id: patient.patient_id || '',
          admission_year: patient.admission_year || new Date().getFullYear(),
          national_id: patient.national_id || '',
          first_name: patient.first_name || '',
          father_name: patient.father_name || '',
          grandfather_name: patient.grandfather_name || '',
          family_name: patient.family_name || '',
          gender: patient.gender || 'male',
          birth_date: patient.birth_date ? patient.birth_date.split('T')[0] : '',
          marital_status: patient.marital_status || 'single',
          refugee_status: patient.refugee_status || 'refugee',
          ration_card_no: patient.ration_card_no || '',
          occupation: patient.occupation || '',
          region: patient.region || 'غزة',
          city_or_area: patient.city_or_area || '',
          phone: patient.phone || '',
          blood_type: patient.blood_type || '',
          allergies: patient.allergies || '',
          notes: patient.notes || '',
        });
      } else {
        setFormData(initialForm);
        fetchNextPatientId();
      }
    }
  }, [isOpen, patient]);

  const fetchNextPatientId = async () => {
    try {
      setLoadingNextId(true);
      const res = await patientsApi.getNextId(new Date().getFullYear());
      if (res.success && res.next_patient_id) {
        setFormData((prev) => ({
          ...prev,
          patient_id: res.next_patient_id,
          admission_year: res.year,
        }));
      }
    } catch (err) {
      console.error('Failed to get next ID:', err);
    } finally {
      setLoadingNextId(false);
    }
  };

  // Civil Registry API Auto-Lookup Handler
  const handleCivilRegistryLookup = async () => {
    const id = (formData.national_id || '').trim();
    if (!/^\d{9}$/.test(id)) {
      setErrors((prev) => ({ ...prev, national_id: 'يرجى إدخال رقم هوية فلسطينية صحيح مكون من 9 أرقام أولاً' }));
      return;
    }

    setCivilLookupLoading(true);
    setCivilNotice(null);
    setErrors((prev) => ({ ...prev, national_id: null }));

    try {
      const res = await civilRegistryApi.lookup(id);
      if (res.success && res.data) {
        const d = res.data;
        setFormData((prev) => ({
          ...prev,
          first_name: d.first_name || prev.first_name,
          father_name: d.father_name || prev.father_name,
          grandfather_name: d.grandfather_name || prev.grandfather_name,
          family_name: d.family_name || prev.family_name,
          gender: d.gender || prev.gender,
          birth_date: d.birth_date || prev.birth_date,
          marital_status: d.marital_status || prev.marital_status,
          region: d.region || prev.region,
          city_or_area: d.city_or_area || prev.city_or_area,
          refugee_status: d.refugee_status || prev.refugee_status,
        }));
        setCivilNotice({
          type: 'success',
          text: `تم استرجاع وتعبئة بيانات المواطن (${d.first_name} ${d.father_name} ${d.grandfather_name} ${d.family_name}) تلقائياً من السجل المدني.`,
        });
      }
    } catch (err) {
      setCivilNotice({
        type: 'warning',
        text: err.message || 'لم يتم العثور على سجل في قاعدة السجل المدني. يرجى إدخال البيانات يدوياً.',
      });
    } finally {
      setCivilLookupLoading(false);
    }
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
    if (!formData.first_name.trim()) errs.first_name = 'الاسم الشخصي مطلوب';
    if (!formData.father_name.trim()) errs.father_name = 'اسم الأب مطلوب';
    if (!formData.grandfather_name.trim()) errs.grandfather_name = 'اسم الجد مطلوب';
    if (!formData.family_name.trim()) errs.family_name = 'اسم العائلة مطلوب';
    if (!formData.gender) errs.gender = 'يرجى تحديد الجنس';

    if (formData.national_id && !/^\d{9}$/.test(formData.national_id.trim())) {
      errs.national_id = 'رقم الهوية الفلسطينية يجب أن يتكون من 9 أرقام';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      let res;
      if (isEditing) {
        res = await patientsApi.update(patient.id, formData);
      } else {
        res = await patientsApi.create(formData);
      }

      if (res.success) {
        onSuccess(res.message);
        onClose();
      }
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'فشل حفظ بيانات المريض' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            {isEditing ? (
              <>
                <Edit size={20} style={{ color: 'var(--hospital-pine)' }} />
                <span>تعديل ملف المريض: {patient?.full_name}</span>
              </>
            ) : (
              <>
                <UserPlus size={20} style={{ color: 'var(--hospital-pine)' }} />
                <span>تسجيل مريض جديد (فتح ملف طبي)</span>
              </>
            )}
          </div>
          <button onClick={onClose} className="btn-icon" style={{ border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {errors.general && (
              <div className="alert-banner alert-crimson">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            {civilNotice && (
              <div className={`alert-banner ${civilNotice.type === 'success' ? 'alert-pine' : 'alert-amber'}`}>
                {civilNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{civilNotice.text}</span>
              </div>
            )}

            {/* SECTION 1: IDENTITY & 4-PART NAME */}
            <div className="form-section-header">
              <IdCard size={17} />
              <span>1. بيانات الهوية والاسم الرباعي (مع التكامل مع السجل المدني)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1.4fr', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">رقم المريض (Patient ID)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    name="patient_id"
                    value={formData.patient_id}
                    onChange={handleChange}
                    className={`form-control num-tabular ${errors.patient_id ? 'error' : ''}`}
                    placeholder="20260001"
                    disabled={isEditing}
                    style={{ fontWeight: '700', letterSpacing: '1px' }}
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={fetchNextPatientId}
                      className="btn btn-secondary btn-sm"
                      title="توليد الرقم التسلسلي التالي"
                      disabled={loadingNextId}
                    >
                      <Sparkles size={14} />
                    </button>
                  )}
                </div>
                {errors.patient_id && <div className="form-error-msg">{errors.patient_id}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">سنة الدخول</label>
                <input
                  type="number"
                  name="admission_year"
                  value={formData.admission_year}
                  onChange={handleChange}
                  className="form-control num-tabular"
                  min="1990"
                  max="2099"
                />
              </div>

              {/* National ID with Civil Registry Lookup Trigger */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">رقم الهوية الفلسطينية (9 أرقام)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    name="national_id"
                    value={formData.national_id}
                    onChange={handleChange}
                    className={`form-control num-tabular ${errors.national_id ? 'error' : ''}`}
                    placeholder="مثال: 902263925"
                    maxLength={9}
                  />
                  <button
                    type="button"
                    onClick={handleCivilRegistryLookup}
                    className="btn btn-secondary btn-sm"
                    title="استعلام السجل المدني وتعبئة البيانات تلقائياً"
                    disabled={civilLookupLoading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <SearchCode size={15} style={{ color: 'var(--hospital-pine)' }} />
                    <span>{civilLookupLoading ? 'جاري الاستعلام...' : 'استعلام'}</span>
                  </button>
                </div>
                {errors.national_id && <div className="form-error-msg">{errors.national_id}</div>}
              </div>
            </div>

            {/* 4-part Name Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span className="required-star">*</span> الاسم الشخصي
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`form-control ${errors.first_name ? 'error' : ''}`}
                  placeholder="الاسم الأول"
                />
                {errors.first_name && <div className="form-error-msg">{errors.first_name}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span className="required-star">*</span> اسم الأب
                </label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  className={`form-control ${errors.father_name ? 'error' : ''}`}
                  placeholder="اسم الأب"
                />
                {errors.father_name && <div className="form-error-msg">{errors.father_name}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span className="required-star">*</span> اسم الجد
                </label>
                <input
                  type="text"
                  name="grandfather_name"
                  value={formData.grandfather_name}
                  onChange={handleChange}
                  className={`form-control ${errors.grandfather_name ? 'error' : ''}`}
                  placeholder="اسم الجد"
                />
                {errors.grandfather_name && <div className="form-error-msg">{errors.grandfather_name}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span className="required-star">*</span> اسم العائلة
                </label>
                <input
                  type="text"
                  name="family_name"
                  value={formData.family_name}
                  onChange={handleChange}
                  className={`form-control ${errors.family_name ? 'error' : ''}`}
                  placeholder="اسم العائلة"
                />
                {errors.family_name && <div className="form-error-msg">{errors.family_name}</div>}
              </div>
            </div>

            {/* SECTION 2: DEMOGRAPHICS & SOCIAL */}
            <div className="form-section-header">
              <User size={17} />
              <span>2. البيانات الديموغرافية والاجتماعية</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <span className="required-star">*</span> الجنس
                </label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="form-select">
                  <option value="male">ذكر (Male)</option>
                  <option value="female">أنثى (Female)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">تاريخ الميلاد</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="form-control num-tabular"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الحالة الاجتماعية</label>
                <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="form-select">
                  <option value="single">أعزب / آنسة</option>
                  <option value="married">متزوج / ة</option>
                  <option value="divorced">مطلق / ة</option>
                  <option value="widowed">أرمل / ة</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الوضع الاجتماعي (المواطنة)</label>
                <select name="refugee_status" value={formData.refugee_status} onChange={handleChange} className="form-select">
                  <option value="refugee">لاجئ (Refugee)</option>
                  <option value="citizen">مواطن (Citizen)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">رقم بطاقة التموين (UNRWA)</label>
                <input
                  type="text"
                  name="ration_card_no"
                  value={formData.ration_card_no}
                  onChange={handleChange}
                  className="form-control num-tabular"
                  placeholder="مثال: RC-992384"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المهنة</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="مثال: طالب، موظف، أعمال حرة"
                />
              </div>
            </div>

            {/* SECTION 3: LOCATION & CONTACT */}
            <div className="form-section-header">
              <MapPin size={17} />
              <span>3. بيانات السكن والاتصال</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المحافظة / المنطقة</label>
                <select name="region" value={formData.region} onChange={handleChange} className="form-select">
                  <option value="غزة">محافظة غزة</option>
                  <option value="الشمال">محافظة شمال غزة</option>
                  <option value="الوسطى">محافظة الوسطى (دير البلح)</option>
                  <option value="خانيونس">محافظة خان يونس</option>
                  <option value="رفح">محافظة رفح</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المدينة أو الحي / المخيم</label>
                <input
                  type="text"
                  name="city_or_area"
                  value={formData.city_or_area}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="مثال: الرمال، مخيم الشاطئ، تل السلطان"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">رقم الهاتف / الجوال</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-control num-tabular"
                  placeholder="059XXXXXXX"
                />
              </div>
            </div>

            {/* SECTION 4: MEDICAL NOTES & ALLERGIES */}
            <div className="form-section-header">
              <HeartPulse size={17} />
              <span>4. المعلومات والتحذيرات الطبية</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">فصيلة الدم</label>
                <select name="blood_type" value={formData.blood_type} onChange={handleChange} className="form-select num-tabular">
                  <option value="">غير محدد</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: 'var(--surgical-crimson)' }}>
                  تحذيرات الحساسية الطبية (Allergies)
                </label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="مثال: حساسية البنسلين، أدوية السلفا..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ملاحظات سريرية عامة</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="ملاحظات الملف الطبي..."
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} />
              <span>{submitting ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'تسجيل المريض وفتح الملف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
