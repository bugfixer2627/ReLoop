// Optional browser regression tooling. Requires a dedicated local Chrome CDP endpoint.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function openUiBrowser(port = 9222) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  let sessionId;
  const pending = new Map();
  const handlers = new Map();
  function send(method, params = {}, scoped = true) {
    const id = ++sequence;
    const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    socket.send(JSON.stringify({ id, method, params, ...(scoped && sessionId ? { sessionId } : {}) }));
    return result;
  }
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task?.reject(new Error(message.error.message));
      else task?.resolve(message.result);
    } else handlers.get(message.method)?.(message.params);
  };
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, false);
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, false));
  await send('Page.enable');
  await send('Runtime.enable');

  async function evaluate(expression) {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(`${expression}: ${exceptionDetails.text}`);
    return result.value;
  }
  async function waitFor(expression, timeout = 12000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
    throw new Error(`Timed out: ${expression}; ${await evaluate('document.body.innerText.slice(0,1200)')}`);
  }
  return {
    send, evaluate, waitFor,
    on: (event, handler) => handlers.set(event, handler),
    navigate: (url) => send('Page.navigate', { url }),
    viewport: (width, height = 1000) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 900 }),
    click: (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`),
    fill: async (selector, value) => {
      await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    },
    select: (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); e.value=${JSON.stringify(value)}; e.dispatchEvent(new Event('change',{bubbles:true}));})()`),
    async screenshot(path, fullPage = false) {
      await mkdir(dirname(path), { recursive: true });
      const size = fullPage ? (await send('Page.getLayoutMetrics')).cssContentSize : null;
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, ...(size ? { clip: { ...size, scale: 1 } } : {}) });
      await writeFile(path, Buffer.from(data, 'base64'));
    },
    async close() { await send('Target.closeTarget', { targetId }, false); socket.close(); },
  };
}
