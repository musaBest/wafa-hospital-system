import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { Theme } from '../types';

interface Toast { id: number; message: string; type: 'ok' | 'warn' }
interface UiValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (value: Theme) => void;
  themeLabel: string;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  toasts: Toast[];
  toast: (message: string, type?: Toast['type']) => void;
}
const UiContext = createContext<UiValue | null>(null);

const themeOrder: Theme[] = ['dark', 'light', 'aurora', 'pearl'];
const themeLabels: Record<Theme, string> = { dark: 'الوضع الليلي', light: 'الوضع النهاري', aurora: 'وضع الشفق', pearl: 'وضع اللؤلؤ' };
const normalizeTheme = (value: string | null): Theme => themeOrder.includes(value as Theme) ? value as Theme : 'dark';

export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => normalizeTheme(localStorage.getItem('wafa_theme')));
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1100);
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('wafa_theme', theme); }, [theme]);
  const toast = (message: string, type: Toast['type'] = 'ok') => {
    const id = Date.now();
    setToasts(current => [...current, { id, message, type }]);
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 2800);
  };
  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme(v => themeOrder[(themeOrder.indexOf(v) + 1) % themeOrder.length]),
    setTheme,
    themeLabel: themeLabels[theme],
    sidebarOpen, setSidebarOpen, toasts, toast
  }), [theme, sidebarOpen, toasts]);
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi must be used inside UiProvider');
  return value;
}
