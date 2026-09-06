import type { Dot } from '../types';

export function screenToSvgCoords(
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement
): { x: number; y: number } {
  const pt = svgElement.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const transformed = pt.matrixTransform(ctm.inverse());
  return {
    x: Math.round(transformed.x * 10) / 10,
    y: Math.round(transformed.y * 10) / 10,
  };
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

export function snapCoord(val: number, gridSize: number = 5, enabled: boolean = false): number {
  if (!enabled) return val;
  return Math.round(val / gridSize) * gridSize;
}

export function findNextDisplayNumber(dots: Dot[]): number {
  if (dots.length === 0) return 1;
  const numbers = dots.map((d) => d.displayNumber);
  const max = Math.max(...numbers);
  return max + 1;
}
