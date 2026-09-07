"""
image_processor.py
High-quality deterministic image-processing pipeline for line-art & illustrator images.
Performs grayscale normalization, adaptive/Otsu thresholding, noise reduction,
morphological line enhancement, contour extraction with hierarchy, and
Douglas-Peucker simplification with curvature/corner detection.
"""

import cv2
import numpy as np
from PIL import Image
import io
from typing import List, Dict, Any, Tuple, Optional


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """
    Loads an image from raw bytes, handling transparent PNGs by compositing onto a white canvas.
    Returns a BGR uint8 numpy array.
    """
    pil_img = Image.open(io.BytesIO(image_bytes))
    if pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info):
        # Composite onto white background
        background = Image.new("RGB", pil_img.size, (255, 255, 255))
        if pil_img.mode != "RGBA":
            pil_img = pil_img.convert("RGBA")
        background.paste(pil_img, mask=pil_img.split()[3])
        pil_img = background
    else:
        pil_img = pil_img.convert("RGB")
    
    # Convert PIL (RGB) to OpenCV (BGR)
    img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return img_bgr


from skimage.morphology import skeletonize
from scipy.spatial import cKDTree


def skeletonize_strokes(binary_lines: np.ndarray) -> np.ndarray:
    """
    Extracts the single-pixel centerline topological skeleton of ink strokes
    using the fast, battle-tested Lee/Zhang-Suen algorithm via skimage.
    Returns a binary uint8 mask (255 on centerline, 0 elsewhere).
    """
    skel = skeletonize(binary_lines > 0)
    return (skel.astype(np.uint8) * 255)


def preprocess_line_art(
    img_bgr: np.ndarray,
    noise_reduction: int = 1,
    adaptive_thresh: bool = False,
    threshold_sensitivity: int = 50
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Preprocesses the line art image:
    - Converts to grayscale
    - Applies mild Gaussian denoising
    - Applies Otsu or Adaptive thresholding modulated by threshold_sensitivity (10-90)
    - Performs morphological close to mend minor breaks in lines
    - Performs morphological open to eliminate specks
    Returns:
    - gray: Grayscale image
    - binary: Inverted binary image (lines are 255/white, background is 0/black)
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Optional mild noise reduction
    if noise_reduction > 0:
        kernel_size = 3 if noise_reduction == 1 else 5
        gray = cv2.GaussianBlur(gray, (kernel_size, kernel_size), 0)

    # Contrast normalization
    gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)

    # Thresholding modulated by sensitivity (10 = only dark heavy lines; 90 = picks up faint pencil sketches)
    sens = max(10, min(90, threshold_sensitivity))
    if adaptive_thresh:
        c_val = max(1, min(20, int(8 - (sens - 50) * 0.2)))
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, c_val
        )
    else:
        # Compute baseline Otsu threshold
        otsu_val, _ = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        # Modulate threshold based on sensitivity
        target_t = int(np.clip(otsu_val + (sens - 50) * 1.5, 20, 245))
        _, binary = cv2.threshold(gray, target_t, 255, cv2.THRESH_BINARY_INV)

    # Morphological closing to close tiny hairline gaps in strokes
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel)

    # Remove isolated tiny noise pixels (specks)
    open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, open_kernel)

    return gray, binary


def extract_outer_silhouette_contour(binary_lines: np.ndarray) -> Optional[np.ndarray]:
    """
    Extracts the clean outer silhouette of the line-art illustration using flood fill
    from the outer border. This guarantees a single outer boundary without double-line
    stroke ribbon contours.
    """
    h, w = binary_lines.shape
    # Create padded canvas to ensure floodfill can reach all exterior borders
    pad = 10
    padded = cv2.copyMakeBorder(binary_lines, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    
    # Inverted: 255 is paper background, 0 is line art
    paper = cv2.bitwise_not(padded)

    # Flood fill from outer corner
    mask = np.zeros((h + 2 * pad + 2, w + 2 * pad + 2), np.uint8)
    filled = paper.copy()
    cv2.floodFill(filled, mask, (0, 0), 128)

    # Everything that was NOT reached by the outer floodfill is the subject
    subject_mask = (filled != 128).astype(np.uint8) * 255

    # Crop padding back
    subject_cropped = subject_mask[pad:pad + h, pad:pad + w]

    # Find external contours of the subject mask
    contours, _ = cv2.findContours(subject_cropped, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None

    # Pick the largest contour by area
    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < (h * w * 0.01): # At least 1% of canvas
        return None
    return largest


def calculate_contour_curvature(pts: np.ndarray, window: int = 2) -> np.ndarray:
    """
    Calculates the curvature (deflection angle in degrees) at each vertex of a closed polygonal contour.
    A higher angle corresponds to a sharp corner, snout, ear tip, or abrupt curve.
    """
    n = len(pts)
    if n < 3:
        return np.zeros(n)

    angles = np.zeros(n)
    w = max(1, min(window, n // 4))

    for i in range(n):
        p_prev = pts[(i - w) % n].astype(float)
        p_curr = pts[i].astype(float)
        p_next = pts[(i + w) % n].astype(float)

        v1 = p_curr - p_prev
        v2 = p_next - p_curr

        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)

        if norm1 < 1e-6 or norm2 < 1e-6:
            angles[i] = 0.0
            continue

        dot = np.dot(v1, v2) / (norm1 * norm2)
        dot = np.clip(dot, -1.0, 1.0)
        # Angle in degrees between incoming and outgoing direction vectors
        angles[i] = np.degrees(np.arccos(dot))

    return angles


def analyze_line_art(
    img_bgr: np.ndarray,
    noise_reduction: int = 1,
    adaptive_thresh: bool = False,
    simplification_factor: float = 0.012,
    threshold_sensitivity: int = 50,
    snap_to_centerline: bool = True
) -> Dict[str, Any]:
    """
    Full deterministic image analysis:
    - Preprocesses the image with sensitivity tuning
    - Extracts the single-pixel stroke centerline skeleton
    - Extracts the outer silhouette
    - Extracts major internal contours
    - Simplifies curves with Douglas-Peucker & detects sharp corner anchors
    - Analyzes curvature and corner points
    Returns a dictionary of analysis results ready for dot budget allocation.
    """
    h, w = img_bgr.shape[:2]
    gray, binary = preprocess_line_art(
        img_bgr,
        noise_reduction=noise_reduction,
        adaptive_thresh=adaptive_thresh,
        threshold_sensitivity=threshold_sensitivity
    )

    # Stroke centerline skeleton
    skel_img = skeletonize_strokes(binary)
    skel_pts = np.argwhere(skel_img > 0)[:, ::-1] # (x, y) coordinates

    # 1. Main outer silhouette
    outer_contour = extract_outer_silhouette_contour(binary)

    # 2. Extract internal line structures
    # Using RETR_CCOMP or RETR_TREE to capture internal details
    all_contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)

    # Minimum perimeter threshold to ignore tiny dust particles or specks
    min_perimeter = max(30.0, (w + h) * 0.03)

    raw_contour_groups = []

    # If outer contour was found via floodfill, treat it as contour 0 (primary)
    if outer_contour is not None:
        peri = cv2.arcLength(outer_contour, True)
        if peri >= min_perimeter:
            raw_contour_groups.append({
                "type": "outer",
                "contour": outer_contour,
                "perimeter": peri,
                "area": cv2.contourArea(outer_contour),
                "is_closed": True
            })

    # Add significant internal/secondary contours
    for c in all_contours:
        peri = cv2.arcLength(c, True)
        area = cv2.contourArea(c)
        if peri < min_perimeter:
            continue

        # Check if this contour is just the identical outer boundary
        if outer_contour is not None:
            # If bounding boxes are almost identical to canvas or outer contour, skip duplicate
            bx, by, bw, bh = cv2.boundingRect(c)
            ox, oy, ow, oh = cv2.boundingRect(outer_contour)
            if abs(bx - ox) < 10 and abs(by - oy) < 10 and abs(bw - ow) < 10 and abs(bh - oh) < 10:
                continue

        raw_contour_groups.append({
            "type": "inner",
            "contour": c,
            "perimeter": peri,
            "area": area,
            "is_closed": True
        })

    # If no outer contour was detected via floodfill, pick the largest contour as outer
    if not any(g["type"] == "outer" for g in raw_contour_groups) and raw_contour_groups:
        raw_contour_groups.sort(key=lambda g: g["perimeter"], reverse=True)
        raw_contour_groups[0]["type"] = "outer"

    # Sort inner contours by significance (perimeter length + area)
    inner_groups = [g for g in raw_contour_groups if g["type"] == "inner"]
    inner_groups.sort(key=lambda g: g["perimeter"] + np.sqrt(max(0, g["area"])), reverse=True)

    # Keep only the top most significant inner contours (e.g., top 6) to keep puzzle clean & children-friendly
    selected_groups = [g for g in raw_contour_groups if g["type"] == "outer"] + inner_groups[:6]

    # Process each contour: Douglas-Peucker simplification + curvature
    processed_contours = []
    for g in selected_groups:
        c = g["contour"]
        peri = g["perimeter"]

        # Adaptive Douglas-Peucker epsilon
        # Outer silhouette gets slightly more detail, inner gets cleaner lines
        epsilon = max(2.0, peri * simplification_factor)
        approx = cv2.approxPolyDP(c, epsilon, True)
        pts = approx.reshape((-1, 2))

        if len(pts) < 3:
            continue

        curvatures = calculate_contour_curvature(pts)

        # Detect sharp corners (e.g. angle >= 28 deg for high-fidelity apex capture)
        corners = [i for i, angle in enumerate(curvatures) if angle >= 28.0]

        contour_dict = {
            "type": g["type"],
            "points": pts.tolist(),
            "curvatures": curvatures.tolist(),
            "corners": corners,
            "perimeter": float(peri),
            "area": float(g["area"]),
            "is_closed": True
        }

        # Store raw contour and skeleton points for the outer silhouette
        if g["type"] == "outer":
            contour_dict["raw_contour"] = c.reshape((-1, 2)).tolist()
            if len(skel_pts) > 0:
                # Subsample skeleton pixels if large to keep payload fast & light
                step_skel = max(1, len(skel_pts) // 3000)
                contour_dict["skeleton_pixels"] = skel_pts[::step_skel].tolist()

        processed_contours.append(contour_dict)

    return {
        "image_width": w,
        "image_height": h,
        "contours": processed_contours,
        "snap_to_centerline": snap_to_centerline
    }
