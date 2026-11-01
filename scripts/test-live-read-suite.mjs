import { spawn } from 'node:child_process';
import { loadProjectEnv } from './load-env.mjs';
loadProjectEnv();
if (!process.env.DEMO_ACCESS_TOKEN) throw new Error('The optional local API test credential is absent; use your existing browser session for read checks. Do not alter authentication.');
const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/integration.live.test.ts', '--reporter=verbose'], {
  windowsHide: true, stdio: 'inherit', env: { ...process.env, RELOOP_INTEGRATION_BASE_URL: 'http://localhost:3000', RELOOP_INTEGRATION_TOKEN: process.env.DEMO_ACCESS_TOKEN, RELOOP_INTEGRATION_WRITES: '0' },
});
child.once('error', () => { process.exitCode = 1; });
child.once('exit', (code) => { process.exitCode = code ?? 1; });
