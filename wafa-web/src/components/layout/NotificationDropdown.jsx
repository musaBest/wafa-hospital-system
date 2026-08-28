import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { notificationsApi } from '../../services/api';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list('all_staff');
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead('all_staff');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle size={16} className="text-crimson" style={{ color: 'var(--surgical-crimson)' }} />;
      default:
        return <Info size={16} style={{ color: 'var(--hospital-pine)' }} />;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon"
        style={{
          position: 'relative',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
          background: isOpen ? 'var(--hospital-pine-light)' : 'var(--bg-surface)',
          color: isOpen ? 'var(--hospital-pine)' : 'var(--clinical-slate)',
        }}
        title="التنبيهات والإشعارات السريرية"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              backgroundColor: 'var(--surgical-crimson)',
              color: '#FFFFFF',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #FFFFFF',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '380px',
            maxWidth: '90vw',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-clinical-lg)',
            border: '1px solid var(--border-medium)',
            zIndex: 1100,
            overflow: 'hidden',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} style={{ color: 'var(--hospital-pine)' }} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--clinical-slate-dark)' }}>
                تنبيهات النظام ({unreadCount} جديد)
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '2px 8px', color: 'var(--hospital-pine)' }}
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                جاري تحميل التنبيهات...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--hospital-pine-border)', margin: '0 auto 8px' }} />
                لا توجد تنبيهات جديدة في الوقت الحالي
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    backgroundColor: item.is_read ? 'transparent' : 'var(--hospital-pine-light)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ marginTop: '2px' }}>{getPriorityIcon(item.priority)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: item.is_read ? '600' : '700', color: 'var(--clinical-slate-dark)' }}>
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="تحديد كمقروء"
                          className="btn-ghost"
                          style={{ padding: '2px 4px' }}
                        >
                          <Check size={14} style={{ color: 'var(--hospital-pine)' }} />
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-body)', lineHeight: '1.4', marginBottom: '4px' }}>
                      {item.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      <span>{new Date(item.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
