'use client';

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

export type UiLocale = 'en-US' | 'zh-CN';

type WorkspaceContextValue = {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
  locale: UiLocale;
  toggleLocale: () => void;
  compact: boolean;
  toggleCompact: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const preferenceKey = 'reloop-ui-preferences';
let memoryPreferences = '';
let storageFallback = false;
function subscribePreferences(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener('reloop-preferences', update);
  return () => { window.removeEventListener('storage', update); window.removeEventListener('reloop-preferences', update); };
}
function preferenceSnapshot() {
  if (storageFallback) return memoryPreferences;
  try { return localStorage.getItem(preferenceKey) ?? memoryPreferences; } catch { return memoryPreferences; }
}
function readPreferences(raw: string): { locale: UiLocale; compact: boolean } {
  try {
    const p = JSON.parse(raw);
    return { locale: p?.locale === 'zh-CN' ? 'zh-CN' : 'en-US', compact: p?.compact === true };
  } catch { return { locale: 'en-US', compact: false }; }
}
function savePreferences(value: { locale: UiLocale; compact: boolean }) {
  memoryPreferences = JSON.stringify(value);
  try { localStorage.setItem(preferenceKey, memoryPreferences); storageFallback = false; } catch { storageFallback = true; }
  window.dispatchEvent(new Event('reloop-preferences'));
}

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  const [accessToken, setToken] = useState<string | null>(null);
  const rawPreferences = useSyncExternalStore(subscribePreferences, preferenceSnapshot, () => '');
  const { locale, compact } = useMemo(() => readPreferences(rawPreferences), [rawPreferences]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo(() => ({
    accessToken,
    setAccessToken: (token: string) => setToken(token),
    clearAccessToken: () => setToken(null),
    locale,
    toggleLocale: () => savePreferences({ locale: locale === 'en-US' ? 'zh-CN' : 'en-US', compact }),
    compact,
    toggleCompact: () => savePreferences({ locale, compact: !compact }),
  }), [accessToken, locale, compact]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProviders.');
  return value;
}
