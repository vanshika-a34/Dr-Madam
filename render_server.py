"""
Render production server.

API-only Flask server with CORS enabled for the Vercel front-end.
Deployed on Render with gunicorn.

Run locally: gunicorn render_server:app --bind 0.0.0.0:5000
"""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

# Load .env before importing API modules
load_dotenv()

from api.chat import get_medical_response
from api.transcribe import transcribe_audio
from api.tts import text_to_speech

app = Flask(__name__)

# Allow requests from any origin (restrict to your Vercel domain in production)
# Example: CORS(app, origins=["https://your-app.vercel.app"])
CORS(app)


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
# Root (for browser visitors hitting the API directly)
# ---------------------------------------------------------
@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "service": "Medical Voice Assistant API",
        "status": "running",
        "endpoints": [
            "GET  /api/health",
            "POST /api/chat",
            "POST /api/transcribe",
            "POST /api/tts",
        ],
    })


# ---------------------------------------------------------
# Run (for local testing of the Render server)
# ---------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
