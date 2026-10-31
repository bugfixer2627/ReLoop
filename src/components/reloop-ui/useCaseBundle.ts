'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from './WorkspaceProviders';
import { ApiRequestError, getCaseBundle } from '@/lib/frontend/api-client';
import type { CaseBundle } from '@/lib/contracts';

export function useCaseBundle(caseId: string) {
  const { accessToken } = useWorkspace();
  const [bundle, setBundle] = useState<CaseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    getCaseBundle(accessToken, caseId).then((value) => {
      if (active) { setBundle(value); setError(null); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof ApiRequestError ? reason.message : 'Could not load this case.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, caseId, reload]);

  return {
    bundle: bundle?.case.id === caseId ? bundle : null,
    loading: loading || (bundle !== null && bundle.case.id !== caseId),
    error,
    retry: () => { setLoading(true); setError(null); setReload((value) => value + 1); },
  };
}
