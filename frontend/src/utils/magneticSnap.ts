/**
 * magneticSnap.ts
 * Real-time pixel-level magnetic stroke snapping for the interactive canvas.
 * Searches the raster illustration canvas within a local radius to lock
 * dot positions onto the ink stroke centerline.
 */

export interface SnapResult {
  snapped: boolean;
  x: number;
  y: number;
  distance: number;
}

export function findMagneticSnapPoint(
  svgX: number,
  svgY: number,
  canvas: HTMLCanvasElement | null,
  offsetX: number,
  offsetY: number,
  imgScale: number,
  searchRadiusSvg: number = 18
): SnapResult {
  if (!canvas || imgScale <= 0) {
    return { snapped: false, x: svgX, y: svgY, distance: 0 };
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { snapped: false, x: svgX, y: svgY, distance: 0 };
  }

  // Convert SVG coordinates to canvas pixel space
  const imgX = Math.round((svgX - offsetX) / imgScale);
  const imgY = Math.round((svgY - offsetY) / imgScale);

  const radiusPx = Math.max(4, Math.round(searchRadiusSvg / imgScale));
  const minX = Math.max(0, imgX - radiusPx);
  const minY = Math.max(0, imgY - radiusPx);
  const maxX = Math.min(canvas.width - 1, imgX + radiusPx);
  const maxY = Math.min(canvas.height - 1, imgY + radiusPx);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (width <= 0 || height <= 0) {
    return { snapped: false, x: svgX, y: svgY, distance: 0 };
  }

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(minX, minY, width, height);
  } catch {
    return { snapped: false, x: svgX, y: svgY, distance: 0 };
  }

  const data = imgData.data;

  // Search for the closest dark ink pixel
  let bestDistSq = Infinity;
  let bestPx = imgX;
  let bestPy = imgY;
  let foundDark = false;

  // Threshold: luminance < 140 and alpha > 40 indicates ink stroke
  for (let dy = 0; dy < height; dy++) {
    const py = minY + dy;
    for (let dx = 0; dx < width; dx++) {
      const px = minX + dx;
      const idx = (dy * width + dx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // If opaque enough and dark enough to be an ink stroke
      if (a > 40) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance < 140) {
          const distSq = (px - imgX) * (px - imgX) + (py - imgY) * (py - imgY);
          // Favor darker pixels slightly by weighting distance
          const darknessWeight = (255 - luminance) / 255;
          const weightedDistSq = distSq / (1.0 + darknessWeight * 0.5);

          if (weightedDistSq < bestDistSq) {
            bestDistSq = weightedDistSq;
            bestPx = px;
            bestPy = py;
            foundDark = true;
          }
        }
      }
    }
  }

  if (foundDark) {
    // Convert back from pixel space to SVG coordinate space
    const snappedSvgX = Math.round((offsetX + bestPx * imgScale) * 10) / 10;
    const snappedSvgY = Math.round((offsetY + bestPy * imgScale) * 10) / 10;
    const distSvg = Math.hypot(snappedSvgX - svgX, snappedSvgY - svgY);

    if (distSvg <= searchRadiusSvg * 1.25) {
      return {
        snapped: true,
        x: snappedSvgX,
        y: snappedSvgY,
        distance: distSvg,
      };
    }
  }

  return { snapped: false, x: svgX, y: svgY, distance: 0 };
}
