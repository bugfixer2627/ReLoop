"""Decode genuine speech to the PCM format expected by Chromium fake capture.

This is a test-only format conversion, not speech synthesis.
"""
import argparse
import wave
import numpy as np
from faster_whisper.audio import decode_audio

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("destination")
args = parser.parse_args()
audio = decode_audio(args.source, sampling_rate=44100)
with wave.open(args.destination, "wb") as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(44100)
    output.writeframes((np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())
print(len(audio) / 44100)
