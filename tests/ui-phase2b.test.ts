import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoBundle } from '@/lib/fixtures/demo';
import { createCaseRequestSchema, platformSchema } from '@/lib/contracts';
import { platformDefinitions } from '@/lib/config/platforms';
import { caseDestination, caseHref, navigationCaseId } from '@/lib/frontend/case-navigation';
import { ApiRequestError } from '@/lib/frontend/api-client';
import { requestMessage } from '@/lib/frontend/request-message';
import { caseFieldIsInvalid, updateInvalidFields, type CaseInput } from '@/lib/frontend/case-validation';
import { SavedCaseIdentity } from '@/components/reloop-ui/SavedCaseIdentity';
import { CaseLoadProblem } from '@/components/reloop-ui/CaseLoadProblem';
import FeedbackPage from '@/app/(dashboard)/feedback/page';
import InvestigationClient from '@/app/(dashboard)/cases/[id]/investigation-client';

const state = vi.hoisted(() => ({ locale: 'en-US', pathname: '/feedback' }));
vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/reloop-ui/WorkspaceProviders', () => ({
  useWorkspace: () => ({ accessToken: 'fixture-token', locale: state.locale, toggleLocale: vi.fn(), clearAccessToken: vi.fn() }),
}));
vi.mock('@/components/reloop-ui/useSelectedCase', () => ({ useSelectedCase: () => null, rememberCase: vi.fn() }));
vi.mock('@/components/reloop-ui/useCaseBundle', () => ({ useCaseBundle: () => ({ bundle: demoBundle, loading: false, error: null, retry: vi.fn() }) }));

beforeEach(() => { state.locale = 'en-US'; state.pathname = '/feedback'; });

describe('case-dependent navigation', () => {
  it('takes unselected workflows to an explicit case picker', () => {
    expect(caseHref(null, 'investigation')).toBe('/dashboard?view=investigation');
    expect(caseHref(null, 'fix')).toBe('/dashboard?view=fix');
    expect(caseHref('bad-id', 'fix')).toBe('/dashboard?view=fix');
    expect(caseDestination('unexpected')).toBeUndefined();
  });

  it('keeps the same case when returning from Fix & Approve or passing through Inbox', () => {
    const id = demoBundle.case.id;
    expect(caseHref(navigationCaseId(`/cases/${id}/fix`, null), 'investigation')).toBe(`/cases/${id}`);
    expect(caseHref(navigationCaseId('/feedback', id), 'fix')).toBe(`/cases/${id}/fix`);
    const otherId = '00000000-0000-4000-8000-000000000102';
    expect(navigationCaseId(`/cases/${otherId}`, id)).toBe(otherId);
  });
});

describe('saved records are read-only components', () => {
  it.each(['en-US', 'zh-CN'])('keeps SKU, product and case identities display-only in %s', (locale) => {
    const original = structuredClone(demoBundle.case);
    const html = renderToStaticMarkup(createElement(SavedCaseIdentity, { caseRecord: demoBundle.case, product: demoBundle.product, locale }));
    for (const value of [original.sku, original.productId, original.id, demoBundle.product.name]) expect(html).toContain(value);
    expect(html).not.toMatch(/<(input|textarea|select|form)\b/);
    expect(demoBundle.case).toEqual(original);
  });

  it('renders the original feedback and product identity together without editable controls', () => {
    state.pathname = `/cases/${demoBundle.case.id}`;
    const html = renderToStaticMarkup(createElement(InvestigationClient, { caseId: demoBundle.case.id }));
    expect(html).toContain('saved-case-identity');
    expect(html).toContain(demoBundle.case.feedbackText);
    expect(html).toContain(demoBundle.case.merchantInstruction);
    expect(html).not.toMatch(/<(textarea|select)\b/);
    expect(html).not.toContain('name="sku"');
  });
});

describe('Feedback Inbox presentation and contracts', () => {
  it.each(['en-US', 'zh-CN'])('renders independent labeled language fields and supported platform IDs in %s', (locale) => {
    state.locale = locale;
    const html = renderToStaticMarkup(createElement(FeedbackPage));
    expect(html).toContain('name="feedbackLocale"');
    expect(html).toContain('name="merchantLocale"');
    for (const id of platformSchema.options) expect(html).toContain(`value="${id}"`);
    expect(html).not.toContain('中文 / English');
    expect(html).not.toContain('Synthetic only');
    expect(html).toContain(locale === 'zh-CN' ? '指令与语音语言' : 'Instruction &amp; voice language');
    expect(html).toContain(locale === 'zh-CN' ? '退出工作区' : 'Sign out');
    expect(html).not.toContain('class="avatar"');
    expect(html).not.toContain('profile-btn');
  });

  it('uses the same supported IDs as case creation and review configuration', () => {
    expect(Object.keys(platformDefinitions).sort()).toEqual([...platformSchema.options].sort());
    for (const channel of platformSchema.options) {
      expect(createCaseRequestSchema.safeParse({
        sku: 'RL-LAMP-01', channel, feedbackText: 'Synthetic report', feedbackLocale: 'en-US',
        merchantInstruction: '请核对证据', merchantLocale: 'zh-CN', synthetic: true,
      }).success).toBe(true);
    }
  });

  it('localizes known API failures without changing or translating source text', () => {
    const error = new ApiRequestError(404, 'UNKNOWN_SKU', 'Product not found.', false);
    expect(requestMessage(error, 'zh-CN', 'save')).toContain('未找到该 SKU');
    expect(requestMessage(error, 'en-US', 'save')).toContain('No product matches');
    expect(requestMessage(new ApiRequestError(404, 'NOT_FOUND', 'Not found', false), 'zh-CN', 'case')).toContain('请选择其他已保存案例');
  });
});

describe('Feedback Inbox field validation updates', () => {
  const input: CaseInput = {
    sku: 'RL-LAMP-01', channel: 'shopify_us', feedbackText: 'Synthetic customer report',
    feedbackLocale: 'en-US', merchantInstruction: 'Check the documented runtime.',
    merchantLocale: 'en-US', synthetic: true,
  };

  it.each([
    ['sku', '   ', 'RL-LAMP-01'],
    ['feedbackText', '  ', 'Customer report after correction'],
    ['merchantInstruction', '  ', 'Check evidence after correction'],
  ] as const)('keeps %s invalid until the corrected value satisfies the shared schema', (field, invalidValue, correctedValue) => {
    expect(caseFieldIsInvalid(input, field, invalidValue)).toBe(true);
    expect(caseFieldIsInvalid(input, field, correctedValue)).toBe(false);
  });

  it('clears only the corrected field and retains errors on the other fields', () => {
    const errors = ['sku', 'feedbackText', 'merchantInstruction'] as const;
    expect(updateInvalidFields([...errors], 'sku', false)).toEqual(['feedbackText', 'merchantInstruction']);
    expect(updateInvalidFields(['feedbackText'], 'feedbackText', true)).toEqual(['feedbackText']);
  });

  it.each(['en-US', 'zh-CN'])('renders bounded missing-case recovery with localized actions for %s', (locale) => {
    const html = renderToStaticMarkup(createElement(CaseLoadProblem, {
      message: locale === 'zh-CN' ? '案例不可用。' : 'Case unavailable.',
      locale, destination: 'investigation', retry: vi.fn(),
    }));
    expect(html).toContain('case-load-problem');
    expect(html).toContain(locale === 'zh-CN' ? '无法打开此案例' : 'Unable to open this case');
    expect(html).toContain('href="/dashboard?view=investigation"');
    expect(html).toContain(locale === 'zh-CN' ? '选择其他案例' : 'Choose another case');
    expect(html).toContain(locale === 'zh-CN' ? '重试' : 'Retry');
  });
});
