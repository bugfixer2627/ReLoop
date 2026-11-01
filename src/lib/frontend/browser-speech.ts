import type { InputLocale } from '@/lib/contracts';

type RecognitionResult = { readonly length: number; readonly [index: number]: { readonly [index: number]: { transcript: string } } };
export type BrowserRecognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: RecognitionResult }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type RecognitionConstructor = new () => BrowserRecognition;

export function browserRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
}

// Browser vendors may process audio remotely. The UI discloses that before Start.
// No raw recording is created, retained, or uploaded to ReLoop in this mode.
export function startBrowserSpeech(
  Constructor: RecognitionConstructor,
  locale: InputLocale,
  callbacks: { onStarted(): void; onTranscript(text: string): void; onError(code: string): void },
  maxSeconds = 60,
) {
  const recognition = new Constructor();
  recognition.lang = locale;
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let cancelled = false;
  let finished = false;
  let stopping = false;
  let text = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { if (timer) clearTimeout(timer); timer = undefined; };
  const fail = (code: string) => {
    if (cancelled || finished) return;
    finished = true;
    clear();
    try { recognition.abort(); } catch { /* Already stopped. */ }
    callbacks.onError(code);
  };
  const stop = () => {
    if (cancelled || finished || stopping) return;
    stopping = true;
    clear();
    // Some vendor implementations never emit end after stop/network loss.
    timer = setTimeout(() => fail('end-timeout'), 10000);
    try { recognition.stop(); } catch { fail('stop-failed'); }
  };
  recognition.onstart = () => {
    if (cancelled || finished) return;
    clear();
    callbacks.onStarted();
    timer = setTimeout(stop, maxSeconds * 1000);
  };
  recognition.onresult = (event) => {
    if (cancelled || finished) return;
    const nextText = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript || '').join(' ').trim();
    // A late empty result must not erase an earlier recognized final phrase.
    if (nextText) text = nextText;
  };
  recognition.onerror = (event) => {
    fail(event.error);
  };
  recognition.onend = () => {
    clear();
    if (cancelled || finished) return;
    finished = true;
    if (text) callbacks.onTranscript(text);
    else callbacks.onError('no-speech');
  };
  timer = setTimeout(() => fail('start-timeout'), 15000);
  try { recognition.start(); } catch { fail('start-failed'); }
  return {
    stop,
    cancel() { cancelled = true; clear(); try { recognition.abort(); } catch { /* Already stopped. */ } },
  };
}
