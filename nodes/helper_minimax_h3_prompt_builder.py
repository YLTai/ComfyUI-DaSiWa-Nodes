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
        "p2_shot": 1,
        "last_shot": 1,
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