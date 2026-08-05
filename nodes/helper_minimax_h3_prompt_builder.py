"""Pure MiniMax H3 prompt-builder contracts."""
from typing import Any

MODES = ("T2VA", "I2VA", "FL2VA", "L2VA", "REF2VA")
MODE_CAPACITY = {
    "T2VA": {"Picture": 0, "Video": 0, "Audio": 0},
    "I2VA": {"Picture": 1, "Video": 0, "Audio": 0},
    "FL2VA": {"Picture": 2, "Video": 0, "Audio": 0},
    "L2VA": {"Picture": 1, "Video": 0, "Audio": 0},
    "REF2VA": {"Picture": 9, "Video": 3, "Audio": 3, "total": 12},
}
TASK_TYPES = (
    "keyframe completion", "reference generation", "video editing",
    "video continuation", "audio reuse", "audio reference",
)
VISUAL_MARKERS = ("fully_preserved", "partially_preserved", "attribute_transfer", "weak_reference")
AUDIO_MARKERS = ("fully_copy", "partially_copy", "reference", "weak_reference")


def default_builder_state(mode: str = "T2VA") -> dict[str, Any]:
    if mode not in MODES:
        mode = "T2VA"
    return {
        "version": 1, "mode": mode, "imd": "", "soundscape": "", "music": "N/A",
        "duration": 5, "p2_shot": 1, "last_shot": 1,
        "ref": {
            "subject_defs": [], "summary_types": ["reference generation"], "summary_text": "",
            "retention": [], "style_line": "", "detail": "", "soundscape": "", "music": "N/A",
        },
    }


def align_frame_count(n: int) -> int:
    n = max(5, int(n))
    while n % 17 != 5:
        n += 1
    return n


def snapped_seconds(seconds: float) -> float:
    return align_frame_count(int(float(seconds) * 24)) / 24.0


def fmt_ss(seconds: float) -> str:
    return f"{snapped_seconds(seconds):.2f}"


def build_base_prompt(state: dict) -> str:
    mode = state.get("mode", "T2VA")
    duration = state.get("duration", 5)
    imd = str(state.get("imd") or "").strip()
    soundscape = str(state.get("soundscape") or "").strip()
    music = str(state.get("music") or "N/A").strip()
    end = fmt_ss(duration)
    if mode == "I2VA":
        head = "For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced."
    elif mode == "FL2VA":
        head = ("How the reference pictures align with the target video — "
                f"Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; "
                f"Picture 2 (from Shot {max(1, int(state.get('p2_shot', 1)))}) aligns with the {end}-second mark of the target video.")
    elif mode == "L2VA":
        head = ("How the reference pictures align with the target video — "
                f"<Picture 1> (from [Shot {max(1, int(state.get('last_shot', 1)))}) aligns with the {end}-second mark of the target video.")
    else:
        head = ""
    body = (f"integrated_multimodal_description: {imd}\n\n"
            f"overall_soundscape: {soundscape}\n\n"
            f"non_diegetic_music: {music}")
    return f"{head}\n\n{body}" if head else body


def build_ref_prompt(state: dict) -> str:
    ref = state.get("ref") if isinstance(state.get("ref"), dict) else {}
    definitions = "\n".join(
        str(item.get("text") or "").strip() for item in ref.get("subject_defs", [])
        if isinstance(item, dict) and str(item.get("text") or "").strip()
    )
    task_types = " + ".join(item for item in TASK_TYPES if item in ref.get("summary_types", [])) or "reference generation"
    retention = []
    for item in ref.get("retention", []):
        if not isinstance(item, dict):
            continue
        label, marker = str(item.get("label") or "").strip(), str(item.get("marker") or "").strip()
        if not label or not marker:
            continue
        context = str(item.get("context") or "").strip()
        note = str(item.get("note") or "").strip()
        retention.append(f"{label}{f' ({context})' if context else ''}: {marker} - {note}")
    retention_text = "\n".join(retention)
    detail = "\n".join(part for part in (str(ref.get("style_line") or "").strip(), str(ref.get("detail") or "").strip()) if part)
    return (f"subject_definitions:\n{definitions}\n\n"
            f"summary:\n[{task_types}] {str(ref.get('summary_text') or '').strip()}\n\n"
            f"retention_analysis:\n{retention_text}\n\n"
            f"detailed_description:\n{detail}\n\n"
            f"overall_soundscape:\n{str(ref.get('soundscape') or '').strip()}\n\n"
            f"non_diegetic_music:\n{str(ref.get('music') or 'N/A').strip()}")


def build_prompt(state: dict) -> str:
    return build_ref_prompt(state) if state.get("mode") == "REF2VA" else build_base_prompt(state)


def validate_builder_state(state: dict) -> list[dict[str, str]]:
    issues = []
    if state.get("mode") == "REF2VA":
        ref = state.get("ref") if isinstance(state.get("ref"), dict) else {}
        if not str(ref.get("summary_text") or "").strip():
            issues.append({"level": "warn", "msg": "REF2VA summary text is empty."})
        if not ref.get("subject_defs"):
            issues.append({"level": "warn", "msg": "REF2VA subject_definitions is empty."})
    return issues
