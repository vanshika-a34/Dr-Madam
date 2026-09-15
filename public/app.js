/* =============================================================
   Medical Voice Assistant — Client-Side Logic
   ============================================================= */

// ---------------------------------------------------------
// Configuration
// ---------------------------------------------------------
// For local development, API_BASE_URL is empty (same-origin).
// For production, set this to the Render backend URL.
// Example: const API_BASE_URL = "https://your-app.onrender.com";
const API_BASE_URL = "";

// ---------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const clearBtn = document.getElementById("clearBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordLabel = document.getElementById("recordLabel");
const recordingIndicator = document.getElementById("recordingIndicator");
const transcriptionBox = document.getElementById("transcriptionBox");
const transcribedText = document.getElementById("transcribedText");
const textForm = document.getElementById("textForm");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const chatSection = document.getElementById("chatSection");
const chatContainer = document.getElementById("chatContainer");
const ttsSection = document.getElementById("ttsSection");
const readAloudBtn = document.getElementById("readAloudBtn");
const stopAudioBtn = document.getElementById("stopAudioBtn");
const audioPlayerContainer = document.getElementById("audioPlayerContainer");
const audioPlayer = document.getElementById("audioPlayer");
const sourcesSection = document.getElementById("sourcesSection");
const sourcesContainer = document.getElementById("sourcesContainer");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");


// ---------------------------------------------------------
// State
// ---------------------------------------------------------
let messages = [];
let lastSources = [];
let lastAnswer = "";
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let backendReady = false;


// ---------------------------------------------------------
// Theme
// ---------------------------------------------------------
function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        themeIcon.textContent = "🌙";
    } else {
        document.documentElement.setAttribute("data-theme", "light");
        themeIcon.textContent = "☀️";
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark") {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
        themeIcon.textContent = "☀️";
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        themeIcon.textContent = "🌙";
    }
}

themeToggle.addEventListener("click", toggleTheme);
initTheme();


// ---------------------------------------------------------
// Sidebar
// ---------------------------------------------------------
function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
}

sidebarToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

sidebarOverlay.addEventListener("click", closeSidebar);


// ---------------------------------------------------------
// Backend Health Check
// ---------------------------------------------------------
async function checkBackend() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/health`, {
            method: "GET",
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            statusDot.classList.add("connected");
            statusDot.classList.remove("error");
            statusText.textContent = "Server connected";
            backendReady = true;
            return;
        }
    } catch (e) {
        // ignore
    }

    statusDot.classList.remove("connected");
    statusDot.classList.add("error");
    statusText.textContent = "Server unavailable — retrying...";
    backendReady = false;

    // Retry in 5 seconds
    setTimeout(checkBackend, 5000);
}

checkBackend();


// ---------------------------------------------------------
// Loading Overlay
// ---------------------------------------------------------
function showLoading(text) {
    loadingText.textContent = text || "Processing...";
    loadingOverlay.style.display = "flex";
}

function hideLoading() {
    loadingOverlay.style.display = "none";
}


// ---------------------------------------------------------
// Chat Rendering
// ---------------------------------------------------------
function renderMessages() {
    if (messages.length === 0) {
        chatSection.style.display = "none";
        return;
    }

    chatSection.style.display = "block";
    chatContainer.innerHTML = "";

    for (const msg of messages) {
        const div = document.createElement("div");
        div.className = `chat-message ${msg.role}`;

        const roleLabel = document.createElement("div");
        roleLabel.className = "chat-message-role";
        roleLabel.textContent = msg.role === "user" ? "You" : "Assistant";

        const content = document.createElement("div");

        if (msg.isThinking) {
            content.innerHTML = `
                <span style="font-style: italic; color: var(--text-muted);">
                    Searching medical information...
                </span>
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            `;
        } else {
            content.textContent = msg.content;
        }

        div.appendChild(roleLabel);
        div.appendChild(content);
        chatContainer.appendChild(div);
    }

    // Scroll to last message
    if (chatContainer.lastElementChild) {
        chatContainer.lastElementChild.scrollIntoView({ behavior: "smooth" });
    }
}


// ---------------------------------------------------------
// Source Rendering
// ---------------------------------------------------------
function renderSources() {
    if (lastSources.length === 0) {
        sourcesSection.style.display = "none";
        return;
    }

    sourcesSection.style.display = "block";
    sourcesContainer.innerHTML = "";

    for (const source of lastSources) {
        const div = document.createElement("div");
        div.className = "source-box";
        div.textContent = source;
        sourcesContainer.appendChild(div);
    }
}


// ---------------------------------------------------------
// TTS Section
// ---------------------------------------------------------
function showTTSControls() {
    if (lastAnswer) {
        ttsSection.style.display = "block";
    } else {
        ttsSection.style.display = "none";
    }
}


// ---------------------------------------------------------
// Send Question to API
// ---------------------------------------------------------
async function sendQuestion(questionText) {
    if (!questionText.trim()) return;

    // Add user message & placeholder assistant thinking message
    messages.push({ role: "user", content: questionText });
    const thinkingIndex = messages.length;
    messages.push({ role: "assistant", content: "", isThinking: true });
    renderMessages();

    try {
        const res = await fetch(`${API_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: questionText }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server error (${res.status})`);
        }

        const data = await res.json();
        const answer = data.answer || "Sorry, I could not generate a response.";
        const sources = data.sources || [];

        // Replace thinking placeholder with actual answer
        messages[thinkingIndex] = { role: "assistant", content: answer };
        lastAnswer = answer;
        lastSources = sources;

        renderMessages();
        renderSources();
        showTTSControls();

        // Reset audio state
        audioPlayerContainer.style.display = "none";
        audioPlayer.src = "";

    } catch (err) {
        messages[thinkingIndex] = {
            role: "assistant",
            content: `Error: ${err.message}`,
        };
        renderMessages();
    }
}


// ---------------------------------------------------------
// Text Input
// ---------------------------------------------------------
textForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = "";
    sendQuestion(text);
});


// ---------------------------------------------------------
// Voice Recording
// ---------------------------------------------------------
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());

            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

            // Send to transcription API
            showLoading("Converting your speech to text...");
            transcriptionBox.style.display = "none";

            try {
                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");

                const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(
                        errData.error || `Transcription failed (${res.status})`
                    );
                }

                const data = await res.json();
                const text = data.text;

                if (!text || !text.trim()) {
                    hideLoading();
                    transcriptionBox.style.display = "block";
                    transcribedText.textContent =
                        "(Could not understand the recording. Please try again.)";
                    return;
                }

                // Show transcription
                transcriptionBox.style.display = "block";
                transcribedText.textContent = text;

                hideLoading();

                // Auto-submit the transcribed question
                await sendQuestion(text);
            } catch (err) {
                hideLoading();
                transcriptionBox.style.display = "block";
                transcribedText.textContent = `Error: ${err.message}`;
            }
        };

        mediaRecorder.start();
        isRecording = true;
        recordIcon.textContent = "⏹️";
        recordLabel.textContent = "Stop Recording";
        recordBtn.classList.remove("btn-primary");
        recordBtn.classList.add("btn-danger");
        recordBtn.style.borderColor = "var(--danger)";
        recordBtn.style.color = "#ffffff";
        recordingIndicator.classList.add("active");
    } catch (err) {
        alert(
            "Microphone access denied. Please allow microphone access and try again."
        );
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
    isRecording = false;
    recordIcon.textContent = "🎙️";
    recordLabel.textContent = "Start Recording";
    recordBtn.classList.remove("btn-danger");
    recordBtn.classList.add("btn-primary");
    recordBtn.style.borderColor = "";
    recordBtn.style.color = "";
    recordingIndicator.classList.remove("active");
}

recordBtn.addEventListener("click", () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});


// ---------------------------------------------------------
// Text-to-Speech
// ---------------------------------------------------------
readAloudBtn.addEventListener("click", async () => {
    if (!lastAnswer) return;

    readAloudBtn.disabled = true;
    readAloudBtn.textContent = "⏳ Generating...";

    try {
        const res = await fetch(`${API_BASE_URL}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: lastAnswer }),
        });

        if (!res.ok) {
            throw new Error(`TTS failed (${res.status})`);
        }

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        audioPlayer.src = audioUrl;
        audioPlayerContainer.style.display = "block";
        audioPlayer.play();
    } catch (err) {
        alert(`Voice generation failed: ${err.message}`);
    } finally {
        readAloudBtn.disabled = false;
        readAloudBtn.textContent = "▶️ Read Aloud";
    }
});

stopAudioBtn.addEventListener("click", () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayerContainer.style.display = "none";
    audioPlayer.src = "";
});


// ---------------------------------------------------------
// Clear Conversation
// ---------------------------------------------------------
clearBtn.addEventListener("click", () => {
    messages = [];
    lastSources = [];
    lastAnswer = "";
    renderMessages();
    renderSources();
    showTTSControls();
    transcriptionBox.style.display = "none";
    audioPlayerContainer.style.display = "none";
    audioPlayer.src = "";
    closeSidebar();
});
