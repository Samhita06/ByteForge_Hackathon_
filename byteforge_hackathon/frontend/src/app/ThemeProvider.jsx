import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme-context.js';

const STORAGE_KEY = 'byteforge-theme';

function readPreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme(preference, systemPrefersDark) {
  return preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
}

function applyTheme(preference, systemPrefersDark) {
  const resolved = resolveTheme(preference, systemPrefersDark);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  const setThemePreference = useCallback((nextPreference) => {
    if (!['light', 'dark', 'system'].includes(nextPreference)) return;
    setPreference(nextPreference);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextPreference);
    } catch {
      // Theme selection remains usable when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (event) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, []);

  useEffect(() => {
    applyTheme(preference, systemPrefersDark);
  }, [preference, systemPrefersDark]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme: resolveTheme(preference, systemPrefersDark),
      setThemePreference,
    }),
    [preference, systemPrefersDark, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
