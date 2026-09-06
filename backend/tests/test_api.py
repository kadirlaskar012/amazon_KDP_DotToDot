"""
test_api.py
Automated test suite verifying the FastAPI endpoints, OpenCV processing,
ReportLab vector PDF generation, 120-dot hard cap, and validator.
"""

import unittest
from fastapi.testclient import TestClient
from backend.app import app


class TestDotToDotBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["max_dots_limit"], 120)

    def test_get_samples(self):
        resp = self.client.get("/api/samples")
        self.assertEqual(resp.status_code, 200)
        samples = resp.json()
        self.assertGreaterEqual(len(samples), 6)
        ids = [s["id"] for s in samples]
        self.assertIn("dinosaur", ids)
        self.assertIn("rocket", ids)

    def test_analyze_and_generate_sample(self):
        resp = self.client.post("/api/analyze-and-generate", data={"sample_id": "rocket", "preset": "medium"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        dots = data["dots"]
        self.assertLessEqual(len(dots), 120)
        self.assertGreater(len(dots), 20)
        # Check dot structure
        d0 = dots[0]
        self.assertIn("id", d0)
        self.assertIn("sequenceIndex", d0)
        self.assertIn("displayNumber", d0)
        self.assertIn("x", d0)
        self.assertIn("y", d0)
        self.assertIn("numberX", d0)
        self.assertIn("numberY", d0)
        self.assertIn("reference_image", data)
        self.assertTrue(data["reference_image"].startswith("data:image/png;base64,"))

    def test_hard_cap_120(self):
        resp = self.client.post("/api/analyze-and-generate", data={"sample_id": "dinosaur", "custom_max_dots": 120})
        self.assertEqual(resp.status_code, 200)
        dots = resp.json()["dots"]
        self.assertLessEqual(len(dots), 120)

    def test_reposition_numbers(self):
        dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "x": 100.0, "y": 100.0, "numberX": 100.0, "numberY": 100.0, "source": "auto", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 2, "x": 150.0, "y": 120.0, "numberX": 150.0, "numberY": 120.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/reposition-numbers", json={"dots": dots})
        self.assertEqual(resp.status_code, 200)
        res_dots = resp.json()["dots"]
        self.assertEqual(len(res_dots), 2)
        # Verify number position was displaced away from the raw dot coordinate
        self.assertTrue(res_dots[0]["numberX"] != 100.0 or res_dots[0]["numberY"] != 100.0)

    def test_validator(self):
        dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "x": 100.0, "y": 100.0, "numberX": 110.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 1, "x": 102.0, "y": 101.0, "numberX": 110.0, "numberY": 90.0, "source": "auto", "visible": True}, # duplicate #1 + overlap
        ]
        resp = self.client.post("/api/validate", json={"dots": dots})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["is_valid"])
        self.assertGreaterEqual(data["error_count"], 1)

    def test_export_pdf_vector(self):
        dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "x": 100.0, "y": 100.0, "numberX": 110.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 2, "x": 200.0, "y": 200.0, "numberX": 210.0, "numberY": 190.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/export-pdf", json={"dots": dots, "includeAnswerKey": False})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "application/pdf")
        pdf_bytes = resp.content
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        # Verify ReportLab vector PDF does not contain image dictionary /XObject
        self.assertNotIn(b"/Subtype /Image", pdf_bytes)

    def test_export_png(self):
        dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "x": 100.0, "y": 100.0, "numberX": 110.0, "numberY": 90.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/export-png", json={"dots": dots, "dpi": 300})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "image/png")
        self.assertTrue(resp.content.startswith(b"\x89PNG"))


if __name__ == "__main__":
    unittest.main()
