# Two independent speech modes

Both paths use the existing voice control in Feedback and artifact revisions. Select the instruction language separately from the interface language. Stop recording, edit recognized words, then explicitly confirm. Confirmation appends to the intended input and does not submit a workflow. Typed text remains available on cancellation/failure. Browser recognition never calls `/api/transcribe`.

## Configured transcription service: local CPU Whisper

`faster-whisper` 1.2.1 with the multilingual `base` model runs locally on CPU/int8. PyAV bundles codecs, so a separate ffmpeg install is unnecessary. Chinese and English use explicit `zh` and `en` language parameters. The service decodes actual WebM/Opus, MP4, MP3, WAV and Ogg; checks actual decoded duration; rejects >60 seconds or >10 MiB; and processes only one recording at a time. It returns no transcript for empty speech. It stores neither audio nor recognized text.

The server binds only to 127.0.0.1. The launcher creates a random temporary service token and supplies it server-to-server through process environment. It never prints the token, sends it to frontend code or writes `.env.local`. The existing application session/origin guards stay unchanged. LLM settings and organizer credentials stay unchanged. This local option creates no paid account and uses no external STT key. Initial model download needs public Hugging Face access; inference subsequently uses the local cache.

On this machine, Python 3.12 and dependencies/model are already installed under ignored `.local-reviews/`. From PowerShell in `C:\Users\Vladimir\Desktop\reloop AI`:

```powershell
npm.cmd run dev:local-stt
```

Stop any previous port-3000 app before starting. Wait for “Local multilingual CPU speech service ready,” then open **http://localhost:3000/login** with the existing account. Select **Configured transcription service** in Feedback or revision controls. `/api/health` should say transcription configured. A configured health flag alone is not an audio test. Ctrl+C stops the local app/service launcher.

For another Windows computer, use Python 3.12 (64-bit):

```powershell
py -3.12 -m venv .local-reviews/stt-venv
& .local-reviews/stt-venv/Scripts/python.exe -m pip install -r scripts/local-stt/requirements.lock.txt
npm.cmd ci
npm.cmd run dev:local-stt
```

On this Codex installation, the bundled Python used to create the venv was `C:\Users\Vladimir\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`; a normal `py -3.12` install is equally valid. Do not use the system Python 3.14 environment unless all native dependencies support it. `RELOOP_STT_PYTHON` can point to another prepared Python executable. `RELOOP_STT_MODEL` selects multilingual `tiny`, `base` (default), or `small`; English-only `.en` models are deliberately unavailable for this bilingual service. Larger models require more memory/download time.

The local service is intended for the Windows/local demo, not a serverless deployment. A hosted deployment needs an appropriately managed persistent CPU service or a verified external STT provider, with private networking/TLS and independent credentials. Do not expose the loopback development service publicly.

The verified cached model snapshot is `Systran/faster-whisper-base` revision `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`. Model weights and the isolated Python environment are deliberately Git-ignored. The pinned PyAV version avoids the incompatible API change in PyAV 19; do not upgrade the decoder independently without audio regression testing.

## Configured transcription service: external alternative

The existing compatible adapter accepts `TRANSCRIPTION_PROVIDER=openai_compatible`, `TRANSCRIPTION_BASE_URL`, `TRANSCRIPTION_API_KEY`, `TRANSCRIPTION_MODEL`, optional `TRANSCRIPTION_TIMEOUT_MS` (1000–120000; default 30000). The documented provider must implement POST `/audio/transcriptions`, accept the selected codec/language and `response_format=verbose_json`, and return nonempty `text` plus positive measured `duration`. A JSON-only service without duration is not yet compatible with the duration guard. Never assume a chat endpoint is also an STT endpoint.

Keep speech credentials separate from TokenHubCloud chat. The organizer chat endpoint is verified; its audio endpoint returned 404. Do not send organizer keys to an unrelated STT domain or change the working LLM settings. For an external service, enter its independent secret locally, never in chat. Existing `.env.local` must not be overwritten.

## Browser recognition

Select **Browser speech recognition** and the intended instruction language. The component uses standard/prefixed SpeechRecognition, supports stop/cancel, a 60-second capture bound, startup/end timeouts and no-speech/error recovery. It preserves a previously recognized phrase when a later event is empty. This mode sends no audio to ReLoop; the browser vendor may process it remotely, as disclosed before starting.

Constructor presence is only a capability probe. Browser policy, permissions, browser-vendor service/network access and recognition language determine whether actual words return. Headless/fake capture can differ from a physical microphone. Chrome/Edge version and OS microphone permissions must be accepted on the demo device. A failed browser service is not silently routed to local/backend STT.

## Real-audio test boundary

`node scripts/test-real-voice.mjs` runs eight combinations: two modes × zh-CN/en-US × Feedback/revision. It uses genuine prerecorded speech replayed through Chromium's fake capture device. The configured path reaches the actual application route and actual local Whisper engine. Browser mode reaches the actual vendor recognizer, with no injected results. Only case reads are UI fixtures; no case generation, database persistence or physical microphone is claimed by this test.

Run production-build browser suites sequentially after `npm.cmd run build`. Do not run a build or dev server against the same `.next` directory while a production browser test is active; generated chunk changes invalidate that test server. Ports 3001/3002 are reserved for isolated workflow/voice runners.

Recorded samples are downloaded into ignored `test-results/`, not committed or redistributed:

- English: [official faster-whisper jfk.flac test recording](https://raw.githubusercontent.com/SYSTRAN/faster-whisper/master/tests/data/jfk.flac).
- Chinese: [official FunASR example](https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/asr_example_zh.wav), referenced by the [FunASR README](https://github.com/modelscope/FunASR).

The test converts recorded speech to PCM WAV for browser replay; it does not synthesize words or substitute transcript responses. Timestamped reports distinguish actual recognized text, failures, mock UI tests and manual microphone confirmation. Physical-microphone acceptance is still required in both contexts for both languages/modes.
