import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Process-only STT configuration. Never edits .env.local or LLM settings.
export async function startLocalSpeech() {
  const python = process.env.RELOOP_STT_PYTHON || fileURLToPath(new URL(process.platform === 'win32' ? '../../.local-reviews/stt-venv/Scripts/python.exe' : '../../.local-reviews/stt-venv/bin/python', import.meta.url));
  await access(python).catch(() => { throw new Error('Local STT Python environment missing. See docs/VOICE_SETUP.md.'); });
  const model = process.env.RELOOP_STT_MODEL || 'base';
  if (!['tiny', 'base', 'small'].includes(model)) throw new Error('Choose a supported multilingual local model: tiny, base or small.');
  const apiKey = randomBytes(32).toString('hex');
  const child = spawn(python, [fileURLToPath(new URL('../local-stt/server.py', import.meta.url)), '--cache', fileURLToPath(new URL('../../.local-reviews/stt-models', import.meta.url)), '--model', model], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, RELOOP_LOCAL_STT_TOKEN: apiKey, HF_HUB_DISABLE_TELEMETRY: '1', HF_HUB_DISABLE_PROGRESS_BARS: '1' },
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => reject(new Error('Local STT model startup timed out. Check model download/network access.')), 180000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('Cannot start local STT Python runtime.')); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Local STT exited before ready. Install dependencies and check model access (docs/VOICE_SETUP.md).')); });
      child.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        for (let end; (end = buffer.indexOf('\n')) >= 0;) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
          try {
            const body = JSON.parse(line);
            if (body.ready && Number.isInteger(body.port)) { clearTimeout(timer); resolve(body.port); }
            if (body.error) { clearTimeout(timer); reject(new Error(body.error)); }
          } catch (error) { if (error instanceof SyntaxError) continue; reject(error); }
        }
      });
    });
    return { child, env: { TRANSCRIPTION_PROVIDER: 'openai_compatible', TRANSCRIPTION_BASE_URL: `http://127.0.0.1:${port}/v1`, TRANSCRIPTION_API_KEY: apiKey, TRANSCRIPTION_MODEL: model, TRANSCRIPTION_TIMEOUT_MS: '120000' }, stop() { child.kill(); } };
  } catch (error) { child.kill(); throw error; }
}
