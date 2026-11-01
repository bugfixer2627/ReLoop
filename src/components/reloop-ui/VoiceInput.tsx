'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ApiRequestError, transcribeAudio } from '@/lib/frontend/api-client';
import { MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS, type InputLocale } from '@/lib/contracts';
import { requestMessage } from '@/lib/frontend/request-message';
import { useWorkspace } from './WorkspaceProviders';
import { Icon } from './icons';
import { browserRecognitionConstructor, startBrowserSpeech } from '@/lib/frontend/browser-speech';

type VoiceState = 'idle' | 'requesting' | 'recording' | 'transcribing' | 'preview' | 'error';

export function VoiceInput({ onConfirmed, disabled = false, inputLocale }: {
  onConfirmed: (text: string) => void;
  disabled?: boolean;
  inputLocale?: InputLocale;
}) {
  const { accessToken, locale } = useWorkspace();
  const transcriptId = useId();
  const [state, setState] = useState<VoiceState>('idle');
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [method, setMethod] = useState<'api' | 'browser'>('api');
  const recognitionRef = useRef<ReturnType<typeof startBrowserSpeech> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const tooLargeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pendingRef = useRef(false);
  const uploadRef = useRef<AbortController | null>(null);
  const chinese = locale === 'zh-CN';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRef.current = false;
      discardRef.current = true;
      uploadRef.current?.abort();
      recognitionRef.current?.cancel();
      chunksRef.current = [];
      if (timerRef.current) clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, []);

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (!accessToken || disabled || pendingRef.current || state === 'recording' || state === 'transcribing') return;
    pendingRef.current = true;
    setMessage('');
    setTranscript('');
    setState('requesting');
    if (method === 'browser') {
      const Constructor = browserRecognitionConstructor();
      if (!Constructor) {
        pendingRef.current = false;
        setState('error');
        setMessage(chinese ? '此浏览器不支持语音识别。请使用支持该功能的 Chrome，选择转写服务或改用文字。' : 'Browser speech recognition is unavailable. Use a supported Chrome browser, a configured transcription service, or type instead.');
        return;
      }
      recognitionRef.current = startBrowserSpeech(Constructor, inputLocale ?? locale, {
        onStarted() { pendingRef.current = false; if (mountedRef.current) setState('recording'); },
        onTranscript(text) { pendingRef.current = false; if (mountedRef.current) { setTranscript(text); setState('preview'); } },
        onError(code) {
          pendingRef.current = false;
          if (!mountedRef.current) return;
          setState('error');
          const denied = ['not-allowed', 'service-not-allowed'].includes(code);
          const details = code === 'network'
            ? (chinese ? '浏览器的语音服务网络连接失败。' : 'The browser speech service could not connect to its network.')
            : code === 'audio-capture' ? (chinese ? '浏览器无法取得麦克风音频。' : 'The browser could not capture microphone audio.')
              : code === 'language-not-supported' ? (chinese ? '浏览器的语音服务不支持所选语言。' : 'The browser speech service does not support the selected language.')
                : code === 'no-speech' ? (chinese ? '浏览器未返回可用的语音文本。' : 'The browser returned no usable speech text.') : '';
          setMessage(denied
            ? (chinese ? '语音权限或浏览器识别服务未获允许，请改用文字或转写服务。' : 'Microphone permission or the browser recognition service was denied. Type instead or use a configured transcription service.')
            : details || (chinese ? '浏览器语音识别失败或没有识别到语音。请重试、改用文字或转写服务。' : 'Browser recognition failed or no speech was recognized. Retry, type instead, or use a configured transcription service.'));
        },
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      pendingRef.current = false;
      setState('error');
      setMessage(chinese ? '此浏览器不支持录音，请改用文字输入。' : 'Recording is not supported by this browser. Use text input instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pendingRef.current = false;
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;
      tooLargeRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        chunksRef.current.push(event.data);
        const size = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
        if (size > MAX_AUDIO_BYTES) {
          tooLargeRef.current = true;
          if (recorder.state === 'recording') recorder.stop();
          if (mountedRef.current) {
            setState('error');
            setMessage(chinese ? '录音超过 10 MiB 限制，未发送。请缩短录音或改用文字。' : 'Recording exceeded 10 MiB and was not sent. Shorten it or use text input.');
          }
        }
      };
      recorder.onerror = () => {
        discardRef.current = true;
        chunksRef.current = [];
        if (timerRef.current) clearTimeout(timerRef.current);
        releaseStream();
        if (recorder.state === 'recording') recorder.stop();
        if (mountedRef.current) {
          setState('error');
          setMessage(chinese ? '录音中断，已丢弃音频。请重试或改用文字。' : 'Recording failed and the audio was discarded. Retry or type instead.');
        }
      };
      recorder.onstop = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        releaseStream();
        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (!mountedRef.current || discardRef.current || tooLargeRef.current) return;
        const audio = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
        if (!audio.size) {
          setState('error');
          setMessage(chinese ? '没有录到语音，请重试或改用文字。' : 'No speech was recorded. Retry or use text input.');
          return;
        }
        setState('transcribing');
        if (!accessToken) return;
        const controller = new AbortController();
        uploadRef.current = controller;
        transcribeAudio(accessToken, audio, inputLocale ?? locale, controller.signal).then((result) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setTranscript(result.text);
          setState('preview');
          setMessage('');
        }).catch((error: unknown) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setState('error');
          setMessage(error instanceof ApiRequestError && error.code === 'NOT_IMPLEMENTED'
            ? (chinese ? '语音转写服务尚未接入。录音已丢弃，请改用文字输入。' : 'Speech-to-text is not implemented. The recording was discarded; use text input instead.')
            : error instanceof ApiRequestError ? requestMessage(error, locale, 'voice')
              : (chinese ? '转写失败，录音已丢弃。请改用文字输入。' : 'Transcription failed. The recording was discarded; use text input instead.'));
        }).finally(() => { if (uploadRef.current === controller) uploadRef.current = null; });
      };
      recorder.start(250);
      setState('recording');
      timerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_AUDIO_SECONDS * 1000);
    } catch (error) {
      pendingRef.current = false;
      releaseStream();
      setState('error');
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      setMessage(denied
        ? (chinese ? '未取得麦克风权限，请允许权限或改用文字输入。' : 'Microphone permission was denied. Allow access or use text input.')
        : (chinese ? '无法访问麦克风，请改用文字输入。' : 'Could not access the microphone. Use text input instead.'));
    }
  }

  function stopRecording(discard: boolean) {
    if (method === 'browser') {
      pendingRef.current = false;
      if (discard) { recognitionRef.current?.cancel(); setState('idle'); setTranscript(''); }
      else { setState('transcribing'); recognitionRef.current?.stop(); }
      return;
    }
    discardRef.current = discard;
    if (timerRef.current) clearTimeout(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      if (!discard) setState('transcribing');
      recorder.stop();
    }
    else releaseStream();
    if (discard) {
      chunksRef.current = [];
      setState('idle');
      setMessage('');
    }
  }

  function cancelUpload() {
    recognitionRef.current?.cancel();
    uploadRef.current?.abort();
    uploadRef.current = null;
    setTranscript('');
    setState('idle');
    setMessage('');
  }

  const buttons = state === 'recording' ? (
    <div className="voice-controls"><button className="btn btn-danger btn-sm" type="button" onClick={() => stopRecording(false)}>{chinese ? '停止并转写' : 'Stop & transcribe'}</button><button className="btn btn-soft btn-sm" type="button" onClick={() => stopRecording(true)}>{chinese ? '取消' : 'Cancel'}</button></div>
  ) : (
    <button className={`mic-button ${state === 'requesting' ? 'recording' : ''}`} type="button" disabled={disabled || state === 'requesting' || state === 'transcribing'} onClick={startRecording} aria-label={chinese ? '开始语音输入' : 'Start voice input'}><Icon name="mic" size={18}/></button>
  );

  return (
    <div className="voice-input">
      <label htmlFor={`${transcriptId}-method`} className="muted">{chinese ? '语音方式' : 'Speech method'}</label>
      <select id={`${transcriptId}-method`} aria-label={chinese ? '语音方式' : 'Speech method'} className="select" value={method} disabled={disabled || ['requesting', 'recording', 'transcribing'].includes(state)} onChange={(event) => { setMethod(event.target.value as 'api' | 'browser'); setState('idle'); setMessage(''); setTranscript(''); }}>
        <option value="api">{chinese ? '已配置的转写服务' : 'Configured transcription service'}</option>
        <option value="browser">{chinese ? '浏览器语音识别（需浏览器支持）' : 'Browser speech recognition (requires support)'}</option>
      </select>
      {method === 'browser' && <p className="muted">{chinese ? '点击麦克风将使用浏览器的语音服务，音频可能发送给浏览器供应商。识别后先编辑并确认；ReLoop 不保存原始音频。' : 'Starting the microphone uses your browser’s speech service, which may send audio to the browser vendor. Edit and confirm the result before submitting; ReLoop does not store raw audio.'}</p>}
      <div className="voice-box"><div>{buttons}</div><div className="voice-description"><strong>{state === 'recording' ? (chinese ? '正在录音…最长 60 秒' : 'Recording… up to 60 seconds') : state === 'transcribing' ? (chinese ? '正在转写…' : 'Transcribing…') : (chinese ? '语音输入' : 'Voice input')}</strong><p>{state === 'recording' ? (chinese ? '停止后会先显示可编辑文本。' : 'A transcript preview appears after stopping.') : (chinese ? '文字输入始终可用；录音不会自动提交。' : 'Typing remains available. Recording never submits automatically.')}</p></div></div>
      {state === 'error' && message && <p className="voice-error" role="alert">{message}</p>}
      {state === 'transcribing' && <button className="btn btn-soft btn-sm" type="button" onClick={cancelUpload}>{chinese ? '取消转写' : 'Cancel transcription'}</button>}
      {state === 'preview' && <div className="voice-transcript"><label htmlFor={transcriptId}>{chinese ? '確認轉寫內容' : 'Confirm transcript'}</label><textarea id={transcriptId} className="textarea" rows={3} value={transcript} onChange={(event) => setTranscript(event.target.value)}/><div className="voice-controls"><button className="btn btn-primary btn-sm" type="button" disabled={!transcript.trim()} onClick={() => { onConfirmed(transcript.trim()); setTranscript(''); setState('idle'); }}>{chinese ? '使用轉寫文字' : 'Use transcript'}</button><button className="btn btn-soft btn-sm" type="button" onClick={() => { setTranscript(''); setState('idle'); }}>{chinese ? '丟棄轉寫' : 'Discard transcript'}</button></div></div>}
      {state === 'requesting' && <p className="api-state" role="status">{chinese ? '請求麥克風權限…' : 'Requesting microphone permission…'}</p>}
    </div>
  );
}
