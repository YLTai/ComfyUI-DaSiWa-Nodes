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
    imd = (state.get("imd") or "").strip()
    soundscape = (state.get("soundscape") or "").strip()
    music = (state.get("music") or "N/A").strip()

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
    """Generate REF2VA prompt following guide §2.x structure."""
    ref = state.get("ref", {})

    # subject_definitions
    defs = "\n".join(
        d["text"].strip() for d in ref.get("subject_defs", [])
        if isinstance(d, dict) and (d.get("text") or "").strip()
    )

    # summary: "[task_type(s)] description"
    chosen = [t for t in TASK_TYPES if t in ref.get("summary_types", [])]
    types_str = " + ".join(chosen) or "reference generation"
    summary_text = (ref.get("summary_text") or "").strip()
    summary = f"[{types_str}] {summary_text}"

    # retention_analysis: "Label(context): marker - note"
    retention_rows = []
    for row in ref.get("retention", []):
        label = row.get("label", "")
        context = row.get("context", "")
        marker = row.get("marker", "")
        note = row.get("note", "")
        if not label or not marker:
            continue
        ctx_part = f" ({context.strip()})" if (context or "").strip() else ""
        retention_rows.append(f"{label}{ctx_part}: {marker} - {note.strip()}")
    retention = "\n".join(retention_rows)

    # detailed_description: style opening + detail body
    style_line = (ref.get("style_line") or "").strip()
    detail = (ref.get("detail") or "").strip()
    parts = [p for p in [style_line, detail] if p]
    detailed = "\n".join(parts)

    soundscape = (ref.get("soundscape") or "").strip()
    music = (ref.get("music") or "N/A").strip()

    return (
        f"subject_definitions:\n{defs}\n\n"
        f"summary:\n{summary}\n\n"
        f"retention_analysis:\n{retention}\n\n"
        f"detailed_description:\n{detailed}\n\n"
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
        if not (ref.get("summary_text") or "").strip():
            issues.append({"level": "warn", "msg": "REF2VA summary text is empty."})
        if not (ref.get("subject_defs") or []):
            issues.append({"level": "warn", "msg": "REF2VA subject_definitions is empty."})

    return issues