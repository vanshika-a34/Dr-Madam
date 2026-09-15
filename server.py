"""
Local development server.

Serves both the static front-end (public/) and the API routes.
Run: python server.py
Open: http://localhost:5000
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, Response

# Load .env before importing API modules
load_dotenv()

from api.chat import get_medical_response
from api.transcribe import transcribe_audio
from api.tts import text_to_speech

app = Flask(__name__, static_folder=None)

PUBLIC_DIR = Path(__file__).parent / "public"


# ---------------------------------------------------------
# Static files
# ---------------------------------------------------------
@app.route("/")
def serve_index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    file_path = PUBLIC_DIR / filename
    if file_path.is_file():
        return send_from_directory(PUBLIC_DIR, filename)
    return send_from_directory(PUBLIC_DIR, "index.html")


# ---------------------------------------------------------
# API routes
# ---------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()

    if not data or not data.get("message"):
        return jsonify({"error": "No message provided"}), 400

    try:
        answer, sources = get_medical_response(data["message"])
        return jsonify({"answer": answer, "sources": sources})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()

    if not audio_bytes:
        return jsonify({"error": "Empty audio file"}), 400

    try:
        text = transcribe_audio(audio_bytes)
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tts", methods=["POST"])
def tts():
    data = request.get_json()

    if not data or not data.get("text"):
        return jsonify({"error": "No text provided"}), 400

    try:
        audio_bytes = text_to_speech(data["text"])
        return Response(
            audio_bytes,
            mimetype="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=response.mp3"},
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------
# Run
# ---------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n  Medical Voice Assistant")
    print(f"  http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
