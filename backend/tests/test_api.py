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


    def test_export_pdf_custom_styling_and_multipath(self):
        dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "displayLabel": "A", "pathId": 1, "x": 100.0, "y": 100.0, "numberX": 115.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 2, "displayLabel": "B", "pathId": 1, "x": 200.0, "y": 100.0, "numberX": 215.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d3", "sequenceIndex": 3, "displayNumber": 3, "displayLabel": "C", "pathId": 2, "x": 150.0, "y": 250.0, "numberX": 165.0, "numberY": 240.0, "source": "auto", "visible": True},
            {"id": "d4", "sequenceIndex": 4, "displayNumber": 4, "displayLabel": "D", "pathId": 2, "x": 250.0, "y": 250.0, "numberX": 265.0, "numberY": 240.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/export-pdf", json={
            "dots": dots,
            "includeAnswerKey": True,
            "startMarkerStyle": "star",
            "stopMarkerStyle": "double_circle",
            "faintGuidelines": "dotted",
            "dotShape": "diamond",
            "numberPlacement": "badge",
            "caption": "EDUCATIONAL TEST"
        })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF"))

    def test_export_book_pdf(self):
        page1_dots = [
            {"id": "p1_d1", "sequenceIndex": 1, "displayNumber": 1, "pathId": 1, "x": 100.0, "y": 100.0, "numberX": 110.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "p1_d2", "sequenceIndex": 2, "displayNumber": 2, "pathId": 1, "x": 200.0, "y": 200.0, "numberX": 210.0, "numberY": 190.0, "source": "auto", "visible": True},
        ]
        page2_dots = [
            {"id": "p2_d1", "sequenceIndex": 1, "displayNumber": 1, "pathId": 1, "x": 120.0, "y": 120.0, "numberX": 130.0, "numberY": 110.0, "source": "auto", "visible": True},
            {"id": "p2_d2", "sequenceIndex": 2, "displayNumber": 2, "pathId": 1, "x": 220.0, "y": 220.0, "numberX": 230.0, "numberY": 210.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/export-book-pdf", json={
            "pages": [
                {"dots": page1_dots, "includeIllustration": False, "caption": "Page 1 Animal"},
                {"dots": page2_dots, "includeIllustration": False, "caption": "Page 2 Vehicle"},
            ],
            "includeAnswerKey": True,
            "answerKeyFormat": "compact_4up",
            "bookTitle": "My Pro Dot Book",
            "includeBelongsTo": True,
            "includeToc": True,
            "includeCopyright": True,
            "includeInstructions": True,
            "startMarkerStyle": "star",
            "stopMarkerStyle": "double_circle",
            "dotShape": "star",
            "numberPlacement": "badge",
        })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF"))

    def test_export_png_with_styling(self):
        dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "displayLabel": "10", "pathId": 1, "x": 100.0, "y": 100.0, "numberX": 115.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 2, "displayLabel": "20", "pathId": 1, "x": 200.0, "y": 200.0, "numberX": 215.0, "numberY": 190.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/export-png", json={
            "dots": dots,
            "dpi": 300,
            "dotShape": "ring",
            "numberPlacement": "inside",
            "startMarkerStyle": "star",
            "faintGuidelines": "dashed"
        })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "image/png")
        self.assertTrue(resp.content.startswith(b"\x89PNG"))

    def test_validator_line_crossings(self):
        # A figure-eight / bow-tie self-intersecting polygon (0,0)->(100,100)->(0,100)->(100,0)
        # Edges (d1,d2) crosses (d3,d4)
        crossing_dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "pathId": 1, "x": 100.0, "y": 100.0, "numberX": 110.0, "numberY": 90.0, "source": "manual", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 2, "pathId": 1, "x": 200.0, "y": 200.0, "numberX": 210.0, "numberY": 190.0, "source": "manual", "visible": True},
            {"id": "d3", "sequenceIndex": 3, "displayNumber": 3, "pathId": 1, "x": 100.0, "y": 200.0, "numberX": 110.0, "numberY": 190.0, "source": "manual", "visible": True},
            {"id": "d4", "sequenceIndex": 4, "displayNumber": 4, "pathId": 1, "x": 200.0, "y": 100.0, "numberX": 210.0, "numberY": 90.0, "source": "manual", "visible": True},
        ]
        resp = self.client.post("/api/validate", json={"dots": crossing_dots})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        codes = [issue["code"] for issue in data["issues"]]
        self.assertIn("LINE_CROSSINGS", codes)

    def test_validator_educational_labels_no_false_gap(self):
        # Alphabet mode: A, B, C with sequenceIndex 1, 2, 3
        edu_dots = [
            {"id": "d1", "sequenceIndex": 1, "displayNumber": 1, "displayLabel": "A", "pathId": 1, "x": 100.0, "y": 100.0, "numberX": 110.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d2", "sequenceIndex": 2, "displayNumber": 2, "displayLabel": "B", "pathId": 1, "x": 150.0, "y": 100.0, "numberX": 160.0, "numberY": 90.0, "source": "auto", "visible": True},
            {"id": "d3", "sequenceIndex": 3, "displayNumber": 3, "displayLabel": "C", "pathId": 1, "x": 200.0, "y": 100.0, "numberX": 210.0, "numberY": 90.0, "source": "auto", "visible": True},
        ]
        resp = self.client.post("/api/validate", json={"dots": edu_dots})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        codes = [issue["code"] for issue in data["issues"]]
        self.assertNotIn("SEQUENCE_GAP", codes)


if __name__ == "__main__":
    unittest.main()
