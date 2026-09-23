import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { UiProvider } from './context/UiContext';
import { AuthProvider } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import './styles.css';
import './styles.motion.css';
import './styles.login.css';
import './styles.system.css';
import { initMotionRuntime } from './utils/motion';

initMotionRuntime();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nProvider><UiProvider><AuthProvider><SplashScreen /><App /></AuthProvider></UiProvider></I18nProvider>,
);
