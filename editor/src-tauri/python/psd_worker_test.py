import tempfile
import unittest
from pathlib import Path

from PIL import Image

import psd_worker


class FakeImageLayer:
    name = "Icon"
    bbox = (10, 20, 14, 24)
    opacity = 255
    visible = True
    blend_mode = "normal"
    text = None
    kind = "pixel"

    def is_group(self):
        return False

    def composite(self):
        image = Image.new("RGBA", (4, 4), (255, 255, 255, 0))
        image.putpixel((1, 1), (255, 0, 0, 255))
        image.putpixel((2, 1), (0, 255, 0, 255))
        return image


class FakeStroke:
    name = "Stroke"
    enabled = True
    present = True
    shown = True
    opacity = 75.0
    size = 3.0
    position = b"OutF"
    blend_mode = b"Nrml"
    color = {b"Rd  ": 12.0, b"Grn ": 34.0, b"Bl  ": 56.0}


class FakeTextLayer:
    kind = "type"
    name = "Title"
    bbox = (10, 20, 130, 60)
    opacity = 255
    visible = True
    blend_mode = "normal"
    text = "Hello"
    effects = [FakeStroke()]
    resource_dict = {
        "FontSet": [
            {"Name": "SourceHanSansCN-Heavy"},
        ],
    }
    engine_dict = {
        "ParagraphRun": {
            "RunArray": [
                {
                    "ParagraphSheet": {
                        "Properties": {
                            "Justification": 2,
                        },
                    },
                },
            ],
        },
        "StyleRun": {
            "RunLengthArray": [5],
            "RunArray": [
                {
                    "StyleSheet": {
                        "StyleSheetData": {
                            "Font": 0,
                            "FontSize": 40.0,
                            "FillColor": {
                                "Type": 1,
                                "Values": [1.0, 0.5, 0.25, 0.0],
                            },
                            "Tracking": 100,
                        },
                    },
                },
            ],
        },
    }

    def is_group(self):
        return False

    def composite(self):
        return Image.new("RGBA", (120, 40), (255, 255, 255, 255))


class PsdWorkerTest(unittest.TestCase):
    def test_convert_layer_outputs_image_source_and_raster_bounds(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            assets_dir = Path(temp_dir) / "layers"
            assets_dir.mkdir()
            state = {"layer_index": 0, "used_asset_names": set()}

            layer = psd_worker.convert_layer(
                FakeImageLayer(),
                assets_dir,
                "layers",
                state,
            )

            self.assertEqual(layer["kind"], "image")
            self.assertEqual(layer["sourceBounds"], {"x": 10, "y": 20, "width": 4, "height": 4})
            self.assertEqual(layer["rasterBounds"], {"x": 11, "y": 21, "width": 2, "height": 1})
            self.assertEqual(layer["image"]["path"], "layers/0001_Icon.png")

    def test_convert_layer_outputs_text_metadata_without_saving_png(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            assets_dir = Path(temp_dir) / "layers"
            assets_dir.mkdir()
            state = {"layer_index": 0, "used_asset_names": set()}

            layer = psd_worker.convert_layer(
                FakeTextLayer(),
                assets_dir,
                "layers",
                state,
            )

            self.assertEqual(layer["kind"], "text")
            self.assertIsNone(layer["image"])
            self.assertEqual(layer["text"]["value"], "Hello")
            self.assertEqual(layer["text"]["fontName"], "SourceHanSansCN-Heavy")
            self.assertEqual(layer["text"]["fontSize"], 40.0)
            self.assertEqual(layer["text"]["color"]["hex"], "#804000")
            self.assertEqual(layer["text"]["alignment"]["name"], "center")
            self.assertEqual(layer["text"]["stroke"]["size"], 3.0)
            self.assertEqual(list(assets_dir.glob("*.png")), [])


if __name__ == "__main__":
    unittest.main()
