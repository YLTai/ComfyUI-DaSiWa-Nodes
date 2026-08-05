# MiniMax H3 Prompt Builder Helper
"""
Pure contracts for MiniMax H3 prompt building. Adapted from ComfyUI-Fantastic-MiniMaxH3-PromptBuilder.
"""

# Mode definitions
MODES = ["T2VA", "I2VA", "FL2VA", "L2VA", "REF2VA"]

# Capacity per mode
MODE_CAPACITY = {
    "T2VA": {"Picture": 0, "Video": 0, "Audio": 0},
    "I2VA": {"Picture": 1, "Video": 0, "Audio": 0},
    "FL2VA": {"Picture": 2, "Video": 0, "Audio": 0},
    "L2VA": {"Picture": 1, "Video": 0, "Audio": 0},
    "REF2VA": {"Picture": 9, "Video": 3, "Audio": 3, "total": 12},
}

# Standard task and marker lists
TASK_TYPES = [
    "keyframe completion",
    "reference generation",
    "video editing",
    "video continuation",
    "audio reuse",
    "audio reference",
]

VISUAL_MARKERS = [
    "fully_preserved",
    "partially_preserved",
    "attribute_transfer",
    "weak_reference",
]
AUDIO_MARKERS = ["fully_copy", "partially_copy", "reference", "weak_reference"]


def align_frame_count(n: int) -> int:
    """Snap frame count to 17k+5 grid."""
    n = max(5, n)
    while n % 17 != 5:
        n += 1
    return n


def snapped_seconds(seconds: float) -> float:
    """Frame-aligned duration in seconds."""
    frames = align_frame_count(int(seconds * 24))
    return frames / 24.0


def fmt_ss(seconds: float) -> str:
    """Format snapped seconds (e.g. '5.10')."""
    return f"{round(snapped_seconds(seconds) * 100) / 100:.2f}"


def fmt_timestamp(sec: float) -> str:
    """Format MM:SS.mmm timestamp."""
    mm = int(sec // 60)
    rest = sec - mm * 60
    ss = int(rest)
    mmm = round((rest - ss) * 1000)
    if mmm == 1000:
        mmm = 0
        ss += 1
    if ss == 60:
        ss = 0
        mm += 1
    return f"{mm:02d}:{ss:02d}.{mmm:03d}"


def default_builder_state(mode: str = "T2VA") -> dict:
    """Return a fresh prompt-builder state tree for a given mode."""
    if mode == "REF2VA":
        return {
            "version": 2,
            "mode": mode,
            "duration": 5,
            "ref": {
                "subject_definitions": "",
                "summary": "",
                "retention_analysis": "",
                "detailed_description": "",
                "soundscape": "",
                "music": "N/A",
            },
        }
    return {
        "version": 1,
        "mode": mode,
        "imd": "",
        "soundscape": "",
        "music": "N/A",
        "duration": 5,
        "ref": {
            "subject_defs": [],
            "summary_types": ["reference generation"],
            "summary_text": "",
            "retention": [],
            "style_line": "",
            "detail": "",
            "soundscape": "",
            "music": "N/A",
        },
    }


def build_base_prompt(state: dict) -> str:
    """Generate prompt for T2VA/I2VA/FL2VA/L2VA using official guide format."""
    mode = state.get("mode", "T2VA")
    duration_s = state.get("duration", 5)
    imd_raw = state.get("imd")
    imd = imd_raw.strip() if isinstance(imd_raw, str) else ""
    soundscape_raw = state.get("soundscape")
    soundscape = soundscape_raw.strip() if isinstance(soundscape_raw, str) else ""
    music_raw = state.get("music")
    music = music_raw.strip() if isinstance(music_raw, str) else "N/A"

    S = fmt_ss(duration_s)
    head = ""

    if mode == "I2VA":
        head = ("For the target video, at 0.00 seconds into the target video, "
                "<Picture 1> (from [Shot 1]) is fully referenced.")
    elif mode == "FL2VA":
        head = ("How the reference pictures align with the target video — "
                f"Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; "
                f"Picture 2 (from Shot 2) aligns with the {S}-second mark of the target video.")
    elif mode == "L2VA":
        head = ("How the reference pictures align with the target video — "
                f"<Picture 1> (from [Shot 1]) aligns with the {S}-second mark of the target video.")

    body = (
        f"integrated_multimodal_description: {imd}\n\n"
        f"overall_soundscape: {soundscape}\n\n"
        f"non_diegetic_music: {music}"
    )
    return f"{head}\n\n{body}" if head else body


def build_ref_prompt(state: dict) -> str:
    """Generate REF2VA prompt from plain-text sections."""
    ref = state.get("ref", {})

    def _str(v):
        return v.strip() if isinstance(v, str) else ""

    # Handle legacy v1 builder_state shapes by merging into v2 keys.
    subject_definitions = _str(ref.get("subject_definitions"))
    if not subject_definitions:
        defs_raw = ref.get("subject_defs") or []
        if isinstance(defs_raw, list):
            subject_definitions = "\n".join(_str(d["text"]) for d in defs_raw if isinstance(d, dict) and _str(d.get("text")))

    summary = _str(ref.get("summary"))
    if not summary:
        chosen = [t for t in TASK_TYPES if t in ref.get("summary_types", [])]
        types_str = " + ".join(chosen) or "reference generation"
        summary_text = _str(ref.get("summary_text"))
        if summary_text:
            summary = f"[{types_str}] {summary_text}"

    retention_analysis = _str(ref.get("retention_analysis"))
    if not retention_analysis:
        retention_rows = []
        for row in ref.get("retention", []):
            label = _str(row.get("label"))
            context = _str(row.get("context"))
            marker = _str(row.get("marker"))
            note = _str(row.get("note"))
            if not label or not marker:
                continue
            ctx_part = f" ({context})" if context else ""
            retention_rows.append(f"{label}{ctx_part}: {marker} - {note}")
        retention_analysis = "\n".join(retention_rows)

    detailed_description = _str(ref.get("detailed_description"))
    if not detailed_description:
        style_line = _str(ref.get("style_line"))
        detail = _str(ref.get("detail"))
        parts = [p for p in [style_line, detail] if p]
        detailed_description = "\n".join(parts)

    soundscape = _str(ref.get("soundscape"))
    music_raw = ref.get("music")
    music = music_raw.strip() if isinstance(music_raw, str) else "N/A"

    return (
        f"subject_definitions:\n{subject_definitions}\n\n"
        f"summary:\n{summary}\n\n"
        f"retention_analysis:\n{retention_analysis}\n\n"
        f"detailed_description:\n{detailed_description}\n\n"
        f"overall_soundscape:\n{soundscape}\n\n"
        f"non_diegetic_music:\n{music}"
    )


def build_prompt(state: dict) -> str:
    """Mode-dispatched prompt assembly."""
    mode = state.get("mode", "T2VA")
    return build_ref_prompt(state) if mode == "REF2VA" else build_base_prompt(state)


def validate_builder_state(state: dict) -> list[dict]:
    """Return list of issues: {"level": "error"|"warn"|"info", "msg": str}."""
    issues = []
    mode = state.get("mode", "T2VA")

    if mode == "REF2VA":
        ref = state.get("ref", {})
        # Check both v2 and legacy v1 keys.
        has_summary = bool((ref.get("summary") or "").strip() or (ref.get("summary_text") or "").strip())
        if not has_summary:
            issues.append({"level": "warn", "msg": "REF2VA summary is empty."})
        has_subjects = bool((ref.get("subject_definitions") or "").strip()) or bool(ref.get("subject_defs"))
        if not has_subjects:
            issues.append({"level": "warn", "msg": "REF2VA subject_definitions is empty."})

    return issues