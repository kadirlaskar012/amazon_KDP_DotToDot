/**
 * labelCollision.ts
 * Real-time 8-way radial collision solver for dot number labels.
 * Automatically positions numbers outward from shapes and prevents
 * overlapping dots, connection lines, other labels, or canvas margins.
 */

import type { Dot } from '../types';

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function boxesOverlap(b1: Box, b2: Box): { overlaps: boolean; area: number } {
  const xOverlap = Math.max(0, Math.min(b1.x2, b2.x2) - Math.max(b1.x1, b2.x1));
  const yOverlap = Math.max(0, Math.min(b1.y2, b2.y2) - Math.max(b1.y1, b2.y1));
  const area = xOverlap * yOverlap;
  return { overlaps: area > 0, area };
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function optimizeDotLabels(
  dots: Dot[],
  dotRadius: number = 3.5,
  fontSize: number = 9,
  canvasWidth: number = 612,
  canvasHeight: number = 792,
  pageMargin: number = 36
): Dot[] {
  if (!dots || dots.length === 0) return dots;

  const sorted = [...dots].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const n = sorted.length;

  // Compute centroid of polygon for outward bias
  let sumX = 0;
  let sumY = 0;
  for (const d of sorted) {
    sumX += d.x;
    sumY += d.y;
  }
  const centroidX = sumX / Math.max(1, n);
  const centroidY = sumY / Math.max(1, n);

  const charW = fontSize * 0.62;
  const textH = fontSize * 1.15;
  const offsetDist = dotRadius + Math.max(6.5, fontSize * 0.85);

  // 8 candidate angles (top-right, top, top-left, right, left, bottom-right, bottom, bottom-left)
  const candidateAngles = [
    -Math.PI / 4,       // 0: top-right (standard default)
    -Math.PI / 2,       // 1: top
    -3 * Math.PI / 4,   // 2: top-left
    0,                  // 3: right
    Math.PI,            // 4: left
    Math.PI / 4,        // 5: bottom-right
    Math.PI / 2,        // 6: bottom
    3 * Math.PI / 4,    // 7: bottom-left
  ];

  const placedBoxes: Box[] = [];

  const updatedDots = sorted.map((d, i) => {
    const numStr = String(d.displayLabel || (d.displayNumber ?? d.sequenceIndex));
    const textW = Math.max(fontSize * 0.9, numStr.length * charW);

    // Vector to center for outward calculation
    const toCentroidX = centroidX - d.x;
    const toCentroidY = centroidY - d.y;

    // Vectors to previous and next dots
    const prevDot = sorted[(i - 1 + n) % n];
    const nextDot = sorted[(i + 1) % n];
    const vInX = d.x - prevDot.x;
    const vInY = d.y - prevDot.y;
    const vOutX = nextDot.x - d.x;
    const vOutY = nextDot.y - d.y;

    let bestScore = Infinity;
    let bestNx = d.x + offsetDist * 0.707;
    let bestNy = d.y - offsetDist * 0.707;
    let bestBox: Box = {
      x1: bestNx - textW / 2,
      y1: bestNy - textH / 2,
      x2: bestNx + textW / 2,
      y2: bestNy + textH / 2,
    };

    for (const ang of candidateAngles) {
      const candX = d.x + Math.cos(ang) * offsetDist;
      const candY = d.y + Math.sin(ang) * offsetDist;
      const box: Box = {
        x1: candX - textW / 2,
        y1: candY - textH / 2,
        x2: candX + textW / 2,
        y2: candY + textH / 2,
      };

      let score = 0;

      // 1. Boundary penalty (must stay inside safe margin)
      const minSafeX = pageMargin + 4;
      const maxSafeX = canvasWidth - pageMargin - 4;
      const minSafeY = pageMargin + 4;
      const maxSafeY = canvasHeight - pageMargin - 4;

      if (box.x1 < minSafeX) score += (minSafeX - box.x1) * 80;
      if (box.x2 > maxSafeX) score += (box.x2 - maxSafeX) * 80;
      if (box.y1 < minSafeY) score += (minSafeY - box.y1) * 80;
      if (box.y2 > maxSafeY) score += (box.y2 - maxSafeY) * 80;

      // 2. Dot collision penalty (label must not sit on any dot)
      for (const other of sorted) {
        const dist = Math.hypot(candX - other.x, candY - other.y);
        const minDist = dotRadius + Math.max(textW, textH) * 0.55;
        if (dist < minDist) {
          score += (minDist - dist) * 200 + 1000;
        }
      }

      // 3. Overlap with existing placed number boxes
      for (const pBox of placedBoxes) {
        const { overlaps, area } = boxesOverlap(box, pBox);
        if (overlaps) {
          score += 3000 + area * 25;
        }
      }

      // 4. Overlap with adjacent line segments
      if (n > 1) {
        // Line from prev to curr
        const dIn = distToSegment(candX, candY, prevDot.x, prevDot.y, d.x, d.y);
        if (dIn < textH * 0.65) score += (textH * 0.65 - dIn) * 60;

        // Line from curr to next
        const dOut = distToSegment(candX, candY, d.x, d.y, nextDot.x, nextDot.y);
        if (dOut < textH * 0.65) score += (textH * 0.65 - dOut) * 60;
      }

      // 5. Outward normal preference (prefer pointing AWAY from center)
      const candDirX = Math.cos(ang);
      const candDirY = Math.sin(ang);
      const dotToCenter = candDirX * toCentroidX + candDirY * toCentroidY;
      if (dotToCenter > 0) {
        // Pointing towards center
        score += 80;
      } else {
        // Pointing away from center (ideal for outer dot labels)
        score -= 50;
      }

      // 6. Tangent normal preference
      const crossIn = vInX * candDirY - vInY * candDirX;
      const crossOut = vOutX * candDirY - vOutY * candDirX;
      if (crossIn + crossOut < 0) {
        score += 40;
      }

      if (score < bestScore) {
        bestScore = score;
        bestNx = candX;
        bestNy = candY;
        bestBox = box;
      }
    }

    placedBoxes.push(bestBox);

    return {
      ...d,
      numberX: Math.round(bestNx * 10) / 10,
      numberY: Math.round(bestNy * 10) / 10,
    };
  });

  return updatedDots;
}
