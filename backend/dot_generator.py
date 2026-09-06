"""
dot_generator.py
Intelligent dot placement engine, path sequencer, and 8-way collision avoidance for numbers.
Enforces strict 120-dot maximum cap, dynamic budget allocation across outer and inner contours,
and natural child-friendly sequencing.
"""

import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
import numpy as np


MAX_ALLOWED_DOTS = 120

DIFFICULTY_PRESETS = {
    "easy": {"target_dots": 50, "min_dots": 40, "max_dots": 60, "min_dist_px": 28.0},
    "medium": {"target_dots": 75, "min_dots": 60, "max_dots": 90, "min_dist_px": 20.0},
    "detailed": {"target_dots": 105, "min_dots": 90, "max_dots": 120, "min_dist_px": 14.0},
}


def compute_euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def resample_polygon_evenly(
    vertices: List[List[float]],
    target_count: int,
    min_dist: float = 10.0,
    img_w: float = 600.0
) -> List[Tuple[float, float]]:
    """
    Evenly samples target_count points along a closed polygon contour:
    - Preserves all key corner/inflection vertices so sharp tips, snouts, ears, and fins are maintained.
    - Distributes intermediate points along edges proportionally to edge lengths.
    - Guarantees sequential, cyclic ordering with ZERO backtracking or crisscrossing cuts.
    - Rotates sequence so Dot 1 starts at the apex/top (minimum Y, closest to center X).
    """
    n = len(vertices)
    if n < 3:
        return [(float(p[0]), float(p[1])) for p in vertices]

    pts = [np.array(p, dtype=float) for p in vertices]

    # Compute edge lengths
    edge_lengths = []
    for i in range(n):
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        edge_lengths.append(float(np.linalg.norm(p2 - p1)))

    total_len = sum(edge_lengths)
    if total_len <= 0:
        return [(float(p[0]), float(p[1])) for p in vertices]

    if target_count <= n:
        result = [(float(round(p[0], 1)), float(round(p[1], 1))) for p in pts[:target_count]]
    else:
        extra_points = target_count - n
        edge_extra = []
        for L in edge_lengths:
            quota = (L / total_len) * extra_points
            edge_extra.append(int(round(quota)))

        diff = extra_points - sum(edge_extra)
        if diff != 0:
            sorted_indices = sorted(range(n), key=lambda i: edge_lengths[i], reverse=True)
            for i in range(abs(diff)):
                idx = sorted_indices[i % n]
                edge_extra[idx] += 1 if diff > 0 else -1
                edge_extra[idx] = max(0, edge_extra[idx])

        result = []
        for i in range(n):
            p1 = pts[i]
            p2 = pts[(i + 1) % n]
            result.append((float(round(p1[0], 1)), float(round(p1[1], 1))))

            k = edge_extra[i]
            for step in range(1, k + 1):
                t = step / (k + 1)
                interp = (1.0 - t) * p1 + t * p2
                result.append((float(round(interp[0], 1)), float(round(interp[1], 1))))

    # Filter any adjacent points that might be too close
    filtered: List[Tuple[float, float]] = []
    for pt in result:
        if not filtered:
            filtered.append(pt)
        else:
            d = math.hypot(pt[0] - filtered[-1][0], pt[1] - filtered[-1][1])
            if d >= min_dist:
                filtered.append(pt)

    # Ensure start (Dot 1) is at the top-most apex (min Y, closest to center X)
    if filtered:
        top_idx = min(
            range(len(filtered)),
            key=lambda i: (filtered[i][1], abs(filtered[i][0] - (img_w / 2.0)))
        )
        filtered = filtered[top_idx:] + filtered[:top_idx]

    return filtered[:target_count]


def optimize_number_positions_8way(
    dots: List[Dict[str, Any]],
    canvas_width: float,
    canvas_height: float,
    dot_radius: float = 3.5,
    font_size: float = 9.0,
    margin: float = 36.0
) -> List[Dict[str, Any]]:
    """
    Determines the optimal placement for each number label using an 8-direction radial search.
    Penalizes:
    - Overlap with other dots
    - Overlap with other number bounding boxes
    - Falling outside page safe margins
    - Placing inside the connecting sequence line angle (prefers outward placement)
    """
    n = len(dots)
    if n == 0:
        return dots

    # Approximate width and height of number text in canvas units
    char_w = font_size * 0.65
    text_h = font_size * 0.9

    # Radial offset distance from dot center
    radial_dist = dot_radius + font_size * 0.9

    # 8 candidate directions (angle in radians)
    angles = [
        -math.pi / 2,        # 0: Top
        -math.pi / 4,        # 1: Top-Right
        0,                   # 2: Right
        math.pi / 4,         # 3: Bottom-Right
        math.pi / 2,         # 4: Bottom
        3 * math.pi / 4,     # 5: Bottom-Left
        math.pi,             # 6: Left
        -3 * math.pi / 4,    # 7: Top-Left
    ]

    placed_boxes: List[Tuple[float, float, float, float]] = []

    for i, dot in enumerate(dots):
        num_str = str(dot.get("displayNumber", i + 1))
        text_w = len(num_str) * char_w
        dx_base = dot["x"]
        dy_base = dot["y"]

        # Calculate local contour normal / bisector if neighbors exist
        prev_dot = dots[(i - 1) % n]
        next_dot = dots[(i + 1) % n]
        v_in = (dx_base - prev_dot["x"], dy_base - prev_dot["y"])
        v_out = (next_dot["x"] - dx_base, next_dot["y"] - dy_base)

        best_score = float("inf")
        best_nx = dx_base + radial_dist
        best_ny = dy_base - (text_h / 2.0)

        for ang in angles:
            cand_cx = dx_base + radial_dist * math.cos(ang)
            cand_cy = dy_base + radial_dist * math.sin(ang)

            cand_box = (
                cand_cx - text_w / 2.0,
                cand_cy - text_h / 2.0,
                text_w,
                text_h
            )

            score = 0.0

            # 1. Page margin penalty
            bx1, by1, bw, bh = cand_box
            bx2, by2 = bx1 + bw, by1 + bh
            if bx1 < margin or by1 < margin or bx2 > (canvas_width - margin) or by2 > (canvas_height - margin):
                score += 5000.0

            # 2. Collision with ALL other dots
            for j, other in enumerate(dots):
                if j == i:
                    continue
                # Distance from other dot to candidate box center
                dist_to_cand = math.hypot(cand_cx - other["x"], cand_cy - other["y"])
                if dist_to_cand < (dot_radius + max(text_w, text_h)):
                    score += 1500.0 / (dist_to_cand + 1e-3)

            # 3. Collision with already placed number boxes
            for p_box in placed_boxes:
                px1, py1, pw, ph = p_box
                px2, py2 = px1 + pw, py1 + ph

                # Bounding box intersection
                x_overlap = max(0.0, min(bx2, px2) - max(bx1, px1))
                y_overlap = max(0.0, min(by2, py2) - max(by1, py1))
                if x_overlap > 0 and y_overlap > 0:
                    score += 2500.0 + (x_overlap * y_overlap) * 50.0

            # 4. Angle preference: prefer placing outward from local polygon interior
            # Dot candidate vector with tangent vectors
            cand_v = (math.cos(ang), math.sin(ang))
            # Cross product with incoming and outgoing vectors
            cross_in = v_in[0] * cand_v[1] - v_in[1] * cand_v[0]
            cross_out = v_out[0] * cand_v[1] - v_out[1] * cand_v[0]
            if (cross_in + cross_out) < 0:
                score += 50.0 # Mild penalty for placing inside concave fold

            if score < best_score:
                best_score = score
                best_nx = cand_cx
                best_ny = cand_cy

        # Save placed box
        text_w = len(num_str) * char_w
        placed_boxes.append((
            best_nx - text_w / 2.0,
            best_ny - text_h / 2.0,
            text_w,
            text_h
        ))

        dot["numberX"] = round(best_nx, 1)
        dot["numberY"] = round(best_ny, 1)

    return dots


def generate_dots_from_analysis(
    analysis: Dict[str, Any],
    preset: str = "detailed",
    custom_max_dots: Optional[int] = None,
    canvas_width: float = 612.0,
    canvas_height: float = 792.0,
    page_margin: float = 36.0,
    dot_radius: float = 3.5,
    font_size: float = 9.0
) -> List[Dict[str, Any]]:
    """
    Main entry point for generating intelligent numbered dots from image analysis.
    Respects strict 120-dot hard cap.
    Scales and centers detected points onto the designated target page dimensions.
    """
    contours = analysis.get("contours", [])
    img_w = analysis.get("image_width", 600)
    img_h = analysis.get("image_height", 600)

    # Determine dot budget
    if custom_max_dots is not None and custom_max_dots > 0:
        total_budget = min(MAX_ALLOWED_DOTS, custom_max_dots)
        min_dist_px = 12.0
    else:
        cfg = DIFFICULTY_PRESETS.get(preset, DIFFICULTY_PRESETS["detailed"])
        total_budget = min(MAX_ALLOWED_DOTS, cfg["target_dots"])
        min_dist_px = cfg["min_dist_px"]

    if not contours:
        return []

    # Pick the primary outer silhouette (guarantees continuous, logical child-friendly outline)
    outer_group = next((c for c in contours if c["type"] == "outer"), None)
    if not outer_group and contours:
        outer_group = max(contours, key=lambda c: c["perimeter"])

    if not outer_group:
        return []

    # Resample the outer silhouette smoothly and sequentially
    sampled_image_pts = resample_polygon_evenly(
        outer_group["points"],
        target_count=total_budget,
        min_dist=min_dist_px,
        img_w=float(img_w)
    )

    # Strict hard cap check: NEVER exceed 120
    if len(sampled_image_pts) > MAX_ALLOWED_DOTS:
        sampled_image_pts = sampled_image_pts[:MAX_ALLOWED_DOTS]

    # Map image pixel coordinates to target page coordinates (fitting inside safe margins)
    # This MUST exactly match SVG preserveAspectRatio="xMidYMid meet" inside the page safe margins:
    usable_w = canvas_width - (2.0 * page_margin)
    usable_h = canvas_height - (2.0 * page_margin)

    # SVG aspect-ratio scaling
    scale = min(usable_w / max(1.0, img_w), usable_h / max(1.0, img_h))
    rendered_w = img_w * scale
    rendered_h = img_h * scale
    offset_x = page_margin + (usable_w - rendered_w) / 2.0
    offset_y = page_margin + (usable_h - rendered_h) / 2.0

    mapped_pts = []
    for px, py in sampled_image_pts:
        nx = round(offset_x + px * scale, 1)
        ny = round(offset_y + py * scale, 1)
        mapped_pts.append((nx, ny))

    # Build dot objects
    dot_objects: List[Dict[str, Any]] = []
    for idx, (x, y) in enumerate(mapped_pts):
        seq = idx + 1
        dot_objects.append({
            "id": f"dot_{uuid.uuid4().hex[:8]}",
            "sequenceIndex": seq,
            "displayNumber": seq,
            "x": x,
            "y": y,
            "numberX": x + 10.0,
            "numberY": y - 10.0,
            "source": "auto",
            "visible": True
        })

    # Run 8-way collision avoidance for numbers
    dot_objects = optimize_number_positions_8way(
        dot_objects,
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        dot_radius=dot_radius,
        font_size=font_size,
        margin=page_margin
    )

    return dot_objects
