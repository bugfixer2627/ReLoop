import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoBundle } from '@/lib/fixtures/demo';
import { mockGeneratedBundle } from './fixtures/generation';
import { caseBundleSchema } from '@/lib/contracts';
import { casesCsv, filterCases, creationSeries } from '@/lib/frontend/case-list';
import { navigationCaseId } from '@/lib/frontend/case-navigation';
import { artifactText } from '@/lib/frontend/artifact-text';
import { caseReference } from '@/lib/frontend/case-reference';
import { CaseTable } from '@/components/reloop-ui/CaseTable';
import { ArtifactWorkspace } from '@/components/reloop-ui/ArtifactWorkspace';
import { SourceBrowser } from '@/components/reloop-ui/SourceBrowser';

vi.mock('next/navigation', () => ({ usePathname: () => '/cases', useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/components/reloop-ui/WorkspaceProviders', () => ({ useWorkspace: () => ({ locale: 'en-US', accessToken: 'test-token' }) }));

const rows = [demoBundle.case, { ...demoBundle.case, id: '00000000-0000-4000-8000-000000000102', channel: 'amazon_de' as const, feedbackText: '不同的反馈', status: 'closed' as const, createdAt: '2026-10-30T23:00:00Z' }];

describe('case management data and exports', () => {
  it('keeps compact case references distinguishable when UUID prefixes match', () => {
    expect(caseReference('00000000-0000-4000-8000-000000000101')).toBe('CASE-000101');
    expect(caseReference('00000000-0000-4000-8000-000000000102')).not.toBe(caseReference('00000000-0000-4000-8000-000000000101'));
    expect(caseReference('RL-2407')).toBe('RL-2407');
  });
  it('combines query, channel and status without changing source records', () => {
    expect(filterCases(rows, { query: '不同', channel: 'amazon_de', status: 'closed' }).map((r) => r.id)).toEqual([rows[1].id]);
    expect(filterCases(rows, { query: '不同', status: 'open' })).toEqual([]);
    expect(rows[0]).toEqual(demoBundle.case);
    expect(filterCases(rows, { sort: 'oldest' })[0].id).toBe(rows[1].id);
    expect(filterCases(rows, {})[0].id).toBe(rows[0].id);
  });
  it('exports only supplied records and escapes spreadsheet injection, quotes and newlines', () => {
    const csv = casesCsv([{ ...rows[1], feedbackText: ' =HYPERLINK("unsafe")\n客户原话' }]);
    expect(csv).toContain(rows[1].id);
    expect(csv).not.toContain(rows[0].id);
    expect(csv).toContain('"\' =HYPERLINK(""unsafe"")\n客户原话"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(casesCsv([]).split('\r\n')).toHaveLength(1);
  });
  it('counts actual creations within UTC day boundaries and includes zero days', () => {
    const series = creationSeries(rows, 3, new Date('2026-11-01T06:00:00+08:00'));
    expect(series.map((r) => r.date)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31']);
    expect(series.map((r) => r.count)).toEqual([0, 1, 1]);
    expect(creationSeries([{ ...rows[0], createdAt: '2026-11-01T01:00:00+08:00' }], 1, new Date('2026-10-31T22:00:00Z'))[0].count).toBe(1);
  });
  it('links table rows to their actual case details and retains selected case there', () => {
    const markup = renderToStaticMarkup(createElement(CaseTable, { cases: rows, locale: 'zh-CN' }));
    for (const c of rows) {
      expect(markup).toContain(`/cases/${c.id}/detail`);
      expect(navigationCaseId(`/cases/${c.id}/detail`, rows.find((r) => r.id !== c.id)!.id)).toBe(c.id);
    }
    expect(markup).not.toContain('Jasmine');
    expect(navigationCaseId('/cases/invalid/detail', rows[0].id)).toBeNull();
  });
});

describe('saved artifacts and sources', () => {
  it('shows the selected current version and its sources without mutating saved content', () => {
    const original = structuredClone(mockGeneratedBundle);
    const a = original.artifacts[0];
    const v1 = original.versions[0];
    const bundle = caseBundleSchema.parse({ ...original, artifacts: [{ ...a, latestVersion: 2 }], versions: [v1, { ...v1, id: '00000000-0000-4000-8000-000000000888', version: 2, sourceIds: ['POLICY-MERCHANT-001'], content: { format: 'support_reply', subject: 'Current subject', body: 'Current saved content' } }] });
    const markup = renderToStaticMarkup(createElement(ArtifactWorkspace, { artifact: bundle.artifacts[0], versions: bundle.versions, findings: [], revisions: [], accessToken: 'test-token', onRefresh: vi.fn() }));
    expect(markup).toContain('Current saved content');
    expect(markup).toContain('POLICY-MERCHANT-001');
    expect(markup).toContain('Confirm review decision');
    expect(markup).toContain('Saved content is read-only');
    expect(mockGeneratedBundle).toEqual(original);
  });
  it('extracts all platform-specific fields for copy/comparison', () => {
    const text = mockGeneratedBundle.versions.map((v) => artifactText(v.content));
    expect(text[0]).toContain('Please share your order number');
    expect(text[1]).toContain('Maximum 4 hours');
    expect(text[2]).toContain('German localization');
    expect(text[3]).toContain('100 units');
  });
  it('retains source verification status and safe external citations', () => {
    const html = renderToStaticMarkup(createElement(SourceBrowser, { bundle: demoBundle, locale: 'zh-CN' }));
    expect(html).toContain('需核验');
    expect(html).toContain('rel="noreferrer"');
    expect(html).not.toContain('Jasmine');
  });
});
