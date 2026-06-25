#!/usr/bin/env python3

import argparse
import json
import os
import posixpath
import re
import sys
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
    output_dir.mkdir(parents=True, exist_ok=True)
    assets_dir.mkdir(parents=True, exist_ok=True)

    psd = PSDImage.open(source_path)
    state = {"layer_index": 0, "used_asset_names": set()}
    source_tree = [convert_layer(layer, assets_dir, assets_dir_name, state) for layer in psd]

    payload = {
        "version": 1,
        "source": {
            "path": source_path,
            "fileName": os.path.basename(source_path),
        },
        "document": {
            "width": getattr(psd, "width", 0),
            "height": getattr(psd, "height", 0),
        },
        "assetsDir": assets_dir_name,
        "sourceTree": source_tree,
    }

    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


def convert_layer(layer, assets_dir, assets_dir_name, state):
    state["layer_index"] += 1
    layer_id = state["layer_index"]
    is_group = layer.is_group()
    children = [convert_layer(child, assets_dir, assets_dir_name, state) for child in layer] if is_group else []
    source_bounds = read_bounds(layer)
    raster_bounds = dict(source_bounds)
    text = read_text(layer, source_bounds)
    kind = resolve_layer_kind(layer, text, is_group)
    image = None

    if kind == "image" and source_bounds["width"] > 0 and source_bounds["height"] > 0:
        composite = layer.composite()
        if composite is not None:
            if composite.mode != "RGBA":
                composite = composite.convert("RGBA")
            trim_box = composite.getchannel("A").getbbox()
            if trim_box is not None:
                left, top, right, bottom = trim_box
                composite = composite.crop(trim_box)
                raster_bounds = {
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
                raster_bounds = {
                    "x": source_bounds["x"],
                    "y": source_bounds["y"],
                    "width": 0,
                    "height": 0,
                }

    return {
        "id": layer_id,
        "name": layer.name or "Layer {0}".format(layer_id),
        "kind": kind,
        "sourceBounds": source_bounds,
        "rasterBounds": raster_bounds,
        "opacity": normalize_opacity(getattr(layer, "opacity", 255)),
        "visible": bool(getattr(layer, "visible", True)),
        "blendMode": read_string(getattr(layer, "blend_mode", None)),
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


def read_text(layer, source_bounds):
    if getattr(layer, "kind", None) != "type":
        return None

    value = getattr(layer, "text", None)
    if not isinstance(value, str):
        return None

    style_runs = read_style_runs(layer, value)
    primary_run = style_runs[0] if style_runs else {}
    paragraph = read_paragraph(layer)
    alignment = paragraph.get("horizontalAlign") if paragraph is not None else read_alignment(layer)
    return {
        "value": value,
        "fontName": primary_run.get("fontName"),
        "fontSize": primary_run.get("fontSize"),
        "color": primary_run.get("color"),
        "tracking": primary_run.get("tracking"),
        "lineHeight": primary_run.get("leading"),
        "alignment": alignment,
        "paragraph": paragraph,
        "box": read_text_box(layer, source_bounds),
        "runs": style_runs,
        "stroke": read_text_stroke(layer, primary_run),
    }


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
            "leading": read_number(style_data.get("Leading")),
            "autoLeading": read_bool(style_data.get("AutoLeading")),
            "horizontalScale": read_number(style_data.get("HorizontalScale")),
            "verticalScale": read_number(style_data.get("VerticalScale")),
            "baselineShift": read_number(style_data.get("BaselineShift")),
            "strokeColor": read_engine_color(style_data.get("StrokeColor")),
            "strokeWidth": read_number(style_data.get("StrokeWidth")),
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
    properties = read_first_paragraph_properties(layer)
    if properties is None:
        return None
    return read_horizontal_alignment(properties)


def read_paragraph(layer):
    properties = read_first_paragraph_properties(layer)
    if properties is None:
        return None

    return {
        "horizontalAlign": read_horizontal_alignment(properties),
        "verticalAlign": read_vertical_alignment(properties),
        "firstLineIndent": read_number(properties.get("FirstLineIndent")),
        "startIndent": read_number(properties.get("StartIndent")),
        "endIndent": read_number(properties.get("EndIndent")),
        "spaceBefore": read_number(properties.get("SpaceBefore")),
        "spaceAfter": read_number(properties.get("SpaceAfter")),
        "autoHyphenate": read_bool(properties.get("AutoHyphenate")),
        "wordSpacing": read_number_list(properties.get("WordSpacing")),
        "letterSpacing": read_number_list(properties.get("LetterSpacing")),
        "glyphSpacing": read_number_list(properties.get("GlyphSpacing")),
        "autoLeading": read_number(properties.get("AutoLeading")),
        "leadingType": read_integer(properties.get("LeadingType")),
        "everyLineComposer": read_bool(properties.get("EveryLineComposer")),
    }


def read_first_paragraph_properties(layer):
    engine_dict = getattr(layer, "engine_dict", {}) or {}
    paragraph_run = engine_dict.get("ParagraphRun", {}) or {}
    run_array = paragraph_run.get("RunArray", []) or []
    if not run_array:
        return None
    return ((run_array[0].get("ParagraphSheet", {}) or {}).get("Properties", {}) or {})


def read_horizontal_alignment(properties):
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


def read_vertical_alignment(properties):
    raw_value = first_present(properties, ["VerticalAlignment", "VerticalJustification", "VAlignment"])
    value = read_integer(raw_value)
    if value is None:
        value = 0
    names = {
        0: "top",
        1: "middle",
        2: "bottom",
        3: "justify",
    }
    return {
        "value": value,
        "name": names.get(value, "unknown"),
    }


def read_text_box(layer, source_bounds):
    kind = read_text_box_kind(layer)
    transform = read_transform(layer)
    engine_bounds = read_engine_text_box_bounds(layer, source_bounds)
    bounds = engine_bounds if engine_bounds is not None else dict(source_bounds)

    return {
        "kind": kind,
        "bounds": bounds,
        "width": bounds["width"],
        "height": bounds["height"],
        "wrap": kind == "paragraph",
        "transform": transform,
        "source": "engineData" if engine_bounds is not None else "layerBounds",
    }


def read_text_box_kind(layer):
    text_type = getattr(layer, "text_type", None)
    text_type_name = str(text_type).lower() if text_type is not None else ""
    if "paragraph" in text_type_name:
        return "paragraph"
    if "point" in text_type_name:
        return "point"
    return "unknown"


def read_transform(layer):
    transform = getattr(layer, "transform", None)
    if transform is None:
        return None
    try:
        values = [read_number(value) for value in transform]
    except TypeError:
        return None
    return values if len(values) == 6 and all(value is not None for value in values) else None


def read_engine_text_box_bounds(layer, source_bounds):
    engine_dict = getattr(layer, "engine_dict", {}) or {}
    match = find_first_keyed_value(engine_dict, {"BoxBounds", "TextBox", "TextBoxBounds"})
    if match is None:
        return None

    key, values = match
    numbers = read_number_list(values)
    if numbers is None or len(numbers) < 4:
        return None

    if key == "BoxBounds":
        top, left, bottom, right = numbers[:4]
    else:
        left, top, right, bottom = numbers[:4]

    width = max(0, right - left)
    height = max(0, bottom - top)
    if width == 0 or height == 0:
        return None

    return {
        "x": source_bounds["x"],
        "y": source_bounds["y"],
        "width": width,
        "height": height,
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


def read_text_stroke(layer, primary_run):
    layer_stroke = read_stroke(layer)
    if layer_stroke is not None:
        layer_stroke["source"] = "layerEffect"
        return layer_stroke

    color = primary_run.get("strokeColor")
    if color is None:
        return None

    return {
        "source": "textStyle",
        "enabled": True,
        "size": primary_run.get("strokeWidth"),
        "position": None,
        "opacity": None,
        "blendMode": None,
        "color": color,
    }


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
        "hex": "#{0:02x}{1:02x}{2:02x}".format(channels[0], channels[1], channels[2]),
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


def read_bool(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    raw_value = getattr(value, "value", value)
    if isinstance(raw_value, bool):
        return raw_value
    if isinstance(raw_value, (int, float)):
        return raw_value != 0
    if isinstance(raw_value, str):
        normalized = raw_value.strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False
    return None


def read_number_list(value):
    if value is None:
        return None
    try:
        values = list(value)
    except TypeError:
        return None
    numbers = [read_number(item) for item in values]
    return numbers if all(item is not None for item in numbers) else None


def first_present(dictionary, keys):
    for key in keys:
        if key in dictionary:
            return dictionary.get(key)
    return None


def find_first_keyed_value(value, keys):
    if hasattr(value, "items"):
        for key, child in value.items():
            key_name = str(key).strip("'")
            if key_name in keys:
                return key_name, child
            match = find_first_keyed_value(child, keys)
            if match is not None:
                return match
    elif isinstance(value, (list, tuple)):
        for child in value:
            match = find_first_keyed_value(child, keys)
            if match is not None:
                return match
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
    return "image"


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
        unique_name = "{0}_{1}".format(safe_name, duplicate_index)
        duplicate_index += 1

    used_names.add(unique_name)
    return "{0}_{1}.png".format(prefix, unique_name)


if __name__ == "__main__":
    main()
