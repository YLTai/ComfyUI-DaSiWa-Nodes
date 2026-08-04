import json
import sys
import types
import wave

import numpy as np

from nodes.helper_minimax_h3_director import audio_duration, load_audio
from nodes import nodes_minimax_h3_director as director


def test_load_audio_applies_timeline_crop(tmp_path):
    path = tmp_path / "reference.wav"
    samples = np.zeros(20 * 8_000, dtype=np.int16)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8_000)
        output.writeframes(samples.tobytes())

    audio = load_audio(path.name, str(tmp_path), trim_start=2, trim_end=17)

    assert audio_duration(audio) == 15


def test_attached_video_soundtrack_uses_video_crop(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setitem(sys.modules, "folder_paths", types.SimpleNamespace(
        get_input_directory=lambda: str(tmp_path)))
    monkeypatch.setattr(director, "load_video", lambda *args, **kwargs: np.zeros((240, 1, 1, 3)))
    monkeypatch.setattr(director, "load_audio", lambda *args, **kwargs: calls.append(kwargs) or {"waveform": np.zeros((1, 1)), "sample_rate": 1})
    monkeypatch.setattr(director, "audio_duration", lambda audio: 10)

    state = {"items": [{"type": "video", "value": "reference.mp4", "audio": "reference.wav", "trim_start": 2, "trim_end": 12}]}
    director.MiniMaxH3Director().build_guide("REF2VA", "", 1344, 768, 5, "match", json.dumps(state))

    assert calls == [{"trim_start": 2.0, "trim_end": 12.0}]
