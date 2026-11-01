import type { Case } from '@/lib/contracts';

export type CaseFilters = { query?: string; status?: string; channel?: string; sort?: string };

export function filterCases(cases: Case[], filters: CaseFilters) {
  const needle = (filters.query ?? '').trim().toLocaleLowerCase();
  return cases.filter((item) =>
    (!filters.status || filters.status === 'all' || item.status === filters.status) &&
    (!filters.channel || filters.channel === 'all' || item.channel === filters.channel) &&
    `${item.id} ${item.sku} ${item.feedbackText} ${item.merchantInstruction}`.toLocaleLowerCase().includes(needle),
  ).sort((a, b) => (filters.sort === 'oldest' ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)) || a.id.localeCompare(b.id));
}

// Quote every field and prevent spreadsheet formula execution in merchant-supplied text.
export function casesCsv(cases: Case[]) {
  const cell = (value: string) => `"${(/^[\s\uFEFF]*[=+@\-\t\r]/u.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`;
  const rows = [['caseId', 'sku', 'channel', 'status', 'feedback', 'feedbackLocale', 'createdAt'],
    ...cases.map((c) => [c.id, c.sku, c.channel, c.status, c.feedbackText, c.feedbackLocale, c.createdAt])];
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

export function creationSeries(cases: Case[], days: number, now: Date) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const counts = new Map<string, number>();
  for (const item of cases) {
    const date = new Date(item.createdAt).toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end - (days - 1 - index) * 86400000).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
}
