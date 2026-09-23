import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, Languages, LockKeyhole, LogIn, Moon, Palette, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { useI18n } from '../i18n';

const landingFor = (_session: { role: string; permissions: string[] }) => '/';

export function LoginPage() {
  const { user, login } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme, themeLabel } = useUi();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('login-performance-mode');
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => {
      document.body.classList.remove('login-performance-mode');
      window.clearInterval(id);
    };
  }, []);

  if (user) return <Navigate to={landingFor(user)} replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const session = await login(String(data.get('username')), String(data.get('password')));
    setLoading(false);
    if (!session) { setError(t('invalidCredentials')); return; }
    navigate(landingFor(session));
  };

  const ar = language === 'ar';
  const copy = ar ? {
    name: 'مستشفى الوفاء',
    full: 'للتأهيل الطبي والجراحة التخصصية',
    system: 'نظام معلومات المستشفى',
    welcome: 'تسجيل الدخول',
    sub: 'أدخل بياناتك للوصول إلى مساحة عملك',
    user: 'اسم المستخدم',
    pass: 'كلمة المرور',
    userHint: 'اسم المستخدم أو رقم الطبيب',
    passHint: '••••••••',
    show: 'إظهار كلمة المرور',
    hide: 'إخفاء كلمة المرور',
    secure: 'اتصال آمن',
    online: 'الأقسام متصلة',
    units: ['الاستقبال', 'العيادات', 'المبيت', 'المختبر', 'المالية'],
  } : {
    name: 'Wafaa Hospital',
    full: 'for Medical Rehabilitation and Specialized Surgery',
    system: 'Hospital Information System',
    welcome: 'Sign in',
    sub: 'Enter your credentials to reach your workspace',
    user: 'Username',
    pass: 'Password',
    userHint: 'Username or doctor number',
    passHint: '••••••••',
    show: 'Show password',
    hide: 'Hide password',
    secure: 'Secure connection',
    online: 'Units online',
    units: ['Reception', 'Clinics', 'Inpatient', 'Laboratory', 'Finance'],
  };

  const themeIcon = theme === 'dark' ? <Sun /> : theme === 'light' ? <Palette /> : theme === 'aurora' ? <Moon /> : <Moon />;
  const locale = ar ? 'ar-EG' : 'en-US';

  return (
    <main className="lxc">
      <div className="lxc-field-bg" aria-hidden="true" />
      <div className="lxc-halo" aria-hidden="true" />

      <div className="lxc-controls">
        <button type="button" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>{themeIcon}</button>
        <button type="button" onClick={() => setLanguage(ar ? 'en' : 'ar')} title={ar ? 'English' : 'العربية'}>
          <Languages /><span>{ar ? 'EN' : 'ع'}</span>
        </button>
      </div>

      <div className="lxc-sheet">
        <div className="lxc-crest">
          <img src="/wafaa-hospital-logo.png" alt="شعار مستشفى الوفاء - Wafaa Hospital" />
        </div>

        <header className="lxc-masthead">
          <p className="lxc-system">{copy.system}</p>
          <h1>{copy.name}</h1>
          <p className="lxc-full">{copy.full}</p>
        </header>

        <div className="lxc-rule" aria-hidden="true">
          <svg viewBox="0 0 300 24" preserveAspectRatio="none">
            <path className="lxc-trace-base" d="M0 12 H104 l7 -8 l6 16 l6 -14 l5 6 H180 l8 -7 l6 15 l5 -10 l4 4 H300" />
            <path className="lxc-trace-live" d="M0 12 H104 l7 -8 l6 16 l6 -14 l5 6 H180 l8 -7 l6 15 l5 -10 l4 4 H300" />
          </svg>
        </div>

        <div className="lxc-intro">
          <h2>{copy.welcome}</h2>
          <p>{copy.sub}</p>
        </div>

        <form onSubmit={submit}>
          <label className="lxc-field">
            <span>{copy.user}</span>
            <div className="lxc-input">
              <UserRound />
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={copy.userHint}
                required
                disabled={loading}
              />
            </div>
          </label>

          <label className="lxc-field">
            <span>{copy.pass}</span>
            <div className="lxc-input">
              <LockKeyhole />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={copy.passHint}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="lxc-peek"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? copy.hide : copy.show}
                title={showPassword ? copy.hide : copy.show}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          {error && <p className="lxc-error" role="alert">{error}</p>}

          <button className="lxc-submit" type="submit" disabled={loading}>
            <LogIn />
            <span>{loading ? t('signingIn') : t('login')}</span>
          </button>
        </form>

        <ul className="lxc-units" aria-hidden="true">
          {copy.units.map(unit => <li key={unit}>{unit}</li>)}
        </ul>

        <footer className="lxc-foot">
          <span className="lxc-secure"><ShieldCheck />{copy.secure}</span>
          <span className="lxc-live">
            <i />{copy.online}
            <b>{now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</b>
          </span>
        </footer>
      </div>

      <p className="lxc-copyright">© Code Nexus · Wafaa Hospital Information System</p>
    </main>
  );
}
