import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { loadProjectEnv } from './load-env.mjs';
loadProjectEnv();
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const secrets = Object.entries(process.env).filter(([name, value]) => /API_KEY|SERVICE_ROLE_KEY|DEMO_ACCESS_TOKEN|DATABASE_URL|PASSWORD|LOCAL_STT_TOKEN/.test(name) && value && value.length >= 12).map(([, value]) => value);
const issues = new Set();
for (const path of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && path !== '.env.example') { issues.add(path); continue; }
  let bytes;
  try { bytes = await readFile(path); } catch { continue; }
  if (bytes.includes(0) || bytes.length > 10 * 1024 * 1024) continue;
  const source = bytes.toString('utf8');
  if (secrets.some((value) => source.includes(value)) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source) || /\bsk-(?:proj-)?[a-zA-Z0-9_-]{32,}\b/.test(source)) issues.add(path);
}
if (issues.size) {
  console.error('Secret check failed in these files (values suppressed):', [...issues].join(', '));
  process.exitCode = 1;
} else console.log(`PASS secret scan: ${files.length} non-ignored repository files; no configured secrets/private keys detected. .env.local excluded.`);
