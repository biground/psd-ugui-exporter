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


if __name__ == "__main__":
    unittest.main()
