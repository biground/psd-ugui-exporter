#!/usr/bin/env python3

import argparse
import json
import os
import posixpath
import re
from pathlib import Path

try:
    from psd_tools import PSDImage
except ModuleNotFoundError as error:
    raise ModuleNotFoundError(
        "No module named 'psd_tools'. Run `npm run setup:python` from Tools/PsdPreprocessor."
    ) from error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--assets-dir", default="layers")
    args = parser.parse_args()

    source_path = args.source
    output_dir = Path(args.out)
    assets_dir_name = args.assets_dir
    assets_dir = output_dir / assets_dir_name
    assets_dir.mkdir(parents=True, exist_ok=True)

    psd = PSDImage.open(source_path)
    state = {"layer_index": 0, "used_asset_names": set()}
    layers = [convert_layer(layer, assets_dir, assets_dir_name, state) for layer in psd]

    manifest = {
        "version": 1,
        "generatedAt": current_iso_timestamp(),
        "source": {
            "path": source_path,
            "fileName": os.path.basename(source_path),
        },
        "document": {
            "width": psd.width,
            "height": psd.height,
            "colorMode": str(getattr(psd, "color_mode", "")) or None,
            "bitsPerChannel": getattr(psd, "depth", None),
        },
        "assetsDir": assets_dir_name,
        "layers": layers,
        "flatLayers": flatten_layer_tree(layers),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    with open(output_dir / "manifest.json", "w", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
        file.write("\n")


def convert_layer(layer, assets_dir, assets_dir_name, state):
    state["layer_index"] += 1
    layer_id = state["layer_index"]
    is_group = layer.is_group()
    children = [convert_layer(child, assets_dir, assets_dir_name, state) for child in layer] if is_group else []
    source_bounds = read_bounds(layer)
    bounds = source_bounds
    text = read_text(layer)
    image = None

    if text is None and not is_group and bounds["width"] > 0 and bounds["height"] > 0:
        composite = layer.composite()
        if composite is not None:
            if composite.mode != "RGBA":
                composite = composite.convert("RGBA")
            trim_box = composite.getchannel("A").getbbox()
            if trim_box is not None:
                left, top, right, bottom = trim_box
                composite = composite.crop(trim_box)
                bounds = {
                    "x": source_bounds["x"] + left,
                    "y": source_bounds["y"] + top,
                    "width": composite.width,
                    "height": composite.height,
                }
                file_name = create_asset_file_name(layer.name, layer_id, state["used_asset_names"])
                composite.save(assets_dir / file_name)
                image = {
                    "fileName": file_name,
                    "width": composite.width,
                    "height": composite.height,
                    "path": posixpath.join(assets_dir_name, file_name),
                }
            else:
                bounds = {
                    "x": source_bounds["x"],
                    "y": source_bounds["y"],
                    "width": 0,
                    "height": 0,
                }

    return {
        "id": layer_id,
        "name": layer.name or f"Layer {layer_id}",
        "kind": resolve_layer_kind(layer, text, is_group),
        "bounds": bounds,
        "sourceBounds": source_bounds,
        "opacity": normalize_opacity(getattr(layer, "opacity", 255)),
        "visible": bool(getattr(layer, "visible", True)),
        "blendMode": str(getattr(layer, "blend_mode", "")) or None,
        "text": text,
        "image": image,
        "children": children,
    }


def read_bounds(layer):
    left, top, right, bottom = layer.bbox
    return {
        "x": left,
        "y": top,
        "width": max(0, right - left),
        "height": max(0, bottom - top),
    }


def read_text(layer):
    if getattr(layer, "kind", None) != "type":
        return None

    value = getattr(layer, "text", None)
    if not isinstance(value, str):
        return None

    style_runs = read_style_runs(layer, value)
    primary_run = style_runs[0] if style_runs else {}
    text = {
        "value": value,
        "fontName": primary_run.get("fontName"),
        "fontSize": primary_run.get("fontSize"),
        "color": primary_run.get("color"),
        "tracking": primary_run.get("tracking"),
        "alignment": read_alignment(layer),
        "runs": style_runs,
        "stroke": read_stroke(layer),
    }
    return text


def read_style_runs(layer, value):
    engine_dict = getattr(layer, "engine_dict", {}) or {}
    style_run = engine_dict.get("StyleRun", {}) or {}
    run_lengths = style_run.get("RunLengthArray", []) or []
    run_array = style_run.get("RunArray", []) or []
    font_set = (getattr(layer, "resource_dict", {}) or {}).get("FontSet", []) or []
    runs = []
    cursor = 0

    for index, run in enumerate(run_array):
        style_data = ((run.get("StyleSheet", {}) or {}).get("StyleSheetData", {}) or {})
        raw_length = run_lengths[index] if index < len(run_lengths) else len(value) - cursor
        length = max(0, min(int(raw_length), len(value) - cursor))
        run_value = value[cursor:cursor + length]

        runs.append({
            "start": cursor,
            "length": length,
            "value": run_value,
            "fontName": read_font_name(font_set, style_data.get("Font")),
            "fontSize": read_number(style_data.get("FontSize")),
            "color": read_engine_color(style_data.get("FillColor")),
            "tracking": read_number(style_data.get("Tracking")),
        })
        cursor += length

    return runs


def read_font_name(font_set, font_index):
    index = read_integer(font_index)
    if index is None:
        return None
    if index < 0 or index >= len(font_set):
        return None
    font = font_set[index] or {}
    return read_string(font.get("Name"))


def read_alignment(layer):
    engine_dict = getattr(layer, "engine_dict", {}) or {}
    paragraph_run = engine_dict.get("ParagraphRun", {}) or {}
    run_array = paragraph_run.get("RunArray", []) or []
    if not run_array:
        return None
    properties = ((run_array[0].get("ParagraphSheet", {}) or {}).get("Properties", {}) or {})
    value = read_integer(properties.get("Justification"))
    names = {
        0: "left",
        1: "right",
        2: "center",
        3: "justify",
    }
    return {
        "value": value,
        "name": names.get(value, "unknown"),
    }


def read_stroke(layer):
    effects = getattr(layer, "effects", []) or []
    for effect in effects:
        effect_name = str(getattr(effect, "name", effect.__class__.__name__)).lower()
        if effect_name != "stroke":
            continue
        enabled = bool(getattr(effect, "enabled", False) and getattr(effect, "shown", True))
        return {
            "enabled": enabled,
            "size": read_number(getattr(effect, "size", None)),
            "position": decode_bytes(getattr(effect, "position", None)),
            "opacity": read_number(getattr(effect, "opacity", None)),
            "blendMode": decode_bytes(getattr(effect, "blend_mode", None)),
            "color": read_effect_color(getattr(effect, "color", None)),
        }
    return None


def read_engine_color(color):
    if not hasattr(color, "get"):
        return None
    values = color.get("Values")
    if values is None:
        return None
    values = list(values)
    if len(values) < 4:
        return None
    alpha, red, green, blue = values[:4]
    return make_color(red, green, blue, alpha)


def read_effect_color(color):
    if not hasattr(color, "get"):
        return None
    red = color.get(b"Rd  ", color.get("Rd  "))
    green = color.get(b"Grn ", color.get("Grn "))
    blue = color.get(b"Bl  ", color.get("Bl  "))
    return make_color(red, green, blue, 255)


def make_color(red, green, blue, alpha):
    channels = [normalize_channel(red), normalize_channel(green), normalize_channel(blue), normalize_channel(alpha)]
    return {
        "r": channels[0],
        "g": channels[1],
        "b": channels[2],
        "a": channels[3],
        "hex": f"#{channels[0]:02x}{channels[1]:02x}{channels[2]:02x}",
    }


def normalize_channel(value):
    if value is None:
        return 0
    number = float(value)
    if 0 <= number <= 1:
        number *= 255
    return max(0, min(255, int(round(number))))


def read_number(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def read_integer(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def decode_bytes(value):
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode("latin-1").strip()
    return read_string(value)


def read_string(value):
    if value is None:
        return None
    raw_value = getattr(value, "value", value)
    return raw_value if isinstance(raw_value, str) else str(raw_value)


def resolve_layer_kind(layer, text, is_group):
    if is_group:
        return "group"
    if text is not None:
        return "text"
    return str(getattr(layer, "kind", "pixel"))


def normalize_opacity(opacity):
    if opacity is None:
        return 1
    return opacity / 255 if opacity > 1 else opacity


def sanitize_name(name):
    source = (name or "").strip()
    normalized = re.sub(r"[<>:\"/\\|?*@#%&{}\[\]$!`'~=+;,]+", "_", source)
    normalized = re.sub(r"\s+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "layer"


def create_asset_file_name(layer_name, index, used_names):
    prefix = str(index).zfill(4)
    safe_name = sanitize_name(layer_name)
    unique_name = safe_name
    duplicate_index = 2

    while unique_name in used_names:
        unique_name = f"{safe_name}_{duplicate_index}"
        duplicate_index += 1

    used_names.add(unique_name)
    return f"{prefix}_{unique_name}.png"


def flatten_layer_tree(layers):
    result = []

    def visit(layer, parent_path, depth):
        layer_path = f"{parent_path}/{layer['name']}" if parent_path else layer["name"]
        result.append({
            "id": layer["id"],
            "name": layer["name"],
            "path": layer_path,
            "depth": depth,
            "kind": layer["kind"],
            "bounds": layer["bounds"],
            "sourceBounds": layer["sourceBounds"],
            "opacity": layer["opacity"],
            "visible": layer["visible"],
            "blendMode": layer["blendMode"],
            "text": layer["text"],
            "image": layer["image"],
        })

        for child in layer["children"]:
            visit(child, layer_path, depth + 1)

    for layer in layers:
        visit(layer, "", 0)

    return result


def current_iso_timestamp():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    main()
