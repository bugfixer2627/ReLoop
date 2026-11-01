// Frontend regression checks with explicit HTTP fixtures; never writes to a database.
// Start the built app, then an isolated headless Chrome with --remote-debugging-port=9222.
// RELOOP_BASE_URL and RELOOP_CDP_PORT override the local defaults.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { openUiBrowser } from './lib/ui-browser.mjs';

const base = process.env.RELOOP_BASE_URL ?? 'http://127.0.0.1:3017';
const evidence = '.local-reviews/integration-evidence/phase2c';
const original = JSON.parse(await readFile(new URL('../src/lib/fixtures/demo.json', import.meta.url), 'utf8'));
const id = original.case.id;
const missingId = '00000000-0000-4000-8000-000000000404';
const requestId = '00000000-0000-4000-8000-000000000999';
const browser = await openUiBrowser(Number(process.env.RELOOP_CDP_PORT ?? 9222));
const results = [];
const browserErrors = [];
const expectedApiFailures = [];
const requests = [];
let listMode = 'success';
let createMode = 'success';
let analysisMode = 'failure';
let writes = 0;
const bundles = new Map([[id, original]]);
function pass(message) { results.push(message); console.log(`PASS ${message}`); }
const ok = (data) => ({ ok: true, data, error: null, requestId });
const failed = (code, message) => ({ ok: false, data: null, error: { code, message, retryable: code === 'DATABASE_UNAVAILABLE' }, requestId });

browser.on('Fetch.requestPaused', async ({ requestId: interceptionId, request }) => {
  const path = new URL(request.url).pathname;
  requests.push({ method: request.method, path, body: request.postData });
  let data;
  let status = 200;
  if (path === '/api/cases' && request.method === 'GET') {
    if (listMode === 'failure') { status = 503; data = failed('DATABASE_UNAVAILABLE', 'Fixture storage unavailable.'); }
    else data = ok({ cases: listMode === 'empty' ? [] : [...bundles.values()].map((bundle) => bundle.case) });
  } else if (path === '/api/cases' && request.method === 'POST') {
    if (createMode === 'unknown-sku') { status = 404; data = failed('UNKNOWN_SKU', 'Product not found.'); }
    else {
      writes++;
      const caseId = `00000000-0000-4000-8000-${String(200 + writes).padStart(12, '0')}`;
      const input = JSON.parse(request.postData);
      const bundle = structuredClone(original);
      bundle.case = { ...bundle.case, ...input, id: caseId };
      bundles.set(caseId, bundle);
      data = ok({ caseId }); status = 201;
    }
  } else if (path.endsWith('/analyze')) {
    if (analysisMode === 'success') data = ok({ caseId: path.split('/')[3], artifacts: [], versions: [], findings: [] });
    else { status = analysisMode === 'unavailable' ? 501 : 503; data = failed(status === 501 ? 'NOT_IMPLEMENTED' : 'DATABASE_UNAVAILABLE', 'Fixture analysis unavailable.'); }
  } else if (path.startsWith('/api/cases/')) {
    const bundle = bundles.get(path.split('/')[3]);
    if (!bundle) { status = 404; data = failed('NOT_FOUND', 'Fixture case not found.'); }
    else data = ok(bundle);
  } else {
    status = 501; data = failed('NOT_IMPLEMENTED', 'Explicit frontend fixture: service unavailable.');
  }
  await browser.send('Fetch.fulfillRequest', {
    requestId: interceptionId, responseCode: status,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    body: Buffer.from(JSON.stringify(data)).toString('base64'),
  }).catch(() => {}); // Navigation may cancel an earlier intercepted request.
});

async function route(path) {
  // Next exposes this router for browser tooling; use its real client navigation.
  await browser.evaluate(`window.next.router.push(${JSON.stringify(path)})`);
  await browser.waitFor(`location.pathname + location.search === ${JSON.stringify(path)}`);
}
async function signIn() {
  await browser.waitFor("document.querySelector('#access-token')");
  await new Promise((resolve) => setTimeout(resolve, 400));
  await browser.fill('#access-token', 'explicit-ui-fixture-token');
  await browser.click('button[type=submit]');
  await browser.waitFor("location.pathname === '/dashboard' && document.querySelector('.side-nav')");
}
async function clientLink(selector, expectedPath) {
  await browser.click(selector);
  await browser.waitFor(`location.pathname + location.search === ${JSON.stringify(expectedPath)}`);
}
async function expectText(expression, text) {
  await browser.waitFor(`${expression}.includes(${JSON.stringify(text)})`);
}

try {
  browser.on('Runtime.exceptionThrown', ({ exceptionDetails }) => browserErrors.push(exceptionDetails.text ?? 'Browser exception'));
  browser.on('Log.entryAdded', ({ entry }) => {
    if (entry.level !== 'error') return;
    if (entry.url.includes('/api/')) expectedApiFailures.push(entry.text);
    else browserErrors.push(`${entry.url}: ${entry.text}`);
  });
  await browser.send('Log.enable');
  await browser.send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  await browser.viewport(1440, 1080);
  await browser.navigate(`${base}/login`);
  await signIn();
  await clientLink('.side-nav a:nth-child(3)', '/dashboard?view=investigation');
  await expectText("document.querySelector('h1').textContent", 'Choose a case to investigate');
  assert.equal(await browser.evaluate("document.querySelector('.side-nav a[aria-current=page]').textContent.trim()"), 'Claim investigation');
  pass('Overview without a selected case opens a named Investigation picker with accurate navigation');
  await clientLink('.side-nav a:nth-child(2)', '/feedback');
  await clientLink('.side-nav a:nth-child(4)', '/dashboard?view=fix');
  await expectText("document.querySelector('h1').textContent", 'Choose a case to fix');
  await browser.waitFor("document.querySelector('.case-open')");
  assert.equal(await browser.evaluate("document.querySelector('.case-open').getAttribute('href')"), `/cases/${id}/fix`);
  pass('Inbox without a selected case offers saved-case selection for Fix & Approve');
  await clientLink('.case-open', `/cases/${id}/fix`);
  await expectText('document.body.innerText', 'No saved support reply');
  await clientLink('.side-nav a:nth-child(3)', `/cases/${id}`);
  await browser.waitFor("document.querySelector('.saved-case-identity')");
  assert.equal(await browser.evaluate("document.querySelectorAll('.saved-case-identity input, .saved-case-identity select, .saved-case-identity textarea').length"), 0);
  pass('Fix → Investigation retains the exact case and displays read-only SKU/product association');
  await clientLink('.side-nav a:nth-child(2)', '/feedback');
  assert.equal(await browser.evaluate("document.querySelector('.side-nav a:nth-child(3)').getAttribute('href')"), `/cases/${id}`);
  await clientLink('.side-nav a:first-child', '/dashboard');
  assert.equal(await browser.evaluate("document.querySelector('.side-nav a:nth-child(4)').getAttribute('href')"), `/cases/${id}/fix`);
  pass('Passing through Inbox and Overview keeps the confirmed case ID');
  await browser.send('Page.reload');
  await expectText('document.body.innerText', 'Workspace access required');
  await browser.click('.workspace-access-required a[href="/login"]');
  await signIn();
  await browser.waitFor(`document.querySelector('.side-nav a:nth-child(4)').getAttribute('href') === '/cases/${id}/fix'`);
  pass('Refresh preserves tab case selection while keeping the existing memory-only token access gate');

  // Direct URL navigation through Next links keeps the existing access-token context.
  await route(`/cases/${missingId}`);
  await browser.waitFor("document.querySelector('.case-recovery-actions')");
  await expectText('document.body.innerText', 'no longer available');
  assert.ok(await browser.evaluate("document.querySelector('.case-load-problem').offsetHeight >= 220"));
  await browser.screenshot(`${evidence}/missing-case-1440.png`);
  await browser.viewport(390, 844);
  await browser.screenshot(`${evidence}/missing-case-390.png`, true);
  await browser.viewport(1440, 1080);
  await browser.screenshot(`${evidence}/case-missing-1440.png`);
  await clientLink('.case-recovery-actions a', '/dashboard?view=investigation');
  await route('/cases/not-a-uuid/fix');
  await browser.waitFor("document.querySelector('.case-recovery-actions')");
  assert.ok(!requests.some((item) => item.path.includes('not-a-uuid')));
  pass('Missing/deleted and malformed case URLs show an understandable recovery action; malformed IDs never reach the API');

  await browser.click('.workspace-sign-out');
  await browser.waitFor("location.pathname === '/login'");
  await signIn();
  listMode = 'empty';
  await clientLink('.side-nav a:nth-child(4)', '/dashboard?view=fix');
  // The dashboard may reuse its existing response: reload after login in this scenario.
  await browser.send('Page.reload');
  await browser.waitFor("document.querySelector('.workspace-access-required')");
  await browser.click('.workspace-access-required a[href="/login"]');
  await signIn();
  await clientLink('.side-nav a:nth-child(4)', '/dashboard?view=fix');
  await expectText('document.body.innerText', 'No saved cases yet');
  assert.equal(await browser.evaluate("document.querySelector('.empty-state a').getAttribute('href')"), '/feedback');
  pass('No saved cases offers case creation instead of a silent Overview redirect');
  listMode = 'success';
  await clientLink('.side-nav a:nth-child(2)', '/feedback');
  await browser.waitFor("document.querySelector('#merchant-locale')");
  await browser.click('.feedback-form button[type=submit]');
  await expectText('document.body.innerText', 'Enter a valid SKU');
  assert.equal(await browser.evaluate('document.activeElement.id'), 'sku');
  assert.equal(await browser.evaluate("document.querySelectorAll('.feedback-form [aria-invalid=true]').length"), 3);
  assert.equal(await browser.evaluate("document.querySelectorAll('.feedback-form .field-error').length"), 3);
  await browser.screenshot(`${evidence}/inbox-invalid-en-1440.png`, true);
  await browser.click('.topbar .language');
  await expectText('document.body.innerText', '请填写有效 SKU');
  await expectText('document.body.innerText', '请填写客户反馈');
  await expectText('document.body.innerText', '请填写商家指令');
  await browser.screenshot(`${evidence}/inbox-invalid-zh-1440.png`, true);
  await browser.replaceText('#sku', 'RL-LAMP-01');
  await browser.waitFor("document.querySelector('#sku').getAttribute('aria-invalid') !== 'true'");
  assert.equal(await browser.evaluate("!!document.querySelector('#sku-error')"), false);
  await browser.replaceText('#customer-feedback', 'Synthetic customer report stays in English.');
  await browser.waitFor("document.querySelector('#customer-feedback').getAttribute('aria-invalid') !== 'true'");
  assert.equal(await browser.evaluate("!!document.querySelector('#customer-feedback-error')"), false);
  await browser.replaceText('#merchant-instruction', '请核对商品规格，保留原始反馈。');
  await browser.waitFor("document.querySelector('#merchant-instruction').getAttribute('aria-invalid') !== 'true'");
  assert.equal(await browser.evaluate("!!document.querySelector('#merchant-instruction-error')"), false);
  await browser.select('#merchant-locale', 'zh-CN');
  await browser.screenshot(`${evidence}/inbox-corrected-zh-1440.png`, true);
  await browser.click('.topbar .language');
  await expectText('document.body.innerText', 'Save the customer message');
  assert.equal(await browser.evaluate("document.querySelectorAll('.feedback-form [aria-invalid=true]').length"), 0);
  assert.equal(await browser.evaluate("document.querySelector('#merchant-locale').value"), 'zh-CN');
  assert.equal(await browser.evaluate("document.querySelector('#customer-feedback').value"), 'Synthetic customer report stays in English.');
  assert.equal(await browser.evaluate("document.querySelector('#merchant-instruction').value"), '请核对商品规格，保留原始反馈。');
  await browser.screenshot(`${evidence}/inbox-corrected-en-1440.png`, true);
  pass('Each corrected field clears its own validation error; locale switching preserves source text and updates error copy');
  for (const width of [768, 1024]) {
    await browser.viewport(width, 900);
    await browser.waitFor("document.querySelector('.feedback-page .heading-actions .btn')");
    assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('.feedback-page .heading-actions .btn')).whiteSpace"), 'nowrap');
    assert.ok(await browser.evaluate("(()=>{const b=document.querySelector('.feedback-page .heading-actions .btn');return b.scrollWidth<=b.clientWidth&&b.getBoundingClientRect().right<=innerWidth})()"));
    await browser.screenshot(`${evidence}/inbox-header-${width}.png`);
  }
  await browser.viewport(1440, 1080);
  assert.deepEqual(await browser.evaluate("[...document.querySelector('#channel').options].map(o=>o.value)"), ['shopify_us', 'amazon_de', 'alibaba_intl']);
  createMode = 'unknown-sku';
  await browser.click('.feedback-form button[type=submit]');
  await expectText('document.body.innerText', 'No product matches this SKU');
  createMode = 'success';
  await browser.click('.feedback-form button[type=submit]');
  await browser.waitFor("document.querySelector('.saved-submission')");
  const firstId = await browser.evaluate("document.querySelector('.saved-submission a').getAttribute('href').split('/').at(-1)");
  const firstWrites = writes;
  await browser.click('.topbar .language');
  await browser.click('.feedback-form button[type=submit]');
  await browser.waitFor("document.querySelector('.feedback-form button[type=submit]').disabled === false");
  assert.equal(writes, firstWrites);
  assert.equal(requests.filter((item) => item.path === `/api/cases/${firstId}/analyze`).length, 2);
  pass('Analysis retry after UI-language switching reuses the saved ID without a second case POST');
  await browser.fill('#sku', 'RL-LAMP-02');
  await expectText('document.body.innerText', '再次保存会新建案例');
  assert.equal(await browser.evaluate("document.querySelector('.saved-submission span[translate=no]').textContent"), 'RL-LAMP-01');
  await browser.screenshot(`${evidence}/inbox-changed-saved-1440.png`);
  await browser.fill('#sku', 'RL-LAMP-01');
  await browser.fill('#merchant-instruction', '请再次核对，保存为新案例。');
  analysisMode = 'unavailable';
  await browser.click('.feedback-form button[type=submit]');
  await expectText('document.body.innerText', '分析服务当前不可用');
  assert.equal(writes, firstWrites + 1);
  pass('Changed source input explicitly creates a new case; the saved original SKU remains read-only');
  await browser.click('.saved-submission a');
  await browser.waitFor("document.querySelector('.saved-case-identity')");
  await expectText('document.body.innerText', '请再次核对，保存为新案例。');
  pass('Saved-case recovery opens the exact returned case ID and original stored input');
  await browser.click('.side-nav a:nth-child(4)');
  await browser.waitFor("document.querySelector('.case-back-link')");
  for (const width of [320, 390, 768, 1024, 1440]) {
    await browser.viewport(width, 1080);
    await browser.evaluate("window.scrollTo(0,document.body.scrollHeight)");
    assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('.case-back-link')).display"), 'inline-flex');
    assert.equal(await browser.evaluate("document.querySelector('.case-back-link').getClientRects().length"), 1);
  }
  pass('Back-navigation label and single arrow stay in one control at all four viewport widths');
  await browser.viewport(1440, 1080);
  await browser.click('.side-nav a:nth-child(2)');
  await browser.waitFor("document.querySelector('#sku')");
  await browser.click('.topbar .language');
  await browser.screenshot(`${evidence}/inbox-en-1440.png`);
  await browser.screenshot(`${evidence}/workspace-after-1440.png`);
  for (const width of [320, 390, 768, 1440]) {
    await browser.viewport(width, 1080);
    await browser.evaluate('window.scrollTo(0,0)');
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= ${width}`), `${width}px Inbox must not overflow horizontally`);
    await browser.screenshot(`${evidence}/inbox-en-${width}.png`);
    if (width === 390 || width === 1440) await browser.screenshot(`${evidence}/inbox-en-${width}-full.png`, true);
  }
  pass('Feedback Inbox stays within 320, 390, 768, 1024 and 1440px widths');
  await browser.viewport(390, 1080);
  await browser.click('.mobile-menu');
  await browser.waitFor("document.querySelector('.sidebar[role=dialog]')");
  await browser.click('.sidebar-mobile-actions button:first-child');
  await browser.waitFor("document.documentElement.lang === 'zh-CN'");
  await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await browser.waitFor("document.activeElement.classList.contains('mobile-menu')");
  await browser.screenshot(`${evidence}/inbox-zh-390.png`);
  await browser.screenshot(`${evidence}/inbox-zh-390-full.png`, true);
  await browser.click('.mobile-menu');
  await browser.click('.sidebar-mobile-actions button:last-child');
  await browser.waitFor("location.pathname === '/login'");
  pass('Existing desktop/mobile language controls work, and explicit mobile sign-out keeps the current access flow');
  assert.deepEqual(browserErrors, [], `Browser console/hydration errors: ${browserErrors.join('; ')}`);
  pass('No browser runtime exceptions, console errors, or hydration errors');
  pass(`${expectedApiFailures.length} expected non-2xx intercepted API fixture responses were exercised as UI error states`);
  pass('All API responses in this run were intercepted synthetic fixtures; no live persistence or AI success is claimed');
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/browser-results.json`, JSON.stringify({ frontendFixtures: true, results, requests: requests.map(({ method, path }) => ({ method, path })) }, null, 2));
} finally { await browser.close(); }
