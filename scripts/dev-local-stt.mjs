import { spawn } from 'node:child_process';
import { loadProjectEnv } from './load-env.mjs';
import { startLocalSpeech } from './lib/local-stt.mjs';
import { fileURLToPath } from 'node:url';
loadProjectEnv();
const service = await startLocalSpeech();
console.log('Local multilingual CPU speech service ready. Audio stays on this computer.');
const production = process.argv.includes('--production');
const proxyFlag = process.env.NODE_USE_ENV_PROXY === '1' && process.allowedNodeEnvironmentFlags.has('--use-env-proxy') ? ['--use-env-proxy'] : [];
const next = spawn(process.execPath, [...proxyFlag, fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), production ? 'start' : 'dev', ...process.argv.slice(2).filter((arg) => arg !== '--production')], {
  windowsHide: true, stdio: 'inherit', env: { ...process.env, ...service.env },
});
const stop = () => { next.kill(); service.stop(); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
next.once('error', () => { service.stop(); process.exitCode = 1; });
next.once('exit', (code) => { service.stop(); process.exitCode = code ?? 1; });
service.child.once('exit', () => { next.kill(); });
