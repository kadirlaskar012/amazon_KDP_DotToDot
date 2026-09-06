import React, { useRef, useState, useEffect } from 'react';
import type { Dot, PageSetup, Tool } from '../types';
import { screenToSvgCoords, snapCoord } from '../utils/geometry';

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function renumberSequentialDots(dotsList: Dot[]): Dot[] {
  const sorted = [...dotsList].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  return sorted.map((d, idx) => ({
    ...d,
    sequenceIndex: idx + 1,
    displayNumber: idx + 1,
  }));
}

interface CanvasProps {
  pageSetup: PageSetup;
  dots: Dot[];
  onUpdateDots: (newDots: Dot[]) => void;
  selectedDotId: string | null;
  onSelectDot: (id: string | null) => void;
  activeTool: Tool;
  dotRadius: number;
  fontSize: number;
  referenceImage: string | null;
  editedIllustration: string | null;
  onUpdateIllustration: (dataUrl: string) => void;
  eraserSize: number;
  referenceOpacity: number;
  referenceVisible: boolean;
  referenceLocked: boolean;
  showAnswer: boolean;
  snapEnabled: boolean;
  crosshairEnabled: boolean;
  safeMarginsVisible?: boolean;
  pageCaption?: string;
  zoom: number;
  onZoomChange: (z: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onNotifyMaxDots: () => void;
  onInlineEditNumber?: (dotId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  pageSetup,
  dots,
  onUpdateDots,
  selectedDotId,
  onSelectDot,
  activeTool,
  dotRadius,
  fontSize,
  referenceImage,
  editedIllustration,
  onUpdateIllustration,
  eraserSize,
  referenceOpacity,
  referenceVisible,
  referenceLocked: _referenceLocked,
  showAnswer,
  snapEnabled,
  crosshairEnabled,
  safeMarginsVisible = true,
  pageCaption = '',
  zoom,
  onZoomChange,
  panOffset,
  setPanOffset,
  onNotifyMaxDots,
  onInlineEditNumber,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const illustrationCanvasRef = useRef<HTMLCanvasElement>(null);
  const isErasingRef = useRef(false);
  const lastErasePosRef = useRef<{ x: number; y: number } | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number }>({ w: 700, h: 700 });

  // Sync reference or edited illustration image to canvas
  useEffect(() => {
    const src = editedIllustration || referenceImage;
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width || 700;
      const h = img.naturalHeight || img.height || 700;
      setImageDims({ w, h });
      const cvs = illustrationCanvasRef.current;
      if (cvs) {
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
        }
      }
    };
    img.src = src;
  }, [referenceImage, editedIllustration]);

  const usableW = pageSetup.widthPt - 2 * pageSetup.marginPt;
  const usableH = pageSetup.heightPt - 2 * pageSetup.marginPt;
  const imgScale = Math.min(usableW / Math.max(1, imageDims.w), usableH / Math.max(1, imageDims.h));
  const renderedW = imageDims.w * imgScale;
  const renderedH = imageDims.h * imgScale;
  const offsetX = pageSetup.marginPt + (usableW - renderedW) / 2;
  const offsetY = pageSetup.marginPt + (usableH - renderedH) / 2;

  const eraseAt = (svgX: number, svgY: number, isFirst: boolean) => {
    const cvs = illustrationCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const imgX = (svgX - offsetX) / imgScale;
    const imgY = (svgY - offsetY) / imgScale;
    const brushRadius = (eraserSize / imgScale) / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    if (isFirst || !lastErasePosRef.current) {
      ctx.beginPath();
      ctx.arc(imgX, imgY, brushRadius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.lineWidth = brushRadius * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastErasePosRef.current.x, lastErasePosRef.current.y);
      ctx.lineTo(imgX, imgY);
      ctx.stroke();
    }
    ctx.restore();

    lastErasePosRef.current = { x: imgX, y: imgY };
  };

  // Dragging interaction state
  const [dragTarget, setDragTarget] = useState<{
    type: 'dot' | 'number' | 'pan';
    dotId?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origNumX?: number;
    origNumY?: number;
  } | null>(null);

  // Crosshair coordinates in SVG space
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Arrow keys precision movement
  useEffect(() => {
    const handleArrowNudge = (e: KeyboardEvent) => {
      if (!selectedDotId) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected dot and renumber sequentially
        e.preventDefault();
        const remaining = dots.filter((d) => d.id !== selectedDotId);
        onUpdateDots(renumberSequentialDots(remaining));
        onSelectDot(null);
        return;
      } else return;

      e.preventDefault();

      if (e.altKey) {
        // Nudge number position only
        onUpdateDots(
          dots.map((d) => {
            if (d.id === selectedDotId) {
              return {
                ...d,
                numberX: Math.round((d.numberX + dx) * 10) / 10,
                numberY: Math.round((d.numberY + dy) * 10) / 10,
              };
            }
            return d;
          })
        );
      } else {
        // Nudge dot position (and maintain relative number position)
        onUpdateDots(
          dots.map((d) => {
            if (d.id === selectedDotId) {
              return {
                ...d,
                x: Math.round((d.x + dx) * 10) / 10,
                y: Math.round((d.y + dy) * 10) / 10,
                numberX: Math.round((d.numberX + dx) * 10) / 10,
                numberY: Math.round((d.numberY + dy) * 10) / 10,
              };
            }
            return d;
          })
        );
      }
    };

    window.addEventListener('keydown', handleArrowNudge);
    return () => window.removeEventListener('keydown', handleArrowNudge);
  }, [selectedDotId, dots, onUpdateDots, onSelectDot]);

  // Cursor-anchored wheel zoom (zooms directly towards mouse position)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.max(25, Math.min(800, Math.round(zoom * zoomFactor)));
    if (newZoom === zoom) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseFromCenter_X = e.clientX - (rect.left + rect.width / 2);
    const mouseFromCenter_Y = e.clientY - (rect.top + rect.height / 2);

    const ratio = newZoom / zoom;
    const newPanX = panOffset.x * ratio + mouseFromCenter_X * (1 - ratio);
    const newPanY = panOffset.y * ratio + mouseFromCenter_Y * (1 - ratio);

    setPanOffset({
      x: Math.round(newPanX * 10) / 10,
      y: Math.round(newPanY * 10) / 10,
    });
    onZoomChange(newZoom);
  };

  // Canvas background pointer down
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    // Middle click or Pan tool or Spacebar
    if (e.button === 1 || activeTool === 'pan' || isSpacePressed) {
      setDragTarget({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origX: panOffset.x,
        origY: panOffset.y,
      });
      return;
    }

    if (e.button !== 0) return; // Only left click

    const svgCoords = screenToSvgCoords(e.clientX, e.clientY, svgRef.current);
    const snappedX = snapCoord(svgCoords.x, 5, snapEnabled);
    const snappedY = snapCoord(svgCoords.y, 5, snapEnabled);

    // If Add Dot tool is active
    if (activeTool === 'addDot') {
      if (dots.length >= 120) {
        onNotifyMaxDots();
        return;
      }

      // Determine insertion sequence position:
      const sorted = [...dots].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
      let targetSeq = sorted.length + 1; // default: append to end

      const selectedDot = dots.find((d) => d.id === selectedDotId);
      if (selectedDot) {
        // Case 1: If a dot is selected (e.g. 18), insert immediately after it (as 19)
        targetSeq = selectedDot.sequenceIndex + 1;
      } else if (sorted.length >= 2) {
        // Case 2: Check if click is near any line segment between adjacent dots
        let bestDist = Infinity;
        let bestIdx = -1;
        for (let i = 0; i < sorted.length - 1; i++) {
          const d = distanceToSegment(snappedX, snappedY, sorted[i].x, sorted[i].y, sorted[i + 1].x, sorted[i + 1].y);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        if (bestDist < 35 && bestIdx !== -1) {
          targetSeq = sorted[bestIdx].sequenceIndex + 1;
        }
      }

      const newDot: Dot = {
        id: `dot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sequenceIndex: targetSeq,
        displayNumber: targetSeq,
        x: snappedX,
        y: snappedY,
        numberX: snappedX + dotRadius + 7,
        numberY: snappedY - dotRadius - 4,
        source: 'manual',
        visible: true,
      };

      // Shift all dots at or after targetSeq up by 1
      const adjustedDots = dots.map((d) => {
        if (d.sequenceIndex >= targetSeq) {
          return {
            ...d,
            sequenceIndex: d.sequenceIndex + 1,
            displayNumber: d.displayNumber + 1,
          };
        }
        return d;
      });

      const updated = renumberSequentialDots([...adjustedDots, newDot]);
      onUpdateDots(updated);
      onSelectDot(newDot.id);
      return;
    }

    // If Erase Line tool is active
    if (activeTool === 'eraseLine') {
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // Fallback if browser does not support pointer capture
      }
      isErasingRef.current = true;
      eraseAt(snappedX, snappedY, true);
      return;
    }

    // Deselect if clicking on empty background
    onSelectDot(null);
  };

  // Pointer move handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!svgRef.current) return;

    // Track crosshair
    const svgCoords = screenToSvgCoords(e.clientX, e.clientY, svgRef.current);
    setCursorPos(svgCoords);

    // If erasing illustration lines
    if (activeTool === 'eraseLine' && isErasingRef.current) {
      eraseAt(svgCoords.x, svgCoords.y, false);
      return;
    }

    if (!dragTarget) return;

    if (dragTarget.type === 'pan') {
      const dx = e.clientX - dragTarget.startX;
      const dy = e.clientY - dragTarget.startY;
      setPanOffset({
        x: dragTarget.origX + dx,
        y: dragTarget.origY + dy,
      });
      return;
    }

    const scale = zoom / 100;
    const deltaSvgX = (e.clientX - dragTarget.startX) / scale;
    const deltaSvgY = (e.clientY - dragTarget.startY) / scale;

    if (dragTarget.type === 'dot' && dragTarget.dotId) {
      const newX = snapCoord(dragTarget.origX + deltaSvgX, 5, snapEnabled);
      const newY = snapCoord(dragTarget.origY + deltaSvgY, 5, snapEnabled);
      const diffX = newX - dragTarget.origX;
      const diffY = newY - dragTarget.origY;

      onUpdateDots(
        dots.map((d) => {
          if (d.id === dragTarget.dotId) {
            return {
              ...d,
              x: Math.round(newX * 10) / 10,
              y: Math.round(newY * 10) / 10,
              numberX: Math.round(((dragTarget.origNumX ?? d.numberX) + diffX) * 10) / 10,
              numberY: Math.round(((dragTarget.origNumY ?? d.numberY) + diffY) * 10) / 10,
            };
          }
          return d;
        })
      );
    } else if (dragTarget.type === 'number' && dragTarget.dotId) {
      const newNumX = snapCoord((dragTarget.origNumX ?? 0) + deltaSvgX, 5, snapEnabled);
      const newNumY = snapCoord((dragTarget.origNumY ?? 0) + deltaSvgY, 5, snapEnabled);

      onUpdateDots(
        dots.map((d) => {
          if (d.id === dragTarget.dotId) {
            return {
              ...d,
              numberX: Math.round(newNumX * 10) / 10,
              numberY: Math.round(newNumY * 10) / 10,
            };
          }
          return d;
        })
      );
    }
  };

  const handlePointerUp = () => {
    setDragTarget(null);
    if (isErasingRef.current) {
      isErasingRef.current = false;
      lastErasePosRef.current = null;
      if (illustrationCanvasRef.current) {
        onUpdateIllustration(illustrationCanvasRef.current.toDataURL('image/png'));
      }
    }
  };

  // Click handler for dot
  const handleDotPointerDown = (e: React.PointerEvent, dot: Dot) => {
    e.stopPropagation();

    if (activeTool === 'deleteDot') {
      const remaining = dots.filter((d) => d.id !== dot.id);
      onUpdateDots(renumberSequentialDots(remaining));
      if (selectedDotId === dot.id) onSelectDot(null);
      return;
    }

    onSelectDot(dot.id);

    if (activeTool === 'select' || activeTool === 'moveDot') {
      setDragTarget({
        type: 'dot',
        dotId: dot.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: dot.x,
        origY: dot.y,
        origNumX: dot.numberX,
        origNumY: dot.numberY,
      });
    }
  };

  // Click handler for number
  const handleNumberPointerDown = (e: React.PointerEvent, dot: Dot) => {
    e.stopPropagation();

    onSelectDot(dot.id);

    if (activeTool === 'editNumber' && onInlineEditNumber) {
      onInlineEditNumber(dot.id);
      return;
    }

    setDragTarget({
      type: 'number',
      dotId: dot.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: dot.x,
      origY: dot.y,
      origNumX: dot.numberX,
      origNumY: dot.numberY,
    });
  };

  // Sorted dots for Answer Key sequence path
  const sortedDots = [...dots].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const pathPoints = sortedDots.map((d) => `${d.x},${d.y}`).join(' ');

  // Compute cursor style
  let cursorClass = 'cursor-default';
  if (isSpacePressed || activeTool === 'pan' || dragTarget?.type === 'pan') {
    cursorClass = dragTarget?.type === 'pan' ? 'cursor-grabbing' : 'cursor-grab';
  } else if (activeTool === 'addDot') {
    cursorClass = dots.length >= 120 ? 'cursor-not-allowed' : 'cursor-crosshair';
  } else if (activeTool === 'deleteDot') {
    cursorClass = 'cursor-pointer';
  } else if (activeTool === 'moveDot' || activeTool === 'moveNumber') {
    cursorClass = 'cursor-move';
  }

  const selectedDot = dots.find((d) => d.id === selectedDotId);

  return (
    <div
      ref={containerRef}
      className={`canvas-viewport ${cursorClass}`}
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="canvas-transform-wrapper"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          ref={svgRef}
          className="paper-canvas"
          width={pageSetup.widthPt}
          height={pageSetup.heightPt}
          viewBox={`0 0 ${pageSetup.widthPt} ${pageSetup.heightPt}`}
          onPointerDown={handleSvgPointerDown}
        >
          {/* Definitions: shadows & markers */}
          <defs>
            <filter id="paper-shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="10" stdDeviation="15" floodOpacity="0.25" />
            </filter>
            <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* 1. Paper Background */}
          <rect
            x={0}
            y={0}
            width={pageSetup.widthPt}
            height={pageSetup.heightPt}
            fill="#ffffff"
            filter="url(#paper-shadow)"
          />

          {/* Optional Grid */}
          {snapEnabled && (
            <rect
              x={0}
              y={0}
              width={pageSetup.widthPt}
              height={pageSetup.heightPt}
              fill="url(#grid-pattern)"
              pointerEvents="none"
              opacity={0.6}
            />
          )}

          {/* 2. KDP Print-Safe Margin Guides */}
          {safeMarginsVisible && (
            <rect
              x={pageSetup.marginPt}
              y={pageSetup.marginPt}
              width={pageSetup.widthPt - 2 * pageSetup.marginPt}
              height={pageSetup.heightPt - 2 * pageSetup.marginPt}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}

          {/* 3. Interactive Line-Art Illustration Layer (Hybrid Dot-to-Dot) */}
          {referenceVisible && (referenceImage || editedIllustration) && (
            <foreignObject
              x={offsetX}
              y={offsetY}
              width={renderedW}
              height={renderedH}
              style={{
                opacity: referenceOpacity,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <canvas
                ref={illustrationCanvasRef}
                style={{
                  width: `${renderedW}px`,
                  height: `${renderedH}px`,
                  display: 'block',
                }}
              />
            </foreignObject>
          )}

          {/* 4. Answer Preview Connecting Lines */}
          {showAnswer && sortedDots.length > 1 && (
            <polyline
              points={pathPoints}
              fill="none"
              stroke="#475569"
              strokeWidth={1.2}
              strokeDasharray="2 2"
              pointerEvents="none"
            />
          )}

          {/* 5. Selected Dot Connector Line to its Number */}
          {selectedDot && (
            <line
              x1={selectedDot.x}
              y1={selectedDot.y}
              x2={selectedDot.numberX}
              y2={selectedDot.numberY}
              stroke="#3b82f6"
              strokeWidth={1.2}
              strokeDasharray="2 2"
              pointerEvents="none"
            />
          )}

          {/* 6. Dots Layer */}
          {dots.map((dot) => {
            if (!dot.visible) return null;
            const isSelected = dot.id === selectedDotId;

            return (
              <g key={`dot-g-${dot.id}`} className="dot-group">
                {/* Selection Halo */}
                {isSelected && (
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={dotRadius + 4.5}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    className="dot-selection-ring"
                  />
                )}

                {/* Primary Solid Black Dot */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={dotRadius}
                  fill="#000000"
                  className={`puzzle-dot ${isSelected ? 'selected' : ''}`}
                  style={{ pointerEvents: activeTool === 'eraseLine' ? 'none' : 'auto' }}
                  onPointerDown={(e) => handleDotPointerDown(e, dot)}
                />
              </g>
            );
          })}

          {/* 7. Numbers Layer */}
          {dots.map((dot) => {
            if (!dot.visible) return null;
            const isSelected = dot.id === selectedDotId;

            return (
              <text
                key={`num-${dot.id}`}
                x={dot.numberX}
                y={dot.numberY}
                fontSize={fontSize}
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                fontWeight="700"
                fill={isSelected ? '#2563eb' : '#000000'}
                className={`puzzle-number ${isSelected ? 'selected' : ''}`}
                style={{ pointerEvents: activeTool === 'eraseLine' ? 'none' : 'auto' }}
                onPointerDown={(e) => handleNumberPointerDown(e, dot)}
                dominantBaseline="central"
                textAnchor="middle"
              >
                {dot.displayNumber}
              </text>
            );
          })}

          {/* 8. Precision Crosshair Overlay */}
          {crosshairEnabled && cursorPos && (
            <g className="crosshair-overlay" pointerEvents="none">
              <line
                x1={0}
                y1={cursorPos.y}
                x2={pageSetup.widthPt}
                y2={cursorPos.y}
                stroke="#ef4444"
                strokeWidth={0.75}
                strokeDasharray="3 3"
                opacity={0.7}
              />
              <line
                x1={cursorPos.x}
                y1={0}
                x2={cursorPos.x}
                y2={pageSetup.heightPt}
                stroke="#ef4444"
                strokeWidth={0.75}
                strokeDasharray="3 3"
                opacity={0.7}
              />
            </g>
          )}
          {/* 9. Active Eraser Circle Cursor */}
          {activeTool === 'eraseLine' && cursorPos && (
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r={eraserSize / 2}
              fill="rgba(239, 68, 68, 0.25)"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}

          {/* 10. Bottom-Middle Object Caption / Name (strictly clamped inside KDP safe margin) */}
          {pageCaption && pageCaption.trim().length > 0 && (
            <text
              x={pageSetup.widthPt / 2}
              y={pageSetup.heightPt - pageSetup.marginPt - 12}
              textAnchor="middle"
              fill="#0f172a"
              fontFamily="'Fredoka', 'Comic Sans MS', 'Helvetica Neue', Arial, sans-serif"
              fontSize={Math.min(22, Math.max(11, Math.floor((usableW - 24) / (pageCaption.trim().length * 0.72))))}
              fontWeight="700"
              letterSpacing="2.5px"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {pageCaption.trim().toUpperCase()}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};
