'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';
type AccentColor = 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose';

interface ThemeContextValue {
  theme: Theme;
  accent: AccentColor;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: AccentColor) => void;
}

const STORAGE_KEY = 'zui-theme';
const VALID_THEMES: Theme[] = ['dark', 'light', 'system'];
const VALID_ACCENTS: AccentColor[] = ['cyan', 'blue', 'purple', 'green', 'orange', 'rose'];

function getStoredPrefs(): { theme: Theme; accent: AccentColor } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      VALID_THEMES.includes(parsed.theme) &&
      VALID_ACCENTS.includes(parsed.accent)
    ) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function savePrefs(theme: Theme, accent: AccentColor) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent }));
  } catch { /* ignore */ }
}

function applyToDocument(resolved: ResolvedTheme, accent: AccentColor) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-accent', accent);
}

function useSystemTheme(): ResolvedTheme {
  const [sys, setSys] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSys(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return sys;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  accent: 'cyan',
  resolvedTheme: 'dark',
  systemTheme: 'dark',
  setTheme: () => {},
  setAccent: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultAccent?: AccentColor;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  defaultAccent = 'cyan',
}: ThemeProviderProps) {
  const systemTheme = useSystemTheme();

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getStoredPrefs();
    return stored?.theme ?? defaultTheme;
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const stored = getStoredPrefs();
    return stored?.accent ?? defaultAccent;
  });

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') return systemTheme;
    return theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    applyToDocument(resolvedTheme, accent);
  }, [resolvedTheme, accent]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      savePrefs(t, accent);
    },
    [accent],
  );

  const setAccent = useCallback(
    (a: AccentColor) => {
      setAccentState(a);
      savePrefs(theme, a);
    },
    [theme],
  );

  const value: ThemeContextValue = useMemo(
    () => ({ theme, accent, resolvedTheme, systemTheme, setTheme, setAccent }),
    [theme, accent, resolvedTheme, systemTheme, setTheme, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
