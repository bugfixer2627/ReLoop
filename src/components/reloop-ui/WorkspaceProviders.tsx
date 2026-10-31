'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type UiLocale = 'en-US' | 'zh-CN';

type WorkspaceContextValue = {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
  locale: UiLocale;
  toggleLocale: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  const [accessToken, setToken] = useState<string | null>(null);
  const [locale, setLocale] = useState<UiLocale>('en-US');
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo(() => ({
    accessToken,
    setAccessToken: (token: string) => setToken(token),
    clearAccessToken: () => setToken(null),
    locale,
    toggleLocale: () => setLocale((current) => current === 'en-US' ? 'zh-CN' : 'en-US'),
  }), [accessToken, locale]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProviders.');
  return value;
}
