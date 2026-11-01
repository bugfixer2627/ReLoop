// Explicit API fixtures: checks UI integration only, never writes a database.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { openUiBrowser } from './lib/ui-browser.mjs';

const base = process.env.RELOOP_BASE_URL ?? 'http://127.0.0.1:3017';
const evidence = '.local-reviews/prototype';
const source = JSON.parse(await readFile(new URL('../src/lib/fixtures/demo.json', import.meta.url), 'utf8'));
const b = await openUiBrowser(Number(process.env.RELOOP_CDP_PORT ?? 9333));
const id = source.case.id;
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const requestId = uuid(999);
const bundle = structuredClone(source);
const other = { ...source.case, id: uuid(102), channel: 'amazon_de', status: 'closed', feedbackText: 'Different customer Alpha feedback', createdAt: '2026-10-30T00:00:00Z' };
const formats = [
  { format: 'support_reply', subject: 'Fixture support subject', body: 'Fixture saved support response for this exact complaint.' },
  { format: 'shopify_description', title: 'Fixture Shopify', description: 'Fixture Shopify saved correction', faq: ['Fixture faq'] },
  { format: 'amazon_listing', title: 'Fixture Amazon brief', description: 'Fixture Amazon correction', bullets: ['Fixture bullet'], internalBrief: true },
  { format: 'alibaba_b2b', title: 'Fixture Alibaba', specifications: { runtime: '4 hours' }, benefits: ['Fixture benefit'], moq: '100', leadTime: '15 days', claimsNotes: ['Fixture note'] },
];
bundle.artifacts = formats.map((_, i) => ({ id: uuid(201 + i), caseId: id, kind: i ? 'listing_correction' : 'support_reply', platform: i === 2 ? 'amazon_de' : i === 3 ? 'alibaba_intl' : 'shopify_us', market: i === 2 ? 'DE' : i === 3 ? 'global_b2b' : 'US', segment: i === 3 ? 'b2b' : 'b2c', latestVersion: 1 }));
bundle.versions = formats.map((content, i) => ({ id: uuid(301 + i), artifactId: uuid(201 + i), version: 1, locale: 'en-US', languageStatus: 'beta', content, sourceIds: ['SPEC-001'], reviewStatus: 'pending_review', validationStatus: 'checked', createdAt: '2026-10-31T00:01:00Z' }));
const logs = [], runtimeErrors = [], writes = [];
let listMode = 'success';
const ok = (data) => ({ ok: true, data, error: null, requestId });
const fail = (code, message) => ({ ok: false, data: null, error: { code, message, retryable: false }, requestId });
let counter = 500;
b.on('Fetch.requestPaused', async ({ requestId: interceptionId, request }) => {
  const path = new URL(request.url).pathname;
  let data, status = 200;
  if (request.method !== 'GET') writes.push({ path, body: request.postData });
  if (path === '/api/cases') {
    if (listMode === 'failure') { status = 503; data = fail('DATABASE_UNAVAILABLE', 'Explicit fixture database failure'); }
    else data = ok({ cases: listMode === 'empty' ? [] : [bundle.case, other] });
  } else if (path === `/api/cases/${id}`) data = ok(bundle);
  else if (path.startsWith('/api/artifacts/') && path.endsWith('/revise')) {
    const input = JSON.parse(request.postData);
    const artifact = bundle.artifacts.find((a) => a.id === path.split('/')[3]);
    const previous = bundle.versions.find((v) => v.artifactId === artifact.id && v.version === artifact.latestVersion);
    assert.equal(input.expectedVersion, artifact.latestVersion);
    const version = { ...previous, id: uuid(++counter), version: ++artifact.latestVersion, reviewStatus: 'draft', content: { ...previous.content, ...(previous.content.format === 'support_reply' ? { body: `Fixture revision ${artifact.latestVersion}` } : { description: `Fixture listing revision ${artifact.latestVersion}` }) }, sourceIds: ['POLICY-MERCHANT-001'] };
    const revision = { id: uuid(++counter), caseId: id, artifactId: artifact.id, promptText: input.promptText, promptLocale: input.promptLocale, fromVersion: artifact.latestVersion - 1, toVersion: artifact.latestVersion, createdAt: '2026-10-31T01:00:00Z' };
    bundle.versions.push(version); bundle.revisions.push(revision);
    data = ok({ caseId: id, artifact, version, revision, findings: [] });
  } else if (path.endsWith('/review')) {
    const input = JSON.parse(request.postData);
    const artifact = bundle.artifacts.find((a) => a.id === path.split('/')[3]);
    const version = bundle.versions.find((v) => v.artifactId === artifact.id && v.version === input.version);
    assert.equal(input.version, artifact.latestVersion);
    version.reviewStatus = input.decision;
    const auditEvent = { id: uuid(++counter), caseId: id, actorRole: input.reviewerRole, action: 'artifact_reviewed', entityId: artifact.id, payload: { version: version.version, decision: input.decision }, createdAt: '2026-10-31T02:00:00Z' };
    bundle.audit.push(auditEvent); data = ok({ caseId: id, artifactId: artifact.id, version, auditEvent });
  } else if (path.endsWith('/tasks')) {
    const input = JSON.parse(request.postData);
    const task = { id: input.taskId ?? uuid(++counter), caseId: id, ...input, createdAt: '2026-10-31T03:00:00Z' };
    delete task.taskId;
    const index = bundle.tasks.findIndex((t) => t.id === task.id);
    if (index >= 0) bundle.tasks[index] = task; else bundle.tasks.push(task);
    const auditEvent = { id: uuid(++counter), caseId: id, actorRole: input.assignedRole, action: 'task_saved', entityId: task.id, payload: {}, createdAt: '2026-10-31T03:00:00Z' };
    bundle.audit.push(auditEvent); data = ok({ task, auditEvent });
  } else { status = 404; data = fail('NOT_FOUND', 'Explicit fixture missing case'); }
  await b.send('Fetch.fulfillRequest', { requestId: interceptionId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(data)).toString('base64') }).catch(() => {});
});
b.on('Runtime.exceptionThrown', ({ exceptionDetails }) => runtimeErrors.push(exceptionDetails.text));
async function route(path) {
  await b.evaluate(`window.next.router.push(${JSON.stringify(path)})`);
  await b.waitFor(`location.pathname + location.search === ${JSON.stringify(path)}`);
}
async function text(value) { await b.waitFor(`document.body.innerText.includes(${JSON.stringify(value)})`); }
async function button(label, scope = 'document') {
  await b.evaluate(`(()=>{const e=[...${scope}.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!e)throw Error('Button missing: '+${JSON.stringify(label)});e.click()})()`);
}
async function screenshot(name) { await b.screenshot(`${evidence}/${name}.png`, true); }
function pass(message) { logs.push(message); console.log('PASS ' + message); }
try {
  await mkdir(evidence, { recursive: true });
  await b.viewport(1440, 1000);
  await b.send('Fetch.enable', { patterns: [{ urlPattern: `${base}/api/*` }] });
  await b.navigate(`${base}/login`);
  await b.waitFor("document.querySelector('#access-token')");
  await new Promise((r) => setTimeout(r, 300));
  await b.evaluate("localStorage.removeItem('reloop-ui-preferences');window.dispatchEvent(new Event('reloop-preferences'))");
  assert.equal(await b.evaluate("document.querySelector('.credential-form .login-submit').disabled"), true);
  await b.fill('#login-password', 'fixture-only-not-sent');
  await b.click('.credential-form .password-toggle');
  assert.equal(await b.evaluate("document.querySelector('#login-password').type"), 'text');
  await screenshot('login-desktop');
  await b.fill('#access-token', 'explicit-prototype-fixture-token');
  await b.click('button[type=submit]');
  await b.waitFor("location.pathname === '/dashboard' && document.querySelector('.case-open')");
  pass('Credential form is explicitly unavailable; working demo-token login preserved');
  assert.equal(await b.evaluate("document.body.innerText.includes('Jasmine')"), false);
  await screenshot('overview-desktop');
  await b.click('.case-open');
  await b.waitFor(`location.pathname === '/cases/${id}/detail' && document.querySelector('.saved-case-identity')`);
  await text(bundle.case.feedbackText);
  await screenshot('detail-desktop');
  await b.click(`.page-heading a[href='/cases/${id}']`);
  await text('Persisted checks');
  assert.equal(await b.evaluate(`document.querySelector('.side-nav a[href="/cases/${id}/fix"]').href.endsWith('/cases/${id}/fix')`), true);
  await screenshot('investigation-desktop');
  await b.click(`.page-heading a[href='/cases/${id}/fix']`);
  await text('Fixture saved support response');
  await screenshot('fix-desktop');
  pass('Overview → exact case detail → investigation → fix preserves persisted case ID');
  for (const platform of ['Amazon Germany', 'Alibaba International', 'Shopify US']) { await button(platform); await text(platform === 'Shopify US' ? 'Fixture Shopify' : platform === 'Amazon Germany' ? 'Fixture Amazon' : 'Fixture Alibaba'); }
  pass('All three platform views show corresponding saved artifacts');
  for (const artifactIndex of [0, 1]) {
    const aid = bundle.artifacts[artifactIndex].id;
    for (let round = 0; round < 2; round++) {
      await b.replaceText(`#prompt-${aid}`, `Fixture requested change ${round + 1}`);
      await b.evaluate(`document.querySelector('#prompt-${aid}').closest('.artifact-workspace').querySelector('.artifact-actions button').click()`);
      await b.waitFor(`document.querySelector('#prompt-${aid}') && document.querySelector('#prompt-${aid}').value === '' && !document.querySelector('#prompt-${aid}').disabled`);
    }
    assert.equal(bundle.artifacts[artifactIndex].latestVersion, 3);
    await b.evaluate(`document.querySelector('#prompt-${aid}').closest('.artifact-workspace').querySelector('.version-history-button:last-child').click()`);
    assert.equal(await b.evaluate(`document.querySelector('#prompt-${aid}').disabled`), true);
    assert.ok((await b.evaluate(`document.querySelector('#prompt-${aid}').closest('.artifact-workspace').querySelector('.artifact-sources').innerText`)).includes('SPEC-001'));
    await b.evaluate(`document.querySelector('#prompt-${aid}').closest('.artifact-workspace').querySelector('.version-history-button:first-child').click()`);
    assert.ok((await b.evaluate(`document.querySelector('#prompt-${aid}').closest('.artifact-workspace').querySelector('.artifact-sources').innerText`)).includes('POLICY-MERCHANT-001'));
  }
  pass('Two consecutive revisions on support and listing reach v3 via API fixtures; historical versions disable actions and change citations');
  await b.evaluate("document.querySelector('.artifact-review button').click()");
  await b.waitFor("document.querySelector('dialog[open]')");
  assert.equal(await b.evaluate("document.activeElement.textContent.trim()"), 'Cancel');
  await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await b.waitFor("!document.querySelector('dialog[open]')");
  await b.evaluate("document.querySelector('.artifact-review button').click()");
  const beforeReview = writes.filter((w) => w.path.endsWith('/review')).length;
  await button('Cancel', "document.querySelector('dialog[open]')");
  assert.equal(writes.filter((w) => w.path.endsWith('/review')).length, beforeReview);
  await b.evaluate("document.querySelector('.artifact-review button').click()");
  await button('Confirm & save', "document.querySelector('dialog[open]')");
  await text('artifact_reviewed');
  assert.equal(bundle.versions.find((v) => v.artifactId === uuid(201) && v.version === 3).reviewStatus, 'approved');
  await button('Create QA follow-up'); await text('Investigate the customer-reported product experience');
  await b.click('.task-state-action'); await text('Reopen');
  assert.equal(bundle.tasks[0].state, 'done');
  await route('/dashboard'); await route(`/cases/${id}/fix`); await text('Fixture revision 3');
  await screenshot('fix-versions-desktop');
  pass('Review confirmation/cancel, task create/update and reloaded version/audit state use API fixture responses');
  await route('/cases'); await b.waitFor("document.querySelectorAll('.case-open').length === 2");
  await b.fill('.case-filters [name=q]', 'Alpha'); await b.select('.case-filters [name=status]', 'closed');
  await b.click('.case-filters button'); await b.waitFor("location.search.includes('q=Alpha') && document.querySelectorAll('.case-open').length === 1");
  assert.equal(await b.evaluate("document.querySelector('.case-open').getAttribute('href')"), `/cases/${other.id}/detail`);
  // Capture the Blob passed to the real download, preventing files outside ignored evidence.
  await b.evaluate("window.fixtureCsv='';window.fixtureCsvOriginal=URL.createObjectURL;URL.createObjectURL=(blob)=>{blob.text().then(t=>window.fixtureCsv=t);return window.fixtureCsvOriginal(blob)};HTMLAnchorElement.prototype.click=function(){if(!this.download)HTMLElement.prototype.click.call(this)}");
  await button('Export visible rows CSV'); await b.waitFor('window.fixtureCsv.length > 0');
  const csv = await b.evaluate('window.fixtureCsv'); assert.ok(csv.includes(other.id)); assert.ok(!csv.includes(id));
  await screenshot('cases-desktop');
  pass('Case filters reflect URL and actual results; CSV contains only displayed persisted IDs');
  await route('/feedback'); await b.waitFor("document.querySelector('.mic-button')");
  await b.send('Browser.setPermission', { permission: { name: 'microphone' }, setting: 'denied', origin: base }, false);
  await b.click('.mic-button'); await text('Microphone permission was denied');
  assert.equal(await b.evaluate("document.querySelector('#merchant-instruction').disabled"), false);
  await b.fill('#merchant-instruction', 'Typing fallback after microphone denial');
  pass('Real browser microphone denial leaves merchant instruction typing available');
  await b.evaluate("window.fixtureRecorder=window.MediaRecorder;window.MediaRecorder=undefined");
  await b.click('.mic-button'); await text('Recording is not supported');
  await b.evaluate("window.MediaRecorder=window.fixtureRecorder");
  pass('Explicit unsupported-recorder fixture shows honest voice error with typing fallback');
  await route(`/rules?caseId=${id}`); await text('SPEC-001'); await button('Product evidence');
  await b.waitFor("location.search.includes('source=evidence') && document.querySelector('.source-tabs').parentElement.innerText.includes('SPEC-001') && !document.querySelector('.source-tabs').parentElement.innerText.includes('LAW-US-FTC-001')");
  assert.equal(await b.evaluate("document.querySelector('.source-tabs').parentElement.innerText.includes('LAW-US-FTC-001')"), false);
  await screenshot('rules-desktop');
  await route('/settings'); await text('Compact tables'); await b.click('[role=switch]');
  await b.click('.setting-row .btn'); await text('工作区设置');
  await b.send('Page.reload'); await text('需要工作区访问权限');
  pass('Device preferences survive refresh; demo token remains memory-only');
  await b.navigate(`${base}/login`); await b.waitFor("document.querySelector('#access-token')");
  await text('欢迎回来。');
  await b.fill('#access-token', 'explicit-prototype-fixture-token'); await b.click('button[type=submit]');
  await text('案例工作台'); await route('/settings'); await text('紧凑表格');
  assert.equal(await b.evaluate("document.querySelector('[role=switch]').getAttribute('aria-checked')"), 'true');
  for (const width of [1440, 768, 390, 320]) {
    await b.viewport(width, 1000);
    for (const [path, marker, name] of [
      ['/dashboard', '案例工作台', 'overview'], ['/cases', '全部案例', 'cases'],
      [`/cases/${id}/detail`, '案例详情', 'detail'], ['/feedback', '反馈收件箱', 'inbox'],
      [`/cases/${id}`, '承诺核验', 'investigation'], [`/cases/${id}/fix`, '修订与审核', 'fix'],
      [`/rules?caseId=${id}`, '规则与来源', 'rules'], ['/settings', '工作区设置', 'settings'],
    ]) {
      await route(path); await text(marker); await b.waitFor("!document.querySelector('.api-state[role=status]')");
      // Scrollable tables are intentional; the document itself must remain within the viewport.
      assert.ok(await b.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), `${name} overflows at ${width}`);
      if (name === 'inbox' && width <= 390) assert.equal(await b.evaluate("getComputedStyle(document.querySelector('.inbox-context')).flexDirection"), 'column');
      await screenshot(`${name}-zh-${width}`);
    }
    if (width === 390) {
      await b.click('.mobile-menu'); await b.waitFor("document.querySelector('.sidebar.open')");
      assert.equal(await b.evaluate("document.querySelector('.main-area').inert"), true);
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      await b.waitFor("!document.querySelector('.sidebar.open')");
      pass('Mobile drawer closes with Escape and protects background focus');
    }
  }
  pass('All eight workspace routes render in Chinese at desktop, tablet, 390px and 320px without document overflow');
  await b.viewport(1440, 1000);
  await b.click('.setting-row .btn'); await text('Workspace settings');
  await route('/cases'); listMode = 'failure'; await route('/dashboard'); await text('Unknown');
  assert.equal(await b.evaluate("[...document.querySelectorAll('.metric-value')].every(e=>e.textContent==='Unknown')"), true);
  listMode = 'empty'; await button('Retry'); await text('No saved cases yet.');
  pass('API errors show unknown metrics; retry/empty states never substitute prototype records');
  await b.click('.profile-control summary'); await b.click('.profile-control .workspace-sign-out');
  await b.waitFor("location.pathname === '/login'");
  assert.equal(await b.evaluate("localStorage.getItem('explicit-prototype-fixture-token')"), null);
  pass('Workspace menu sign-out navigates to public login');
  assert.deepEqual(runtimeErrors, []);
  pass('No runtime or hydration exceptions');
  await writeFile(`${evidence}/browser-results.json`, JSON.stringify({ logs, runtimeErrors, fixtureOnly: true }, null, 2));
} finally {
  await writeFile(`${evidence}/browser-partial-results.json`, JSON.stringify({ logs, runtimeErrors, writes: writes.map((w) => ({ path: w.path })) }, null, 2));
  await b.close();
}
