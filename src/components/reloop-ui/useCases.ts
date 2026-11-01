'use client';

import { useEffect, useState } from 'react';
import type { Case } from '@/lib/contracts';
import { listCases } from '@/lib/frontend/api-client';
import { requestMessage } from '@/lib/frontend/request-message';
import { useWorkspace } from './WorkspaceProviders';

export function useCases() {
  const { accessToken, locale } = useWorkspace();
  const [result, setResult] = useState<{ token: string; items: Case[]; error: unknown } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    listCases(accessToken).then((items) => { if (active) setResult({ token: accessToken, items, error: null }); })
      .catch((error: unknown) => { if (active) setResult({ token: accessToken, items: [], error }); });
    return () => { active = false; };
  }, [accessToken, reload]);
  const current = result?.token === accessToken ? result : null;
  return { cases: current?.items ?? [], loading: !current, error: current?.error ? requestMessage(current.error, locale, 'case') : null,
    retry: () => { setResult(null); setReload((n) => n + 1); } };
}
