"""
app.py
Local FastAPI backend for the Hybrid Dot-to-Dot Generator & Editor.
Provides deterministic image processing, dot budget generation,
8-way number collision avoidance, quality validation, vector PDF export,
and high-res PNG export.
"""

import os
import io
import re
import json
import base64
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from .image_processor import load_image_from_bytes, analyze_line_art
from .dot_generator import generate_dots_from_analysis, optimize_number_positions_8way, MAX_ALLOWED_DOTS
from .validator import validate_puzzle
from .pdf_generator import generate_vector_pdf, generate_raster_png, generate_book_pdf
from .samples import SAMPLES_DIR, create_all_samples

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)


app = FastAPI(title="Hybrid Dot-to-Dot Generator & Editor API")

# Enable CORS for local Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure sample images exist
create_all_samples()


# --- Models ---
class DotModel(BaseModel):
    id: str
    sequenceIndex: int
    displayNumber: int
    displayLabel: Optional[str] = None
    pathId: Optional[int] = 1
    x: float
    y: float
    numberX: float
    numberY: float
    source: str = "auto"
    visible: bool = True


class RepositionRequest(BaseModel):
    dots: List[DotModel]
    canvasWidth: float = 612.0
    canvasHeight: float = 792.0
    pageMargin: float = 36.0
    dotRadius: float = 3.5
    fontSize: float = 9.0


class ValidateRequest(BaseModel):
    dots: List[DotModel]
    canvasWidth: float = 612.0
    canvasHeight: float = 792.0
    pageMargin: float = 36.0
    dotRadius: float = 3.5
    fontSize: float = 9.0


class ExportPdfRequest(BaseModel):
    dots: List[DotModel]
    widthPt: float = 612.0
    heightPt: float = 792.0
    pageMargin: float = 36.0
    dotRadiusPt: float = 3.5
    fontSizePt: float = 9.0
    includeAnswerKey: bool = False
    includeIllustration: bool = True
    illustrationImageBase64: Optional[str] = None
    caption: Optional[str] = None
    startMarkerStyle: str = "star"
    stopMarkerStyle: str = "double_circle"
    faintGuidelines: str = "none"
    faintGuidelineOpacity: float = 0.18
    dotShape: str = "circle"
    numberPlacement: str = "outside"


class PageExportModel(BaseModel):
    dots: List[DotModel]
    includeIllustration: bool = True
    illustrationImageBase64: Optional[str] = None
    caption: Optional[str] = None


class ExportBookPdfRequest(BaseModel):
    pages: List[PageExportModel]
    widthPt: float = 612.0
    heightPt: float = 792.0
    pageMargin: float = 36.0
    dotRadiusPt: float = 3.5
    fontSizePt: float = 9.0
    includeAnswerKey: bool = False
    answerKeyFormat: str = "compact_4up"
    bookTitle: str = "Dot-to-Dot Puzzle Book"
    includeBelongsTo: bool = False
    includeToc: bool = False
    includeCopyright: bool = False
    includeInstructions: bool = False
    startMarkerStyle: str = "star"
    stopMarkerStyle: str = "double_circle"
    faintGuidelines: str = "none"
    faintGuidelineOpacity: float = 0.18
    dotShape: str = "circle"
    numberPlacement: str = "outside"


class ExportPngRequest(BaseModel):
    dots: List[DotModel]
    widthPt: float = 612.0
    heightPt: float = 792.0
    pageMargin: float = 36.0
    dotRadiusPt: float = 3.5
    fontSizePt: float = 9.0
    dpi: int = 300
    includeAnswerKey: bool = False
    includeIllustration: bool = True
    illustrationImageBase64: Optional[str] = None
    caption: Optional[str] = None
    startMarkerStyle: str = "star"
    stopMarkerStyle: str = "double_circle"
    faintGuidelines: str = "none"
    faintGuidelineOpacity: float = 0.18
    dotShape: str = "circle"
    numberPlacement: str = "outside"


# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "max_dots_limit": MAX_ALLOWED_DOTS}


@app.get("/api/samples")
def get_samples():
    """Returns the list of available built-in sample line-art illustrations."""
    samples = [
        {"id": "dinosaur", "title": "Baby Dinosaur", "filename": "dinosaur.png"},
        {"id": "rocket", "title": "Space Rocket", "filename": "rocket.png"},
        {"id": "cat", "title": "Cartoon Cat", "filename": "cat.png"},
        {"id": "teddy_bear", "title": "Teddy Bear", "filename": "teddy_bear.png"},
        {"id": "car", "title": "Cartoon Car", "filename": "car.png"},
        {"id": "flower", "title": "Sunflower", "filename": "flower.png"},
    ]
    return samples


@app.get("/api/samples/{filename}")
def get_sample_file(filename: str):
    """Serves a specific sample image file."""
    filepath = os.path.join(SAMPLES_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Sample not found")
    return FileResponse(filepath, media_type="image/png")


@app.post("/api/analyze-and-generate")
async def analyze_and_generate(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None),
    preset: str = Form("detailed"),
    custom_max_dots: Optional[int] = Form(None),
    noise_reduction: int = Form(1),
    adaptive_thresh: bool = Form(False),
    canvas_width: float = Form(612.0),
    canvas_height: float = Form(792.0),
    page_margin: float = Form(36.0),
    dot_radius: float = Form(3.5),
    font_size: float = Form(9.0),
    threshold_sensitivity: int = Form(50),
    snap_to_centerline: bool = Form(True)
):
    """
    Processes an uploaded image or sample image, extracts contours & curvature,
    and places up to 120 numbered dots with 8-way number collision avoidance.
    Supports adjustable line threshold sensitivity and stroke centerline snapping.
    """
    image_bytes = None

    if file and file.filename:
        image_bytes = await file.read()
    elif sample_id:
        sample_path = os.path.join(SAMPLES_DIR, f"{sample_id}.png")
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                image_bytes = f.read()
        else:
            raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found")
    else:
        # Default to dinosaur sample
        sample_path = os.path.join(SAMPLES_DIR, "dinosaur.png")
        with open(sample_path, "rb") as f:
            image_bytes = f.read()

    try:
        img_bgr = load_image_from_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")

    # 1. Run deterministic image analysis with sensitivity & centerline snapping
    analysis = analyze_line_art(
        img_bgr,
        noise_reduction=noise_reduction,
        adaptive_thresh=adaptive_thresh,
        threshold_sensitivity=threshold_sensitivity,
        snap_to_centerline=snap_to_centerline
    )

    # 2. Generate dots respecting budget (max 120)
    dots = generate_dots_from_analysis(
        analysis,
        preset=preset,
        custom_max_dots=custom_max_dots,
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        page_margin=page_margin,
        dot_radius=dot_radius,
        font_size=font_size
    )

    # Convert original image to base64 data URI for instant reference layer display
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    ref_data_uri = f"data:image/png;base64,{img_b64}"

    return {
        "success": True,
        "dots": dots,
        "total_dots": len(dots),
        "max_allowed_dots": MAX_ALLOWED_DOTS,
        "image_width": analysis["image_width"],
        "image_height": analysis["image_height"],
        "contour_count": len(analysis["contours"]),
        "reference_image": ref_data_uri
    }


@app.post("/api/reposition-numbers")
def reposition_numbers(req: RepositionRequest):
    """
    Reruns the 8-directional collision avoidance algorithm on current dots
    without altering their coordinates.
    """
    dots_dict = [d.model_dump() for d in req.dots]
    updated_dots = optimize_number_positions_8way(
        dots_dict,
        canvas_width=req.canvasWidth,
        canvas_height=req.canvasHeight,
        dot_radius=req.dotRadius,
        font_size=req.fontSize,
        margin=req.pageMargin
    )
    return {"success": True, "dots": updated_dots}


@app.post("/api/validate")
def validate_puzzle_endpoint(req: ValidateRequest):
    """
    Runs automated puzzle quality checks ("CHECK PUZZLE").
    """
    dots_dict = [d.model_dump() for d in req.dots]
    report = validate_puzzle(
        dots_dict,
        canvas_width=req.canvasWidth,
        canvas_height=req.canvasHeight,
        page_margin=req.pageMargin,
        dot_radius=req.dotRadius,
        font_size=req.fontSize
    )
    return report


@app.post("/api/export-pdf")
def export_pdf(req: ExportPdfRequest):
    """
    Generates a print-ready vector PDF with ReportLab.
    Supports Hybrid Dot-to-Dot: Whatever illustration lines remain after erasing
    can be embedded directly underneath the vector dots and numbers.
    """
    dots_dict = [d.model_dump() for d in req.dots]
    pdf_bytes = generate_vector_pdf(
        dots=dots_dict,
        width_pt=req.widthPt,
        height_pt=req.heightPt,
        page_margin=req.pageMargin,
        dot_radius_pt=req.dotRadiusPt,
        font_size_pt=req.fontSizePt,
        include_answer_key=req.includeAnswerKey,
        include_illustration=req.includeIllustration,
        illustration_image_base64=req.illustrationImageBase64,
        caption=req.caption,
        start_marker_style=req.startMarkerStyle,
        stop_marker_style=req.stopMarkerStyle,
        faint_guidelines=req.faintGuidelines,
        faint_guideline_opacity=req.faintGuidelineOpacity,
        dot_shape=req.dotShape,
        number_placement=req.numberPlacement,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=dot_to_dot_puzzle.pdf"}
    )


@app.post("/api/export-png")
def export_png(req: ExportPngRequest):
    """
    Generates a print-ready 300 or 600 DPI PNG.
    Supports Hybrid Dot-to-Dot with remaining illustration lines.
    """
    dots_dict = [d.model_dump() for d in req.dots]
    png_bytes = generate_raster_png(
        dots=dots_dict,
        width_pt=req.widthPt,
        height_pt=req.heightPt,
        page_margin=req.pageMargin,
        dot_radius_pt=req.dotRadiusPt,
        font_size_pt=req.fontSizePt,
        dpi=req.dpi,
        include_answer_key=req.includeAnswerKey,
        include_illustration=req.includeIllustration,
        illustration_image_base64=req.illustrationImageBase64,
        caption=req.caption,
        start_marker_style=req.startMarkerStyle,
        stop_marker_style=req.stopMarkerStyle,
        faint_guidelines=req.faintGuidelines,
        faint_guideline_opacity=req.faintGuidelineOpacity,
        dot_shape=req.dotShape,
        number_placement=req.numberPlacement,
    )

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename=dot_to_dot_puzzle_{req.dpi}dpi.png"}
    )


@app.post("/api/export-book-pdf")
def export_book_pdf(req: ExportBookPdfRequest):
    """
    Generates a combined multi-page vector PDF book for Amazon KDP & D2D.
    Contains all pages in sequence, with optional answer key pages at the end.
    """
    formatted_pages = []
    for p in req.pages:
        dots_dict = [d.model_dump() for d in p.dots]
        formatted_pages.append({
            "dots": dots_dict,
            "includeIllustration": p.includeIllustration,
            "illustrationImageBase64": p.illustrationImageBase64,
            "caption": p.caption,
        })

    pdf_bytes = generate_book_pdf(
        pages=formatted_pages,
        width_pt=req.widthPt,
        height_pt=req.heightPt,
        page_margin=req.pageMargin,
        dot_radius_pt=req.dotRadiusPt,
        font_size_pt=req.fontSizePt,
        include_answer_key=req.includeAnswerKey,
        answer_key_format=req.answerKeyFormat,
        book_title=req.bookTitle,
        include_belongs_to=req.includeBelongsTo,
        include_toc=req.includeToc,
        include_copyright=req.includeCopyright,
        include_instructions=req.includeInstructions,
        start_marker_style=req.startMarkerStyle,
        stop_marker_style=req.stopMarkerStyle,
        faint_guidelines=req.faintGuidelines,
        faint_guideline_opacity=req.faintGuidelineOpacity,
        dot_shape=req.dotShape,
        number_placement=req.numberPlacement,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=dot_to_dot_book.pdf"}
    )


# --- Project Management Endpoints (Local-Only Disk Storage) ---

class SaveProjectRequest(BaseModel):
    project: Dict[str, Any]
    saveLocation: Optional[str] = None
    filename: Optional[str] = None


class LoadProjectRequest(BaseModel):
    filePath: str


@app.get("/api/projects/default-location")
def get_default_location():
    """Returns the default tools projects directory path on disk."""
    os.makedirs(PROJECTS_DIR, exist_ok=True)
    return {
        "defaultLocation": PROJECTS_DIR,
        "folderName": "projects"
    }


@app.get("/api/projects")
def list_projects(folder: Optional[str] = None):
    """
    Lists all saved .dotproj project files in the tools projects folder or custom location.
    """
    target_dir = folder.strip() if (folder and folder.strip()) else PROJECTS_DIR
    if not os.path.exists(target_dir):
        return {"projects": [], "location": target_dir}

    projects = []
    for fname in os.listdir(target_dir):
        if fname.endswith((".dotproj", ".json")):
            fpath = os.path.join(target_dir, fname)
            if not os.path.isfile(fpath):
                continue
            try:
                stat = os.stat(fpath)
                mtime_str = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                meta = {
                    "filename": fname,
                    "filePath": fpath,
                    "updatedAt": mtime_str,
                    "timestamp": stat.st_mtime,
                    "sizeBytes": stat.st_size,
                    "projectName": fname.replace(".dotproj", "").replace(".json", ""),
                    "pageCount": 1,
                    "dotsCount": 0
                }
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if "projectName" in data and data["projectName"]:
                            meta["projectName"] = data["projectName"]
                        if "pages" in data and isinstance(data["pages"], list):
                            meta["pageCount"] = len(data["pages"])
                        if "dots" in data and isinstance(data["dots"], list):
                            meta["dotsCount"] = len(data["dots"])
                except Exception:
                    pass
                projects.append(meta)
            except Exception:
                continue

    projects.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return {"projects": projects, "location": target_dir}


@app.post("/api/projects/save")
def save_project_endpoint(req: SaveProjectRequest):
    """
    Saves the project data directly to the local disk in the tools projects folder
    (or custom user location) without triggering any browser downloads.
    """
    target_dir = PROJECTS_DIR
    proj_name = req.project.get("projectName", "untitled_puzzle")
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', proj_name).lower()
    default_filename = f"{safe_name}.dotproj"

    if req.saveLocation and req.saveLocation.strip():
        loc = req.saveLocation.strip()
        # If user passed a file path with extension
        if loc.endswith((".dotproj", ".json")):
            file_path = loc
            target_dir = os.path.dirname(file_path) or PROJECTS_DIR
            if target_dir:
                os.makedirs(target_dir, exist_ok=True)
            filename = os.path.basename(file_path)
        else:
            target_dir = loc
            os.makedirs(target_dir, exist_ok=True)
            filename = req.filename.strip() if req.filename and req.filename.strip() else default_filename
            file_path = os.path.join(target_dir, filename)
    else:
        os.makedirs(PROJECTS_DIR, exist_ok=True)
        filename = req.filename.strip() if req.filename and req.filename.strip() else default_filename
        file_path = os.path.join(PROJECTS_DIR, filename)

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(req.project, f, indent=2)
        
        pages_count = len(req.project.get("pages", []))
        return {
            "success": True,
            "filePath": file_path,
            "filename": filename,
            "saveLocation": target_dir,
            "pageCount": pages_count,
            "message": f"Project successfully saved to {file_path}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save project file: {str(e)}")


@app.post("/api/projects/load")
def load_project_endpoint(req: LoadProjectRequest):
    """
    Loads a saved project directly from a local file path on disk.
    """
    if not os.path.exists(req.filePath):
        raise HTTPException(status_code=404, detail=f"Project file '{req.filePath}' not found")
    try:
        with open(req.filePath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "success": True,
            "project": data,
            "filePath": req.filePath
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read project file: {str(e)}")


@app.delete("/api/projects/{filename}")
def delete_project_endpoint(filename: str, folder: Optional[str] = None):
    """Deletes a project file from disk."""
    target_dir = folder.strip() if (folder and folder.strip()) else PROJECTS_DIR
    target_path = os.path.join(target_dir, filename)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")
    try:
        os.remove(target_path)
        return {"success": True, "deleted": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

