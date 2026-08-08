<h1 align="center">
  <img src="https://img.shields.io/badge/YouTube-Summarizer-FF0000?style=flat&logo=youtube&logoColor=white" alt="YT Summarizer"/>
</h1>

<p align="center">
  <strong>Summarize any YouTube video with AI — right from your browser.</strong><br/>
  Powered by <a href="https://console.groq.com">Groq</a> (free & fast) · LangChain RAG · Chrome Extension
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/LangChain-RAG-1C3C3C?style=flat"/>
  <img src="https://img.shields.io/badge/Groq-llama3-FF6B35?style=flat"/>
  <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat&logo=googlechrome&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat"/>
</p>

---

## ✨ Features

- 📺 **One-click summary** — click the extension on any YouTube video
- 🔗 **Paste any URL** — works with youtube.com and youtu.be links
- 💬 **Ask questions** — built-in Q&A tab powered by RAG
- ⚡ **Groq-powered** — llama3-8b runs at ~500 tokens/sec, completely free
- 🔒 **Private** — your API key never leaves your machine
- 💾 **Smart caching** — re-asking about the same video is instant

---

## 🏗️ How It Works

```
Chrome Extension (popup)
        │
        │  HTTP POST  /summarize  or  /ask
        ▼
  FastAPI Backend  (localhost:8000)
        │
        ├─ youtube-transcript-api  →  fetch captions
        ├─ RecursiveCharacterTextSplitter  →  chunk transcript
        ├─ HuggingFace all-MiniLM-L6-v2   →  free local embeddings
        ├─ FAISS vector store              →  semantic search
        └─ Groq llama3-8b-8192            →  generate answer
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Google Chrome
- A free [Groq API key](https://console.groq.com) (takes 30 seconds)

---

### Step 1 — Start the Backend

**Mac / Linux:**
```bash
git clone https://github.com/nikitabudholiya/yt-summarizer.git
cd yt-summarizer
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**
```
git clone https://github.com/nikitabudholiya/yt-summarizer.git
cd yt-summarizer
scripts\setup.bat
```

> The script creates a virtual environment, installs all dependencies, asks for your Groq API key, and starts the server. On the first run, it downloads the embedding model (~80 MB).

**Or manually:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then edit .env and add your GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

Verify it's running: http://localhost:8000/health should return `{"status":"ok"}`

---

### Step 2 — Load the Chrome Extension

1. Open **`chrome://extensions`** in Chrome
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the **`extension/`** folder from this repo

---

### Step 3 — Use It

| What you want | How |
|---|---|
| Summarize a playing video | Go to YouTube → click the extension icon → **Use current tab** → **Summarize Video** |
| Summarize by URL | Paste any YouTube link → **Summarize Video** |
| Ask a question | After summarizing → switch to the **Ask a Question** tab |
| Change your API key | Click ⚙ in the popup |

---

## 🛠️ VS Code Development

Open the project in VS Code, then press **F5** to start the backend server (uses `.vscode/launch.json`).

Test the API without the extension using the included REST client file:
- Install the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension
- Open `api-test.http`
- Click **Send Request** above any block

---

## ⚙️ Configuration

| Setting | File | Default |
|---|---|---|
| Groq API key | `backend/.env` | — |
| Groq model | `backend/main.py` → `GROQ_MODEL` | `llama3-8b-8192` |
| Backend URL | Extension ⚙ settings | `http://localhost:8000` |

### Groq model options

| Model | Speed | Context | Best for |
|---|---|---|---|
| `llama3-8b-8192` | ⚡ Fastest | 8K | Quick summaries |
| `llama3-70b-8192` | Fast | 8K | Better reasoning |
| `mixtral-8x7b-32768` | Medium | 32K | Long videos |

---

## 🗂️ Project Structure

```
yt-summarizer/
├── backend/
│   ├── main.py              # FastAPI app — /summarize and /ask endpoints
│   ├── requirements.txt
│   └── .env.example         # Copy to .env and add your key
├── extension/
│   ├── manifest.json        # Chrome Extension Manifest v3
│   ├── popup.html           # Extension UI
│   ├── popup.js             # UI logic — detect tab, call API, show results
│   ├── content.js           # Injected into YouTube to read the video URL
│   ├── background.js        # Service worker
│   └── icons/               # Extension icons (run generate_icons.py)
├── scripts/
│   ├── setup.sh             # One-command setup for Mac/Linux
│   └── setup.bat            # One-command setup for Windows
├── .vscode/
│   ├── launch.json          # F5 to start the server
│   └── extensions.json      # Recommended VS Code extensions
├── api-test.http            # Test endpoints with REST Client extension
└── .gitignore
```

---

## ❓ Troubleshooting

**"No captions available"** — The video has disabled subtitles. Try a different video.

**"Failed to fetch"** — Make sure the backend server is running (`uvicorn main:app --port 8000`).

**Extension not detecting the tab** — Refresh the YouTube page after installing the extension (Chrome requires a page reload for content scripts to activate).

**Slow on first summarize** — The embedding model downloads once (~80 MB). Subsequent runs are fast.

**Windows PATH issues** — Make sure Python is added to PATH during installation.

---

## 🤝 Contributing

Pull requests are welcome! To contribute:

1. Fork this repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT — use it, modify it, share it.

---

<p align="center">Made with ❤️ using LangChain · Groq · FastAPI</p>
