# MiniMax H3 Director

The MiniMax H3 Director is a compact reference-and-prompt authoring layer for ComfyUI's native MiniMax H3 nodes. It keeps media, ordering, trims, per-reference descriptions, and the global prompt in one workflow node, validates H3 limits before execution, and hands the result to the installed native implementation rather than reimplementing conditioning or latent creation.

## What it adds

- One timeline UI for images, videos, audio, trims, ordering, endpoint frames, and reference prompts.
- `FL2VA` text/image-to-video: zero, one, or two images; one image is an endpoint, two define first/last frames.
- `REF2VA` reference-to-video: up to 9 images, 3 videos, 3 audio clips, 12 files total.
- Reference validation: video/audio clips are 2–15 seconds; visual and audio totals are each capped at 15 seconds; audio requires visual media.
- Deterministic prompt assembly from the global prompt plus enabled per-media prompt blocks.
- Safe input-path resolution under ComfyUI's input directory.
- Lazy model routing: only the selected FL2VA or REF2VA model is requested.
- Native compatibility: the Guide calls ComfyUI's installed `MiniMaxH3ImageToVideo` or `MiniMaxH3ReferenceToVideo` node.

## Installation and graph

Install the nodepack requirements, restart ComfyUI, and ensure the ComfyUI version includes native MiniMax H3 support:

```bash
pip install -r requirements.txt
```

Add **MiniMax H3 Director** and **MiniMax H3 Director Guide** from `DaSiWa Nodes/MiniMax H3`.

Connect:

1. Director `guide` → Guide `guide`.
2. The selected MiniMax H3 model, `CLIP`, and visual `VAE` → Guide.
3. Guide `positive` and `latent` → the native MiniMax H3 sampler/decoder path.
4. In `REF2VA`, connect the audio VAE to Guide `audio_vae`.

The Director's model outputs are optional lazy sockets: connect the FL2VA model for FL2VA, or the REF2VA model for REF2VA. The Guide refuses REF2VA without an audio VAE.

## Modes and reference usage

### FL2VA

Use for text-to-video, image-to-video, or first/last-frame generation. Select `FL2VA`, set width, height, duration, and prompt, then add zero, one, or two images. Timeline order is significant: the first image becomes the first endpoint and the second becomes the last endpoint. Video and audio files are rejected in this mode.

Conceptual mapping to MiniMax terminology:
- Zero images → pure text-to-video (T2VA).
- One image as first endpoint → first-frame conditioning (I2VA-style).
- Two images → first-and-last-frame interpolation (true FL2VA).

FL2VA requires a mandatory alignment instruction line as the very first line of the prompt when endpoint images are used. Write it before the core fields, followed by one blank line:

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

Replace `{duration}` with the Director `duration` value (e.g. `8.00` for 8 seconds). The endpoint images correspond to `Picture 1` and `Picture 2` in timeline order. The body field for FL2VA is always `integrated_multimodal_description`, not `detailed_description`.

### REF2VA

Use when the generation should borrow identity, appearance, motion, composition, or sound from references. Select `REF2VA`, then add images, videos, and/or audio in the timeline. A video may have a soundtrack attached; standalone audio is also supported. Keep at least one image or video when using audio. Use the trim grips to select the useful portion of a reference before queueing.

The backend loads uploaded media from ComfyUI's input directory, decodes images to `IMAGE`, audio to waveform/sample-rate dictionaries, and videos to 24-fps image batches. Paths are normalized and cannot escape the input directory.

## Dense prompting guide

MiniMax H3's published prompting format is closer to a compact multimodal screenplay than a keyword list. The official examples use an `integrated_multimodal_description` with numbered shots, explicit cut timestamps, stable reference labels, and separate sound fields. The Director accepts free-form text rather than generating the hosted Context-IR rewrite, so write the same structure directly in the global prompt when references or timing matter.

### Recommended H3 structure

For text-only FL2VA prompts (no endpoint images), use the three core fields directly:

```text
integrated_multimodal_description: [Shot 1] ... [Shot 2] At 00:04.500, ...

overall_soundscape: ...

non_diegetic_music: ...
```

When FL2VA uses endpoint images, prepend the alignment instruction line described above.

For REF2VA, use the full six-section rewrite format. Define assets first and keep labels stable throughout:

Label rules (from the official REF2VA guide):
- `<Subject N>`: reusable visible content abstracted from references (people, objects, scenes, clothing, styles, actions, poses). This is what actually appears in the target video.
- `<Picture N>`: ONLY when the image itself is a concrete frame anchor (opening frame, keyframe, last frame, storyboard reference). If an image only defines appearance/style, cite it inside `<Subject N>` and do NOT create a separate `<Picture N>` entry.
- `<Video N>`: whole-video structural roles only (editing source, continuation, temporal structure, cuts/rhythm). Specific people/actions/styles from a video still belong under `<Subject N>`.
- `<Audio N>`: copied or referenced audio signals (dialogue, music, ambience, voice timbre).

Corrected REF2VA template:
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

Summary task-type prefixes (choose all that apply, join with ` + `):
- `[keyframe completion]`: an image serves as a concrete first/key/last frame.
- `[reference generation]`: references provide guidance for subjects, style, motion, camera, etc.
- `[video editing]`: existing source video is directly modified.
- `[video continuation]`: new content extends from an existing source video.
- `[audio reuse]`: same audio signal reused in full or in part.
- `[audio reference]`: audio not copied directly; only timbre, style, rhythm, or content referenced.

Retention markers:
- Visual (`<Subject N>`, `<Picture N>`, `<Video N>`): `fully_preserved`, `partially_preserved`, `attribute_transfer`, `weak_reference`.
- Audio (`<Audio N>`): `fully_copy`, `partially_copy`, `reference`, `weak_reference`.

Number labels by Director timeline order: images first, then videos, then standalone audio; keep the same label meaning everywhere. A video soundtrack is only an `<Audio N>` reference when you explicitly want its sound used or referenced.

### Shots and timestamps

`[Shot 1]` starts without a timestamp. Every later shot begins at its cut time in `MM:SS.mmm`, for example `[Shot 2] At 00:04.500, the camera cuts to a close-up...`. Use timestamps for actual shot changes or important transitions, not for every sentence. Describe the state before the cut, the new framing, the action at that time, and any audio continuity. The timestamp is relative to the generated output timeline, so keep it inside the selected Director duration and align it with the media timeline when possible.

For a single continuous shot, use one `[Shot 1]` block and describe temporal changes inline: `At 00:03.000, the subject turns...`. For a reference clip, distinguish source timing from target timing: `At 00:05.000 in the target video, reproduce the hand gesture seen near 00:02.400 in <Video 1>`.

MiniMax's reference rewrite vocabulary can be used compactly: `fully_preserved`, `partially_preserved`, `attribute_transfer`, and `weak_reference` for visual content; `fully_copy`, `partially_copy`, `reference`, and `weak_reference` for audio. These labels clarify intent; they do not replace the actual visual description.

MiniMax H3 responds best to a short natural-language description of the visible subject, action, camera, timing, environment, and sound. Prefer concrete verbs and observable results over keyword piles. A reliable order is:

`subject + appearance/identity + action/change + setting + camera/framing + motion/tempo + lighting/style + audio/dialogue`

Write one compact paragraph. State what must remain stable, then describe the change. Use present tense for the scene and explicit temporal connectors: `starts with`, `then`, `as`, `while`, `ends with`. Describe camera movement separately from subject movement: `the camera slowly tracks left while she turns toward camera`. Specify shot size and lens intent when important: `medium close-up`, `wide establishing shot`, `low angle`, `shallow depth of field`. Avoid contradictory camera directions, vague adjectives, excessive style tags, and instructions about model internals.

Camera motion vocabulary (use as natural English within shots):
- Motion types: `Zoom In / Zoom Out`, `Push In / Pull Out`, `Pan Left / Pan Right`, `Truck Left / Truck Right`, `Tilt Up / Tilt Down`, `Pedestal Up / Pedestal Down`, `Arc Shot`, `Tracking Shot`, `Static Shot`, `Shake Slightly / Shake Strongly`, `POV`, `Roll Clockwise / Roll Counterclockwise`.
- Amplitude: `with small amplitude`, `with large amplitude`.
- Speed: `at slow speed`, `at fast speed`.
Examples:
- `The camera pushes in with small amplitude at slow speed toward her hands.`
- `The camera pans right with large amplitude at fast speed, revealing the open doorway.`
Omit amplitude and speed when medium/normal is intended.

Dialogue, speakers, and special tokens:
- Speaker IDs: assign `(S1)`, `(S2)` once by vocal appearance order in the target video; reuse consistently. Characters who never speak get no ID.
- Dialogue format: wrap exact spoken text in `<d>[Language] ...</d>`, preserving original language and punctuation verbatim. Example:
  - `The young woman with a quiet voice (S1) says: <d>[English] I get off at the next station.</d>`
- Voiceover: use phrase `says in an off-screen voiceover` and immediately state lips remain closed after the `<d>` block:
  - `... says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.`
- Cross-cut dialogue: when speech continues across a cut, use `<scenetrans>` at both sides and note continuity (`continues seamlessly across the cut`). Use `<cutoff>` when speech is truncated at video end.
- On-screen text: place visible signs/subtitles/neon text in English double quotes, preserving original characters exactly. Example: `A neon sign reading "营业中" glows above the doorway.`

### FL2VA prompt patterns

- Text-to-video: `A red fox crosses a snow-covered clearing at dawn, pauses beside a pine tree, then looks toward the camera. Slow low-angle tracking shot, soft blue morning light, visible breath, quiet wind and footsteps.`
- One endpoint image: describe the image as the starting state and the desired motion/change: `The person in the reference image remains recognizable as they walk from the doorway into warm afternoon light; the camera follows in a gentle handheld medium shot.`
- First/last frames: describe the transition explicitly: `Begin with the empty stage from the first frame. A dancer enters, spins beneath a spotlight, and end on the poised silhouette shown in the last frame. Smooth dolly forward, theatrical ambience.`

### REF2VA prompt patterns

Use each reference for one job and say what should be preserved or transferred. Include the reference label and, when useful, the target time or shot:

`<Subject 1> is the character from <Picture 1>. Use <Picture 2> for the room layout and <Video 1> for walking motion. At 00:00.000, begin from <Picture 1>; at 00:03.500, <Subject 1> walks toward the window using <Video 1>'s gesture rhythm. Keep identity and wardrobe consistent. <Audio 1> supplies the calm voice timbre for (S1).`

For multiple images, identify them by timeline order (`image 1`, `image 2`) and avoid repeating all visual details already present in the references. For video references, describe the desired transfer (`motion`, `timing`, `camera path`, or `gesture`) and what must not transfer. For audio, specify whether it is dialogue, ambience, music, or a performance and describe synchronization: `lips match the spoken sentence`, `footsteps land with the movement`, or `preserve the musical beat`.

### Prompting with per-media text

Use the global prompt for the shot's invariant intent. Add a short prompt to each image/video for its role, for example `character identity and red coat`, `use this clip's hand gesture timing`, or `use this room's architecture`. Enabled media prompts are assembled in deterministic timeline order after the global prompt. Do not write conflicting global and media instructions; use media prompts to assign reference responsibility, not to create unrelated scenes.

How Director fields become the final prompt:
- Global prompt (Director `prompt` input):
  - FL2VA: contains the optional alignment instruction line plus the three core fields (`integrated_multimodal_description`, `overall_soundscape`, `non_diegetic_music`).
  - REF2VA: should contain the full six sections (`subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music`).
- Per-media prompt blocks: short notes attached to individual timeline items describing that asset's responsibility. Only enabled blocks are included.
- Assembly order: the Guide concatenates:
  1. Global prompt
  2. Enabled per-media blocks sorted by their timeline position/order
This produces `resolved_prompt`, which is passed to the native MiniMax H3 node. Keep the heavy structure in the global prompt; use per-media blocks for concise role assignments tied to specific references.

### Negative constraints

MiniMax H3 is primarily guided through positive natural-language descriptions. Put essential constraints in the positive prompt: `single subject`, `static background`, `no camera shake`, `hands remain visible`, `dialogue is clearly audible`. Keep the list short and compatible with the requested action; contradictory negatives reduce reliability.

### Practical recipe

1. Choose FL2VA for endpoint/text generation; choose REF2VA for reference transfer.
2. Add only references that contribute a specific identity, appearance, motion, layout, or sound signal.
3. Trim videos/audio to the strongest 2–15 second segment and keep totals within the limits.
4. Write a global prompt in the order subject → action → camera → environment → audio.
5. Add one responsibility-focused prompt per important visual reference.
6. Check that duration, aspect ratio, and requested motion match the references; queue through the native MiniMax H3 sampler.

See the upstream MiniMax H3 documentation for canonical conventions:
- [Video Prompt Writing Guide (T2VA / I2VA / FL2VA / L2VA)](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md)
- [Full-Reference Mode Rewrite Output Format Guide](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md)
