"""MiniMax H3 Director guide node."""
import json

from .helper_minimax_h3_director import (
    assemble_prompt,
    audio_duration,
    load_audio,
    load_image,
    load_video,
    normalize_guide,
    validate_reference_limits,
)


class MiniMaxH3Director:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "mode": (["FL2VA", "REF2VA"], {"default": "FL2VA"}),
                "prompt": ("STRING", {"default": "", "multiline": True}),
                "width": ("INT", {"default": 1344, "min": 32, "max": 8192, "step": 32}),
                "height": ("INT", {"default": 768, "min": 32, "max": 8192, "step": 32}),
                "duration": ("INT", {"default": 5, "min": 1, "max": 1000}),
                "ref_image_size": (["match", "max"], {"default": "match"}),
                "timeline_data": ("STRING", {"default": "{\"version\":1,\"items\":[],\"prompt_blocks\":[]}", "multiline": False, "hidden": True}),
            },
            "optional": {
                "fl2va_model": ("MODEL", {"lazy": True}),
                "ref2va_model": ("MODEL", {"lazy": True}),
            },
        }

    RETURN_TYPES = ("MINIMAX_H3_DIRECTOR_GUIDE", "INT", "STRING", "INT", "INT", "MODEL", "BOOLEAN", "BOOLEAN")
    RETURN_NAMES = ("guide", "duration", "positive_prompt", "width", "height", "model", "fl2va_requested", "ref2va_requested")
    FUNCTION = "build_guide"
    CATEGORY = "DaSiWa Nodes/MiniMax H3"

    def check_lazy_status(self, mode, prompt, width, height, duration, ref_image_size, timeline_data,
                          fl2va_model=None, ref2va_model=None):
        selected_name = "fl2va_model" if mode == "FL2VA" else "ref2va_model"
        selected_model = fl2va_model if mode == "FL2VA" else ref2va_model
        return [selected_name] if selected_model is None else []

    def build_guide(self, mode, prompt, width, height, duration, ref_image_size, timeline_data,
                    fl2va_model=None, ref2va_model=None):
        length = int(duration) * 24
        try:
            state = json.loads(timeline_data or "{}")
        except (TypeError, json.JSONDecodeError) as exc:
            raise ValueError(f"MiniMax Director timeline_data is invalid JSON: {exc}") from exc
        if not isinstance(state, dict):
            raise ValueError("MiniMax Director timeline_data must contain an object")

        items = sorted(enumerate(state.get("items", [])), key=lambda pair: (int(pair[1].get("order", pair[0])), pair[0]))
        images, videos, audios = [], [], []
        first_frame = last_frame = None
        ref_video_audios, ref_images, ref_videos, ref_audios = {}, {}, {}, {}
        try:
            import folder_paths
            input_directory = folder_paths.get_input_directory()
        except ImportError:
            input_directory = None
        image_index = 0
        for _, item in items:
            if not item.get("enabled", True):
                continue
            kind = item.get("type")
            value = item.get("value", item.get("tensor"))
            if value is None:
                continue
            if isinstance(value, str) and input_directory:
                if kind == "image":
                    value = load_image(value, input_directory)
                elif kind == "audio":
                    trim_start = float(item.get("trim_start", 0.0))
                    trim_end = item.get("trim_end")
                    value = load_audio(value, input_directory, trim_start=trim_start,
                                       trim_end=float(trim_end) if trim_end is not None else None)
                    item = {**item, "duration": audio_duration(value)}
                elif kind == "video":
                    trim_start = float(item.get("trim_start", 0.0))
                    trim_end = item.get("trim_end")
                    value = load_video(value, input_directory, trim_start=trim_start,
                                       trim_end=float(trim_end) if trim_end is not None else None)
                    item = {**item, "duration": float(value.shape[0]) / 24.0}
            attached_audio = item.get("audio")
            if isinstance(attached_audio, str) and input_directory:
                attached_audio = load_audio(attached_audio, input_directory)
                item = {**item, "audio": attached_audio, "audio_duration": audio_duration(attached_audio)}
            if mode == "FL2VA":
                if kind != "image":
                    continue
                target = "first" if image_index == 0 else "last"
                image_index += 1
                if target == "last":
                    if last_frame is not None:
                        raise ValueError("FL2VA accepts at most two images")
                    last_frame = value
                else:
                    if first_frame is not None:
                        raise ValueError("FL2VA accepts at most two images")
                    first_frame = value
                images.append(value)
            elif kind == "image":
                key = f"ref_image_{len(ref_images) + 1}"
                ref_images[key] = value
                images.append(item)
            elif kind == "video":
                key = f"ref_video_{len(ref_videos) + 1}"
                ref_videos[key] = value
                videos.append(item)
                if item.get("audio") is not None:
                    ref_video_audios[f"ref_video_audio_{len(ref_videos)}"] = item["audio"]
                    audios.append({"duration": item.get("audio_duration", item.get("duration"))})
            elif kind == "audio":
                ref_audios[f"ref_audio_{len(ref_audios) + 1}"] = value
                audios.append(item)
        if mode == "REF2VA":
            validate_reference_limits(images=images, videos=videos, audios=audios)
        blocks = state.get("prompt_blocks", [])
        resolved = assemble_prompt(prompt, blocks)
        guide = {
            "version": 1, "mode": mode, "prompt": prompt, "prompt_blocks": blocks,
            "timeline": [
                {key: item.get(key) for key in ("id", "type", "start", "duration", "order", "trim_start", "trim_end") if key in item}
                for _, item in items if item.get("enabled", True)
            ],
            "resolved_prompt": resolved, "width": width, "height": height, "length": length,
            "ref_image_size": ref_image_size,
            "first_frame": first_frame, "last_frame": last_frame,
            "ref_images": ref_images if mode == "REF2VA" else {},
            "ref_videos": ref_videos if mode == "REF2VA" else {},
            "ref_video_audios": ref_video_audios if mode == "REF2VA" else {},
            "ref_audios": ref_audios if mode == "REF2VA" else {},
        }
        normalize_guide(guide)
        duration = max(5, round((length / 24.0) * 24))
        duration += (5 - (duration % 17)) % 17
        selected_model = fl2va_model if mode == "FL2VA" else ref2va_model
        return (guide, int(duration), resolved, int(width), int(height), selected_model,
                mode == "FL2VA", mode == "REF2VA")


NODE_CLASS_MAPPINGS = {"MiniMaxH3Director": MiniMaxH3Director}
NODE_DISPLAY_NAME_MAPPINGS = {"MiniMaxH3Director": "MiniMax H3 Director"}
