import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Microscope,
  Plus,
  Stethoscope,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, EmptyState, PageHeader, Panel } from "../components/ui";
import { useHospital } from "../context/HospitalContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { canViewFinancialReports } from "../utils/permissions";

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

export function DashboardPage() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    patients,
    visits,
    admissions,
    invoices,
    doctors,
    clinicName,
    patientName,
  } = useHospital();
  const visitsToday = visits.filter((v) => v.date === today()).length;
  const active = visits.filter(
    (v) => v.date === today() && v.status !== "completed",
  ).length;
  const collected = invoices.reduce((sum, item) => sum + item.payableAmount, 0);
  const canViewFinance = canViewFinancialReports(user);
  const canRegisterPatient = user?.permissions.includes('patients.create') ?? false;
  const canOpenQueue = user?.permissions.includes('queue.view') ?? false;
  const quickModules = [
    { path: '/patients', label: t('patients'), sub: language === 'ar' ? 'ملفات وتسجيل المرضى' : 'Patient files & registration', icon: Users, permission: 'patients.view' },
    { path: '/queue', label: t('queue'), sub: language === 'ar' ? 'مراجعات اليوم والفرز' : 'Today reviews & triage', icon: ClipboardList, permission: 'queue.view' },
    { path: '/admissions', label: t('admissions'), sub: language === 'ar' ? 'المبيت والأسرة والمتابعة' : 'Inpatient beds & follow-up', icon: BedDouble, permission: 'admissions.view' },
    { path: '/diagnostics', label: t('diagnostics'), sub: language === 'ar' ? 'الطلبات التشخيصية' : 'Diagnostic orders', icon: FlaskConical, permission: 'diagnostics.view' },
    { path: '/laboratory', label: t('laboratory'), sub: language === 'ar' ? 'المختبر والنتائج' : 'Lab & results', icon: Microscope, permission: 'laboratory.view' },
    { path: '/reports', label: t('reports'), sub: language === 'ar' ? 'تقارير التشغيل' : 'Operational reports', icon: BarChart3, permission: 'reports.view' },
  ].filter(item => user?.permissions.includes(item.permission));
  const activities = [
    ...visits.map((v) => ({
      id: v.id,
      date: v.date,
      text: `${clinicName(v.clinicId, language)} — ${patientName(v.patientId)}`,
    })),
    ...(canViewFinance ? invoices : []).map((v) => ({
      id: v.id,
      date: v.date.slice(0, 10),
      text: `${v.service} — ${patientName(v.patientId)}`,
    })),
  ]
    .slice(-6)
    .reverse();
  return (
    <>
      <PageHeader
        crumb={t("overview")}
        title={t("dashboardTitle")}
        sub={t("dashboardSub")}
        actions={
          <>
            {canOpenQueue && (
              <Button className="btn-ghost" onClick={() => navigate("/queue")}>
                <Activity />
                {t("liveQueue")}
              </Button>
            )}
            {canRegisterPatient && (
              <Button
                className="btn-primary"
                onClick={() => navigate("/patients?new=1")}
              >
                <Plus />
                {t("registerPatient")}
              </Button>
            )}
          </>
        }
      />
      <section className="dashboard-welcome glass">
        <div className="dashboard-welcome-copy">
          <span className="dashboard-live"><i/><HeartPulse/>{language === 'ar' ? 'مساحة العمل جاهزة' : 'Workspace ready'}</span>
          <h2>{language === 'ar' ? `أهلاً ${user?.displayName || ''}` : `Welcome, ${user?.displayName || ''}`}</h2>
          <p>{language === 'ar' ? 'وصول سريع لأهم أقسام المستشفى — اضغط على أي بطاقة للانتقال مباشرة.' : 'Quick access to the hospital core modules — select any card to open it instantly.'}</p>
        </div>
        <div className="dashboard-module-strip">
          {quickModules.slice(0,6).map(({path,label,sub,icon:Icon}) => <button key={path} type="button" className="dashboard-module" onClick={() => navigate(path)}>
            <span className="dashboard-module-icon"><Icon/></span>
            <span><b>{label}</b><small>{sub}</small></span>
            <ArrowUpRight className="dashboard-module-arrow"/>
          </button>)}
        </div>
      </section>
      <div className="stat-grid">
        <button type="button" className="stat-card stat-link glass c-cyan" onClick={() => user?.permissions.includes('patients.view') && navigate('/patients')} disabled={!user?.permissions.includes('patients.view')}>
          <div className="stat-top"><div className="stat-icon"><Users /></div><span className="stat-arrow">↗</span></div>
          <b className="stat-num">{patients.length}</b><span>{t("registeredPatients")}</span>
        </button>
        <button type="button" className="stat-card stat-link glass c-emerald" onClick={() => user?.permissions.includes('queue.view') && navigate('/queue')} disabled={!user?.permissions.includes('queue.view')}>
          <div className="stat-top"><div className="stat-icon"><Stethoscope /></div><span className="stat-arrow">↗</span></div>
          <b className="stat-num">{active}</b><span>{t("activeCases")}</span>
        </button>
        <button type="button" className="stat-card stat-link glass c-amber" onClick={() => user?.permissions.includes('queue.view') ? navigate('/queue') : user?.permissions.includes('patients.view') && navigate('/patients')} disabled={!user?.permissions.includes('queue.view') && !user?.permissions.includes('patients.view')}>
          <div className="stat-top"><div className="stat-icon"><Building2 /></div><span className="stat-arrow">↗</span></div>
          <b className="stat-num">{visitsToday}</b><span>{t("outpatientVisits")}</span>
        </button>
        <button type="button" className="stat-card stat-link glass c-violet" onClick={() => canViewFinance ? navigate('/finance-reports') : user?.permissions.includes('admissions.view') && navigate('/admissions')} disabled={!canViewFinance && !user?.permissions.includes('admissions.view')}>
          <div className="stat-top"><div className="stat-icon">{canViewFinance ? <CircleDollarSign /> : <BedDouble />}</div><span className="stat-arrow">↗</span></div>
          <b className="stat-num">{canViewFinance ? collected.toLocaleString() : admissions.filter((a) => a.status === "admitted").length}</b>
          <span>{canViewFinance ? `${t("walletCredits")} ₪` : t("activeAdmissions")}</span>
        </button>
      </div>
      <Panel className="hero-panel">
        <div className="panel-head">
          <h3>
            <HeartPulse />
            {t("activityIndex")}
          </h3>
          <span>{t("activitySub")}</span>
        </div>
        <svg className="pulse-chart" viewBox="0 0 600 90">
          <defs>
            <linearGradient id="pulseGrad">
              <stop stopColor="var(--cyan)" />
              <stop offset="1" stopColor="var(--emerald)" />
            </linearGradient>
          </defs>
          <path d="M0 45 H120 L136 15 L156 75 L176 30 L192 45 H300 L316 10 L336 80 L356 45 H600" />
        </svg>
      </Panel>
      <div className="two-col">
        <Panel>
          <div className="panel-head">
            <h3>
              <Activity />
              {t("recentActivity")}
            </h3>
          </div>
          {activities.length ? (
            <div className="activity-list">
              {activities.map((item) => (
                <div className="activity-row" key={item.id}>
                  <span>
                    <HeartPulse />
                  </span>
                  <b>{item.text}</b>
                  <small>{item.date}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t("noActivity")} sub={t("noActivitySub")} />
          )}
        </Panel>
        <Panel>
          <div className="panel-head">
            <h3>
              <BedDouble />
              {t("quickSummary")}
            </h3>
          </div>
          <div className="summary-list">
            <div className="glass">
              <span>{t("doctors")}</span>
              <b>{doctors.length}</b>
            </div>
            <div className="glass">
              <span>{t("activeAdmissions")}</span>
              <b>{admissions.filter((a) => a.status === "admitted").length}</b>
            </div>
            <div className="glass">
              <span>{t("todayVisits")}</span>
              <b>{visitsToday}</b>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
