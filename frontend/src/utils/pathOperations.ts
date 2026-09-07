/**
 * pathOperations.ts
 * Advanced Dot-to-Dot path algorithms:
 * - Start Dot rotation ("Make Dot #1")
 * - Direction reversal (Clockwise <-> Counter-Clockwise)
 * - Self-intersection / Line-crossing detection
 * - 2-Opt Line-crossing Auto-Untangler
 * - Curvature smoothing (Laplacian / Chaikin apex-preserving smoothing)
 */

import type { Dot } from '../types';

/** Orientation test for 3 points */
function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
}

/** Check if segment (p1-p2) intersects segment (p3-p4) */
export function segmentsIntersect(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number
): boolean {
  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  );
}

/**
 * Rotates sequence so targetDot becomes Dot #1.
 * Maintains path integrity and contour flow.
 */
export function rotateStartDot(dots: Dot[], targetDotId: string): Dot[] {
  if (dots.length <= 1) return dots;
  const targetIdx = dots.findIndex((d) => d.id === targetDotId);
  if (targetIdx === -1 || targetIdx === 0) return dots;

  const targetDot = dots[targetIdx];
  const targetPathId = targetDot.pathId ?? 1;

  // Separate dots of the target path and other paths
  const pathDots = dots.filter((d) => (d.pathId ?? 1) === targetPathId);
  const otherDots = dots.filter((d) => (d.pathId ?? 1) !== targetPathId);

  const localIdx = pathDots.findIndex((d) => d.id === targetDotId);
  if (localIdx === -1) return dots;

  // Cyclically rotate pathDots
  const rotatedPath = [...pathDots.slice(localIdx), ...pathDots.slice(0, localIdx)];

  // Re-combine preserving relative path order
  const combined = [...rotatedPath, ...otherDots];

  // Renumber sequence indexes sequentially
  return combined.map((d, idx) => ({
    ...d,
    sequenceIndex: idx + 1,
    displayNumber: idx + 1,
  }));
}

/**
 * Reverses traversal direction of dots in a path (CW <-> CCW).
 */
export function reversePathDirection(dots: Dot[], pathId?: number): Dot[] {
  if (dots.length <= 1) return dots;
  const targetPathId = pathId ?? (dots[0]?.pathId ?? 1);

  const pathDots = dots.filter((d) => (d.pathId ?? 1) === targetPathId);
  const otherDots = dots.filter((d) => (d.pathId ?? 1) !== targetPathId);

  if (pathDots.length <= 1) return dots;

  // Keep first dot as start dot, reverse the rest, OR reverse entire cycle
  const first = pathDots[0];
  const rest = [...pathDots.slice(1)].reverse();
  const reversedPath = [first, ...rest];

  const combined = [...reversedPath, ...otherDots];

  return combined.map((d, idx) => ({
    ...d,
    sequenceIndex: idx + 1,
    displayNumber: idx + 1,
  }));
}

/**
 * Detects all self-intersections / criss-crosses in paths.
 */
export function detectLineCrossings(dots: Dot[]): {
  count: number;
  crossings: [number, number][];
} {
  const crossings: [number, number][] = [];
  if (dots.length < 4) return { count: 0, crossings };

  // Group by pathId
  const pathMap = new Map<number, Dot[]>();
  for (const d of dots) {
    const pid = d.pathId ?? 1;
    if (!pathMap.has(pid)) pathMap.set(pid, []);
    pathMap.get(pid)!.push(d);
  }

  for (const [, pDots] of pathMap.entries()) {
    const n = pDots.length;
    if (n < 4) continue;

    for (let i = 0; i < n - 1; i++) {
      const p1 = pDots[i];
      const p2 = pDots[i + 1];

      for (let j = i + 2; j < n - 1; j++) {
        // Skip consecutive segments sharing a vertex
        if (j === i || j === i + 1 || (i === 0 && j === n - 1)) continue;

        const p3 = pDots[j];
        const p4 = pDots[j + 1];

        if (segmentsIntersect(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y)) {
          crossings.push([p1.sequenceIndex, p3.sequenceIndex]);
        }
      }
    }
  }

  return { count: crossings.length, crossings };
}

/**
 * Untangles self-crossings using 2-Opt edge swaps.
 */
export function untangleLineCrossings(dots: Dot[], maxIterations: number = 30): Dot[] {
  if (dots.length < 4) return dots;

  let current = [...dots].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  let improved = true;
  let iter = 0;

  while (improved && iter < maxIterations) {
    improved = false;
    iter++;
    const n = current.length;

    for (let i = 0; i < n - 2; i++) {
      const p1 = current[i];
      const p2 = current[i + 1];
      const pid = p1.pathId ?? 1;

      if ((p2.pathId ?? 1) !== pid) continue;

      for (let j = i + 2; j < n - 1; j++) {
        const p3 = current[j];
        const p4 = current[j + 1];

        if ((p3.pathId ?? 1) !== pid || (p4.pathId ?? 1) !== pid) continue;
        if (j === i || j === i + 1 || (i === 0 && j === n - 1)) continue;

        if (segmentsIntersect(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y)) {
          // 2-Opt reverse between i + 1 and j
          const sub = current.slice(i + 1, j + 1).reverse();
          current = [
            ...current.slice(0, i + 1),
            ...sub,
            ...current.slice(j + 1),
          ];
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return current.map((d, idx) => ({
    ...d,
    sequenceIndex: idx + 1,
    displayNumber: idx + 1,
  }));
}

/**
 * Smooths dot trajectory using apex-preserving Laplacian relaxation.
 * Sharp corner apexes are preserved to maintain animal ears/tails/noses.
 */
export function smoothDotPath(dots: Dot[], intensity: number = 0.2): Dot[] {
  if (dots.length <= 3) return dots;

  const n = dots.length;
  const smoothed = dots.map((d) => ({ ...d }));

  for (let i = 1; i < n - 1; i++) {
    const prev = dots[i - 1];
    const curr = dots[i];
    const next = dots[i + 1];

    if ((prev.pathId ?? 1) !== (curr.pathId ?? 1) || (next.pathId ?? 1) !== (curr.pathId ?? 1)) {
      continue;
    }

    // Measure angle deviation to detect sharp corner apexes
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const dotProd = v1x * v2x + v1y * v2y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 > 0 && len2 > 0) {
      const cosAngle = dotProd / (len1 * len2);
      // If angle is sharp (< 45 degrees deflection), preserve corner apex
      if (cosAngle < 0.2) {
        continue;
      }
    }

    // Laplacian relaxation
    const avgX = (prev.x + next.x) / 2.0;
    const avgY = (prev.y + next.y) / 2.0;

    const newX = curr.x + (avgX - curr.x) * intensity;
    const newY = curr.y + (avgY - curr.y) * intensity;

    const dx = newX - curr.x;
    const dy = newY - curr.y;

    smoothed[i].x = Math.round(newX * 10) / 10;
    smoothed[i].y = Math.round(newY * 10) / 10;
    smoothed[i].numberX = Math.round((curr.numberX + dx) * 10) / 10;
    smoothed[i].numberY = Math.round((curr.numberY + dy) * 10) / 10;
  }

  return smoothed;
}
