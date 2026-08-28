import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  RefreshCw,
  Printer,
  CreditCard,
  Banknote,
  ShieldAlert,
  Calendar,
  UserCheck,
  Building,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transfersApi } from '../../services/api';
import TransferFormModal from './TransferFormModal';

export default function TransfersList() {
  const { user, isAccountant } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchTransfers = useCallback(async () => {
    if (!isAccountant) return;
    try {
      setLoading(true);
      const res = await transfersApi.list({
        search: searchTerm,
        payment_method: filterMethod,
      });
      if (res.success) {
        setTransfers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  }, [isAccountant, searchTerm, filterMethod]);

  const fetchStats = async () => {
    if (!isAccountant) return;
    try {
      const res = await transfersApi.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchStats();
  }, [fetchTransfers]);

  const handleSuccess = (msg) => {
    setFeedbackMessage(msg);
    fetchTransfers();
    fetchStats();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // If user is NOT an accountant (e.g. IT Admin), show strict RBAC separation warning
  if (!isAccountant) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <div
          className="clinical-card medical-file-tab tab-crimson"
          style={{ padding: '32px', backgroundColor: '#FFFFFF', textAlign: 'center' }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--surgical-crimson-bg)',
              color: 'var(--surgical-crimson)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--surgical-crimson)', marginBottom: '8px' }}>
            الوصول مقيد — فصل الصلاحيات المالية (Separation of Duties)
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-body)',
              lineHeight: '1.6',
              maxWidth: '600px',
              margin: '0 auto 20px',
            }}
          >
            بموجب لوائح الرقابة والحوكمة المالية في مستشفى الوفاء، يُحظر على <strong>{user?.role_label || 'هذا الحساب'}</strong>{' '}
            الوصول إلى قسم الحوالات والمدفوعات النقدية. هذه الوحدة مسندة <strong>حصرياً للمحاسب المالي</strong> لضمان النزاهة
            والمساءلة.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-parchment)',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            <ShieldAlert size={15} style={{ color: 'var(--surgical-crimson)' }} />
            <span>يرجى تسجيل الدخول بحساب المحاسب المالي للوصول إلى هذه الوحدة.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
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
            <Receipt size={24} style={{ color: 'var(--hospital-pine)' }} />
            <span>صندوق التحويلات والدفعات المالية (Transfers & Cashier)</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            سجل مالي موثق وغير قابل للتعديل لجميع المقبوضات والحوالات الإلكترونية
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <PlusCircle size={17} />
          <span>توثيق دفعة / حوالة جديدة</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="alert-banner alert-pine">
          <CheckCircle2 size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="stats-grid">
        <div className="stat-item medical-file-tab">
          <div className="stat-content">
            <div className="stat-label">إجمالي المقبوضات التراكمية</div>
            <div className="stat-value">
              {stats ? `${stats.total_amount.toLocaleString()} ₪` : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper">
            <Receipt size={22} />
          </div>
        </div>

        <div className="stat-item medical-file-tab tab-amber">
          <div className="stat-content">
            <div className="stat-label">تحصيلات اليوم</div>
            <div className="stat-value">
              {stats ? `${stats.today_amount.toLocaleString()} ₪` : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper amber">
            <Calendar size={22} />
          </div>
        </div>

        <div className="stat-item medical-file-tab tab-slate">
          <div className="stat-content">
            <div className="stat-label">الحوالات الإلكترونية (Digital)</div>
            <div className="stat-value">
              {stats ? `${stats.digital_total.toLocaleString()} ₪` : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper slate">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="stat-item medical-file-tab tab-pine">
          <div className="stat-content">
            <div className="stat-label">المدفوعات النقدية (Cash)</div>
            <div className="stat-value">
              {stats ? `${stats.cash_total.toLocaleString()} ₪` : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper">
            <Banknote size={22} />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
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
              placeholder="ابحث برقم الإيصال (TR-...)، رقم الحوالة، اسم المحول، أو اسم المريض..."
              className="form-control"
              style={{ paddingRight: '36px' }}
            />
          </div>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="form-select"
            style={{ width: '180px' }}
          >
            <option value="">جميع طرق السداد</option>
            <option value="digital_transfer">حوالات إلكترونية فقط</option>
            <option value="cash">نقدي (كاش) فقط</option>
          </select>

          <button onClick={fetchTransfers} className="btn btn-secondary btn-sm" title="تحديث">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Transfers Ledger Table */}
      <div className="table-responsive">
        <table className="clinical-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>رقم السند</th>
              <th>المريض والمستفيد</th>
              <th style={{ width: '120px' }}>المبلغ</th>
              <th style={{ width: '140px' }}>طريقة الدفع</th>
              <th>بيانات الحوالة / المحول</th>
              <th style={{ width: '130px' }}>المحاسب المسؤول</th>
              <th style={{ width: '140px' }}>تاريخ وساعة القبض</th>
              <th style={{ width: '80px', textAlign: 'center' }}>طباعة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  جاري تحميل سجل المعاملات المالية...
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  لا توجد حركات مالية مسجلة حالياً
                </td>
              </tr>
            ) : (
              transfers.map((item) => (
                <tr key={item.id} className="medical-file-tab">
                  <td>
                    <span className="badge badge-pine num-tabular" style={{ fontWeight: '700' }}>
                      {item.receipt_number}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--clinical-slate-dark)' }}>
                      {item.patient?.full_name || 'مريض غير محدد'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="num-tabular">
                      ملف: {item.patient?.patient_id} • هوية: {item.patient?.national_id || '—'}
                    </div>
                  </td>

                  <td>
                    <div className="num-tabular" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--hospital-pine-dark)' }}>
                      {Number(item.amount).toFixed(2)} ₪
                    </div>
                  </td>

                  <td>
                    {item.payment_method === 'digital_transfer' ? (
                      <span className="badge badge-slate" style={{ gap: '4px' }}>
                        <CreditCard size={12} />
                        <span>حوالة ({item.transfer_platform || 'إلكتروني'})</span>
                      </span>
                    ) : (
                      <span className="badge badge-green" style={{ gap: '4px' }}>
                        <Banknote size={12} />
                        <span>نقدي (كاش)</span>
                      </span>
                    )}
                  </td>

                  <td>
                    {item.payment_method === 'digital_transfer' ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.sender_name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }} className="num-tabular">
                          مرجع: {item.reference_number}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>قبض نقدي مباشر بالصندوق</span>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: '12.5px', fontWeight: '500' }}>
                      {item.accountant?.name?.split(' ')[0] || 'المحاسب'}
                    </span>
                  </td>

                  <td className="num-tabular" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(item.confirmed_at || item.created_at).toLocaleString('ar-EG', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedReceipt(item)}
                      className="btn-icon"
                      title="طباعة إيصال السند المالي"
                    >
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Recording Transfer */}
      <TransferFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Receipt Print Preview Modal */}
      {selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <div
            className="modal-content medical-file-tab"
            style={{ maxWidth: '580px', backgroundColor: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Printer size={18} />
                <span>إيصال سند قبض مالي رسمي</span>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="btn-icon" style={{ border: 'none' }}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px', backgroundColor: '#FAFCFD' }}>
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-medium)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--hospital-pine-dark)' }}>
                  مستشفى الوفاء للتأهيل الطبي والجراحة التخصصية
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  غزة - فلسطين | الدائرة المالية وصندوق الإيرادات
                </p>
                <div style={{ marginTop: '8px' }}>
                  <span className="badge badge-pine num-tabular" style={{ fontSize: '14px', fontWeight: '800' }}>
                    سند قبض رقم: {selectedReceipt.receipt_number}
                  </span>
                </div>
              </div>

              {/* Receipt Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>اسم المريض:</span>
                  <strong>{selectedReceipt.patient?.full_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>رقم الملف الطبي:</span>
                  <span className="num-tabular">{selectedReceipt.patient?.patient_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>المبلغ المقبوض:</span>
                  <strong style={{ fontSize: '16px', color: 'var(--hospital-pine-dark)' }} className="num-tabular">
                    {Number(selectedReceipt.amount).toFixed(2)} شيكل (ILS)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>طريقة الدفع:</span>
                  <span>{selectedReceipt.payment_method === 'digital_transfer' ? 'حوالة إلكترونية' : 'نقدي'}</span>
                </div>
                {selectedReceipt.payment_method === 'digital_transfer' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>اسم المحول / الجهة:</span>
                      <strong>{selectedReceipt.sender_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>جهة التحويل / البنك:</span>
                      <span
                        style={{
                          fontWeight: '700',
                          color: 'var(--clinical-slate-dark)',
                          backgroundColor: 'var(--hospital-pine-light)',
                          padding: '1px 8px',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      >
                        {selectedReceipt.transfer_platform || '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>رقم مرجع الحوالة:</span>
                      <span className="num-tabular" style={{ fontWeight: '600' }}>
                        {selectedReceipt.reference_number}
                      </span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>تاريخ المعاملة:</span>
                  <span className="num-tabular">
                    {new Date(selectedReceipt.confirmed_at || selectedReceipt.created_at).toLocaleString('ar-EG')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>المحاسب المسؤول:</span>
                  <span>{selectedReceipt.accountant?.name}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => window.print()} className="btn btn-primary">
                <Printer size={15} />
                <span>طباعة السند</span>
              </button>
              <button onClick={() => setSelectedReceipt(null)} className="btn btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
