import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

const DEFAULT_STATE = { version: 1, items: [], prompt_blocks: [] };
const MAX = { image: 9, video: 3, audio: 3, total: 12 };
const REPOSITORY_URL = "https://github.com/darksidewalker/ComfyUI-DaSiWa-Nodes/blob/main/docs/minimax_h3_director.md";
const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "heic", "heif", "jpeg", "jpg", "jxl", "png", "tif", "tiff", "webp"]);
const VIDEO_EXTENSIONS = new Set(["3gp", "avi", "flv", "m2ts", "m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "mts", "ts", "webm", "wmv"]);
const AUDIO_EXTENSIONS = new Set(["aac", "aif", "aiff", "alac", "amr", "ape", "caf", "flac", "m4a", "mka", "mp3", "oga", "ogg", "opus", "wav", "weba", "wma"]);
let cssInstalled = false;

function installStyles() {
  if (cssInstalled) return;
  cssInstalled = true;
  const style = document.createElement("style");
  style.textContent = `
    .ds-h3{box-sizing:border-box;width:100%;min-width:0;min-height:650px;align-self:stretch;background:transparent;border:0;border-radius:0;padding:0;font:12px system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;overflow:visible}
    .ds-h3 button{background:#202b35;color:#dbe7f0;border:1px solid #40515e;border-radius:4px;padding:4px 7px;cursor:pointer}.ds-h3 button:hover{background:#2c3c49}.ds-h3-lane-add{position:absolute;right:6px;z-index:3;width:22px;height:22px;padding:0!important;border-radius:50%!important;font-size:17px;line-height:18px;background:rgba(70,150,105,.3)!important;border-color:rgba(126,210,157,.75)!important;color:#bff3d0!important}
    .ds-h3-toolbar,.ds-h3-row,.ds-h3-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.ds-h3-toolbar{justify-content:space-between;padding:2px 0 4px}.ds-h3-title{font-weight:600;color:#fff}.ds-h3-mode{background:rgba(112,62,180,.42)!important;border-color:rgba(177,128,255,.8)!important;box-shadow:0 0 8px rgba(151,91,255,.55);color:#fff!important;font-weight:700}.ds-h3-drop{border:1px dashed #587084;border-radius:5px;padding:12px;text-align:center;color:#9fb3c2}.ds-h3-drop.over{background:#263845;border-color:#8dd7ff}.ds-h3-list{display:flex;flex-direction:column;gap:4px}.ds-h3-item{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:6px;align-items:center;border:1px solid #344452;border-radius:4px;padding:4px}.ds-h3-item.selected{border-color:#73c7ef;background:#1b2933}.ds-h3-item img,.ds-h3-item video{width:50px;height:38px;object-fit:cover;background:#090d11}.ds-h3-item audio{width:50px}.ds-h3-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds-h3-muted{color:#8fa3b2}.ds-h3-prompt{width:100%;min-height:88px;box-sizing:border-box;background:#0d1217;color:#e5eef4;border:1px solid #40515e;border-radius:4px;padding:7px;resize:vertical}.ds-h3-prompt-panel{width:100%;box-sizing:border-box;border:0;border-radius:0;padding:0;display:flex;flex-direction:column;gap:6px;background:transparent}.ds-h3-block{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:5px;align-items:start}.ds-h3-status{min-height:16px;color:#f3c67a}.ds-h3-info-field{box-sizing:border-box;min-height:28px;border:1px solid #40515e;border-radius:4px;padding:6px 7px;background:#0d1217}.ds-h3-status.error{color:#ff6f6f;font-weight:700}.ds-h3-danger{color:#ff9e9e}.ds-h3-small{font-size:11px;color:#9fb3c2}.ds-h3-ruler{position:relative;height:19px;color:#8fa3b2;font-size:10px;white-space:nowrap;overflow:hidden}.ds-h3-ruler span{position:absolute;top:1px;border-left:1px solid #587084;padding-left:2px;height:16px}.ds-h3-track{position:relative;min-height:238px;max-width:100%;overflow-x:auto;overflow-y:hidden;background:#0b1015;border:1px solid #344452;border-radius:5px;padding:7px 6px 6px}.ds-h3-track::before{content:none}.ds-h3-track-inner{position:relative;min-width:100%;height:204px;overflow:visible;background:repeating-linear-gradient(90deg,#111a21 0,#111a21 49px,#1b2933 50px)}.ds-h3-track-inner::after{content:'';position:absolute;left:var(--insert-x,-8px);top:0;height:204px;border-left:2px solid #f3c67a;pointer-events:none}.ds-h3-track-inner.over{outline:2px solid #8dd7ff;outline-offset:-2px}.ds-h3-timeline-lane{position:absolute;left:0;right:0;height:120px;box-sizing:border-box;border-bottom:1px solid #344452}.ds-h3-timeline-lane.visual{top:0;background:rgba(17,30,39,.72)}.ds-h3-timeline-lane.audio{top:120px;background:rgba(22,49,36,.55)}.ds-h3-timeline-lane.disabled{background:rgba(51,55,60,.72);filter:grayscale(1);cursor:not-allowed}.ds-h3-timeline-lane.disabled::after{content:"Not supported by the selected mode";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#a1a8ad;font-size:11px;font-weight:600;background:rgba(0,0,0,.35);pointer-events:none}.ds-h3-lane-label{position:absolute;left:5px;top:2px;color:#8fa3b2;font-size:10px;text-transform:uppercase;pointer-events:none;z-index:1}.ds-h3-grip{position:absolute;top:0;width:11px;height:100%;cursor:ew-resize;background:rgba(255,255,255,.22);z-index:4}.ds-h3-grip.left{left:0;border-right:1px solid rgba(255,255,255,.65)}.ds-h3-grip.right{right:0;border-left:1px solid rgba(255,255,255,.65)}.ds-h3-clip{position:absolute;top:18px;height:48px;min-width:64px;box-sizing:border-box;border:1px solid #73c7ef;border-radius:4px;background:#1b4558;color:#e5eef4;padding:6px 14px 19px;cursor:grab;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ds-h3-clip.image,.ds-h3-clip.video{min-width:112px!important;width:112px!important;height:112px;top:7px}.ds-h3-clip.audio{border-color:#7ecf9d;background:#254b38;top:7px;height:112px}.ds-h3-waveform{position:absolute;inset:22px 12px 20px;width:calc(100% - 24px);height:calc(100% - 42px);pointer-events:none;opacity:.9}.ds-h3-crop-readout{position:absolute;left:14px;right:14px;bottom:3px;font-size:10px;line-height:12px;color:#d9f5e2;background:rgba(0,0,0,.36);pointer-events:none;text-align:center;overflow:hidden;white-space:nowrap}.ds-h3-clip-close{position:absolute!important;right:2px;top:2px;width:18px;height:18px;padding:0!important;line-height:15px!important;font-size:16px;color:#fff!important;background:rgba(105,28,28,.9)!important;border-color:#f08080!important;z-index:5}.ds-h3-clip.video{border-color:#b887d8;background:#432e52}.ds-h3-clip.text{border-color:#83c98a;background:#27442d}
  `;
  style.textContent += `
    .ds-h3-docs{font-weight:700;min-width:26px;padding:4px 8px!important}.ds-h3-prompt-panel{min-height:120px;overflow:visible}.ds-h3-prompt-field{position:relative;flex:none;min-height:90px}.ds-h3-prompt-panel .ds-h3-prompt-field>.ds-h3-prompt{height:100%;min-height:0;padding-bottom:16px;resize:none}.ds-h3-prompt-field-resizer{position:absolute;bottom:0;left:0;width:100%;height:12px;cursor:ns-resize;display:flex;justify-content:center;align-items:flex-end;padding-bottom:4px;box-sizing:border-box;z-index:2;touch-action:none}.ds-h3-prompt-field-resizer::after{content:"";width:40px;height:4px;background:rgba(255,255,255,.16);border-radius:2px}.ds-h3-prompt-field-resizer:hover::after,.ds-h3-prompt-field-resizer.active::after{background:rgba(141,215,255,.8)}
  `;
  document.head.appendChild(style);
}

function parseState(value) { try { const s = JSON.parse(value || "{}"); return { ...DEFAULT_STATE, ...s, items: Array.isArray(s.items) ? s.items : [], prompt_blocks: Array.isArray(s.prompt_blocks) ? s.prompt_blocks : [] }; } catch { return structuredClone(DEFAULT_STATE); } }
function viewUrl(path) { return api.apiURL(`/view?filename=${encodeURIComponent(path)}&type=input`); }
function count(state, type) { return state.items.filter(i => i.enabled !== false && i.type === type).length; }
function escapeText(text) { return String(text ?? ""); }
function idFor(type, n) { return `${type}-${Date.now()}-${n}`; }
function mediaTypeFor(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return AUDIO_EXTENSIONS.has(extension) ? "audio" : null;
}
function mediaLabel(item) {
  const name = String(item.value || "media").split("/").pop();
  const prompt = String(item.prompt || "").trim().replace(/\s+/g, " ");
  const promptPreview = prompt ? ` · “${prompt.slice(0, 42)}${prompt.length > 42 ? "…" : ""}”` : "";
  if (item.type === "image") return `${name}${promptPreview}`;
  const duration = Number(item.duration);
  const durationText = Number.isFinite(duration) ? ` · ${duration.toFixed(2)}s` : "";
  const trim = (item.type === "video" || item.type === "audio") && (Number(item.trim_start) > 0 || item.trim_end != null)
    ? ` · crop L ${Number(item.trim_start || 0).toFixed(2)}s / R ${item.trim_end == null ? "end" : `${Number(item.trim_end).toFixed(2)}s`}` : "";
  return `${name}${durationText}${trim}${promptPreview}`;
}

async function uploadFile(file, status) {
  const form = new FormData();
  form.append("image", file, file.name);
  form.append("type", "input");
  form.append("overwrite", "false");
  status.textContent = `Uploading ${file.name}…`;
  const response = await api.fetchApi("/upload/image", { method: "POST", body: form });
  if (!response.ok) throw new Error(`upload failed (${response.status})`);
  const result = await response.json();
  return result.subfolder ? `${result.subfolder}/${result.name}` : result.name;
}

function install(node) {
  if (node.__dasiwaH3Installed) return;
  node.__dasiwaH3Installed = true;
  installStyles();
  const dataWidget = node.widgets?.find(w => w.name === "timeline_data");
  if (!dataWidget) return;
  dataWidget.hidden = true; dataWidget.options = { ...(dataWidget.options || {}), hidden: true };
  dataWidget.draw = () => {}; dataWidget.computeSize = () => [0, -4];
  let state = parseState(dataWidget.value);
  const mode = () => node.widgets?.find(w => w.name === "mode")?.value || "FL2VA";
  const modeWidget = node.widgets?.find(w => w.name === "mode");
  if (modeWidget) { modeWidget.hidden = true; modeWidget.draw = () => {}; modeWidget.computeSize = () => [0, -4]; }
  const prompt = () => node.widgets?.find(w => w.name === "prompt");
  const promptWidget = prompt(); if (promptWidget) { promptWidget.hidden = true; promptWidget.draw = () => {}; promptWidget.computeSize = () => [0, -4]; }
  const status = document.createElement("div"); status.className = "ds-h3-status ds-h3-info-field"; status.textContent = "Info messages appear here.";
  const timeline = document.createElement("div"); timeline.className = "ds-h3 ds-h3-root"; timeline.tabIndex = 0;
  const setStatus = (message, isError = false) => { status.textContent = message; status.classList.toggle("error", isError); };
  const emit = () => { dataWidget.value = JSON.stringify(state); dataWidget.callback?.(dataWidget.value); node.graph?.setDirtyCanvas(true, true); };
  const syncAttachedPrompts = () => { const attached = state.items.filter(item => String(item.prompt || "").trim()).map((item, index) => ({ id: `attached-${item.id}`, text: String(item.prompt).trim(), enabled: item.enabled !== false, start: Number(item.start) || 0, duration: Number(item.duration) || 1, order: index })); if (attached.length || state.items.every(item => !item.prompt)) state.prompt_blocks = attached; };
  const mutate = fn => { fn(state); syncAttachedPrompts(); state.items.forEach((x, i) => { x.order = i; }); state.prompt_blocks.forEach((x, i) => { x.order = i; }); emit(); render(); };
  const activeItems = () => state.items.filter(x => x.enabled !== false);
  const ensureLayout = () => { let cursor = 0; state.items.forEach(item => { if (!Number.isFinite(item.start)) item.start = cursor; if (!Number.isFinite(item.duration)) item.duration = item.type === "image" ? 1 : 2; cursor = Math.max(cursor, item.start + item.duration + 0.25); }); };
  let insertAt = 0;
  let selectedId = null;
  let lastTimelineLength = null;
  let mediaPromptHeight = Math.max(90, Number(state.media_prompt_height) || 120);
  let globalPromptHeight = Math.max(90, Number(state.global_prompt_height) || 120);
  const hiddenLanes = new Set();
  let compactLanes = false;
  const addItem = item => mutate(s => { const start = Math.max(insertAt, ...s.items.map(x => (Number(x.start) || 0) + (Number(x.duration) || 1) + 0.25), 0); s.items.push({ id: idFor(item.type, s.items.length), enabled: true, order: s.items.length, start, duration: item.type === "image" ? 1 : 2, ...item }); insertAt = start; });
  const remove = id => mutate(s => { s.items = s.items.filter(x => x.id !== id); if (selectedId === id) selectedId = null; });
  timeline.addEventListener("keydown", event => { if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return; if ((event.key === "Delete" || event.key === "Backspace") && selectedId) { event.preventDefault(); event.stopPropagation(); remove(selectedId); } });
  const move = (id, delta) => mutate(s => { const i = s.items.findIndex(x => x.id === id); const j = i + delta; if (i >= 0 && j >= 0 && j < s.items.length) [s.items[i], s.items[j]] = [s.items[j], s.items[i]]; });
  const replace = (id, value) => mutate(s => { const x = s.items.find(i => i.id === id); if (x) x.value = value; });

  const addPath = type => { if (mode() === "FL2VA" && type !== "image") return; if (count(state, type) >= MAX[type] || activeItems().length >= MAX.total) { status.textContent = `Limit reached: ${MAX[type]} ${type}s / ${MAX.total} files.`; return; } fileInput.accept = type === "image" ? "image/*" : type === "video" ? "video/*" : "audio/*"; fileInput.click(); };
  const fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.multiple = true; fileInput.accept = "image/*,video/*,audio/*"; fileInput.hidden = true;
  fileInput.onchange = async () => { for (const file of fileInput.files || []) await acceptFile(file); fileInput.value = ""; };
  async function probeDuration(value, type) {
    if (type === "image") return null;
    const media = document.createElement(type === "video" ? "video" : "audio");
    media.preload = "metadata";
    media.src = viewUrl(value);
    return await new Promise(resolve => {
      const done = result => { media.remove(); resolve(Number.isFinite(result) ? result : null); };
      media.onloadedmetadata = () => done(media.duration);
      media.onerror = () => done(null);
    });
  }
  async function extractWaveform(value, id) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const response = await fetch(viewUrl(value));
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      const channel = buffer.getChannelData(0); const peakCount = 240; const step = Math.max(1, Math.floor(channel.length / peakCount)); const peaks = [];
      for (let index = 0; index < peakCount; index += 1) { let peak = 0; for (let sample = index * step; sample < Math.min(channel.length, (index + 1) * step); sample += 1) peak = Math.max(peak, Math.abs(channel[sample])); peaks.push(peak); }
      audioContext.close?.();
      mutate(s => { const item = s.items.find(x => x.id === id); if (item) item.waveform_peaks = peaks; });
    } catch (error) { console.warn("[MiniMax H3 Director] Audio waveform decode failed", error); }
  }
  async function acceptFile(file, targetLane = null) { const type = mediaTypeFor(file); const validLane = targetLane === "visual" ? type === "image" || type === "video" : targetLane === "audio" ? type === "audio" : true; const modeSupportsType = mode() !== "FL2VA" || type === "image"; if (!type || !validLane || !modeSupportsType) { const requirement = mode() === "FL2VA" ? "FL2VA supports image references only; video and audio are unavailable." : targetLane ? `Drop ${targetLane === "audio" ? "audio" : "image or video"} files on this lane.` : "This media type is not available in the selected MiniMax mode."; setStatus(requirement, true); return; } if (count(state, type) >= MAX[type] || activeItems().length >= MAX.total) { setStatus("MiniMax reference limit reached.", true); return; } try { const value = await uploadFile(file, status); const sourceDuration = await probeDuration(value, type); if (sourceDuration !== null && sourceDuration < 2) { setStatus(`${file.name}: MiniMax references must be at least 2 seconds.`, true); return; } const duration = sourceDuration === null ? null : Math.min(sourceDuration, 15); const item = { type, value, ...(duration !== null ? { duration, source_duration: sourceDuration } : {}), ...((type === "video" || type === "audio") ? { trim_start: 0, trim_end: duration } : {}) }; addItem(item); const added = state.items[state.items.length - 1]; if (type === "audio") void extractWaveform(value, added.id); setStatus(sourceDuration > 15 ? `${file.name} added; cropped to the first 15 seconds.` : `${file.name} added.`); } catch (error) { setStatus(error.message, true); } }
  const render = () => {
    timeline.replaceChildren();
    const selected = state.items.find(item => item.id === selectedId);
    const toolbar = document.createElement("div"); toolbar.className = "ds-h3-toolbar";
    const title = document.createElement("span"); title.className = "ds-h3-title"; title.textContent = "MiniMax H3 Director"; toolbar.append(title);
    const controls = document.createElement("span"); controls.className = "ds-h3-actions";
    const modeButton = document.createElement("button"); modeButton.className = "ds-h3-mode"; modeButton.textContent = `Mode: ${mode()} ↔`; modeButton.title = "Switch MiniMax H3 mode"; modeButton.onclick = () => { if (modeWidget) { modeWidget.value = mode() === "FL2VA" ? "REF2VA" : "FL2VA"; modeWidget.callback?.(modeWidget.value); } render(); }; const docsButton = document.createElement("button"); docsButton.className = "ds-h3-docs"; docsButton.textContent = "?"; docsButton.title = "Open MiniMax H3 Director documentation on GitHub"; docsButton.onclick = () => window.open(REPOSITORY_URL, "_blank", "noopener,noreferrer"); controls.append(modeButton, docsButton); if (selected) { const removeButton = document.createElement("button"); removeButton.className = "ds-h3-danger"; removeButton.textContent = "🗑 Remove"; removeButton.title = `Remove selected ${selected.type}`; removeButton.onclick = () => remove(selected.id); controls.append(removeButton); }
    const chooseFiles = accept => { fileInput.accept = accept; fileInput.click(); };
    toolbar.append(controls); timeline.append(toolbar);

    const lengthWidget = node.widgets?.find(w => w.name === "duration"); const timelineSeconds = Math.max(1, Number(lengthWidget?.value) || 5); lastTimelineLength = timelineSeconds;
    const hint = document.createElement("div"); hint.className = "ds-h3-small"; hint.textContent = mode() === "FL2VA" ? `FL2VA: ${timelineSeconds.toFixed(2)}s · zero, one, or two images. Timeline order determines First → Last.` : `REF2VA: ${timelineSeconds.toFixed(2)}s · ${count(state,"image")}/${MAX.image} images · ${count(state,"video")}/${MAX.video} videos · ${count(state,"audio")}/${MAX.audio} audio · ${activeItems().length}/${MAX.total} files`; timeline.append(hint);
    ensureLayout();
    const track = document.createElement("div"); track.className = "ds-h3-track"; track.addEventListener("pointerdown", () => timeline.focus());
    const trackInner = document.createElement("div"); trackInner.className = "ds-h3-track-inner";
    trackInner.onclick = event => { if (event.target !== trackInner) return; const rect = trackInner.getBoundingClientRect(); insertAt = Math.max(0, Math.round(((event.clientX - rect.left) / scale) * 4) / 4); status.textContent = `Insert cursor: ${insertAt.toFixed(2)}s · choose + image, + video, + audio, or + text.`; trackInner.style.setProperty("--insert-x", `${insertAt * scale}px`); };
    const laneTypes = ["Image/Video", "audio"]; const laneHeight = 120; const trackEntries = activeItems(); const audioEntries = trackEntries.filter(x => x.type === "audio"); let audioCursor = 0; const audioStarts = new Map(audioEntries.map(item => { const start = audioCursor; audioCursor += (Number(item.duration) || 1) + 0.25; return [item.id, start]; })); const maxEnd = timelineSeconds; const scale = 48; const acceptLaneDrop = async (event, targetLane) => { event.preventDefault(); event.stopPropagation(); trackInner.classList.remove("over"); const rect = trackInner.getBoundingClientRect(); insertAt = Math.max(0, Math.round(((event.clientX - rect.left) / scale) * 4) / 4); trackInner.style.setProperty("--insert-x", `${insertAt * scale}px`); for (const file of event.dataTransfer.files || []) await acceptFile(file, targetLane); }; trackInner.style.width = `${Math.max(240, maxEnd * scale)}px`; trackInner.style.height = `${laneTypes.length * laneHeight}px`; trackInner.style.background = `repeating-linear-gradient(0deg, transparent 0, transparent ${laneHeight - 1}px, #344452 ${laneHeight - 1}px, #344452 ${laneHeight}px), repeating-linear-gradient(90deg,#111a21 0,#111a21 49px,#1b2933 50px)`; const ruler = document.createElement("div"); ruler.className = "ds-h3-ruler"; for (let second = 0; second <= Math.ceil(maxEnd); second += 1) { const tick = document.createElement("span"); tick.textContent = `${second}s`; tick.style.left = `${second * scale}px`; ruler.append(tick); } track.append(ruler);
    const lanes = new Map(); laneTypes.forEach((type, index) => { const lane = document.createElement("div"); const targetLane = type === "audio" ? "audio" : "visual"; const supported = mode() !== "FL2VA" || targetLane === "visual"; lane.className = `ds-h3-timeline-lane ${targetLane}${supported ? "" : " disabled"}`; lane.style.top = `${index * laneHeight}px`; lane.ondragover = event => { if ([...event.dataTransfer.items].some(item => item.kind === "file")) { event.preventDefault(); if (supported) trackInner.classList.add("over"); } }; lane.ondragleave = () => trackInner.classList.remove("over"); lane.ondrop = event => { if (!supported) { event.preventDefault(); event.stopPropagation(); setStatus("FL2VA supports image references only; the audio lane is disabled.", true); return; } acceptLaneDrop(event, targetLane); }; const label = document.createElement("span"); label.className = "ds-h3-lane-label"; label.textContent = type; label.style.display = hiddenLanes.has(type) ? "none" : "block"; lane.append(label); trackInner.append(lane); lanes.set(type, lane); const add = document.createElement("button"); add.className = "ds-h3-lane-add"; add.textContent = "+"; add.title = supported ? (type === "audio" ? "Add audio" : "Add image or video") : "Audio is not supported by FL2VA"; add.style.top = `${19 + index * laneHeight + (laneHeight - 22) / 2}px`; add.disabled = !supported; add.onclick = () => chooseFiles(type === "audio" ? "audio/*" : "image/*,video/*"); track.append(add); });
    trackEntries.forEach(item => { const clip = document.createElement("div"); clip.className = `ds-h3-clip ${item.type} ${selectedId === item.id ? "selected" : ""}`; clip.textContent = mediaLabel(item); clip.title = item.type === "text" ? String(item.value || "") : String(item.value || ""); clip.style.display = "block"; if (item.type === "image") { clip.style.backgroundImage = `linear-gradient(90deg, rgba(20,35,45,.78), rgba(20,35,45,.5)), url("${viewUrl(item.value)}")`; clip.style.backgroundSize = "cover"; clip.style.backgroundPosition = "center"; } item.start = Number.isFinite(item.start) ? item.start : 0; item.duration = Number.isFinite(item.duration) ? item.duration : 1; const visualStart = item.type === "audio" ? audioStarts.get(item.id) : item.start; clip.style.left = `${visualStart * scale}px`; clip.style.top = "7px"; clip.style.width = `${item.type === "video" || item.type === "audio" ? 180 : Math.max(64, item.duration * scale)}px`; if (selectedId === item.id) { const close = document.createElement("button"); close.className = "ds-h3-clip-close"; close.textContent = "×"; close.title = `Remove selected ${item.type}`; close.onclick = event => { event.stopPropagation(); remove(item.id); }; clip.append(close); }
      const cropReadout = document.createElement("span"); cropReadout.className = "ds-h3-crop-readout"; if (item.type === "video" || item.type === "audio") { cropReadout.textContent = `crop ${Number(item.trim_start || 0).toFixed(2)}s–${item.trim_end == null ? "end" : Number(item.trim_end).toFixed(2) + "s"}`; clip.append(cropReadout); } if (item.type === "audio") { const peaks = Array.isArray(item.waveform_peaks) ? item.waveform_peaks : []; const waveform = document.createElement("canvas"); waveform.className = "ds-h3-waveform"; waveform.width = 360; waveform.height = 160; waveform.title = peaks.length ? "Audio waveform for the current crop" : "Decoding audio waveform…"; const context = waveform.getContext("2d"); const sourceDuration = Number(item.source_duration) || Number(item.duration) || 1; const cropStart = Number(item.trim_start) || 0; const cropEnd = Number(item.trim_end) || sourceDuration; if (context && peaks.length) { const center = waveform.height / 2; context.fillStyle = "rgba(126, 225, 157, .8)"; for (let x = 0; x < waveform.width; x += 1) { const ratio = x / waveform.width; const peakIndex = Math.min(peaks.length - 1, Math.floor(((cropStart + ratio * (cropEnd - cropStart)) / sourceDuration) * peaks.length)); const amplitude = peaks[peakIndex] * (waveform.height - 16) * .45; context.fillRect(x, center - amplitude, 1, amplitude * 2); } } clip.append(waveform); const audioIndex = state.items.filter(x => x.type === "audio").findIndex(x => x.id === item.id); const order = document.createElement("strong"); order.textContent = `${audioIndex + 1}.`; order.title = `Audio reference ${audioIndex + 1}`; order.style.marginRight = "5px"; clip.prepend(order); [["↑", -1], ["↓", 1]].forEach(([label, delta]) => { const b = document.createElement("button"); b.textContent = label; b.title = `Move audio ${delta < 0 ? "up" : "down"}`; b.style.position = "relative"; b.style.float = "right"; b.style.padding = "0 3px"; b.onclick = event => { event.stopPropagation(); move(item.id, delta); }; clip.append(b); }); }
      const resize = (edge, event) => { event.stopPropagation(); clip.setPointerCapture?.(event.pointerId); const origin = event.clientX; const start = item.start; const duration = item.duration; const sourceDuration = Number(item.source_duration) || duration; const onMove = moveEvent => { const delta = (moveEvent.clientX - origin) / scale; if (edge === "left") { if (item.type === "video" || item.type === "audio") { item.trim_start = Math.min(sourceDuration - 0.25, Math.max(0, Math.round(((Number(item.trim_start) || 0) + delta) * 4) / 4)); item.duration = Math.min(15, Math.max(0.25, Math.round((sourceDuration - item.trim_start) * 4) / 4)); item.trim_end = Math.min(sourceDuration, item.trim_start + item.duration); } else { const nextStart = Math.max(0, Math.round((start + delta) * 4) / 4); const end = start + duration; item.start = Math.min(nextStart, end - 0.25); item.duration = Math.max(0.25, Math.round((end - item.start) * 4) / 4); item.trim_start = item.start; } } else if (item.type === "video" || item.type === "audio") { item.duration = Math.min(15, sourceDuration - (Number(item.trim_start) || 0), Math.max(0.25, Math.round((duration + delta) * 4) / 4)); item.trim_end = Math.min(sourceDuration, (Number(item.trim_start) || 0) + item.duration); } else { item.duration = Math.max(0.25, Math.round((duration + delta) * 4) / 4); item.trim_end = item.start + item.duration; } if (item.type === "video" || item.type === "audio") { cropReadout.textContent = `crop ${Number(item.trim_start || 0).toFixed(2)}s–${Number(item.trim_end).toFixed(2)}s / ${sourceDuration.toFixed(2)}s`; setStatus(`${edge === "left" ? "Crop start" : "Crop end"}: ${cropReadout.textContent}`); } clip.style.left = `${visualStart * scale}px`; clip.style.width = `${item.type === "video" || item.type === "audio" ? 180 : Math.max(64, item.duration * scale)}px`; }; const onUp = () => { clip.removeEventListener("pointermove", onMove); clip.removeEventListener("pointerup", onUp); if (item._block) { item._block.start = item.start; item._block.duration = item.duration; } mutate(() => {}); }; clip.addEventListener("pointermove", onMove); clip.addEventListener("pointerup", onUp); };
      const leftGrip = document.createElement("span"); leftGrip.className = "ds-h3-grip left"; leftGrip.onpointerdown = event => resize("left", event); const rightGrip = document.createElement("span"); rightGrip.className = "ds-h3-grip right"; rightGrip.onpointerdown = event => resize("right", event); clip.append(leftGrip, rightGrip);
      clip.onclick = event => { if (event.target !== clip) return; selectedId = item.id; render(); }; clip.onpointerdown = event => { selectedId = item.id; if (item.type === "audio") return; if (event.target !== clip) return; event.stopPropagation(); clip.setPointerCapture?.(event.pointerId); const origin = event.clientX; const start = item.start; const onMove = moveEvent => { const next = Math.max(0, start + (moveEvent.clientX - origin) / scale); item.start = Math.round(next * 4) / 4; clip.style.left = `${item.start * scale}px`; }; const onUp = () => { clip.removeEventListener("pointermove", onMove); clip.removeEventListener("pointerup", onUp); mutate(() => {}); }; clip.addEventListener("pointermove", onMove); clip.addEventListener("pointerup", onUp); }; lanes.get(item.type === "audio" ? "audio" : "Image/Video").append(clip); }); track.append(trackInner); timeline.append(track);
    const promptPanel = document.createElement("div"); promptPanel.className = "ds-h3-prompt-panel";
    const selectedLabel = document.createElement("div"); selectedLabel.className = "ds-h3-small"; selectedLabel.textContent = selected && selected.type !== "audio" ? `Media prompt · ${selected.type} · ${String(selected.value || "").split("/").pop()}` : "Media prompt · select an image or video"; promptPanel.append(selectedLabel);
    const editor = document.createElement("textarea"); editor.className = "ds-h3-prompt"; editor.rows = 6; editor.style.display = "block"; editor.placeholder = "Select an image or video in the timeline to edit its prompt"; editor.value = selected?.type === "audio" ? "" : (selected?.prompt || ""); editor.disabled = !selected || selected.type === "audio"; allowNativeTextEditing(editor); editor.onchange = () => { if (!selected || selected.type === "audio") return; mutate(s => { const item = s.items.find(x => x.id === selected.id); if (item) item.prompt = editor.value; }); }; appendPromptField(promptPanel, editor, "media_prompt_height", () => mediaPromptHeight, value => { mediaPromptHeight = value; });

    const globalLabel = document.createElement("div"); globalLabel.className = "ds-h3-small"; globalLabel.textContent = "Global prompt"; promptPanel.append(globalLabel);
    const globalEditor = document.createElement("textarea"); globalEditor.className = "ds-h3-prompt"; globalEditor.rows = 6; globalEditor.style.display = "block"; globalEditor.placeholder = "Global prompt"; globalEditor.value = promptWidget?.value || ""; allowNativeTextEditing(globalEditor); globalEditor.onchange = () => { if (promptWidget) { promptWidget.value = globalEditor.value; promptWidget.callback?.(globalEditor.value); } }; appendPromptField(promptPanel, globalEditor, "global_prompt_height", () => globalPromptHeight, value => { globalPromptHeight = value; }); timeline.append(promptPanel);
    const list = document.createElement("div"); list.className = "ds-h3-list"; list.style.display = "none";
    activeItems().forEach((item, index) => { const row = document.createElement("div"); row.className = "ds-h3-item"; row.draggable = true; row.dataset.id = item.id; row.ondragstart = e => e.dataTransfer.setData("text/plain", item.id); row.ondragover = e => e.preventDefault(); row.ondrop = e => { const from = state.items.findIndex(x => x.id === e.dataTransfer.getData("text/plain")); const to = state.items.findIndex(x => x.id === item.id); if (from >= 0 && to >= 0) mutate(s => { const [x] = s.items.splice(from, 1); s.items.splice(to, 0, x); }); };
      const preview = item.type === "video" ? document.createElement("video") : item.type === "audio" ? document.createElement("audio") : document.createElement("img"); preview.src = viewUrl(item.value); if (item.type === "video") { preview.controls = true; preview.muted = true; } if (item.type === "audio") preview.controls = true;
      const middle = document.createElement("div"); const name = document.createElement("div"); name.className = "ds-h3-name"; name.textContent = `${item.type} ${index + 1}: ${item.value}`; middle.append(name); const promptArea = document.createElement("textarea"); promptArea.className = "ds-h3-prompt ds-h3-media-prompt"; promptArea.placeholder = `Prompt for this ${item.type}`; promptArea.value = item.prompt || ""; promptArea.onchange = () => mutate(s => { const x = s.items.find(i => i.id === item.id); if (x) x.prompt = promptArea.value; }); middle.append(promptArea); if (item.type === "video") { const trim = document.createElement("input"); trim.className = "ds-h3-prompt"; trim.placeholder = "trim start,end seconds"; trim.value = `${item.trim_start ?? 0},${item.trim_end ?? ""}`; trim.onchange = () => { const [a,b] = trim.value.split(",").map(x => x.trim()); mutate(s => { const x = s.items.find(i => i.id === item.id); if (x && Number.isFinite(Number(a)) && (!b || Number(b) > Number(a))) { x.trim_start = Number(a); x.trim_end = b ? Number(b) : null; } }); }; middle.append(trim); } if (item.type === "video" && item.audio) { const paired = document.createElement("div"); paired.className = "ds-h3-small"; paired.textContent = `soundtrack: ${item.audio}`; middle.append(paired); }
      const actions = document.createElement("div"); actions.className = "ds-h3-actions"; [["↑", () => move(item.id,-1)], ["↓", () => move(item.id,1)], ["replace", () => { const v = window.prompt("Replacement input path:", item.value); if (v?.trim()) replace(item.id, v.trim()); }], ["clear", () => remove(item.id)]].forEach(([label, fn]) => { const b = document.createElement("button"); b.textContent = label; b.onclick = fn; actions.append(b); }); if (mode() === "REF2VA" && item.type === "video") { const b = document.createElement("button"); b.textContent = item.audio ? "remove soundtrack" : "attach soundtrack"; b.onclick = () => { if (item.audio) mutate(s => { const x=s.items.find(i=>i.id===item.id); if(x){ x.audio=null; delete x.audio_duration; } }); else { const v=window.prompt("Soundtrack path relative to ComfyUI input:", ""); if(v?.trim()) mutate(s => { const x=s.items.find(i=>i.id===item.id); if(x) x.audio=v.trim(); }); } }; actions.append(b); } row.append(preview, middle, actions); list.append(row); }); timeline.append(list);
    // Prompt text is edited on the corresponding media row and synchronized to prompt_blocks.
    timeline.append(status); if (domWidget) domWidget.computeSize = () => [Math.max(420, node.size?.[0] || 520), uiHeight()];
  };
  const allowNativeTextEditing = element => {
    ["pointerdown", "mousedown", "keydown", "keypress", "keyup", "copy", "cut", "paste"].forEach(type => element.addEventListener(type, event => event.stopPropagation()));
  };
  const appendPromptField = (panel, editor, stateKey, getHeight, setHeight) => {
    const field = document.createElement("div");
    field.className = "ds-h3-prompt-field";
    field.style.height = `${getHeight()}px`;
    const resizer = document.createElement("div");
    resizer.className = "ds-h3-prompt-field-resizer";
    resizer.title = "Drag to resize this prompt field";
    resizer.setAttribute("role", "separator");
    resizer.setAttribute("aria-label", "Resize prompt field");
    resizer.addEventListener("mousedown", event => {
      event.preventDefault();
      event.stopPropagation();
      const startY = event.clientY;
      const startHeight = getHeight();
      resizer.classList.add("active");
      const drag = moveEvent => {
        if (moveEvent.buttons === 0) return finish();
        const height = Math.max(90, Math.min(640, startHeight + moveEvent.clientY - startY));
        setHeight(height);
        field.style.height = `${height}px`;
        syncNodeBounds();
      };
      const finish = () => {
        window.removeEventListener("mousemove", drag, true);
        window.removeEventListener("mouseup", finish, true);
        document.body.style.cursor = "default";
        resizer.classList.remove("active");
        state[stateKey] = getHeight();
        emit();
        syncNodeBounds();
      };
      document.body.style.cursor = "ns-resize";
      window.addEventListener("mousemove", drag, true);
      window.addEventListener("mouseup", finish, true);
    });
    field.append(editor, resizer);
    panel.append(field);
  };
  let domWidget;
  const uiHeight = () => Math.max(650, 400 + mediaPromptHeight + globalPromptHeight);
  const minimumNodeSize = [440, 680];
  let syncingNodeBounds = false;
  const syncNodeBounds = () => {
    if (syncingNodeBounds) return;
    const [currentWidth = minimumNodeSize[0], currentHeight = minimumNodeSize[1]] = node.size || [];
    const [contentWidth = minimumNodeSize[0], contentHeight = minimumNodeSize[1]] = node.computeSize?.() || [];
    const width = Math.max(minimumNodeSize[0], contentWidth, currentWidth);
    const height = Math.max(minimumNodeSize[1], uiHeight(), contentHeight, currentHeight);
    if (width !== currentWidth || height !== currentHeight) {
      syncingNodeBounds = true;
      node.setSize?.([width, height]);
      syncingNodeBounds = false;
    }
    timeline.style.width = `${Math.max(1, (node.size?.[0] || width) - 20)}px`;
    timeline.style.height = `${uiHeight()}px`;
  };
  if (node.addDOMWidget) {
    domWidget = node.addDOMWidget("minimax_h3_director_ui", "custom", timeline, { serialize: false, hideOnZoom: false, getHeight: () => uiHeight() });
    domWidget.computeSize = () => [Math.max(420, node.size?.[0] || 520), uiHeight()];
  }
  const oldResize = node.onResize;
  node.onResize = function (...args) { oldResize?.apply(this, args); syncNodeBounds(); };
  const restorePersistedState = () => {
    state = parseState(dataWidget.value);
    mediaPromptHeight = Math.max(90, Number(state.media_prompt_height) || 120);
    globalPromptHeight = Math.max(90, Number(state.global_prompt_height) || 120);
    selectedId = null;
    syncNodeBounds();
    render();
  };
  const oldConfigure = node.onConfigure;
  node.onConfigure = function (...args) {
    oldConfigure?.apply(this, args);
    requestAnimationFrame(restorePersistedState);
  };
  node.__dasiwaH3RestorePersistedState = () => requestAnimationFrame(restorePersistedState);
  node.__dasiwaH3State = () => state; node.__dasiwaH3Render = render;
  if (modeWidget) { const old = modeWidget.callback; modeWidget.callback = value => { old?.(value); render(); }; }
  const lengthWidget = node.widgets?.find(w => w.name === "duration");
  if (lengthWidget) { const old = lengthWidget.callback; lengthWidget.callback = value => { old?.(value); render(); }; }
  const oldDrawForeground = node.onDrawForeground;
  node.onDrawForeground = function (...args) { oldDrawForeground?.apply(this, args); const seconds = Math.max(1, Number(lengthWidget?.value) || 5); if (seconds !== lastTimelineLength) render(); };
  node.__dasiwaH3LengthPoll = window.setInterval(() => { const seconds = Math.max(1, Number(lengthWidget?.value) || 5); if (seconds !== lastTimelineLength) render(); }, 200);
  syncNodeBounds();
  requestAnimationFrame(syncNodeBounds);
  render();
}

app.registerExtension({ name: "DaSiWa.MiniMaxH3Director", nodeCreated(node) { if (node.comfyClass === "MiniMaxH3Director") install(node); }, loadedGraphNode(node) { if (node.comfyClass === "MiniMaxH3Director") { install(node); node.__dasiwaH3RestorePersistedState?.(); } } });
