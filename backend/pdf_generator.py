"""
pdf_generator.py
Print-ready vector PDF and high-resolution PNG generation for Amazon KDP & D2D.
Supports:
- Individual puzzle pages with vector dots, sequence numbering, and optional hybrid illustration
- Bottom-middle object name / puzzle caption strictly inside KDP print-safe margins
- Optional Front Matter pages:
  1. "This Book Belongs To" page with decorative border and write-in line
  2. Copyright & Disclaimer page compliant with KDP self-publishing standards
  3. Dynamic Table of Contents listing puzzle names and page numbers
  4. "How to Solve Dot-to-Dot" illustrated instructions page
- Solution / Answer Key pages at the back of the book
"""

import io
import base64
from typing import List, Dict, Any, Optional
import numpy as np
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont


def _render_belongs_to_page(c: canvas.Canvas, width_pt: float, height_pt: float, page_margin: float):
    """Renders a decorative 'This Book Belongs To' page."""
    c.setFillColor(colors.white)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)

    # Double decorative frame inside safe margins
    c.setStrokeColor(colors.Color(0.15, 0.15, 0.15))
    c.setLineWidth(2.5)
    c.rect(page_margin + 8, page_margin + 8, width_pt - 2 * page_margin - 16, height_pt - 2 * page_margin - 16, fill=0, stroke=1)
    c.setLineWidth(1.0)
    c.rect(page_margin + 14, page_margin + 14, width_pt - 2 * page_margin - 28, height_pt - 2 * page_margin - 28, fill=0, stroke=1)

    # Header
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width_pt / 2.0, height_pt * 0.62, "THIS BOOK BELONGS TO:")

    # Dotted line for child's name
    c.setLineWidth(1.5)
    c.setDash([3, 4], 0)
    c.line(width_pt * 0.2, height_pt * 0.48, width_pt * 0.8, height_pt * 0.48)
    c.setDash([], 0)

    c.setFont("Helvetica-Oblique", 13)
    c.setFillColor(colors.Color(0.35, 0.35, 0.35))
    c.drawCentredString(width_pt / 2.0, height_pt * 0.44, "Artist & Puzzle Master")

    # Small friendly footer note
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.Color(0.4, 0.4, 0.4))
    c.drawCentredString(width_pt / 2.0, page_margin + 28, "Have fun connecting dots and coloring your creations!")

    c.showPage()


def _render_copyright_page(c: canvas.Canvas, book_title: str, width_pt: float, height_pt: float, page_margin: float):
    """Renders an Amazon KDP & D2D compliant Copyright and Disclaimer page."""
    c.setFillColor(colors.white)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)

    y = height_pt * 0.48
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.black)
    c.drawCentredString(width_pt / 2.0, y, book_title.upper() if book_title else "DOT-TO-DOT PUZZLE BOOK")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.Color(0.2, 0.2, 0.2))

    notices = [
        "Copyright © 2026. All Rights Reserved.",
        "Independently published for Amazon KDP & global distribution.",
        "",
        "No part of this publication may be reproduced, stored in a retrieval system,",
        "or transmitted in any form or by any means—electronic, mechanical, recording,",
        "photocopying, or otherwise—without prior written permission of the copyright owner.",
        "",
        "Disclaimer: This puzzle book is designed for entertainment, educational development,",
        "fine motor skills practice, and creative fun. Suitable for kids and all ages."
    ]
    y -= 30
    for line in notices:
        c.drawCentredString(width_pt / 2.0, y, line)
        y -= 14

    c.showPage()


def _render_table_of_contents(c: canvas.Canvas, pages: List[Dict[str, Any]], width_pt: float, height_pt: float, page_margin: float):
    """Renders a clean Table of Contents with puzzle names and page numbers."""
    c.setFillColor(colors.white)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(colors.black)
    c.drawCentredString(width_pt / 2.0, height_pt - page_margin - 30, "TABLE OF CONTENTS")

    c.setLineWidth(1.2)
    c.line(page_margin + 15, height_pt - page_margin - 44, width_pt - page_margin - 15, height_pt - page_margin - 44)

    y = height_pt - page_margin - 75
    c.setFont("Helvetica-Bold", 10)
    c.drawString(page_margin + 20, y, "PUZZLE TITLE")
    c.drawRightString(width_pt - page_margin - 20, y, "PAGE")
    y -= 15

    c.setLineWidth(0.5)
    c.line(page_margin + 20, y + 5, width_pt - page_margin - 20, y + 5)
    y -= 15

    c.setFont("Helvetica", 10)
    line_h = min(20.0, max(13.0, (y - page_margin - 35) / max(1, len(pages))))

    for idx, p in enumerate(pages):
        if y < page_margin + 30:
            break
        caption = p.get("caption") or f"Puzzle {idx + 1}"
        page_title = f"{idx + 1}.  {caption.upper()}"
        num_str = str(idx + 1)

        c.drawString(page_margin + 20, y, page_title)
        c.drawRightString(width_pt - page_margin - 20, y, num_str)

        title_w = c.stringWidth(page_title, "Helvetica", 10)
        num_w = c.stringWidth(num_str, "Helvetica", 10)
        c.setDash([1, 4], 0)
        c.line(page_margin + 20 + title_w + 8, y + 3, width_pt - page_margin - 20 - num_w - 8, y + 3)
        c.setDash([], 0)

        y -= line_h

    c.showPage()


def _render_instructions_page(c: canvas.Canvas, width_pt: float, height_pt: float, page_margin: float):
    """Renders an illustrated 'How to Solve' instructions page."""
    c.setFillColor(colors.white)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(colors.black)
    c.drawCentredString(width_pt / 2.0, height_pt - page_margin - 30, "HOW TO SOLVE DOT-TO-DOT")

    c.setLineWidth(1.2)
    c.line(page_margin + 15, height_pt - page_margin - 44, width_pt - page_margin - 15, height_pt - page_margin - 44)

    steps = [
        ("1. FIND NUMBER 1", "Begin by finding dot number 1 on the page. Place your pencil or crayon right on it."),
        ("2. FOLLOW THE NUMBERS", "Draw a smooth line from dot 1 to dot 2, then to dot 3, continuing in numerical order (1, 2, 3, 4...)."),
        ("3. REVEAL THE MYSTERY PICTURE", "Keep connecting the numbers until you reach the final dot to complete the outline."),
        ("4. COLOR YOUR MASTERPIECE", "Now the exciting part! Use your favorite colors, crayons, or markers to bring your picture to life!")
    ]

    y = height_pt - page_margin - 95
    for title, desc in steps:
        c.setFont("Helvetica-Bold", 13)
        c.setFillColor(colors.black)
        c.drawString(page_margin + 25, y, title)
        y -= 18

        c.setFont("Helvetica", 10)
        c.setFillColor(colors.Color(0.25, 0.25, 0.25))
        c.drawString(page_margin + 25, y, desc)
        y -= 36

    c.showPage()


def _render_page_content(
    c: canvas.Canvas,
    dots: List[Dict[str, Any]],
    width_pt: float,
    height_pt: float,
    page_margin: float,
    dot_radius_pt: float,
    font_size_pt: float,
    include_answer_key: bool = False,
    include_illustration: bool = True,
    illustration_image_base64: Optional[str] = None,
    caption: Optional[str] = None
):
    """Renders a single puzzle page onto a ReportLab Canvas."""
    # 1. Pure white background
    c.setFillColor(colors.white)
    c.rect(0, 0, width_pt, height_pt, fill=1, stroke=0)

    # 2. Optional Hybrid Illustration Line-Art Layer (placed underneath dots)
    if include_illustration and illustration_image_base64:
        try:
            raw_b64 = illustration_image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(raw_b64)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")

            # Clean near-white pixels to transparent so pure black line art sits cleanly on paper
            arr = np.array(pil_img)
            white_mask = (arr[:, :, 0] > 235) & (arr[:, :, 1] > 235) & (arr[:, :, 2] > 235)
            arr[white_mask, 3] = 0
            pil_img = Image.fromarray(arr)

            clean_buf = io.BytesIO()
            pil_img.save(clean_buf, format="PNG")
            clean_buf.seek(0)

            img_w, img_h = pil_img.size
            usable_w = width_pt - (2.0 * page_margin)
            usable_h = height_pt - (2.0 * page_margin)

            scale = min(usable_w / max(1.0, img_w), usable_h / max(1.0, img_h))
            rendered_w = img_w * scale
            rendered_h = img_h * scale
            offset_x = page_margin + (usable_w - rendered_w) / 2.0
            offset_y = page_margin + (usable_h - rendered_h) / 2.0

            pdf_img_y = height_pt - offset_y - rendered_h
            img_reader = ImageReader(clean_buf)
            c.drawImage(
                img_reader,
                offset_x,
                pdf_img_y,
                width=rendered_w,
                height=rendered_h,
                mask="auto"
            )
        except Exception as e:
            print(f"Error embedding illustration in PDF: {e}")

    # 3. Optional Answer Key connecting lines
    if include_answer_key and len(dots) > 1:
        c.setStrokeColor(colors.Color(0.2, 0.2, 0.2)) # Dark charcoal / black
        c.setLineWidth(0.75)
        path = c.beginPath()
        sorted_dots = sorted(dots, key=lambda d: d.get("sequenceIndex", 0))
        first_d = sorted_dots[0]
        path.moveTo(first_d["x"], height_pt - first_d["y"])
        for d in sorted_dots[1:]:
            path.lineTo(d["x"], height_pt - d["y"])
        c.drawPath(path, stroke=1, fill=0)

    # 4. Draw black dots
    c.setFillColor(colors.black)
    c.setStrokeColor(colors.black)

    for d in dots:
        if not d.get("visible", True):
            continue
        x = d["x"]
        y_pdf = height_pt - d["y"]
        c.circle(x, y_pdf, dot_radius_pt, fill=1, stroke=0)

    # 5. Draw black numbers
    c.setFont("Helvetica-Bold", font_size_pt)

    for d in dots:
        if not d.get("visible", True):
            continue
        num_str = str(d.get("displayNumber", ""))
        nx = d.get("numberX", d["x"] + dot_radius_pt + 3)
        ny_pdf = height_pt - d.get("numberY", d["y"]) - (font_size_pt * 0.35)
        c.drawCentredString(nx, ny_pdf, num_str)

    # 6. Bottom-Middle Puzzle Caption (strictly clamped inside Amazon KDP safe margin)
    if caption and caption.strip():
        clean_cap = caption.strip().upper()
        usable_w = width_pt - 2.0 * page_margin
        cap_font_size = min(18, max(10, int((usable_w - 24) / (len(clean_cap) * 0.72))))
        c.setFont("Helvetica-Bold", cap_font_size)
        c.setFillColor(colors.black)
        c.drawCentredString(width_pt / 2.0, page_margin + 12, clean_cap)


def generate_vector_pdf(
    dots: List[Dict[str, Any]],
    width_pt: float = 612.0,
    height_pt: float = 792.0,
    page_margin: float = 36.0,
    dot_radius_pt: float = 3.5,
    font_size_pt: float = 9.0,
    include_answer_key: bool = False,
    include_illustration: bool = True,
    illustration_image_base64: Optional[str] = None,
    caption: Optional[str] = None
) -> bytes:
    """Generates a single-page vector PDF."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width_pt, height_pt))

    _render_page_content(
        c=c,
        dots=dots,
        width_pt=width_pt,
        height_pt=height_pt,
        page_margin=page_margin,
        dot_radius_pt=dot_radius_pt,
        font_size_pt=font_size_pt,
        include_answer_key=include_answer_key,
        include_illustration=include_illustration,
        illustration_image_base64=illustration_image_base64,
        caption=caption
    )
    c.showPage()
    c.save()
    return buffer.getvalue()


def generate_book_pdf(
    pages: List[Dict[str, Any]],
    width_pt: float = 612.0,
    height_pt: float = 792.0,
    page_margin: float = 36.0,
    dot_radius_pt: float = 3.5,
    font_size_pt: float = 9.0,
    include_answer_key: bool = False,
    book_title: str = "Dot-to-Dot Puzzle Book",
    include_belongs_to: bool = False,
    include_toc: bool = False,
    include_copyright: bool = False,
    include_instructions: bool = False
) -> bytes:
    """
    Generates a complete multi-page PDF book for Amazon KDP & D2D.
    Supports optional Front Matter pages:
      - This Book Belongs To
      - Copyright & Disclaimer
      - Table of Contents
      - How to Solve Instructions
    Followed by puzzle pages and optional answer key pages at the end.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width_pt, height_pt))

    # 1. Front Matter: "This Book Belongs To" page
    if include_belongs_to:
        _render_belongs_to_page(c, width_pt, height_pt, page_margin)

    # 2. Front Matter: Copyright & Disclaimer page
    if include_copyright:
        _render_copyright_page(c, book_title, width_pt, height_pt, page_margin)

    # 3. Front Matter: Table of Contents
    if include_toc:
        _render_table_of_contents(c, pages, width_pt, height_pt, page_margin)

    # 4. Front Matter: How to Solve Instructions page
    if include_instructions:
        _render_instructions_page(c, width_pt, height_pt, page_margin)

    # 5. Render each puzzle page
    for p in pages:
        p_dots = p.get("dots", [])
        inc_illus = p.get("includeIllustration", True)
        illus_b64 = p.get("illustrationImageBase64", None)
        cap = p.get("caption", None)

        _render_page_content(
            c=c,
            dots=p_dots,
            width_pt=width_pt,
            height_pt=height_pt,
            page_margin=page_margin,
            dot_radius_pt=dot_radius_pt,
            font_size_pt=font_size_pt,
            include_answer_key=False,  # Puzzle pages don't have lines
            include_illustration=inc_illus,
            illustration_image_base64=illus_b64,
            caption=cap
        )
        c.showPage()

    # 6. Append Solution / Answer Key pages at the back if requested
    if include_answer_key:
        for idx, p in enumerate(pages):
            p_dots = p.get("dots", [])
            if not p_dots:
                continue
            inc_illus = p.get("includeIllustration", True)
            illus_b64 = p.get("illustrationImageBase64", None)
            cap = p.get("caption", None)

            _render_page_content(
                c=c,
                dots=p_dots,
                width_pt=width_pt,
                height_pt=height_pt,
                page_margin=page_margin,
                dot_radius_pt=dot_radius_pt * 0.8,
                font_size_pt=font_size_pt * 0.8,
                include_answer_key=True,  # Solution lines drawn
                include_illustration=inc_illus,
                illustration_image_base64=illus_b64,
                caption=f"{cap} (Answer Key)" if cap else f"Answer Key - Page {idx + 1}"
            )
            # Add header banner at top of answer page
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.black)
            c.drawCentredString(width_pt / 2.0, height_pt - page_margin / 2.0, f"Answer Key - Page {idx + 1}")
            c.showPage()

    c.save()
    return buffer.getvalue()


def generate_raster_png(
    dots: List[Dict[str, Any]],
    width_pt: float = 612.0,
    height_pt: float = 792.0,
    page_margin: float = 36.0,
    dot_radius_pt: float = 3.5,
    font_size_pt: float = 9.0,
    dpi: int = 300,
    include_answer_key: bool = False,
    include_illustration: bool = True,
    illustration_image_base64: Optional[str] = None,
    caption: Optional[str] = None
) -> bytes:
    """
    Generates a print-ready 300 or 600 DPI PNG with anti-aliasing.
    - Pure white background.
    - Optional Hybrid Illustration Layer.
    - Pure black dots and numbers.
    - Bottom-middle puzzle caption inside safe margins.
    """
    scale = dpi / 72.0
    pixel_w = int(round(width_pt * scale))
    pixel_h = int(round(height_pt * scale))

    # Render with 2x supersampling for ultra-crisp text and edges
    ss_scale = 2
    img = Image.new("RGBA", (pixel_w * ss_scale, pixel_h * ss_scale), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)

    total_scale = scale * ss_scale
    dot_r_px = dot_radius_pt * total_scale
    font_size_px = int(round(font_size_pt * total_scale))

    # Paste Hybrid Illustration Layer if requested
    if include_illustration and illustration_image_base64:
        try:
            raw_b64 = illustration_image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(raw_b64)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")

            # Clean near-white pixels to transparent so only line art is drawn
            arr = np.array(pil_img)
            white_mask = (arr[:, :, 0] > 235) & (arr[:, :, 1] > 235) & (arr[:, :, 2] > 235)
            arr[white_mask, 3] = 0
            pil_img = Image.fromarray(arr)

            img_w, img_h = pil_img.size
            usable_w = width_pt - (2.0 * page_margin)
            usable_h = height_pt - (2.0 * page_margin)

            fit_scale = min(usable_w / max(1.0, img_w), usable_h / max(1.0, img_h))
            rendered_w = int(round(img_w * fit_scale * total_scale))
            rendered_h = int(round(img_h * fit_scale * total_scale))
            offset_x = int(round((page_margin + (usable_w - img_w * fit_scale) / 2.0) * total_scale))
            offset_y = int(round((page_margin + (usable_h - img_h * fit_scale) / 2.0) * total_scale))

            resized_illus = pil_img.resize((rendered_w, rendered_h), Image.Resampling.LANCZOS)
            img.paste(resized_illus, (offset_x, offset_y), resized_illus)
        except Exception as e:
            print(f"Error embedding illustration in PNG: {e}")

    try:
        font = ImageFont.truetype("arialbd.ttf", font_size_px)
    except Exception:
        try:
            font = ImageFont.truetype("arial.ttf", font_size_px)
        except Exception:
            try:
                font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size_px)
            except Exception:
                font = ImageFont.load_default()

    # Optional Answer Key lines
    if include_answer_key and len(dots) > 1:
        sorted_dots = sorted(dots, key=lambda d: d.get("sequenceIndex", 0))
        pts = [(d["x"] * total_scale, d["y"] * total_scale) for d in sorted_dots]
        line_w = max(1, int(round(1.0 * total_scale)))
        draw.line(pts, fill=(50, 50, 50), width=line_w)

    # Draw dots
    for d in dots:
        if not d.get("visible", True):
            continue
        cx = d["x"] * total_scale
        cy = d["y"] * total_scale
        draw.ellipse([cx - dot_r_px, cy - dot_r_px, cx + dot_r_px, cy + dot_r_px], fill=(0, 0, 0))

    # Draw numbers centered at exact (numberX, numberY) with anchor="mm"
    for d in dots:
        if not d.get("visible", True):
            continue
        num_str = str(d.get("displayNumber", ""))
        nx = d.get("numberX", d["x"] + dot_radius_pt + 5) * total_scale
        ny = d.get("numberY", d["y"]) * total_scale
        draw.text((nx, ny), num_str, fill=(0, 0, 0), font=font, anchor="mm")

    # Bottom-middle puzzle caption in PNG
    if caption and caption.strip():
        clean_cap = caption.strip().upper()
        cap_size_px = int(round(18.0 * total_scale))
        try:
            cap_font = ImageFont.truetype("arialbd.ttf", cap_size_px)
        except Exception:
            cap_font = font
        cap_x = (width_pt / 2.0) * total_scale
        cap_y = (height_pt - page_margin - 12) * total_scale
        draw.text((cap_x, cap_y), clean_cap, fill=(0, 0, 0), font=cap_font, anchor="mm")

    # Downscale supersampled image to final pixel dimensions using high-quality Lanczos filter
    final_img = img.resize((pixel_w, pixel_h), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    final_img.save(buffer, format="PNG", dpi=(dpi, dpi))
    return buffer.getvalue()
