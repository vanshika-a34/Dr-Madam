import asyncio
import tempfile
from pathlib import Path

import edge_tts


# ---------------------------------------------------------
# Text-to-speech
# ---------------------------------------------------------
async def _generate_voice(text, output_path):
    voice = "en-IN-NeerjaNeural"

    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
    )

    await communicate.save(output_path)


def text_to_speech(text):
    """Convert text to speech using Edge-TTS. Returns MP3 bytes."""
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".mp3",
    ) as temp_file:
        output_path = temp_file.name

    # Create a new event loop if needed (safe for threaded Flask)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.run_until_complete(_generate_voice(text, output_path))

    with open(output_path, "rb") as audio_file:
        audio_bytes = audio_file.read()

    Path(output_path).unlink(missing_ok=True)

    return audio_bytes
