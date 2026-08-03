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

### REF2VA

Use when the generation should borrow identity, appearance, motion, composition, or sound from references. Select `REF2VA`, then add images, videos, and/or audio in the timeline. A video may have a soundtrack attached; standalone audio is also supported. Keep at least one image or video when using audio. Use the trim grips to select the useful portion of a reference before queueing.

The backend loads uploaded media from ComfyUI's input directory, decodes images to `IMAGE`, audio to waveform/sample-rate dictionaries, and videos to 24-fps image batches. Paths are normalized and cannot escape the input directory.

## Dense prompting guide

MiniMax H3's published prompting format is closer to a compact multimodal screenplay than a keyword list. The official examples use an `integrated_multimodal_description` with numbered shots, explicit cut timestamps, stable reference labels, and separate sound fields. The Director accepts free-form text rather than generating the hosted Context-IR rewrite, so write the same structure directly in the global prompt when references or timing matter.

### Recommended H3 structure

For text-only or FL2VA prompts, use:

```text
integrated_multimodal_description: [Shot 1] ... [Shot 2] At 00:04.500, ...
overall_soundscape: ...
non_diegetic_music: ...
```

For REF2VA, define the assets first and keep labels stable throughout the prompt:

```text
subject_definitions:
<Subject 1> is the woman from <Picture 1>, with short dark hair and a red coat.
<Picture 1> is the opening-frame anchor for [Shot 1].
<Video 1> supplies the walking motion and camera rhythm.
<Audio 1> is the spoken voice reference for <Subject 1> (S1).

summary: [reference generation + audio reference] Use <Subject 1> from <Picture 1>,
the motion of <Video 1>, and the voice character of <Audio 1>.

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - identity and clothing remain consistent.
<Picture 1> ([Shot 1] first frame): fully_preserved - opening composition anchor.
<Video 1> (walking motion): attribute_transfer - motion is applied to <Subject 1>.
<Audio 1>: reference - timbre and delivery are followed without copying the signal.

detailed_description: [Shot 1] ... [Shot 2] At 00:04.500, ...
overall_soundscape: ...
non_diegetic_music: ...
```

Use `<Subject N>` for reusable people, objects, environments, actions, or styles; `<Picture N>` for a concrete first/key/last frame or composition anchor; `<Video N>` for an edited, continued, or temporally referenced source clip; and `<Audio N>` for copied or stylistically referenced sound. Number labels by the Director timeline order: images first, then videos, then standalone audio; keep the same label meaning everywhere. A video soundtrack is only an `<Audio N>` reference when you explicitly want its sound used or referenced.

### Shots and timestamps

`[Shot 1]` starts without a timestamp. Every later shot begins at its cut time in `MM:SS.mmm`, for example `[Shot 2] At 00:04.500, the camera cuts to a close-up...`. Use timestamps for actual shot changes or important transitions, not for every sentence. Describe the state before the cut, the new framing, the action at that time, and any audio continuity. The timestamp is relative to the generated output timeline, so keep it inside the selected Director duration and align it with the media timeline when possible.

For a single continuous shot, use one `[Shot 1]` block and describe temporal changes inline: `At 00:03.000, the subject turns...`. For a reference clip, distinguish source timing from target timing: `At 00:05.000 in the target video, reproduce the hand gesture seen near 00:02.400 in <Video 1>`.

MiniMax's reference rewrite vocabulary can be used compactly: `fully_preserved`, `partially_preserved`, `attribute_transfer`, and `weak_reference` for visual content; `fully_copy`, `partially_copy`, `reference`, and `weak_reference` for audio. These labels clarify intent; they do not replace the actual visual description.

MiniMax H3 responds best to a short natural-language description of the visible subject, action, camera, timing, environment, and sound. Prefer concrete verbs and observable results over keyword piles. A reliable order is:

`subject + appearance/identity + action/change + setting + camera/framing + motion/tempo + lighting/style + audio/dialogue`

Write one compact paragraph. State what must remain stable, then describe the change. Use present tense for the scene and explicit temporal connectors: `starts with`, `then`, `as`, `while`, `ends with`. Describe camera movement separately from subject movement: `the camera slowly tracks left while she turns toward camera`. Specify shot size and lens intent when important: `medium close-up`, `wide establishing shot`, `low angle`, `shallow depth of field`. Avoid contradictory camera directions, vague adjectives, excessive style tags, and instructions about model internals.

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

### Negative constraints

MiniMax H3 is primarily guided through positive natural-language descriptions. Put essential constraints in the positive prompt: `single subject`, `static background`, `no camera shake`, `hands remain visible`, `dialogue is clearly audible`. Keep the list short and compatible with the requested action; contradictory negatives reduce reliability.

### Practical recipe

1. Choose FL2VA for endpoint/text generation; choose REF2VA for reference transfer.
2. Add only references that contribute a specific identity, appearance, motion, layout, or sound signal.
3. Trim videos/audio to the strongest 2–15 second segment and keep totals within the limits.
4. Write a global prompt in the order subject → action → camera → environment → audio.
5. Add one responsibility-focused prompt per important visual reference.
6. Check that duration, aspect ratio, and requested motion match the references; queue through the native MiniMax H3 sampler.

See the [fal.ai MiniMax H3 prompting guide](https://fal.ai/learn/devs/minimax-h3-prompting-guide) and the [MiniMax H3 ModelScope prompt-writing references](https://modelscope.cn/models/MiniMax/MiniMax-H3) for the upstream multimodal, shot, reference-label, and timestamp conventions.
