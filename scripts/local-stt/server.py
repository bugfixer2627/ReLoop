"""Loopback-only, in-memory multilingual STT. Never stores audio or transcripts.

Compatible subset: POST /v1/audio/transcriptions (verbose_json), authenticated
with an ephemeral token supplied by the local launcher. No hosted database use.
"""
import argparse
import hmac
import io
import json
import os
import threading
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BYTES = 10 * 1024 * 1024
MAX_BODY = MAX_BYTES + 64 * 1024
gate = threading.Lock()


def load_engine(model_name, cache):
    from faster_whisper import WhisperModel
    return WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4,
                        num_workers=1, download_root=cache)


def handler(engine, token, model_name):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # No request headers, audio, transcripts, or credentials in logs.

        def reply(self, status, value):
            body = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_GET(self):
            if self.path == "/healthz":
                self.reply(200, {"ready": True, "engine": "faster-whisper", "model": model_name})
            else:
                self.reply(404, {"error": {"code": "not_found"}})

        def do_POST(self):
            if self.path != "/v1/audio/transcriptions":
                self.reply(404, {"error": {"code": "not_found"}})
                return
            if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + token):
                self.reply(401, {"error": {"code": "unauthorized"}})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length <= 0 or length > MAX_BODY:
                self.reply(413 if length > MAX_BODY else 400, {"error": {"code": "invalid_audio"}})
                return
            if not gate.acquire(blocking=False):
                self.reply(429, {"error": {"code": "busy"}})
                return
            try:
                self.connection.settimeout(30)
                content_type = self.headers.get("Content-Type", "")
                if "\r" in content_type or "\n" in content_type or not content_type.startswith("multipart/form-data;"):
                    self.reply(400, {"error": {"code": "invalid_multipart"}})
                    return
                raw = self.rfile.read(length)
                if len(raw) != length:
                    self.reply(400, {"error": {"code": "incomplete_audio"}})
                    return
                message = BytesParser(policy=default).parsebytes(("Content-Type: " + content_type + "\r\nMIME-Version: 1.0\r\n\r\n").encode() + raw)
                fields = {part.get_param("name", header="content-disposition"): part for part in message.iter_parts()}
                language = fields["language"].get_content().strip()
                if language not in ("zh", "en") or "file" not in fields or fields["model"].get_content().strip() != model_name:
                    self.reply(400, {"error": {"code": "invalid_parameters"}})
                    return
                audio = fields["file"].get_payload(decode=True)
                if not audio or len(audio) > MAX_BYTES:
                    self.reply(413 if audio else 400, {"error": {"code": "invalid_audio"}})
                    return
                from faster_whisper.audio import decode_audio
                try:
                    waveform = decode_audio(io.BytesIO(audio), sampling_rate=16000)
                except Exception:
                    self.reply(415, {"error": {"code": "unsupported_audio"}})
                    return
                duration = len(waveform) / 16000
                if not 0 < duration <= 60:
                    self.reply(413 if duration > 60 else 400, {"error": {"code": "invalid_duration"}})
                    return
                segments, _ = engine.transcribe(waveform, language=language, beam_size=5,
                                               vad_filter=True, condition_on_previous_text=False)
                text = " ".join(segment.text.strip() for segment in segments).strip()
                if not text:
                    self.reply(422, {"error": {"code": "no_speech"}})
                    return
                self.reply(200, {"text": text, "duration": duration, "language": language})
            except (KeyError, ValueError, TimeoutError):
                self.reply(400, {"error": {"code": "invalid_request"}})
            except Exception:
                self.reply(500, {"error": {"code": "transcription_failed"}})
            finally:
                gate.release()
    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--model", choices=("tiny", "base", "small"), default="base")
    parser.add_argument("--cache", required=True)
    args = parser.parse_args()
    token = os.environ.get("RELOOP_LOCAL_STT_TOKEN", "")
    if len(token) < 32:
        print(json.dumps({"error": "LOCAL_SERVICE_TOKEN_REQUIRED"}), flush=True)
        return 1
    try:
        engine = load_engine(args.model, args.cache)
    except ImportError:
        print(json.dumps({"error": "LOCAL_STT_DEPENDENCIES_MISSING"}), flush=True)
        return 1
    except Exception:
        print(json.dumps({"error": "LOCAL_STT_MODEL_LOAD_FAILED"}), flush=True)
        return 1
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler(engine, token, args.model))
    print(json.dumps({"ready": True, "port": server.server_port}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
