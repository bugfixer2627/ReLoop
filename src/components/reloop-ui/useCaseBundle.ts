'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from './WorkspaceProviders';
import { ApiRequestError, getCaseBundle } from '@/lib/frontend/api-client';
import { validCaseId } from '@/lib/frontend/case-navigation';
import { requestMessage } from '@/lib/frontend/request-message';
import { rememberCase } from './useSelectedCase';
import type { CaseBundle } from '@/lib/contracts';

export function useCaseBundle(caseId: string) {
  const { accessToken, locale } = useWorkspace();
  const [bundle, setBundle] = useState<CaseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [settledCaseId, setSettledCaseId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const request = validCaseId(caseId)
      ? getCaseBundle(accessToken, caseId)
      : Promise.reject(new ApiRequestError(400, 'INVALID_REQUEST', 'Invalid case ID.', false));
    request.then((value) => {
      if (active) { setBundle(value); setError(null); rememberCase(value.case.id); }
    }).catch((reason: unknown) => {
      if (active) setError(reason);
    }).finally(() => {
      if (active) { setSettledCaseId(caseId); setLoading(false); }
    });
    return () => { active = false; };
  }, [accessToken, caseId, reload]);

  return {
    bundle: bundle?.case.id === caseId ? bundle : null,
    loading: loading || settledCaseId !== caseId,
    error: error ? requestMessage(error, locale, 'case') : null,
    retry: () => { setLoading(true); setError(null); setReload((value) => value + 1); },
  };
}
