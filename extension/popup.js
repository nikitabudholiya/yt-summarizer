// ── State ──────────────────────────────────────────────────────────────────
let currentVideoUrl  = "";
let currentVideoId   = "";
let summaryGenerated = false;

const DEFAULT_SERVER = "http://localhost:8000";

// ── DOM refs ──────────────────────────────────────────────────────────────
const urlInput     = document.getElementById("urlInput");
const detectBtn    = document.getElementById("detectBtn");
const clearBtn     = document.getElementById("clearBtn");
const summarizeBtn = document.getElementById("summarizeBtn");
const errorMsg     = document.getElementById("errorMsg");
const loader       = document.getElementById("loader");
const loaderMsg    = document.getElementById("loaderMsg");
const resultCard   = document.getElementById("resultCard");
const summaryText  = document.getElementById("summaryText");
const qaMessages   = document.getElementById("qaMessages");
const qaInput      = document.getElementById("qaInput");
const askBtn       = document.getElementById("askBtn");
const gearBtn      = document.getElementById("gearBtn");
const settingsPanel = document.getElementById("settingsPanel");
const apiKeyInput  = document.getElementById("apiKeyInput");
const serverInput  = document.getElementById("serverInput");
const saveSettings = document.getElementById("saveSettings");

// ── Init: load saved settings ────────────────────────────────────────────
chrome.storage.sync.get(["groqApiKey", "serverUrl"], (data) => {
  if (data.groqApiKey) apiKeyInput.value = data.groqApiKey;
  serverInput.value = data.serverUrl || DEFAULT_SERVER;
});

// ── Settings panel toggle ─────────────────────────────────────────────────
gearBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
});

saveSettings.addEventListener("click", () => {
  chrome.storage.sync.set({
    groqApiKey: apiKeyInput.value.trim(),
    serverUrl:  serverInput.value.trim() || DEFAULT_SERVER,
  });
  settingsPanel.classList.remove("open");
  showInfo("Settings saved ✓");
});

// ── URL input handling ────────────────────────────────────────────────────
urlInput.addEventListener("input", () => {
  currentVideoUrl = urlInput.value.trim();
  summarizeBtn.disabled = !currentVideoUrl;
  hideError();
});

clearBtn.addEventListener("click", () => {
  urlInput.value      = "";
  currentVideoUrl     = "";
  currentVideoId      = "";
  summaryGenerated    = false;
  summarizeBtn.disabled = true;
  resultCard.classList.remove("show");
  loader.classList.remove("show");
  summaryText.innerHTML = "";
  qaMessages.innerHTML  = "";
  hideError();
});

// ── Auto-detect current tab ───────────────────────────────────────────────
detectBtn.addEventListener("click", async () => {
  detectBtn.textContent = "Detecting…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes("youtube.com")) {
    showError("No YouTube video found in the current tab.");
    detectBtn.textContent = "📺 Use current tab";
    return;
  }

  // Ask content script for the live URL (handles SPA navigation)
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_VIDEO_URL" });
    if (resp?.url) {
      urlInput.value  = resp.url;
      currentVideoUrl = resp.url;
      summarizeBtn.disabled = false;
      hideError();
    } else {
      showError("Open a YouTube watch page first, then try again.");
    }
  } catch {
    // Fallback: use the tab URL directly
    if (tab.url.includes("watch?") || tab.url.includes("/shorts/")) {
      urlInput.value  = tab.url;
      currentVideoUrl = tab.url;
      summarizeBtn.disabled = false;
      hideError();
    } else {
      showError("No YouTube video found in the current tab.");
    }
  }
  detectBtn.textContent = "📺 Use current tab";
});

// ── Summarize ─────────────────────────────────────────────────────────────
summarizeBtn.addEventListener("click", async () => {
  if (!currentVideoUrl) return;
  hideError();
  showLoader("Fetching transcript…");
  summarizeBtn.disabled = true;
  resultCard.classList.remove("show");

  const { serverUrl, groqApiKey } = await getSettings();

  try {
    loaderMsg.textContent = "Running RAG pipeline…";
    const res = await fetch(`${serverUrl}/summarize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        video_url:    currentVideoUrl,
        groq_api_key: groqApiKey || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    currentVideoId   = data.video_id;
    summaryGenerated = true;

    summaryText.innerHTML = formatText(data.summary);
    resultCard.classList.add("show");
    switchTab("summary");
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoader();
    summarizeBtn.disabled = false;
  }
});

// ── Q&A ───────────────────────────────────────────────────────────────────
askBtn.addEventListener("click", () => sendQuestion());
qaInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendQuestion(); });

async function sendQuestion() {
  const q = qaInput.value.trim();
  if (!q || !currentVideoId) return;

  appendBubble("user", q);
  qaInput.value = "";
  askBtn.disabled = true;

  const { serverUrl, groqApiKey } = await getSettings();

  try {
    const res = await fetch(`${serverUrl}/ask`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        video_url:    currentVideoUrl,
        question:     q,
        groq_api_key: groqApiKey || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    appendBubble("ai", data.answer);
  } catch (e) {
    appendBubble("ai", `⚠️ ${e.message}`);
  } finally {
    askBtn.disabled = false;
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name)
  );
  document.querySelectorAll(".tab-pane").forEach((p) =>
    p.classList.toggle("active", p.id === `tab-${name}`)
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function showLoader(msg = "Working…") {
  loaderMsg.textContent = msg;
  loader.classList.add("show");
}
function hideLoader() { loader.classList.remove("show"); }

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("show");
}
function hideError() { errorMsg.classList.remove("show"); }

function showInfo(msg) {
  errorMsg.style.background = "#0f2a1a";
  errorMsg.style.borderColor = "#1a5a2a";
  errorMsg.style.color = "#4ade80";
  errorMsg.textContent = msg;
  errorMsg.classList.add("show");
  setTimeout(() => {
    hideError();
    errorMsg.style = "";
  }, 2000);
}

function appendBubble(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `qa-bubble ${role}`;
  const label = document.createElement("div");
  label.className = "qa-label";
  label.textContent = role === "user" ? "You" : "AI";
  const content = document.createElement("div");
  content.innerHTML = formatText(text);
  wrap.appendChild(label);
  wrap.appendChild(content);
  qaMessages.appendChild(wrap);
  qaMessages.scrollTop = qaMessages.scrollHeight;
}

function formatText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

async function getSettings() {
  return new Promise((res) =>
    chrome.storage.sync.get(["groqApiKey", "serverUrl"], (d) =>
      res({ groqApiKey: d.groqApiKey || "", serverUrl: d.serverUrl || DEFAULT_SERVER })
    )
  );
}
