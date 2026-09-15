import tempfile
from pathlib import Path

# ---------------------------------------------------------
# Whisper model (cached at module level)
# ---------------------------------------------------------
_whisper_model = None


def _get_whisper():
    global _whisper_model

    if _whisper_model is None:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8",
        )

    return _whisper_model


# ---------------------------------------------------------
# Speech-to-text
# ---------------------------------------------------------
def transcribe_audio(audio_bytes):
    """Transcribe audio bytes (WAV) to text using Faster-Whisper."""
    whisper_model = _get_whisper()

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".wav",
    ) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = temp_file.name

    try:
        segments, _ = whisper_model.transcribe(
            temp_path,
            beam_size=5,
        )

        text = " ".join(segment.text.strip() for segment in segments).strip()
        return text

    finally:
        Path(temp_path).unlink(missing_ok=True)
