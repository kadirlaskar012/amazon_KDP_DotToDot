import React from 'react';
import {
  MousePointer,
  Move,
  PlusCircle,
  Trash2,
  Tag,
  Type,
  Hand,
  Search,
  Grid,
  Crosshair,
  Eraser,
  RotateCcw,
  SquareDashed,
} from 'lucide-react';
import type { Tool } from '../types';

interface LeftToolbarProps {
  activeTool: Tool;
  onSelectTool: (tool: Tool) => void;
  dotsCount: number;
  maxDots: number;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  crosshairEnabled: boolean;
  onToggleCrosshair: () => void;
  safeMarginsVisible?: boolean;
  onToggleSafeMargins?: () => void;
  eraserSize: number;
  setEraserSize: (size: number) => void;
  onRestoreIllustration?: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onSelectTool,
  dotsCount,
  maxDots,
  snapEnabled,
  onToggleSnap,
  crosshairEnabled,
  onToggleCrosshair,
  safeMarginsVisible = true,
  onToggleSafeMargins,
  eraserSize,
  setEraserSize,
  onRestoreIllustration,
}) => {
  const isMaxReached = dotsCount >= maxDots;

  const tools: { id: Tool; label: string; icon: React.ReactNode; shortcut: string; disabled?: boolean; notice?: string }[] = [
    { id: 'select', label: 'Select / Inspect', icon: <MousePointer size={18} />, shortcut: 'V' },
    { id: 'moveDot', label: 'Move Dot', icon: <Move size={18} />, shortcut: 'M' },
    {
      id: 'addDot',
      label: isMaxReached ? 'Max 120 Dots Reached' : 'Add Dot',
      icon: <PlusCircle size={18} />,
      shortcut: 'A',
      disabled: isMaxReached,
      notice: isMaxReached ? 'Maximum 120 dots reached' : undefined,
    },
    { id: 'deleteDot', label: 'Delete Dot', icon: <Trash2 size={18} />, shortcut: 'D' },
    { id: 'eraseLine', label: 'Erase Image Lines (Drag on Canvas)', icon: <Eraser size={18} />, shortcut: 'X' },
    { id: 'moveNumber', label: 'Move Number Label', icon: <Tag size={18} />, shortcut: 'N' },
    { id: 'editNumber', label: 'Edit Number Text', icon: <Type size={18} />, shortcut: 'E' },
    { id: 'pan', label: 'Pan Canvas (Space+Drag)', icon: <Hand size={18} />, shortcut: 'H' },
    { id: 'zoom', label: 'Zoom Tool', icon: <Search size={18} />, shortcut: 'Z' },
  ];

  return (
    <aside className="left-toolbar">
      <div className="tool-group primary-tools">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              className={`tool-btn ${isActive ? 'tool-active' : ''} ${t.disabled ? 'tool-disabled' : ''}`}
              onClick={() => {
                if (!t.disabled) onSelectTool(t.id);
              }}
              title={`${t.label} (${t.shortcut})${t.notice ? ` - ${t.notice}` : ''}`}
              disabled={t.disabled}
            >
              {t.icon}
              <span className="tool-shortcut">{t.shortcut}</span>
            </button>
          );
        })}
      </div>

      {/* Active Eraser Controls */}
      {activeTool === 'eraseLine' && (
        <>
          <div className="tool-group-divider" />
          <div className="eraser-controls-panel">
            <span className="eraser-panel-label">BRUSH</span>
            <div className="eraser-sizes-row">
              {[10, 20, 36, 60].map((s) => (
                <button
                  key={s}
                  className={`btn-eraser-size ${eraserSize === s ? 'eraser-size-active' : ''}`}
                  onClick={() => setEraserSize(s)}
                  title={`Eraser brush: ${s}px`}
                >
                  <span
                    className="eraser-dot-preview"
                    style={{ width: Math.max(4, Math.min(14, s / 3.5)), height: Math.max(4, Math.min(14, s / 3.5)) }}
                  />
                </button>
              ))}
            </div>
            {onRestoreIllustration && (
              <button
                className="tool-btn btn-restore-lines"
                onClick={onRestoreIllustration}
                title="Restore original un-erased illustration lines"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </>
      )}

      <div className="tool-group-divider" />

      {/* Precision / Alignment Toggles */}
      <div className="tool-group precision-toggles">
        <button
          className={`tool-btn ${snapEnabled ? 'tool-active' : ''}`}
          onClick={onToggleSnap}
          title={`Snap to Grid (5px): ${snapEnabled ? 'ON' : 'OFF'}`}
        >
          <Grid size={18} />
          <span className="tool-indicator">{snapEnabled ? 'ON' : 'OFF'}</span>
        </button>
        <button
          className={`tool-btn ${crosshairEnabled ? 'tool-active' : ''}`}
          onClick={onToggleCrosshair}
          title={`Precision Crosshair: ${crosshairEnabled ? 'ON' : 'OFF'}`}
        >
          <Crosshair size={18} />
          <span className="tool-indicator">{crosshairEnabled ? 'ON' : 'OFF'}</span>
        </button>
        {onToggleSafeMargins && (
          <button
            className={`tool-btn ${safeMarginsVisible ? 'tool-active' : ''}`}
            onClick={onToggleSafeMargins}
            title={`Amazon KDP Safe Margin Guides: ${safeMarginsVisible ? 'ON' : 'OFF'}`}
          >
            <SquareDashed size={18} />
            <span className="tool-indicator">{safeMarginsVisible ? 'ON' : 'OFF'}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
