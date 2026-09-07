"""
validator.py
Automated Quality Check system ("CHECK PUZZLE").
Validates puzzle health, dot count (hard cap 120), duplicate display numbers,
sequence gaps, overlapping dots, number collisions, margin violations, and jump gaps.
Returns actionable diagnostics with severity and offending dot IDs.
"""

import math
from typing import List, Dict, Any


def validate_puzzle(
    dots: List[Dict[str, Any]],
    canvas_width: float = 612.0,
    canvas_height: float = 792.0,
    page_margin: float = 36.0,
    dot_radius: float = 3.5,
    font_size: float = 9.0
) -> Dict[str, Any]:
    """
    Runs comprehensive diagnostic checks on current dot sequence.
    Returns:
    {
      "is_valid": bool,
      "total_dots": int,
      "error_count": int,
      "warning_count": int,
      "issues": [
         {"type": "error"|"warning"|"info", "code": str, "message": str, "dot_ids": [str]}
      ]
    }
    """
    issues = []
    total_dots = len(dots)

    # 1. Hard cap 120 dots
    if total_dots > 120:
        issues.append({
            "type": "error",
            "code": "DOT_LIMIT_EXCEEDED",
            "message": f"Maximum 120 dots exceeded! Current count is {total_dots}.",
            "dot_ids": [d["id"] for d in dots[120:]]
        })
    elif total_dots == 0:
        issues.append({
            "type": "error",
            "code": "NO_DOTS",
            "message": "No dots currently placed in the project.",
            "dot_ids": []
        })

    # 2. Duplicate numbers
    num_to_dots: Dict[int, List[str]] = {}
    for d in dots:
        num = d.get("displayNumber", 0)
        num_to_dots.setdefault(num, []).append(d["id"])

    for num, ids in num_to_dots.items():
        if len(ids) > 1:
            issues.append({
                "type": "error",
                "code": "DUPLICATE_NUMBER",
                "message": f"Duplicate number #{num} assigned to {len(ids)} different dots.",
                "dot_ids": ids
            })

    # 3. Missing numbers in sequence (gaps)
    if total_dots > 0:
        # Check if educational labels are used (e.g. letters, roman, skip counting)
        has_custom_labels = any(bool(d.get("displayLabel")) for d in dots)
        if not has_custom_labels:
            sorted_numbers = sorted(list(num_to_dots.keys()))
            min_n = min(sorted_numbers)
            max_n = max(sorted_numbers)
            expected_set = set(range(min_n, max_n + 1))
            actual_set = set(sorted_numbers)
            missing = sorted(list(expected_set - actual_set))
            if missing:
                sample_missing = ", ".join(f"#{m}" for m in missing[:5])
                if len(missing) > 5:
                    sample_missing += f" (+{len(missing) - 5} more)"
                issues.append({
                    "type": "warning",
                    "code": "SEQUENCE_GAP",
                    "message": f"Missing numbers in sequence: {sample_missing}.",
                    "dot_ids": []
                })

    # 4. Overlapping dots (Euclidean distance < 2 * dot_radius + 2px)
    min_dot_dist = dot_radius * 2.2
    for i in range(total_dots):
        d1 = dots[i]
        for j in range(i + 1, total_dots):
            d2 = dots[j]
            dist = math.hypot(d1["x"] - d2["x"], d1["y"] - d2["y"])
            if dist < min_dot_dist:
                issues.append({
                    "type": "warning",
                    "code": "DOT_OVERLAP",
                    "message": f"Dot #{d1.get('displayNumber')} and #{d2.get('displayNumber')} are overlapping or touching ({dist:.1f}px apart).",
                    "dot_ids": [d1["id"], d2["id"]]
                })

    # 5. Outside printable safe margins
    for d in dots:
        x, y = d["x"], d["y"]
        nx = d.get("numberX", x)
        ny = d.get("numberY", y)
        num = d.get("displayLabel") or d.get("displayNumber", "?")

        # Check dot
        if x < page_margin or x > (canvas_width - page_margin) or y < page_margin or y > (canvas_height - page_margin):
            issues.append({
                "type": "warning",
                "code": "DOT_OUT_OF_BOUNDS",
                "message": f"Dot #{num} is placed outside the KDP print-safe margin.",
                "dot_ids": [d["id"]]
            })
        # Check number
        elif nx < page_margin or nx > (canvas_width - page_margin) or ny < page_margin or ny > (canvas_height - page_margin):
            issues.append({
                "type": "warning",
                "code": "NUMBER_OUT_OF_BOUNDS",
                "message": f"Number #{num} label is placed outside the KDP print-safe margin.",
                "dot_ids": [d["id"]]
            })

    # 6. Large unexplained jumps across sequence (within same path island)
    diag_length = math.hypot(canvas_width, canvas_height)
    max_jump_threshold = diag_length * 0.45
    for i in range(total_dots - 1):
        d1 = dots[i]
        d2 = dots[i + 1]
        # Only check jump within the same pathId
        if (d1.get("pathId", 1) or 1) == (d2.get("pathId", 1) or 1):
            dist = math.hypot(d1["x"] - d2["x"], d1["y"] - d2["y"])
            if dist > max_jump_threshold:
                issues.append({
                    "type": "info",
                    "code": "LARGE_JUMP",
                    "message": f"Large jump ({dist:.0f}px) between sequential dots #{d1.get('displayNumber')} and #{d2.get('displayNumber')}.",
                    "dot_ids": [d1["id"], d2["id"]]
                })

    # 7. Self-Intersecting Lines / Line Crossings within path islands
    def _ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])

    def _segments_intersect(p1, p2, p3, p4) -> bool:
        return (_ccw(p1, p3, p4) != _ccw(p2, p3, p4)) and (_ccw(p1, p2, p3) != _ccw(p1, p2, p4))

    path_groups: Dict[int, List[Dict[str, Any]]] = {}
    for d in sorted(dots, key=lambda x: x.get("sequenceIndex", 0)):
        pid = d.get("pathId", 1) or 1
        path_groups.setdefault(pid, []).append(d)

    crossing_count = 0
    crossing_dot_ids = set()
    for pid, p_dots in path_groups.items():
        n = len(p_dots)
        if n < 4:
            continue
        for i in range(n - 1):
            p1 = (p_dots[i]["x"], p_dots[i]["y"])
            p2 = (p_dots[i + 1]["x"], p_dots[i + 1]["y"])
            for j in range(i + 2, n - 1):
                p3 = (p_dots[j]["x"], p_dots[j]["y"])
                p4 = (p_dots[j + 1]["x"], p_dots[j + 1]["y"])
                if _segments_intersect(p1, p2, p3, p4):
                    crossing_count += 1
                    crossing_dot_ids.update([p_dots[i]["id"], p_dots[i + 1]["id"], p_dots[j]["id"], p_dots[j + 1]["id"]])

    if crossing_count > 0:
        issues.append({
            "type": "warning",
            "code": "LINE_CROSSINGS",
            "message": f"{crossing_count} line crossing(s) detected in path sequence. Use 'Untangle Crossings' to resolve.",
            "dot_ids": list(crossing_dot_ids)
        })

    error_count = sum(1 for issue in issues if issue["type"] == "error")
    warning_count = sum(1 for issue in issues if issue["type"] == "warning")

    return {
        "is_valid": error_count == 0,
        "total_dots": total_dots,
        "error_count": error_count,
        "warning_count": warning_count,
        "issues": issues
    }
