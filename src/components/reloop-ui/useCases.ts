'use client';

import { useEffect, useState } from 'react';
import { loadCasePage } from '@/lib/frontend/api-client';
import { requestMessage } from '@/lib/frontend/request-message';
import { useWorkspace } from './WorkspaceProviders';

export function useCases(query = 'page=1') {
  const { accessToken, locale } = useWorkspace();
  const [result, setResult] = useState<{ token: string; query: string; data?: Awaited<ReturnType<typeof loadCasePage>>; error?: unknown } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    loadCasePage(accessToken, query).then((data) => { if (active) setResult({ token: accessToken, query, data }); })
      .catch((error: unknown) => { if (active) setResult({ token: accessToken, query, error }); });
    return () => { active = false; };
  }, [accessToken, query, reload]);
  const current = result?.token === accessToken && result.query === query ? result : null;
  return { cases: current?.data?.cases ?? [], pageInfo: current?.data, loading: !current, error: current?.error ? requestMessage(current.error, locale, 'case') : null,
    retry: () => { setResult(null); setReload((n) => n + 1); } };
}
