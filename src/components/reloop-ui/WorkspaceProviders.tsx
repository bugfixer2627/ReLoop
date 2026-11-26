'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import type { CaseInput } from '@/lib/frontend/case-validation';
import type { InputLocale } from '@/lib/contracts';

export type UiLocale = 'en-US' | 'zh-CN';

type WorkspaceContextValue = {
  accessToken: string | null;
  userId: string | null;
  authReady: boolean;
  setAccessToken: (token: string, userId?: string) => void;
  clearAccessToken: () => void;
  feedbackDraft: RefObject<{ fields: Omit<CaseInput, 'feedbackLocale'> & { feedbackLocale: InputLocale }; saved: { id: string; input: CaseInput } | null } | null>;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const feedbackDraft = useRef<WorkspaceContextValue['feedbackDraft']['current']>(null);
  const rawPreferences = useSyncExternalStore(subscribePreferences, preferenceSnapshot, () => '');
  const { locale, compact } = useMemo(() => readPreferences(rawPreferences), [rawPreferences]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((body) => { if (active && body?.ok) {
        setToken(body.data.authenticated ? 'session' : null);
        setUserId(body.data.authenticated ? body.data.userId ?? null : null);
      } })
      .catch(() => { if (active) setToken(null); })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => ({
    accessToken,
    userId,
    authReady,
    setAccessToken: (token: string, id?: string) => { feedbackDraft.current = null; setToken(token ? 'session' : null); setUserId(id ?? null); },
    clearAccessToken: () => { feedbackDraft.current = null; setToken(null); setUserId(null); },
    feedbackDraft,
    locale,
    toggleLocale: () => savePreferences({ locale: locale === 'en-US' ? 'zh-CN' : 'en-US', compact }),
    compact,
    toggleCompact: () => savePreferences({ locale, compact: !compact }),
  }), [accessToken, userId, authReady, locale, compact]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProviders.');
  return value;
}
