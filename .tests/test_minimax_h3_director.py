import json
import sys
import types
import wave

import numpy as np
import pytest

from nodes.helper_minimax_h3_director import audio_duration, load_audio, load_embedded_video_audio
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


def test_load_embedded_video_audio_applies_the_video_crop(tmp_path):
    av = pytest.importorskip("av")
    path = tmp_path / "reference.m4a"
    sample_rate = 8_000
    with av.open(str(path), "w") as output:
        stream = output.add_stream("aac", rate=sample_rate)
        stream.layout = "mono"
        for _ in range(14 * sample_rate // 1024):
            frame = av.AudioFrame.from_ndarray(np.zeros((1, 1024), dtype=np.int16), format="s16", layout="mono")
            frame.sample_rate = sample_rate
            for packet in stream.encode(frame):
                output.mux(packet)
        for packet in stream.encode():
            output.mux(packet)

    audio = load_embedded_video_audio(path.name, str(tmp_path), trim_start=2, trim_end=12)

    assert audio["sample_rate"] == sample_rate
    assert audio_duration(audio) == pytest.approx(10, abs=0.1)


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


def test_embedded_video_media_modes_select_requested_streams(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setitem(sys.modules, "folder_paths", types.SimpleNamespace(
        get_input_directory=lambda: str(tmp_path)))
    monkeypatch.setattr(director, "load_video", lambda *args, **kwargs: calls.append(("video", kwargs)) or np.zeros((240, 1, 1, 3)))
    monkeypatch.setattr(director, "load_embedded_video_audio", lambda *args, **kwargs: calls.append(("audio", kwargs)) or {"waveform": np.zeros((1, 1, 80_000)), "sample_rate": 8_000})
    monkeypatch.setattr(director, "load_image", lambda *args: np.zeros((1, 1, 1, 3)))
    monkeypatch.setattr(director, "audio_duration", lambda audio: 10)

    node = director.MiniMaxH3Director()
    common = {"type": "video", "value": "reference.mp4", "trim_start": 2, "trim_end": 12}

    video_guide = node.build_guide("REF2VA", "", 1344, 768, 5, "match", json.dumps({"items": [{**common, "media_mode": "video"}]}))[0]
    assert list(video_guide["ref_videos"]) == ["ref_video_1"]
    assert video_guide["ref_video_audios"] == {}
    assert calls == [("video", {"trim_start": 2.0, "trim_end": 12.0})]

    calls.clear()
    audio_guide = node.build_guide("REF2VA", "", 1344, 768, 5, "match", json.dumps({"items": [
        {"type": "image", "value": "visual.png"}, {**common, "media_mode": "audio"},
    ]}))[0]
    assert audio_guide["ref_videos"] == {}
    assert list(audio_guide["ref_audios"]) == ["ref_audio_1"]
    assert calls == [("audio", {"trim_start": 2.0, "trim_end": 12.0})]

    calls.clear()
    combined_guide = node.build_guide("REF2VA", "", 1344, 768, 5, "match", json.dumps({"items": [{**common, "media_mode": "video_audio"}]}))[0]
    assert list(combined_guide["ref_videos"]) == ["ref_video_1"]
    assert list(combined_guide["ref_video_audios"]) == ["ref_video_audio_1"]
    assert calls == [
        ("video", {"trim_start": 2.0, "trim_end": 12.0}),
        ("audio", {"trim_start": 2.0, "trim_end": 12.0}),
    ]


def test_each_video_audio_pair_uses_its_matching_upstream_autogrow_key(monkeypatch, tmp_path):
    monkeypatch.setitem(sys.modules, "folder_paths", types.SimpleNamespace(
        get_input_directory=lambda: str(tmp_path)))
    monkeypatch.setattr(director, "load_video", lambda *args, **kwargs: np.zeros((120, 1, 1, 3)))
    monkeypatch.setattr(director, "load_embedded_video_audio", lambda path, *args, **kwargs: {
        "waveform": np.full((1, 1, 40_000), 1 if path == "one.mp4" else 2), "sample_rate": 8_000,
    })
    monkeypatch.setattr(director, "audio_duration", lambda audio: 5)

    guide = director.MiniMaxH3Director().build_guide("REF2VA", "", 1344, 768, 5, "match", json.dumps({"items": [
        {"type": "video", "value": "one.mp4", "media_mode": "video_audio", "trim_start": 2, "trim_end": 7},
        {"type": "video", "value": "two.mp4", "media_mode": "video_audio", "trim_start": 3, "trim_end": 8},
    ]}))[0]

    assert list(guide["ref_videos"]) == ["ref_video_1", "ref_video_2"]
    assert list(guide["ref_video_audios"]) == ["ref_video_audio_1", "ref_video_audio_2"]
    assert guide["ref_video_audios"]["ref_video_audio_1"]["waveform"][0, 0, 0] == 1
    assert guide["ref_video_audios"]["ref_video_audio_2"]["waveform"][0, 0, 0] == 2
