#!/usr/bin/env python3
"""
faster-whisper STT Worker
Receives audio file path from Node.js backend, returns JSON transcription.

Setup:
    pip install faster-whisper soundfile numpy

Usage:
    python worker.py --file /path/to/audio.wav --model small --language zh
"""

import argparse
import json
import sys
import os


def main():
    parser = argparse.ArgumentParser(description="faster-whisper STT Worker")
    parser.add_argument("--file", required=True, help="Path to audio file (WAV)")
    parser.add_argument("--model", default="small", help="Model size: tiny, base, small, medium, large-v3")
    parser.add_argument("--language", default="zh", help="Language code")
    parser.add_argument("--device", default="auto", help="Device: auto, cpu, cuda")
    parser.add_argument("--compute_type", default="auto", help="Compute type: auto, int8, float16")

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(json.dumps({"error": f"File not found: {args.file}"}))
        sys.exit(1)

    try:
        from faster_whisper import WhisperModel

        # Auto-detect device
        device = args.device
        compute_type = args.compute_type

        if device == "auto":
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
                compute_type = "float16" if device == "cuda" else "int8"
            except ImportError:
                device = "cpu"
                compute_type = "int8"

        print(f"[STT Worker] Loading model '{args.model}' on {device} ({compute_type})...", file=sys.stderr)

        model = WhisperModel(args.model, device=device, compute_type=compute_type)

        segments, info = model.transcribe(
            args.file,
            language=args.language,
            beam_size=5,
            vad_filter=True,
        )

        text = " ".join(segment.text for segment in segments)

        result = {
            "text": text.strip(),
            "language": info.language,
            "duration": info.duration,
        }

        print(json.dumps(result, ensure_ascii=False))

    except ImportError:
        print(json.dumps({
            "error": "faster-whisper not installed. Run: pip install faster-whisper",
            "text": ""
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e), "text": ""}))
        sys.exit(1)


if __name__ == "__main__":
    main()
