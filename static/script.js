const state = {
  mode: "browse",
  steps: [],
  index: -1,
  playing: false,
  timer: null,
  logs: []
};

const $ = (id) => document.getElementById(id);

function addLog(message) {
  const time = new Date().toLocaleTimeString([], {hour12:false});
  state.logs.push({time, message});
  const log = $("activityLog");
  if (state.logs.length === 1) log.innerHTML = "";
  log.innerHTML = state.logs.slice(-30).map(x =>
    `<div class="log-entry"><span class="log-time">${x.time}</span>${escapeHtml(x.message)}</div>`
  ).join("");
  log.scrollTop = log.scrollHeight;
  $("logCount").textContent = `${state.logs.length} event${state.logs.length === 1 ? "" : "s"}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function setStatus(text) {
  $("activityStatus").textContent = text;
}

function resetVisualizer() {
  stopAuto();
  state.steps = [];
  state.index = -1;
  $("flowName").textContent = "No activity selected";
  $("stepCounter").textContent = "0 / 0";
  $("protocolBadge").textContent = "READY";
  $("timelineText").textContent = "Ready";
  $("progressBar").style.width = "0%";
  $("progressText").textContent = "0%";
  $("messageTitle").textContent = "Waiting for an activity";
  $("messageDescription").textContent = "Choose Browsing, Mail, or Streaming from the Activity Panel.";
  $("protocolMessage").textContent = "Protocol messages will appear here.";
  $("messageProtocol").textContent = "—";
  $("directionLabel").textContent = "—";
  $("fieldList").innerHTML = "";
  $("timeline").innerHTML = "";
  $("serverName").textContent = "SERVER";
}

function renderTimeline() {
  $("timeline").innerHTML = state.steps.map((_, i) =>
    `<div class="timeline-step ${i < state.index ? "done" : ""} ${i === state.index ? "active" : ""}" data-i="${i}"></div>`
  ).join("");
  document.querySelectorAll(".timeline-step").forEach(el => {
    el.addEventListener("click", () => showStep(Number(el.dataset.i)));
  });
}

function animatePacket(direction) {
  const arrow = $("packetArrow");
  arrow.className = "packet-arrow";
  void arrow.offsetWidth;
  arrow.classList.add(direction === "client-server" ? "animate-right" : "left", direction === "client-server" ? "" : "animate-left");
}

function showStep(index) {
  if (!state.steps.length) return;
  state.index = Math.max(0, Math.min(index, state.steps.length - 1));
  const step = state.steps[state.index];

  $("flowName").textContent = `${step.activityName || state.modeLabel || ""}${step.activityName ? "" : ""}`;
  $("stepCounter").textContent = `${state.index + 1} / ${state.steps.length}`;
  $("protocolBadge").textContent = step.type;
  $("messageProtocol").textContent = step.type;
  $("messageTitle").textContent = step.title;
  $("messageDescription").textContent = step.description;
  $("protocolMessage").textContent = step.message;
  $("directionLabel").textContent = step.direction === "client-server" ? "CLIENT → SERVER" : "SERVER → CLIENT";
  $("fieldList").innerHTML = (step.fields || []).map(f => `<span class="field">${escapeHtml(f)}</span>`).join("");
  $("timelineText").textContent = `${step.title} · ${state.index + 1} of ${state.steps.length}`;

  const percent = Math.round(((state.index + 1) / state.steps.length) * 100);
  $("progressBar").style.width = `${percent}%`;
  $("progressText").textContent = `${percent}%`;

  renderTimeline();
  animatePacket(step.direction);

  if (state.index === state.steps.length - 1) {
    setStatus("Activity completed");
  } else {
    const next = state.steps[state.index + 1];
    setStatus(`Step ${state.index + 1}: ${next ? "Processing next protocol message" : "Processing"}`);
  }
}

function loadFlow(data) {
  stopAuto();
  state.steps = data.steps.map(s => ({...s, activityName: data.activity}));
  state.index = 0;
  state.modeLabel = data.activity;
  $("flowName").textContent = data.activity;
  $("serverName").textContent = data.activity === "Mail" ? "MAIL SERVER" :
                                data.activity === "Streaming" ? "STREAM SERVER" : "WEB SERVER";
  renderTimeline();
  showStep(0);
}

function playAuto() {
  if (!state.steps.length) return;
  if (state.playing) return;
  state.playing = true;
  $("autoPlayBtn").textContent = "▶ Playing";
  const tick = () => {
    if (!state.playing) return;
    if (state.index >= state.steps.length - 1) {
      stopAuto();
      setStatus("Activity completed");
      return;
    }
    showStep(state.index + 1);
    state.timer = setTimeout(tick, 1500);
  };
  state.timer = setTimeout(tick, 1500);
}

function stopAuto() {
  state.playing = false;
  clearTimeout(state.timer);
  state.timer = null;
  $("autoPlayBtn").textContent = "▶ Play";
}

function showMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".activity-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  $("browseForm").classList.toggle("hidden", mode !== "browse");
  $("mailForm").classList.toggle("hidden", mode !== "mail");
  $("streamForm").classList.toggle("hidden", mode !== "stream");
  setStatus(`Ready for ${mode === "browse" ? "browsing" : mode === "mail" ? "mail" : "streaming"}`);
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

async function browse() {
  const url = $("urlInput").value.trim();
  if (!url) { setStatus("Please enter a URL"); return; }
  try {
    setStatus("Resolving DNS…");
    addLog("Browsing activity started");
    addLog("DNS query generated");
    const data = await postJSON("/api/browse", {url});
    addLog("DNS response received");
    setStatus("Requesting webpage…");
    addLog("HTTP GET generated");
    loadFlow(data);
    setTimeout(() => {
      addLog("HTTP 200 OK received");
      setStatus("Page loaded");
    }, 1550 * 3);
    playAuto();
  } catch (e) {
    setStatus(`Error: ${e.message}`);
    addLog(`Error: ${e.message}`);
  }
}

async function sendMail() {
  const to = $("mailTo").value.trim();
  const subject = $("mailSubject").value.trim();
  const body = $("mailBody").value.trim();
  if (!to || !subject || !body) {
    setStatus("Please complete To, Subject and Body");
    return;
  }
  try {
    setStatus("Opening SMTP conversation…");
    addLog("Mail activity started");
    const data = await postJSON("/api/mail", {to, subject, body});
    loadFlow(data);
    addLog("SMTP EHLO generated");
    playAuto();
  } catch (e) {
    setStatus(`Error: ${e.message}`);
    addLog(`Error: ${e.message}`);
  }
}

async function startStream() {
  try {
    const quality = $("qualitySelect").value;
    setStatus(`Starting ${quality} stream…`);
    addLog(`Streaming started at ${quality}`);
    const data = await postJSON("/api/stream", {quality});
    loadFlow(data);
    addLog("DNS query generated for streaming host");
    playAuto();
  } catch (e) {
    setStatus(`Error: ${e.message}`);
    addLog(`Error: ${e.message}`);
  }
}

$("visitBtn").addEventListener("click", browse);
$("sendBtn").addEventListener("click", sendMail);
$("playStreamBtn").addEventListener("click", startStream);
$("pauseStreamBtn").addEventListener("click", stopAuto);
$("qualitySelect").addEventListener("change", () => {
  addLog(`Streaming quality changed to ${$("qualitySelect").value}`);
  if (state.mode === "stream") setStatus(`Quality set to ${$("qualitySelect").value}`);
});

document.querySelectorAll(".activity-tab").forEach(btn => btn.addEventListener("click", () => showMode(btn.dataset.mode)));

$("autoPlayBtn").addEventListener("click", playAuto);
$("pauseBtn").addEventListener("click", () => {
  stopAuto();
  setStatus("Visualization paused");
});
$("nextBtn").addEventListener("click", () => {
  stopAuto();
  if (state.steps.length) showStep(state.index + 1);
});
$("prevBtn").addEventListener("click", () => {
  stopAuto();
  if (state.steps.length) showStep(state.index - 1);
});
$("replayBtn").addEventListener("click", () => {
  if (!state.steps.length) return;
  stopAuto();
  showStep(0);
  addLog("Protocol visualization replayed");
  playAuto();
});
$("resetBtn").addEventListener("click", () => {
  state.logs = [];
  $("activityLog").innerHTML = '<div class="empty-log">Perform an activity to start the log.</div>';
  $("logCount").textContent = "0 events";
  setStatus("Ready");
  resetVisualizer();
});

showMode("browse");
resetVisualizer();
