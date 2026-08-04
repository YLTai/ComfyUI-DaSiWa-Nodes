import wave

import numpy as np

from nodes.helper_minimax_h3_director import audio_duration, load_audio


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
