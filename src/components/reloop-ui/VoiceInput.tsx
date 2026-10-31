'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiRequestError, transcribeAudio } from '@/lib/frontend/api-client';
import { MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS } from '@/lib/contracts';
import { useWorkspace } from './WorkspaceProviders';
import { Icon } from './icons';

type VoiceState = 'idle' | 'requesting' | 'recording' | 'transcribing' | 'preview' | 'error';

export function VoiceInput({ onConfirmed, disabled = false }: {
  onConfirmed: (text: string) => void;
  disabled?: boolean;
}) {
  const { accessToken, locale } = useWorkspace();
  const [state, setState] = useState<VoiceState>('idle');
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const tooLargeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const chinese = locale === 'zh-CN';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
    if (!accessToken || disabled || state === 'requesting' || state === 'recording') return;
    setMessage('');
    setTranscript('');
    setState('requesting');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('error');
      setMessage(chinese ? '此浏览器不支持录音，请改用文字输入。' : 'Recording is not supported by this browser. Use text input instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/webm'];
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
          recorder.stop();
          if (mountedRef.current) {
            setState('error');
          setMessage(chinese ? '录音超过 10 MiB 限制，未发送。请缩短录音或改用文字。' : 'Recording exceeded 10 MiB and was not sent. Shorten it or use text input.');
          }
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
        transcribeAudio(accessToken, audio, locale).then((result) => {
          if (!mountedRef.current) return;
          setTranscript(result.text);
          setState('preview');
          setMessage('');
        }).catch((error: unknown) => {
          if (!mountedRef.current) return;
          setState('error');
          setMessage(error instanceof ApiRequestError && error.code === 'NOT_IMPLEMENTED'
            ? (chinese ? '语音转写服务尚未接入。录音已丢弃，请改用文字输入。' : 'Speech-to-text is not implemented. The recording was discarded; use text input instead.')
            : error instanceof ApiRequestError ? error.message
              : (chinese ? '转写失败，录音已丢弃。请改用文字输入。' : 'Transcription failed. The recording was discarded; use text input instead.'));
        });
      };
      recorder.start(250);
      setState('recording');
      timerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_AUDIO_SECONDS * 1000);
    } catch (error) {
      releaseStream();
      setState('error');
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      setMessage(denied
        ? (chinese ? '未取得麦克风权限，请允许权限或改用文字输入。' : 'Microphone permission was denied. Allow access or use text input.')
        : (chinese ? '无法访问麦克风，请改用文字输入。' : 'Could not access the microphone. Use text input instead.'));
    }
  }

  function stopRecording(discard: boolean) {
    discardRef.current = discard;
    if (timerRef.current) clearTimeout(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
    else releaseStream();
    if (discard) {
      chunksRef.current = [];
      setState('idle');
      setMessage('');
    } else if (recorder?.state === 'recording') {
      setState('transcribing');
    }
  }

  const buttons = state === 'recording' ? (
    <div className="voice-controls"><button className="btn btn-danger btn-sm" type="button" onClick={() => stopRecording(false)}>{chinese ? '停止並轉寫' : 'Stop & transcribe'}</button><button className="btn btn-soft btn-sm" type="button" onClick={() => stopRecording(true)}>{chinese ? '取消' : 'Cancel'}</button></div>
  ) : (
    <button className={`mic-button ${state === 'requesting' ? 'recording' : ''}`} type="button" disabled={disabled || state === 'requesting' || state === 'transcribing'} onClick={startRecording} aria-label={chinese ? '開始語音輸入' : 'Start voice input'}><Icon name="mic" size={18}/></button>
  );

  return (
    <div className="voice-input">
      <div className="voice-box"><div>{buttons}</div><div className="voice-description"><strong>{state === 'recording' ? (chinese ? '正在錄音…最長 60 秒' : 'Recording… up to 60 seconds') : state === 'transcribing' ? (chinese ? '正在轉寫…' : 'Transcribing…') : (chinese ? '中文 / English 語音輸入' : 'Chinese / English voice input')}</strong><p>{state === 'recording' ? (chinese ? '停止後會先顯示可編輯文本。' : 'A transcript preview appears after stopping.') : (chinese ? '文字輸入始終可用；錄音不會自動提交。' : 'Typing remains available. Recording never submits automatically.')}</p></div></div>
      {state === 'error' && message && <p className="voice-error" role="alert">{message}</p>}
      {state === 'preview' && <div className="voice-transcript"><label htmlFor="transcript-preview">{chinese ? '確認轉寫內容' : 'Confirm transcript'}</label><textarea id="transcript-preview" className="textarea" rows={3} value={transcript} onChange={(event) => setTranscript(event.target.value)}/><div className="voice-controls"><button className="btn btn-primary btn-sm" type="button" disabled={!transcript.trim()} onClick={() => { onConfirmed(transcript.trim()); setTranscript(''); setState('idle'); }}>{chinese ? '使用轉寫文字' : 'Use transcript'}</button><button className="btn btn-soft btn-sm" type="button" onClick={() => { setTranscript(''); setState('idle'); }}>{chinese ? '丟棄轉寫' : 'Discard transcript'}</button></div></div>}
      {state === 'requesting' && <p className="api-state" role="status">{chinese ? '請求麥克風權限…' : 'Requesting microphone permission…'}</p>}
    </div>
  );
}
