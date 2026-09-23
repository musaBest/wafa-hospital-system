import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Activity,
  BedDouble,
  Bell,
  CircleDollarSign,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Scissors,
  Settings,
  Stethoscope,
  Sun,
  Users,
  X,
  Building2,
  BarChart3,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  LogOut,
  ShieldCheck,
  Sparkles,
  Microscope,
  UserRound,
  Eye,
  Trash2,
  WalletCards,
  ReceiptText,
  BadgeCheck,
} from "lucide-react";
import { useI18n } from "../i18n";
import { useUi } from "../context/UiContext";
import { useHospital } from "../context/HospitalContext";
import { useAuth } from "../context/AuthContext";
import { canUseBilling, canViewFinancialReports } from "../utils/permissions";

const orderStyle = (index: number) => ({ '--i': index } as unknown as CSSProperties);

const isEngineerMohammed = (user?: { username?: string; id?: string } | null) => Boolean(user && (user.id === '00000000-0000-4000-8000-000000000004' || user.username?.toLowerCase().trim() === 'eng.mohammed_moqbil'));

const nav = [
  ["/", "dashboard", LayoutDashboard, ["dashboard.view"]],
  ["/registration-desk", "registrationDesk", UserRound, ["patients.create","visits.create"]],
  ["/inquiries", "patientInquiries", Search, ["patient_inquiries.view"]],
  ["/archive", "archive", Archive, ["archive.view"]],
  ["/patients", "patients", Users, ["patients.view"]],
  ["/operations", "operations", Scissors, ["operations.view"]],
  ["/queue", "queue", ClipboardList, ["queue.view"]],
  ["/dental-clinic", "dentalClinic", Stethoscope, ["dental.view","financial_audit.view"]],
  ["/elderly-care", "elderlyCare", HeartPulse, ["elderly.view"]],
  ["/outpatient-physical-therapy", "outpatientPhysicalTherapy", Activity, ["outpatient_pt.view"]],
  ["/admissions", "admissions", BedDouble, ["admissions.view","inpatient_rehab.view","inpatient_social.view","inpatient_pt.view","inpatient_finance.view","moh_portal.view"]],
  ["/diagnostics", "diagnostics", FlaskConical, ["diagnostics.view"]],
  ["/laboratory", "laboratory", Microscope, ["laboratory.view"]],
  ["/billing", "billing", CircleDollarSign, ["billing.view","billing.create"]],
  ["/payment-audit", "paymentAudit", WalletCards, ["cashier_payment.view"]],
  ["/financial-collector", "financialCollector", ReceiptText, ["cashier_collection.view"]],
  ["/financial-audit", "financialAuditor", BadgeCheck, ["financial_audit.view"]],
  ["/doctors", "doctors", Stethoscope, ["doctors.view"]],
  ["/clinics", "clinics", Building2, ["clinics.view"]],
  ["/reports", "reports", BarChart3, ["reports.view"]],
  ["/user-access", "userAccess", ShieldCheck, ["users.view"]],
  ["/engineer-activity", "engineerActivity", Eye, ["engineer_activity.view"]],
  ["/trash-bin", "trashBin", Trash2, ["trash_bin.view"]],
  ["/finance-reports", "financialReports", BarChart3, ["finance.view"]],
  ["/settings", "settings", Settings, ["settings.view"]],
  ["/doctor-dashboard", "doctorDashboard", Stethoscope, ["doctor_portal.view"]],

] as const;

// v4.3.86 — القائمة الجانبية مقسّمة إلى مسارات عمل بدل قائمة واحدة طويلة.
const navGroupOrder = [
  { id: 'daily', ar: 'التشغيل اليومي', en: 'Daily operations' },
  { id: 'clinical', ar: 'الأقسام السريرية', en: 'Clinical units' },
  { id: 'finance', ar: 'المالية والفواتير', en: 'Finance and billing' },
  { id: 'system', ar: 'الإدارة والنظام', en: 'Administration' },
] as const;

const navGroupOf: Record<string, string> = {
  '/': 'daily',
  '/registration-desk': 'daily',
  '/inquiries': 'daily',
  '/archive': 'daily',
  '/patients': 'daily',
  '/queue': 'daily',
  '/operations': 'clinical',
  '/dental-clinic': 'clinical',
  '/elderly-care': 'clinical',
  '/outpatient-physical-therapy': 'clinical',
  '/admissions': 'clinical',
  '/diagnostics': 'clinical',
  '/laboratory': 'clinical',
  '/doctor-dashboard': 'clinical',
  '/billing': 'finance',
  '/payment-audit': 'finance',
  '/financial-collector': 'finance',
  '/financial-audit': 'finance',
  '/finance-reports': 'finance',
  '/doctors': 'system',
  '/clinics': 'system',
  '/reports': 'system',
  '/user-access': 'system',
  '/engineer-activity': 'system',
  '/trash-bin': 'system',
  '/settings': 'system',
};

function ClockChip({ language }: { language: 'ar' | 'en' }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);
  return <div className="clock-chip">
    <b>{now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</b>
    <span>{now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
  </div>;
}

export function AppShell() {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme, themeLabel, sidebarOpen, setSidebarOpen, toasts } = useUi();
  const { patients, doctors, notifications, markNotificationRead, markAllNotificationsRead, clearNotifications } = useHospital();
  const { user, logout, canAny } = useAuth();
  const [notificationsMuted, setNotificationsMuted] = useState(() => localStorage.getItem(`wafaa_notifications_muted_${user?.id || 'guest'}`) === '1');
  useEffect(() => { setNotificationsMuted(localStorage.getItem(`wafaa_notifications_muted_${user?.id || 'guest'}`) === '1'); }, [user?.id]);
  const toggleNotificationsMuted = () => {
    const key = `wafaa_notifications_muted_${user?.id || 'guest'}`;
    const next = !notificationsMuted;
    setNotificationsMuted(next);
    if (next) localStorage.setItem(key, '1'); else localStorage.removeItem(key);
  };
  const visibleNav = nav.filter(([path, , , permissions]) => {
    if (path === '/') return true;
    if (user?.role === 'cashier' && !['/registration-desk','/dental-clinic'].includes(path)) return false;
    if (path === "/doctor-dashboard" && !(user?.role === 'doctor' && user?.doctorId)) return false;
    if ((path === "/engineer-activity" || path === "/trash-bin") && !isEngineerMohammed(user)) return false;
    if (path === "/finance-reports" && !canViewFinancialReports(user)) return false;
    if (path === "/billing" && !canUseBilling(user)) return false;
    return canAny(...permissions);
  });
  const [navQuery, setNavQuery] = useState("");
  const groupedNav = useMemo(() => {
    const needle = navQuery.trim().toLowerCase();
    let order = 0;
    return navGroupOrder
      .map(group => {
        const items = visibleNav
          .filter(([path]) => (navGroupOf[path] || 'system') === group.id)
          .filter(([path, label]) => !needle || `${t(label)} ${path}`.toLowerCase().includes(needle))
          .map(entry => ({ entry, index: order++ }));
        return { group, items };
      })
      .filter(section => section.items.length > 0);
  }, [navQuery, t, language, user?.id, user?.permissions, user?.role]);
  useEffect(() => { if (!sidebarOpen) setNavQuery(""); }, [sidebarOpen]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setAccountOpen(false);
        setNotificationOpen(false);
      }
      // v4.3.85: One consistent Enter behavior across the whole system.
      // It activates focused controls, submits forms, confirms modals, and chooses the
      // first command result without changing normal textarea/new-line behavior.
      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName || "";
        const isTextArea = tag === "TEXTAREA" || target?.isContentEditable;
        const isCombo = target?.getAttribute("role") === "combobox" || target?.getAttribute("aria-autocomplete") === "list";
        if (!isTextArea && !isCombo) {
          if (target?.closest?.(".cmdk-box")) {
            const firstResult = document.querySelector<HTMLButtonElement>(".cmdk-item:not(:disabled)");
            if (firstResult) { event.preventDefault(); firstResult.click(); return; }
          }

          if (target?.matches?.("button:not(:disabled), a[href], [role='button']:not([aria-disabled='true'])")) {
            event.preventDefault();
            target.click();
            return;
          }

          const form = target?.closest?.("form") as HTMLFormElement | null;
          if (form) {
            const submit = form.querySelector<HTMLButtonElement>("button[type='submit']:not(:disabled), .btn-primary:not(:disabled)");
            if (submit) { event.preventDefault(); submit.click(); return; }
          }

          const actionScope = target?.closest?.(".modal,.glass-strong,.panel,.card,.legacy-export-panel,.financial-declaration-editor") as HTMLElement | null;
          const primary = actionScope?.querySelector<HTMLButtonElement>("button[type='submit']:not(:disabled), .btn-primary:not(:disabled), .btn:not(:disabled)[data-primary='true']");
          if (primary) { event.preventDefault(); primary.click(); }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) setAccountOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotificationOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const searchResults = useMemo(() => {
    const text = query.toLowerCase();
    const links = visibleNav.map(([path, label]) => ({
      path,
      title: t(label),
      sub: t("system"),
    }));
    const patientLinks =
      user?.role === 'cashier' || !canAny("patients.view","admissions.view","outpatient_pt.view","inpatient_pt.view","inpatient_rehab.view","inpatient_social.view","inpatient_finance.view","moh_portal.view","laboratory.view","diagnostics.view","billing.view","doctor_portal.view")
        ? []
        : patients.map((p) => ({
            path: `/patients/${p.id}`,
            title: p.fullName,
            sub: `${p.idNumber} · ${p.medicalSerial} · ${p.phone || ""}` ,
          }));
    const doctorLinks =
      !canAny("doctors.view")
        ? []
        : doctors.map((d) => ({
            path: "/doctors",
            title: d.name,
            sub: t("doctor"),
          }));
    return [...links, ...patientLinks, ...doctorLinks]
      .filter(
        (item) =>
          !text || `${item.title} ${item.sub}`.toLowerCase().includes(text),
      )
      .slice(0, 12);
  }, [query, t, patients, doctors, user?.permissions, user?.role]);

  const allowedNotifications = useMemo(() => {
    if (isEngineerMohammed(user)) return notifications;
    const canAdmission = canAny('admissions.view','inpatient_rehab.view','inpatient_social.view','inpatient_pt.view','inpatient_finance.view','moh_portal.view');
    const canPt = canAny('outpatient_pt.view','inpatient_pt.view');
    const canDental = canAny('dental.view','financial_audit.view');
    const canElderly = canAny('elderly.view');
    const canLab = canAny('laboratory.view','diagnostics.view');
    const canQueue = canAny('queue.view','visits.view');
    const canBilling = canAny('billing.view','finance.view','patient_finance.view');
    return notifications.filter(item => {
      const text = `${item.title} ${item.body} ${item.link || ''}`;
      if (/مبيت|صحة|تخريج|تقرير مبيت|تجديد|تحويلة/.test(text)) return canAdmission;
      if (/أسنان|اسنان|Dental/.test(text)) return canDental;
      if (/مسنين|مسنات|رعاية المسنين|Elderly/.test(text)) return canElderly;
      if (/علاج طبيعي/.test(text)) return canPt;
      if (/مختبر|تحليل|أشعة|نتيجة/.test(text)) return canLab;
      if (/طابور|فرز|دور|زيارة/.test(text)) return canQueue;
      if (/فاتورة|مالي|دفعة|خصم|رسوم/.test(text)) return canBilling;
      return canAny('patients.view');
    });
  }, [notifications, user?.id, user?.permissions]);
  const visibleNotifications = notificationsMuted ? [] : allowedNotifications;
  const switchLanguage = () => {
    const next = language === "ar" ? "en" : "ar";
    setLanguage(next);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("wafaa:language-change", { detail: next })), 0);
  };

  return (
    <div
      className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      <aside className="dock glass" aria-label="Main navigation">
        <button type="button" className="dock-brand dock-brand-button" onClick={() => navigate("/")} title={t("dashboard")}>
          <div className="brand-logo">
            <img
              src="/wafaa-hospital-logo.png"
              alt="شعار مستشفى الوفاء"
            />
          </div>
          {sidebarOpen && (
            <div>
              <b>{t("appName")}</b>
              <span>{t("appSub")}</span>
            </div>
          )}
        </button>
        <button
          className="dock-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? t("collapseMenu") : t("openMenu")}
        >
          {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
        </button>
        <nav className="dock-nav">
          {sidebarOpen && (
            <div className="dock-filter">
              <Search />
              <input
                value={navQuery}
                onChange={event => setNavQuery(event.target.value)}
                placeholder={language === 'ar' ? 'تصفية القائمة' : 'Filter menu'}
                aria-label={language === 'ar' ? 'تصفية القائمة' : 'Filter menu'}
              />
              {navQuery && (
                <button type="button" onClick={() => setNavQuery("")} aria-label={language === 'ar' ? 'مسح' : 'Clear'}>
                  <X />
                </button>
              )}
            </div>
          )}
          {groupedNav.map(({ group, items }) => (
            <section className="dock-group" key={group.id}>
              <p className="dock-group-label">
                <span>{language === 'ar' ? group.ar : group.en}</span>
                <em>{items.length}</em>
              </p>
              {items.map(({ entry, index }) => {
                const [path, label, Icon] = entry;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === "/"}
                    data-tip={t(label)}
                    style={orderStyle(index)}
                    className={({ isActive }) => `dock-item ${isActive ? "active" : ""}`}
                    title={!sidebarOpen ? t(label) : undefined}
                  >
                    <span className="dock-ico" aria-hidden="true"><Icon /></span>
                    <span>{t(label)}</span>
                    <i className="dock-cue" aria-hidden="true" />
                  </NavLink>
                );
              })}
            </section>
          ))}
          {sidebarOpen && groupedNav.length === 0 && (
            <p className="dock-empty">{language === 'ar' ? 'لا توجد شاشة مطابقة' : 'No matching screen'}</p>
          )}
        </nav>
        <div className="dock-footer">
          <div className="admin-avatar">{user?.displayName.charAt(0)}</div>
          {sidebarOpen && (
            <div className="dock-user">
              <b>{user?.displayName}</b>
              <span>{t(user?.role || "admin")}</span>
            </div>
          )}
          <button
            className="logout-mini"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title={t("logout")}
          >
            <LogOut />
          </button>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-fab glass"
          onClick={() => setSidebarOpen(true)}
          aria-label={t("openMenu")}
          title={t("openMenu")}
        >
          <Menu />
          <span>{t("menu")}</span>
        </button>
      )}

      <div className="workspace">
        <header className="topbar glass">
          <button
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
          >
            <Search />
            <span>{t("search")}</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="top-actions">
            {location.pathname !== "/admissions" && <ClockChip language={language} />}
            <button
              className="icon-btn"
              onClick={switchLanguage}
              title={t("language")}
            >
              <Languages />
              <strong>{language === "ar" ? "EN" : "ع"}</strong>
            </button>
            <button className="icon-btn theme-cycle-btn" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
              {theme === "dark" ? <Sun /> : theme === "light" ? <Palette /> : theme === "aurora" ? <Sparkles /> : <Moon />}
            </button>
            <div className="notification-wrap" ref={notificationRef}>
              <button className="icon-btn notification" onClick={()=>setNotificationOpen(open=>!open)} aria-expanded={notificationOpen} title="الإشعارات">
                <Bell />
                {visibleNotifications.some(item=>!item.read)&&<i />}
                {visibleNotifications.filter(item=>!item.read).length>0&&<strong className="notification-count">{Math.min(99,visibleNotifications.filter(item=>!item.read).length)}</strong>}
              </button>
              {notificationOpen&&<div className="notification-popover glass-strong">
                <div className="notification-popover-head"><div><b>الإشعارات</b><span>{visibleNotifications.filter(item=>!item.read).length} غير مقروء</span></div><div><button onClick={toggleNotificationsMuted}>{notificationsMuted?'إلغاء الكتم':'كتم'}</button>{visibleNotifications.length>0&&<button onClick={markAllNotificationsRead}>تحديد الكل كمقروء</button>}{visibleNotifications.length>0&&<button onClick={clearNotifications}>مسح</button>}</div></div>
                <div className="notification-list">
                  {visibleNotifications.length?visibleNotifications.slice(0,30).map(item=><button key={item.id} className={`notification-item ${item.read?'read':''} notification-${item.type}`} onClick={()=>{markNotificationRead(item.id);setNotificationOpen(false);if(item.link)navigate(item.link)}}><span className="notification-dot"/><div><b>{item.title}</b><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString(language==='ar'?'ar-EG':'en-US',{hour12:true})}</small></div></button>):<div className="notification-empty"><Bell/><b>{notificationsMuted?'الإشعارات مكتومة':'لا توجد إشعارات'}</b><span>{notificationsMuted?'اضغط إلغاء الكتم لعودة التنبيهات.':'ستظهر هنا تنبيهات القسم المسموح لك فقط.'}</span></div>}
                </div>
              </div>}
            </div>
            <div className="account-menu-wrap" ref={accountMenuRef}>
              <button
                type="button"
                className="user-chip user-chip-button"
                onClick={() => setAccountOpen(open => !open)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                title={user?.displayName}
              >
                {user?.displayName.charAt(0)}
              </button>
              {accountOpen && <div className="account-popover glass-strong" role="menu">
                <div className="account-popover-head">
                  <span className="account-avatar"><UserRound/></span>
                  <div>
                    <b>{user?.displayName}</b>
                    <small>{t(user?.role || "admin")}</small>
                  </div>
                </div>
                <div className="account-username">
                  <span>{t("username")}</span>
                  <code dir="ltr">{user?.username}</code>
                </div>
                <button
                  type="button"
                  className="account-logout"
                  onClick={() => {
                    setAccountOpen(false);
        setNotificationOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  <LogOut/>
                  <span>{t("logout")}</span>
                </button>
              </div>}
            </div>
          </div>
          <div className="wx-scroll-line" aria-hidden="true"><i /></div>
        </header>
        <main className="content">
          <div className="page-transition" key={`${location.pathname}-${language}`}>
            <Outlet />
          </div>
        </main>
      </div>

      {searchOpen && (
        <div
          className="cmdk-back open"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setSearchOpen(false)
          }
        >
          <div className="cmdk-box glass-strong">
            <div className="cmdk-input-row">
              <Search />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
              />
              <button onClick={() => setSearchOpen(false)}>
                <X />
              </button>
            </div>
            <div className="cmdk-list">
              {searchResults.map((item, index) => (
                <button
                  key={`${item.path}-${item.title}`}
                  style={orderStyle(index)}
                  className="cmdk-item"
                  onClick={() => {
                    navigate(item.path);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <Activity />
                  <span>
                    <b>{item.title}</b>
                    <small>{item.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="toast-stack">
        {toasts.map((item) => (
          <div className={`toast-item glass toast-${item.type}`} key={item.id}>
            {item.type === "ok" ? <HeartPulse /> : <Bell />}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
