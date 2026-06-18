import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

try:
    from PIL import Image
    import psd_tools_backend
    IMPORT_ERROR = None
except ImportError as error:
    Image = None
    psd_tools_backend = None
    IMPORT_ERROR = error


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


class PsdToolsBackendTest(unittest.TestCase):
    @unittest.skipIf(IMPORT_ERROR is not None, "Python fallback dependencies are not installed")
    def test_convert_layer_records_text_metadata_without_saving_png(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            assets_dir = Path(temp_dir) / "layers"
            assets_dir.mkdir()
            state = {"layer_index": 0, "used_asset_names": set()}

            layer = psd_tools_backend.convert_layer(
                FakeTextLayer(),
                assets_dir,
                "layers",
                state,
            )

            self.assertEqual(layer["kind"], "text")
            self.assertIsNone(layer["image"])
            self.assertEqual(list(assets_dir.glob("*.png")), [])
            self.assertEqual(layer["text"]["value"], "Hello")
            self.assertEqual(layer["text"]["fontName"], "SourceHanSansCN-Heavy")
            self.assertEqual(layer["text"]["fontSize"], 40.0)
            self.assertEqual(layer["text"]["color"]["hex"], "#804000")
            self.assertEqual(layer["text"]["alignment"]["name"], "center")
            self.assertEqual(layer["text"]["stroke"]["color"]["hex"], "#0c2238")
            self.assertEqual(layer["text"]["stroke"]["size"], 3.0)


if __name__ == "__main__":
    unittest.main()
