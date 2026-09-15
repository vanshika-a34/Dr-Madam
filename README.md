# 🩺 Medical Voice Assistant

An AI-powered medical information assistant that lets users **type or speak medical questions** and receive answers in **text**, with an optional **Read Aloud** feature.

## 🏗️ Architecture

| Layer | Platform | Purpose |
|-------|----------|---------|
| **Front-end** | Vercel | Static HTML/CSS/JS — loads instantly |
| **Back-end** | Render | Flask API — LLM, STT, TTS |
| **Development** | Localhost | Single Flask server (both) |

## ✨ Features

* ⌨️ **Text Input** — Type your medical question.
* 🎙️ **Voice Input** — Speak your question using **Faster-Whisper (STT)**.
* 🤖 **AI Responses** — Uses **GLM-5.3-Flash via OpenRouter** + own medical knowledge.
* 🏥 **Medical Information** — Supplements answers with **MedlinePlus** data when available.
* 📝 **Text Answers** — Displays the final response on screen.
* 🔊 **Read Aloud** — Converts the response to speech using **Edge-TTS (TTS)**.
* ⏹️ **Stop Audio** — Stop/clear the generated audio.
* 🌓 **Light/Dark Theme** — Toggle between light and dark themes.

## 🔄 How It Works

```text
⌨️ Type OR 🎙️ Speak
        ↓
   Question Text
        ↓
     AI Agent
        ↓
   MedlinePlus Tool (supplementary)
        ↓
   📝 Text Response
        ↓
   ▶️ Read Aloud
        ↓
     🔊 Edge-TTS
```

### Speech Features

```text
🎙️ Speech → Faster-Whisper → Text        (STT)

📝 Text Response → Edge-TTS → Speech     (TTS)
```

## 🛠️ Tech Stack

| Technology     | Purpose                 |
| -------------- | ----------------------- |
| Python         | Core development        |
| Flask          | API server              |
| LangChain      | AI agent & tool calling |
| OpenRouter     | LLM API                 |
| GLM-5.3-Flash  | Language model          |
| Faster-Whisper | Speech-to-Text          |
| Edge-TTS       | Text-to-Speech          |
| MedlinePlus    | Medical information     |
| HTML/CSS/JS    | Front-end UI            |
| Vercel         | Front-end hosting       |
| Render         | Backend hosting         |

## 📁 Project Structure

```text
medical-voice-assistant/
│
├── api/                        ← Python backend modules
│   ├── __init__.py
│   ├── chat.py                 ← AI response logic
│   ├── transcribe.py           ← Speech-to-text
│   └── tts.py                  ← Text-to-speech
├── public/                     ← Static front-end
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.py                   ← Local dev server
├── render_server.py            ← Render production server
├── vercel.json                 ← Vercel config
├── render.yaml                 ← Render config
├── requirements.txt
├── CHANGES.md                  ← Detailed changelog
├── .env
├── .env.example
├── .gitignore
├── app.py                      ← Original Streamlit app (reference)
└── medical_voice_assistant.ipynb
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd medical-voice-assistant
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Add API Key

Create a `.env` file:

```text
OPENROUTER_API_KEY=your_api_key_here
```

> Never commit your API key to GitHub.

## ▶️ Run Locally

```bash
python server.py
```

Open: **http://localhost:5000**

## 🚀 Deploy

### Front-end → Vercel

1. Push your repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Set **Output Directory** to `public`.
4. Deploy — your static UI loads instantly.

### Backend → Render

1. Push your repo to GitHub.
2. Create a new **Web Service** in [Render](https://render.com).
3. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn render_server:app --bind 0.0.0.0:$PORT --timeout 120`
4. Add environment variable: `OPENROUTER_API_KEY=your_key`
5. Deploy.

### Connect Front-end to Backend

After deploying both, update `API_BASE_URL` in `public/app.js`:

```javascript
const API_BASE_URL = "https://your-app.onrender.com";
```

Redeploy the front-end on Vercel.

## 🩺 Example

**User:**
"What are the symptoms of diabetes?"

**Assistant:**
Displays a medical information response in text.

The user can then click **▶️ Read Aloud** to listen to the response.

## ⚠️ Disclaimer

This project is for **educational and informational purposes only**. It is not a substitute for a doctor, medical diagnosis, treatment, or emergency medical advice. Always consult a qualified healthcare professional for personal medical concerns.
