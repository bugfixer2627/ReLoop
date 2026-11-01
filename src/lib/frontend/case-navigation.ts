import { z } from 'zod';

export type CaseDestination = 'investigation' | 'fix';
const caseIdSchema = z.uuid();

export function validCaseId(value: unknown): string | null {
  const parsed = caseIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function caseDestination(value: unknown): CaseDestination | undefined {
  return value === 'investigation' || value === 'fix' ? value : undefined;
}

export function casePickerHref(destination: CaseDestination) {
  return `/dashboard?view=${destination}`;
}

export function caseHref(id: string | null, destination: CaseDestination) {
  const confirmed = validCaseId(id);
  return confirmed ? `/cases/${confirmed}${destination === 'fix' ? '/fix' : ''}` : casePickerHref(destination);
}

export function navigationCaseId(pathname: string, selectedId: string | null) {
  const routeId = pathname.match(/^\/cases\/([^/]+)(?:\/(?:fix|detail))?\/?$/)?.[1];
  return routeId ? validCaseId(routeId) : validCaseId(selectedId);
}
