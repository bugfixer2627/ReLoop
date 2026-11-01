import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { loadProjectEnv } from './load-env.mjs';
loadProjectEnv();
await access(new URL('../.next/BUILD_ID', import.meta.url));
// Eight opt-in cases; real speech and STT, never a mocked success fallback.
const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/voice.live.test.ts', '--reporter=verbose'], {
  windowsHide: true, stdio: 'inherit', env: { ...process.env, RELOOP_REAL_VOICE_TESTS: '1' },
});
child.once('error', () => { console.error('Could not launch real voice verification.'); process.exitCode = 1; });
child.once('exit', (code) => { process.exitCode = code ?? 1; });
