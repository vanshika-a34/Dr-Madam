# CHANGES.md — Step-by-Step Changelog

All changes made during the conversion from Streamlit to Vercel + Render deployment.

---

## Step 1: Created Backend API Modules (`api/`)

### `api/__init__.py`
- **What**: Created Python package init file.
- **Why**: Makes the `api/` directory importable as a Python package so `server.py` and `render_server.py` can import from `api.chat`, `api.transcribe`, and `api.tts`.

### `api/chat.py`
- **What**: Extracted the AI response logic from `app.py` into a standalone module.
- **Why**: Decouples the LLM logic from Streamlit so it can be used by any web framework (Flask).
- **Changes from original**:
  - Moved from `st.cache_resource` to module-level lazy initialization (`_get_model()`).
  - Changed system prompt from `HumanMessage` to proper `SystemMessage`.
  - **Broadened the system prompt**: The original prompt said "Use information retrieved from the medical information tool" which limited answers to MedlinePlus results only. The new prompt says "You can answer any medical question using your own medical knowledge. When relevant, use the medical_information tool to supplement your answer with verified information from MedlinePlus." This means the assistant now answers ALL medical questions, not just ones MedlinePlus covers.
  - API key is read from `os.getenv()` instead of `st.secrets`.

### `api/transcribe.py`
- **What**: Extracted the Faster-Whisper speech-to-text logic from `app.py`.
- **Why**: Same decoupling reason. The STT functionality is identical.
- **Changes from original**:
  - Moved from `st.cache_resource` to module-level lazy initialization.
  - Function signature unchanged: takes audio bytes, returns text string.

### `api/tts.py`
- **What**: Extracted the Edge-TTS text-to-speech logic from `app.py`.
- **Why**: Same decoupling reason. The TTS functionality is identical.
- **Changes from original**:
  - Added safe event loop handling (`asyncio.new_event_loop()`) for Flask's threaded environment, since `asyncio.run()` can fail when called from a non-main thread.
  - Voice unchanged: `en-IN-NeerjaNeural`.
  - Function signature unchanged: takes text string, returns MP3 bytes.

---

## Step 2: Created Front-End (`public/`)

### `public/index.html`
- **What**: Single-page HTML UI that matches the Streamlit app layout.
- **Why**: Replaces Streamlit's auto-generated UI with a static HTML page that can be hosted on Vercel for instant loading.
- **Layout matches original**: Title (🩺 Medical Voice Assistant), subtitle, disclaimer box (same wording), voice input section (🎙️), text input section (⌨️), chat messages, read-aloud controls (▶️/⏹️), MedlinePlus sources panel (🔎), sidebar with About info and Clear Conversation button.
- **New additions**:
  - Theme toggle button (☀️/🌙) in the header — a simple bordered button matching existing button style.
  - Backend status indicator (green/orange dot) showing server connection state.
  - Sidebar is now a slide-out panel (since there's no Streamlit sidebar component in vanilla HTML).

### `public/style.css`
- **What**: Complete CSS with light and dark theme support using CSS custom properties.
- **Why**: Provides theming without JavaScript CSS manipulation and keeps styling maintainable.
- **Design decisions**:
  - **Light theme colors**: White backgrounds, dark text, muted blue accent `#4b7bec` (taken directly from the original Streamlit app's `.source-box` border color).
  - **Dark theme colors**: Dark grey `#121212`/`#1e1e1e` backgrounds, light text, slightly brighter blue `#5a8dee` for contrast.
  - **Disclaimer box**: Exact same colors as original (`#fff4e5` bg, `#ffd699` border) in light mode, with warm dark equivalents in dark mode.
  - **Explicitly avoided**: No glassmorphism, no `backdrop-filter`, no purple anywhere, no neon/glow effects, no gradient backgrounds, no rounded pill buttons with shadows. Clean borders, simple box shadows, system font stack.
  - **Source boxes**: Same left-border style from original (4px solid blue left border).

### `public/app.js`
- **What**: Client-side JavaScript handling all interactions.
- **Why**: Replaces Streamlit's Python-driven UI logic with browser-native JavaScript.
- **Features**:
  - **Theme toggle**: Reads/saves preference in `localStorage`, toggles `data-theme` attribute on `<html>`. Persists across page refreshes.
  - **Voice recording**: Uses browser `MediaRecorder` API to capture audio, sends it to `/api/transcribe` endpoint, then auto-submits the transcribed text to `/api/chat`.
  - **Text input**: Form submission sends text to `/api/chat`, displays response.
  - **TTS playback**: Sends response text to `/api/tts`, receives MP3 blob, plays via `<audio>` element.
  - **Chat history**: Maintained in a JavaScript array, rendered as styled message divs.
  - **Backend health check**: Pings `/api/health` on page load, shows connection status, auto-retries every 5 seconds if unavailable.
  - **`API_BASE_URL` constant**: Empty string for localhost (same-origin), set to Render URL for production deployment.

---

## Step 3: Created Server Files

### `server.py` (Local Development)
- **What**: Flask server that serves both the static front-end and API routes.
- **Why**: Single command (`python server.py`) to run the full app locally during development.
- **Routes**:
  - `/` → serves `public/index.html`
  - `/<path>` → serves static files from `public/`
  - `/api/health` → health check
  - `/api/chat` → AI response
  - `/api/transcribe` → speech-to-text
  - `/api/tts` → text-to-speech
- Loads `.env` automatically via `python-dotenv`.

### `render_server.py` (Render Production)
- **What**: API-only Flask server with CORS enabled.
- **Why**: On Render, this server only handles API requests. The front-end is on Vercel, so CORS headers are needed for cross-origin requests.
- **Differences from `server.py`**:
  - No static file serving (Vercel handles that).
  - CORS enabled via `flask-cors`.
  - Root `/` returns a JSON description of available endpoints.
- Designed to run with `gunicorn` for production.

---

## Step 4: Created Configuration Files

### `vercel.json`
- **What**: Vercel deployment configuration.
- **Why**: Tells Vercel to serve the `public/` directory as a static site with filesystem-first routing.
- **No serverless functions**: All backend logic lives on Render. Vercel only serves HTML/CSS/JS.

### `render.yaml`
- **What**: Render service definition (Infrastructure as Code).
- **Why**: Defines the web service configuration for one-click Render deployment.
- **Settings**: Python runtime, pip install build command, gunicorn start command with 120s timeout (for STT/TTS operations), OPENROUTER_API_KEY as a synced secret.

---

## Step 5: Updated Existing Files

### `requirements.txt`
- **Added**: `flask`, `flask-cors`, `gunicorn`
- **Kept**: All existing dependencies (`streamlit`, `langchain`, `langchain-core`, `langchain-openrouter`, `python-dotenv`, `requests`, `faster-whisper`, `edge-tts`)
- **Why**: Flask is the new web framework, flask-cors enables cross-origin requests from Vercel to Render, gunicorn is the production WSGI server.

### `.gitignore`
- **Added**: `node_modules/`, `*.pyc`
- **Kept**: All existing entries.
- **Why**: Prevents accidental commits of Node.js dependencies and compiled Python files.

---

## Step 6: Updated README.md

- Updated tech stack table to include Flask and deployment platforms.
- Added deployment instructions for Vercel (front-end) and Render (backend).
- Added production configuration step (setting `API_BASE_URL` in `app.js`).
- Updated project structure diagram.
- Kept all original content where applicable.

---

## Summary of What Changed vs. What Stayed the Same

### Unchanged
- Voice (Faster-Whisper `small` model, `cpu`, `int8`) — same STT
- Voice (Edge-TTS `en-IN-NeerjaNeural`) — same TTS
- LLM (GLM-5.3-Flash via OpenRouter) — same model
- MedlinePlus tool (same XML parsing, same API) — same data source
- Original `app.py` — kept for reference, not deleted
- Original `.env` and `.env.example` — unchanged
- Original notebook — unchanged

### Changed
- **UI framework**: Streamlit → vanilla HTML/CSS/JS (static files)
- **Backend framework**: Streamlit server → Flask API server
- **Deployment**: Streamlit Cloud → Vercel (front-end) + Render (backend)
- **System prompt**: Broadened to answer all medical questions, not just MedlinePlus-covered topics
- **Theme**: Added light/dark toggle (original was light-only)
- **Architecture**: Monolith → split static + API
