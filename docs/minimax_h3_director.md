# MiniMax H3 Director

A timeline-based authoring node for ComfyUI's native MiniMax H3 models. It centralizes media management, ordering, trimming, per-reference prompts, and the global prompt into one workflow node, validates H3 constraints before execution, and routes everything to the installed native MiniMax H3 implementation — no duplicate backend logic.

## Changelog (latest additions)

Since the last GitHub release (August 2026):

- **Embedded video audio extraction:** videos can now supply their own audio reference. Select A or V+A on a video clip to decode its embedded audio track with the same trim range used for frames.
- **Per-video stream switch (V / A / V+A):** compact controls on each video tile let you treat it as Video only, Audio only, or Video+embedded-audio without adding separate audio slots.
- **Trim support for standalone audio:** audio clips now show a waveform preview and draggable left/right crop markers, behaving identically to video trimming.
- **Attached soundtrack trim alignment:** external soundtracks linked to a video share its trim window automatically.
- **Mode-switch safety:** toggling FL2VA ↔ REF2VA preserves incompatible references instead of deleting them; they reappear when you switch back.
- **Hardened video duration detection:** fallback to container-level duration when stream metadata is incomplete.

## Quick overview

- One node holds all your references, trims, ordering, endpoint frames, and prompts.
- Two modes: FL2VA (text/image endpoints) and REF2VA (multi-image/video/audio references).
- Two timeline lanes: Image/Video + Audio. Click a lane to select it; paste / drop media there.
- Per-video stream switch: choose Video only, Audio only, or Video+embedded-audio with identical trim ranges.
- Standalone audio clips can be trimmed with left/right handles just like video.
- Deterministic prompt assembly: global prompt + enabled per-media prompt blocks in timeline order.
- Only the selected FL2VA or REF2VA model is loaded; the Guide node calls ComfyUI's built-in H3 nodes.

## Installation and graph setup

Install dependencies and restart ComfyUI:

```bash
pip install -r requirements.txt
```

Ensure your ComfyUI version includes native MiniMax H3 support. Add these two nodes from `DaSiWa Nodes/MiniMax H3`:

1. **MiniMax H3 Director** — your timeline, references, and prompt editor.
2. **MiniMax H3 Director Guide** — validation and routing to native H3 nodes.

Wire them like this:

```text
┌──────────────────────┐
│ Model Loader         │     (MiniMax-H3 checkpoint)
│ CLIP Loader          │     (e.g. llama-3.2-11b-instruct.gguf)
│ VAE Loader           │     (visual VAE)
│ Audio VAE Loader     │     (only for REF2VA)
└───┬────────┬────────┬─┘
    │        │        │
    ▼        ▼        ▼
┌──────────────────────────────────────────────┐
│ DaSiWa MiniMax H3 Director                   │
│  - add/edit references                       │
│  - set trims, ordering, prompts              │
│  - emits structured "guide" dict             │
└────┬─────────────────────────────────────────┘
     │ guide
     ▼
┌──────────────────────────────────────────────┐
│ DaSiwa MiniMax H3 Director Guide             │
│  - validates director output                 │
│  - assembles final prompt                    │
│  - CALLS the native ComfyUI H3 nodes:        │
│      • MiniMaxH3ImageToVideo   (FL2VA)       │
│      • MiniMaxH3ReferenceToVideo (REF2VA)    │
│  - you NEVER wire those native nodes yourself│
└────┬─────────────────────────────────────────┘
     │ positive, latent
     ▼
┌──────────────────────────────────────────────┐
│ Standard ComfyUI sampling/decoding chain     │
│  - KSampler                                  │
│  - VAE Decode                                │
│  - Enhanced Video Combine / Image Save etc.  │
└──────────────────────────────────────────────┘
```

Connections detail:

- Director `guide` → Guide `guide`
- Selected MiniMax H3 model → Guide `model`
- `CLIP` → Guide `clip`
- Visual `VAE` → Guide `vae`
- In REF2VA: audio VAE → Guide `audio_vae`
- Guide outputs `positive` and `latent` → standard MiniMax H3 sampler/decoder chain

Important: the Guide node replaces and wraps ComfyUI's native `MiniMaxH3ImageToVideo` and `MiniMaxH3ReferenceToVideo` nodes. You do not add or wire those native nodes yourself — the Guide calls them internally based on the chosen mode.

The Director has optional model sockets (`fl2va_model`, `ref2va_model`) for lazy loading: connect whichever model matches your active mode. The Guide refuses REF2VA without an audio VAE connected.

## Modes at a glance

### FL2VA (First/Last Frame to Video)

Use for text-only generation, single-image starting frames, or first+last frame interpolation.

- Zero images → pure T2VA
- One image → first-frame conditioning (I2VA-style)
- Two images → first and last frame interpolation (true FL2VA)
- Up to 2 image slots; video/audio files are blocked in this mode.
- Endpoint images require an alignment instruction line as the very first line of the global prompt.

Alignment instruction patterns:

For one endpoint (first frame only):
```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: ...
```

For two endpoints (first and last frame):
```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the {duration}.00-second mark of the target video.

integrated_multimodal_description: ...
```

Replace `{duration}` with your Director duration setting (e.g. `8.00`). Images map left-to-right by slot order: first image = Picture 1, second = Picture 2. FL2VA always uses `integrated_multimodal_description`, not `detailed_description`.

### REF2VA (Reference to Video)

Use when you want the generated video to borrow identity, appearance, motion, composition, or sound from existing media.

- Up to 9 images, 3 videos, 3 audio clips, 12 files total.
- Each video clip offers three modes via small buttons on its clip tile:
  - **V** — Video only (frames as visual reference)
  - **A** — Audio only (extract embedded audio as reference; no video frames)
  - **V+A** — Video + embedded audio (both streams decoded with the same trim range)
- Standalone audio clips show a waveform preview and support left/right crop markers.
- Attach an external soundtrack file to any video; it shares the same trim window.
- Keep at least one image or video when using audio.

When a video provides audio (via A/V+A or attached soundtrack), that audio becomes `<Audio N>` in the reference numbering. Embedded audio and separate soundtracks share the same time crop as the host video frames.

## UI walkthrough: controls and buttons

Open the node and read top-to-bottom.

### Toolbar row

- **Title label:** "MiniMax H3 Director"
- **Mode button:** shows current mode (`FL2VA` or `REF2VA`). Click to toggle. When switching modes:
  - Going to FL2VA hides non-image references but keeps them in memory so they reappear when you switch back.
  - Going to REF2VA restores all previously added media.
- **? button:** opens the online documentation on GitHub.
- **Remove button:** appears when a clip is selected; deletes that item.
- **Clear button:** removes all media and prompts from the timeline.

### Timeline area

The main workspace has two horizontal lanes stacked vertically.

#### Lane selection

- Click anywhere on a lane to select it. The selected lane gets a highlight and displays "· selected".
- Selection determines where pasted media goes:
  - Select **Image/Video** lane, then Ctrl+V or drop files → images/videos land here.
  - Select **Audio** lane, then Ctrl+V or drop files → audio lands here.
- FL2VA disables the Audio lane entirely.

#### Adding media

Three ways:

1. **+ buttons:** each empty slot shows a "+"; click to open a file picker filtered for that lane type.
2. **Drag-and-drop:** drag files from your OS directly onto the desired lane.
3. **Paste:** select a lane, focus the node, press Ctrl+V with images/videos/audio on your clipboard.

Each uploaded file is stored in ComfyUI's `input/` directory and linked by relative path.

#### Clip tiles

Each media item renders as a labeled tile inside its lane.

Common elements:

- **Identity badge (top-left):** shows the MiniMax reference label used in prompts: `Picture 1`, `Video 2`, `Audio 1`, etc., assigned by type in timeline order.
- **Label text:** filename, duration, current crop range (for video/audio), and a truncated preview of the media prompt if present.
- **Selection outline:** click a tile to select it; enables the Remove button and populates the Media Prompt editor below.
- **Drag-to-reorder:** grab a tile and move it horizontally; dropping near another slot swaps positions.

Video-specific elements:

- **Stream selector (top-right):** three tiny buttons:
  - `V` — treat as video-only reference
  - `A` — extract and use only the embedded audio track
  - `V+A` — use both video frames and embedded audio
- **Crop markers:** vertical lines overlaid on the clip showing the selected start/end within the source. Drag these markers left/right to adjust which portion of the source is sent to MiniMax.
- **Crop readout:** displays current crop range vs source duration.

Audio-specific elements:

- **Waveform preview:** rendered canvas showing amplitude peaks across the entire source.
- **Crop markers:** same concept as video; drag to select the 2–15 second segment to use.

Images:

- No trimming; treated as single-frame anchors.

#### Removing/disabling items

- Click a tile then hit the toolbar **Remove** button, or press Delete/Backspace while a tile is selected.
- Items can also be disabled via the legacy list view (hidden by default).

### Prompt editors

Below the timeline are two resizable text areas.

#### Media Prompt (upper editor)

- Appears when an image or video clip is selected. Disabled (empty) when nothing is selected or when an audio clip is selected.
- Purpose: write a concise responsibility note for the selected reference, e.g.:
  - `"character identity and red coat"`
  - `"use this clip's hand gesture timing"`
  - `"room architecture and lighting"`
- These short blocks are appended after the global prompt during assembly, in timeline order.

#### Global Prompt (lower editor)

- Holds the main prompt structure for the whole generation.
- For FL2VA: contains the alignment instruction line(s) plus core fields (`integrated_multimodal_description`, `overall_soundscape`, `non_diegetic_music`).
- For REF2VA: should contain the six-section structure described in the prompting guide below.
- Both editors have a drag-handle bar at the bottom for resizing height. Your preferred heights persist in the workflow JSON.

## Limits and validation

MiniMax H3 enforces hard caps; the Director checks these before sending data downstream:

- Reference clip length: minimum 2 seconds, maximum 15 seconds each.
- Combined visual total: ≤ 15 seconds.
- Combined audio total: ≤ 15 seconds.
- Slot counts (REF2VA): max 9 images, 3 videos, 3 audio clips, 12 total files.
- FL2VA: max 2 images; no video/audio allowed.
- Path safety: all input paths resolve strictly under ComfyUI's input directory.

Violations appear as red status messages inside the node. Fix them before queuing.

## How processing flows: upstream and downstream

Understanding the data path makes wiring and debugging easier.

### Upstream inputs (what feeds into the Director)

- **width / height / duration** widgets: define output resolution and length.
- **Optional model sockets** (`fl2va_model`, `ref2va_model`): connect only the model matching your current mode; the Guide uses them lazily.
- All media is managed inside the node UI (upload/paste/drop), but paths ultimately live in ComfyUI's `input/` folder.

### Inside the Director

On queue, the Director executes this sequence:

1. Reads current mode (FL2VA or REF2VA).
2. Iterates over all enabled timeline items in slot order.
   - For FL2VA: keeps only image items (max 2); discards others temporarily.
   - For REF2VA: processes images, videos, and audio respecting slot limits.
3. Loads each asset:
   - Images → resized tensors.
   - Videos → decoded to 24 fps frame batches, cropped according to trim_start/trim_end.
   - Audio → decoded waveforms, cropped identically.
   - For videos in A or V+A mode → embedded audio is extracted using the same crop window.
   - Attached soundtracks → loaded and cropped using the host video's trim range.
4. Builds a structured `guide` dictionary containing:
   - Mode flag, dimensions, duration.
   - Ordered lists of images, videos, audios with metadata.
   - Endpoint frames (FL2VA).
   - Reference maps keyed as `ref_image_N`, `ref_video_N`, `ref_audio_N`, `ref_video_audio_N`.
   - Enabled per-media prompt blocks with their IDs and order.

This `guide` object is passed out as the sole data connection to the Guide node.

### The Guide node

The Guide is a thin adapter between your authored timeline and ComfyUI's native H3 nodes:

1. Validates the incoming `guide`:
   - Confirms mode consistency.
   - Checks that required models/CLIP/VAEs are connected.
   - For REF2VA, ensures an audio VAE exists.
2. Assembles the final prompt:
   - Starts with the global prompt from the Director.
   - Appends enabled per-media prompt blocks sorted by timeline position.
   - Writes the result as `resolved_prompt`.
3. Routes to the appropriate native node:
   - FL2VA → calls `MiniMaxH3ImageToVideo` with endpoint frames and prompt.
   - REF2VA → calls `MiniMaxH3ReferenceToVideo` with all reference maps and prompt.
4. Emits standard ComfyUI outputs:
   - `positive` (conditioning)
   - `latent` (image batch)
   - These feed downstream samplers and decoders exactly like any other H3 workflow.

You never call the native MiniMax H3 nodes directly when using Director+Guide; the Guide abstracts that away.

## Dense prompting guide

MiniMax H3 expects structured natural language rather than keyword piles. Use the official field names and shot/timestamp conventions.

### FL2VA prompt structure

Text-only (no endpoint images):
```text
integrated_multimodal_description: [Shot 1] ... [Shot 2] At 00:04.500, ...

overall_soundscape: ...

non_diegetic_music: ...
```

With endpoint images: prepend the alignment instruction line shown earlier, blank line, then the three fields above.

### REF2VA prompt structure

Use the six-section format. Define assets once and reuse labels consistently.

Label rules:
- `<Subject N>`: visible content abstracted from references (people, objects, scenes, clothing, actions). This is what actually appears.
- `<Picture N>`: ONLY for concrete frame anchors (opening/key/last frame, storyboard). If an image defines style/appearance only, cite it inside a Subject and don't create a Picture entry.
- `<Video N>`: structural roles only (editing source, continuation, pacing/cuts/rhythm). Specific subjects/actions/styles from a video belong under Subjects.
- `<Audio N>`: copied or referenced audio signals (dialogue, music, ambience, voice timbre).

Template:
```text
subject_definitions:
<Subject 1> is the woman in <Picture 1>, with short dark hair and a red coat.
<Picture 1> is the opening-frame anchor for [Shot 1].
<Subject 2> is the walking motion taken from <Video 1>.
<Video 1> provides the camera path and pacing structure.
<Audio 1> is the voice-timbre reference for <Subject 1> (S1).

summary:
[reference generation + audio reference] Use <Subject 1> from <Picture 1>, the motion and pacing of <Video 1>, and the voice character of <Audio 1>.

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - identity and clothing remain consistent.
<Picture 1> ([Shot 1] first frame): fully_preserved - opening composition anchor.
<Subject 2> (motion transferred to <Subject 1>): attribute_transfer - walk rhythm is applied to <Subject 1>.
<Video 1> (pacing structure): weak_reference - general timing and camera rhythm are retained.
<Audio 1>: reference - timbre and delivery are followed without copying the signal.

detailed_description: [Shot 1] ... [Shot 2] At 00:04.500, ...
overall_soundscape: ...
non_diegetic_music: ...
```

Summary task-type prefixes (combine with ` + `):
- `[keyframe completion]`, `[reference generation]`, `[video editing]`, `[video continuation]`, `[audio reuse]`, `[audio reference]`

Retention markers:
- Visual: `fully_preserved`, `partially_preserved`, `attribute_transfer`, `weak_reference`
- Audio: `fully_copy`, `partially_copy`, `reference`, `weak_reference`

Number labels by timeline order: images first (Pictures), then videos, then audio. Keep meanings stable everywhere.

### Shots and timestamps

- `[Shot 1]` starts without a timestamp. Later shots begin at cut times in `MM:SS.mmm`.
- Use timestamps for actual cuts or important transitions, not every sentence.
- Timestamps are relative to the generated output timeline; keep them within your duration and align with media timeline when relevant.
- Single continuous shot: one `[Shot 1]` block, describe temporal changes inline.
- Distinguish source vs target timing for references: `At 00:05.000 in the target video, reproduce the hand gesture seen near 00:02.400 in <Video 1>`.

### Camera motion vocabulary

Use as natural English inside shots:
- Types: Zoom/Push/Pan/Truck/Tilt/Pedestal/Arc/Tracking/Shake/POV/Roll
- Amplitude: `with small/large amplitude`
- Speed: `at slow/fast speed`

Example: `The camera pushes in with small amplitude at slow speed toward her hands.`

### Dialogue and special tokens

- Speaker IDs: `(S1)`, `(S2)` by vocal appearance order; reuse consistently.
- Exact dialogue: `<d>[Language] ...</d>` preserving original language/punctuation.
- Voiceover: say `in an off-screen voiceover` and specify lips remain closed after the tag.
- Cross-cut speech: `<scenetrans>` at both sides; `<cutoff>` when truncated.
- On-screen text: double-quote in English, preserve original characters exactly.

### Practical workflow

1. Choose FL2VA for endpoint/text work; REF2VA for multi-reference transfer.
2. Add only references that contribute specific identity, motion, layout, or sound.
3. Trim videos/audio to the strongest 2–15s segments; respect totals.
4. Write the global prompt in subject → action → camera → environment → audio order.
5. Add one-line responsibility notes as media prompts for key references.
6. Verify duration, aspect ratio, and motion match your references; queue through the Guide.

Official MiniMax H3 guides (canonical conventions):
- [Video Prompt Writing Guide](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md)
- [Full-Reference Rewrite Format Guide](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md)
