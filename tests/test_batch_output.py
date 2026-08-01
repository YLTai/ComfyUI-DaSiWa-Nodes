import gc
import importlib.util
import os
import sys
from pathlib import Path

import torch


MODULE_PATH = Path(__file__).parents[1] / "nodes" / "batch_output.py"
spec = importlib.util.spec_from_file_location("batch_output", MODULE_PATH)
assert spec is not None and spec.loader is not None
batch_output = importlib.util.module_from_spec(spec)
sys.modules["batch_output"] = batch_output
spec.loader.exec_module(batch_output)


def test_uses_available_ram_not_a_fixed_output_cap(monkeypatch, tmp_path):
    monkeypatch.setattr(batch_output, "total_ram_bytes", lambda: 128 * 1024 ** 3)
    monkeypatch.setattr(
        batch_output, "available_ram_bytes", lambda: batch_output.ram_safety_reserve_bytes() + 16
    )

    output, storage_path = batch_output.allocate_cpu_output((1, 2, 2, 1), torch.float32, str(tmp_path))

    assert storage_path is None
    assert output.device.type == "cpu"


def test_uses_mmap_when_available_ram_would_cross_reserve(monkeypatch, tmp_path):
    monkeypatch.setattr(batch_output, "total_ram_bytes", lambda: 128 * 1024 ** 3)
    monkeypatch.setattr(batch_output, "available_ram_bytes", lambda: batch_output.ram_safety_reserve_bytes())

    output, storage_path = batch_output.allocate_cpu_output((1, 2, 2, 1), torch.float32, str(tmp_path))

    assert storage_path is not None
    assert os.path.exists(storage_path)
    del output
    gc.collect()
    assert not os.path.exists(storage_path)


def test_low_ram_system_uses_a_proportional_reserve(monkeypatch):
    monkeypatch.setattr(batch_output, "total_ram_bytes", lambda: 8 * 1024 ** 3)

    assert batch_output.ram_safety_reserve_bytes() == 2 * 1024 ** 3


def test_reserve_is_capped_at_eight_gib_on_large_memory_systems(monkeypatch):
    monkeypatch.setattr(batch_output, "total_ram_bytes", lambda: 128 * 1024 ** 3)

    assert batch_output.ram_safety_reserve_bytes() == 8 * 1024 ** 3