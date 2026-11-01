import { afterEach, describe, expect, it, vi } from "vitest";
import { startBrowserSpeech, browserRecognitionConstructor, type BrowserRecognition } from "@/lib/frontend/browser-speech";

class Recognition implements BrowserRecognition {
  static latest: Recognition;
  lang = ""; continuous = false; interimResults = true; maxAlternatives = 0;
  onstart: BrowserRecognition["onstart"] = null;
  onresult: BrowserRecognition["onresult"] = null;
  onerror: BrowserRecognition["onerror"] = null;
  onend: BrowserRecognition["onend"] = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() { Recognition.latest = this; }
}
const callbacks = () => ({ onStarted: vi.fn(), onTranscript: vi.fn(), onError: vi.fn() });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("browser speech lifecycle (injected recognition events, not real speech)", () => {
  it.each([["zh-CN", "请核对测试条件。"], ["en-US", "Check the test conditions."]] as const)("captures editable %s text only after stop/end", (locale, text) => {
    vi.useFakeTimers();
    const cb = callbacks();
    const session = startBrowserSpeech(Recognition, locale, cb);
    const recognition = Recognition.latest;
    expect(recognition.lang).toBe(locale);
    recognition.onresult?.({ results: { length: 1, 0: { 0: { transcript: text } } } });
    expect(cb.onTranscript).not.toHaveBeenCalled();
    recognition.onresult?.({ results: { length: 1, 0: { 0: { transcript: "" } } } });
    session.stop();
    recognition.onend?.();
    expect(cb.onTranscript).toHaveBeenCalledExactlyOnceWith(text);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancellation drops late results and releases timers", () => {
    vi.useFakeTimers();
    const cb = callbacks();
    const session = startBrowserSpeech(Recognition, "en-US", cb);
    session.cancel();
    Recognition.latest.onresult?.({ results: { length: 1, 0: { 0: { transcript: "late" } } } });
    Recognition.latest.onend?.();
    expect(cb.onTranscript).not.toHaveBeenCalled();
    expect(cb.onError).not.toHaveBeenCalled();
    expect(Recognition.latest.abort).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["not-allowed", "network", "audio-capture"])("reports %s once and never submits partial text", (error) => {
    vi.useFakeTimers();
    const cb = callbacks();
    startBrowserSpeech(Recognition, "zh-CN", cb);
    Recognition.latest.onresult?.({ results: { length: 1, 0: { 0: { transcript: "partial" } } } });
    Recognition.latest.onerror?.({ error });
    Recognition.latest.onend?.();
    expect(cb.onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(cb.onTranscript).not.toHaveBeenCalled();
  });
  it("stops at the duration limit and reports an empty session", () => {
    vi.useFakeTimers();
    const cb = callbacks();
    startBrowserSpeech(Recognition, "en-US", cb);
    vi.advanceTimersByTime(60000);
    expect(Recognition.latest.stop).toHaveBeenCalledOnce();
    expect(cb.onError).toHaveBeenCalledExactlyOnceWith("no-speech");
  });
  it("handles a vendor stop exception without leaving the UI waiting", () => {
    vi.useFakeTimers();
    const cb = callbacks();
    const session = startBrowserSpeech(Recognition, "en-US", cb);
    Recognition.latest.stop.mockImplementation(() => { throw new Error("invalid state"); });
    session.stop();
    expect(cb.onError).toHaveBeenCalledExactlyOnceWith("stop-failed");
  });
  it("times out a service that never sends an end event", () => {
    vi.useFakeTimers();
    const cb = callbacks();
    const session = startBrowserSpeech(Recognition, "en-US", cb);
    Recognition.latest.stop.mockImplementation(() => {});
    session.stop();
    vi.advanceTimersByTime(10000);
    expect(cb.onError).toHaveBeenCalledExactlyOnceWith("end-timeout");
  });
  it("supports prefixed APIs and safely detects unsupported browsers", () => {
    vi.stubGlobal("window", {});
    expect(browserRecognitionConstructor()).toBeUndefined();
    vi.stubGlobal("window", { webkitSpeechRecognition: Recognition });
    expect(browserRecognitionConstructor()).toBe(Recognition);
  });
});
