import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Trash2,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  XCircle,
  Info,
  Lock,
  Unlock,
  Upload,
  Images,
  Magnet,
  Plus,
  Star,
  ArrowUpDown,
  Split,
  Wand2,
} from 'lucide-react';
import { PAGE_PRESETS } from '../types';
import type {
  Dot,
  PageSetup,
  DifficultyPreset,
  ValidationReport,
  MediaItem,
  StartMarkerStyle,
  StopMarkerStyle,
  FaintGuidelineStyle,
  NumberingMode,
  DotShape,
  NumberPlacement,
} from '../types';

interface RightSidebarProps {
  selectedDot: Dot | null;
  onUpdateDot: (dot: Dot) => void;
  onDeleteDot: (id: string) => void;
  dotRadius: number;
  setDotRadius: (r: number) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
  pageSetup: PageSetup;
  setPageSetup: (p: PageSetup) => void;
  referenceOpacity: number;
  setReferenceOpacity: (op: number) => void;
  referenceVisible: boolean;
  setReferenceVisible: (v: boolean) => void;
  referenceLocked: boolean;
  setReferenceLocked: (l: boolean) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  difficultyPreset: DifficultyPreset;
  setDifficultyPreset: (p: DifficultyPreset) => void;
  customMaxDots: number;
  setCustomMaxDots: (cnt: number) => void;
  onGenerateDots: () => void;
  isGenerating: boolean;
  validationReport: ValidationReport | null;
  onSelectDotById: (id: string) => void;
  mediaLibrary?: MediaItem[];
  onOpenMediaLibrary?: () => void;
  onApplyMedia?: (media: MediaItem) => void;
  activePageNumber?: number;
  pageCaption?: string;
  onUpdatePageCaption?: (caption: string) => void;
  thresholdSensitivity: number;
  setThresholdSensitivity: (s: number) => void;
  snapToCenterline: boolean;
  setSnapToCenterline: (snap: boolean) => void;
  onInsertDotNear?: (baseDot: Dot, before: boolean) => void;
  onAutoPositionNumbers?: () => void;
  magneticSnapEnabled?: boolean;
  setMagneticSnapEnabled?: (snap: boolean) => void;
  startMarkerStyle?: StartMarkerStyle;
  setStartMarkerStyle?: (s: StartMarkerStyle) => void;
  stopMarkerStyle?: StopMarkerStyle;
  setStopMarkerStyle?: (s: StopMarkerStyle) => void;
  faintGuidelines?: FaintGuidelineStyle;
  setFaintGuidelines?: (f: FaintGuidelineStyle) => void;
  faintGuidelineOpacity?: number;
  setFaintGuidelineOpacity?: (op: number) => void;
  numberingMode?: NumberingMode;
  setNumberingMode?: (m: NumberingMode) => void;
  dotShape?: DotShape;
  setDotShape?: (sh: DotShape) => void;
  numberPlacement?: NumberPlacement;
  setNumberPlacement?: (pl: NumberPlacement) => void;
  onSetStartDot?: () => void;
  onReversePath?: () => void;
  onSmoothPath?: (intensity?: number) => void;
  onUntangleCrossings?: () => void;
  lineCrossingsCount?: number;
  onSplitPathAtSelected?: () => void;
}

type Tab = 'inspector' | 'generator' | 'page' | 'quality' | 'media';

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedDot,
  onUpdateDot,
  onDeleteDot,
  dotRadius,
  setDotRadius,
  fontSize,
  setFontSize,
  pageSetup,
  setPageSetup,
  referenceOpacity,
  setReferenceOpacity,
  referenceVisible,
  setReferenceVisible,
  referenceLocked,
  setReferenceLocked,
  onUploadImage,
  difficultyPreset,
  setDifficultyPreset,
  customMaxDots,
  setCustomMaxDots,
  onGenerateDots,
  isGenerating,
  validationReport,
  onSelectDotById,
  mediaLibrary,
  onOpenMediaLibrary,
  onApplyMedia,
  activePageNumber,
  pageCaption,
  onUpdatePageCaption,
  thresholdSensitivity,
  setThresholdSensitivity,
  snapToCenterline,
  setSnapToCenterline,
  onInsertDotNear,
  onAutoPositionNumbers,
  magneticSnapEnabled = false,
  setMagneticSnapEnabled,
  startMarkerStyle = 'star',
  setStartMarkerStyle,
  stopMarkerStyle = 'double_circle',
  setStopMarkerStyle,
  faintGuidelines = 'none',
  setFaintGuidelines,
  faintGuidelineOpacity = 0.18,
  setFaintGuidelineOpacity,
  numberingMode = 'numbers',
  setNumberingMode,
  dotShape = 'circle',
  setDotShape,
  numberPlacement = 'outside',
  setNumberPlacement,
  onSetStartDot,
  onReversePath,
  onSmoothPath,
  onUntangleCrossings,
  lineCrossingsCount = 0,
  onSplitPathAtSelected,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('inspector');

  const handleNudge = (dx: number, dy: number, isAlt: boolean = false) => {
    if (!selectedDot) return;
    if (isAlt) {
      onUpdateDot({
        ...selectedDot,
        numberX: Math.round((selectedDot.numberX + dx) * 10) / 10,
        numberY: Math.round((selectedDot.numberY + dy) * 10) / 10,
      });
    } else {
      onUpdateDot({
        ...selectedDot,
        x: Math.round((selectedDot.x + dx) * 10) / 10,
        y: Math.round((selectedDot.y + dy) * 10) / 10,
        numberX: Math.round((selectedDot.numberX + dx) * 10) / 10,
        numberY: Math.round((selectedDot.numberY + dy) * 10) / 10,
      });
    }
  };

  const handleResetNumberOffset = () => {
    if (!selectedDot) return;
    onUpdateDot({
      ...selectedDot,
      numberX: selectedDot.x + dotRadius + 7,
      numberY: selectedDot.y - dotRadius - 4,
    });
  };

  return (
    <aside className="right-sidebar">
      {/* Tab Navigation */}
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${activeTab === 'inspector' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('inspector')}
          title="Dot & Number Inspector"
        >
          <Sliders size={16} />
          <span>Inspect</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'generator' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('generator')}
          title="Auto Generator & Reference Layer"
        >
          <Sparkles size={16} />
          <span>Generate</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'page' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('page')}
          title="Page Setup & KDP Margins"
        >
          <BookOpen size={16} />
          <span>Page</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'quality' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('quality')}
          title="Quality & Diagnostics"
        >
          <CheckCircle2 size={16} />
          <span>Health</span>
          {validationReport && validationReport.error_count > 0 && (
            <span className="badge-error">{validationReport.error_count}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'media' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('media')}
          title="Media Library"
        >
          <Images size={16} />
          <span>Media</span>
          {mediaLibrary && mediaLibrary.length > 0 && (
            <span className="badge-info" style={{ backgroundColor: '#3b82f6', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 8, marginLeft: 3 }}>
              {mediaLibrary.length}
            </span>
          )}
        </button>
      </div>

      <div className="sidebar-content">
        {/* TAB 1: INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="tab-pane">
            <h3 className="section-title">Selected Dot Inspector</h3>
            {selectedDot ? (
              <div className="inspector-card">
                <div className="info-header">
                  <div className="dot-badge">
                    <span className="dot-badge-id">ID: {selectedDot.id.slice(0, 10)}</span>
                    <span className={`badge-source ${selectedDot.source}`}>
                      {selectedDot.source.toUpperCase()}
                    </span>
                  </div>
                  <button
                    className="btn btn-danger-icon"
                    onClick={() => onDeleteDot(selectedDot.id)}
                    title="Delete Dot"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Display Number & Sequence */}
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Display #</label>
                    <input
                      type="number"
                      className="input-field"
                      value={selectedDot.displayNumber}
                      onChange={(e) =>
                        onUpdateDot({
                          ...selectedDot,
                          displayNumber: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Seq Index</label>
                    <input
                      type="text"
                      className="input-field input-readonly"
                      value={selectedDot.sequenceIndex}
                      disabled
                    />
                  </div>
                </div>

                {/* Dot Coordinates */}
                <div className="sub-section-title">Dot Coordinates (pt)</div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input-field"
                      value={selectedDot.x}
                      onChange={(e) =>
                        onUpdateDot({
                          ...selectedDot,
                          x: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input-field"
                      value={selectedDot.y}
                      onChange={(e) =>
                        onUpdateDot({
                          ...selectedDot,
                          y: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Number Coordinates */}
                <div className="sub-section-title">Number Position (pt)</div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Num X</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input-field"
                      value={selectedDot.numberX}
                      onChange={(e) =>
                        onUpdateDot({
                          ...selectedDot,
                          numberX: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Num Y</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input-field"
                      value={selectedDot.numberY}
                      onChange={(e) =>
                        onUpdateDot({
                          ...selectedDot,
                          numberY: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Reset Number Position Button */}
                <button className="btn btn-secondary btn-full" onClick={handleResetNumberOffset}>
                  <RotateCcw size={14} />
                  <span>Reset Number Position</span>
                </button>

                {/* Sequence & Dot Editing Actions */}
                <div className="sub-section-title" style={{ marginTop: '12px' }}>Dot Sequence & Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                  {onInsertDotNear && (
                    <>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        onClick={() => onInsertDotNear(selectedDot, true)}
                        title={`Insert new dot before #${selectedDot.displayNumber}`}
                      >
                        <Plus size={12} />
                        <span>Insert Before</span>
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        onClick={() => onInsertDotNear(selectedDot, false)}
                        title={`Insert new dot after #${selectedDot.displayNumber}`}
                      >
                        <Plus size={12} />
                        <span>Insert After</span>
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {onAutoPositionNumbers && (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '11px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      onClick={onAutoPositionNumbers}
                      title="Automatically position numbers outward from contours to prevent collisions"
                    >
                      <Sparkles size={12} />
                      <span>Auto-Fix Overlaps</span>
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    style={{
                      color: '#f87171',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      fontSize: '11px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onClick={() => onDeleteDot(selectedDot.id)}
                    title={`Delete dot #${selectedDot.displayNumber} and auto-renumber`}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Path & Flow Controls */}
                <div className="sub-section-title" style={{ marginTop: '10px' }}>
                  <span>Path & Flow Controls</span>
                  {selectedDot.pathId && selectedDot.pathId > 1 && (
                    <span className="badge-info" style={{ fontSize: '10px', padding: '1px 5px', marginLeft: 6 }}>
                      Path #{selectedDot.pathId}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                  {onSetStartDot && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#f59e0b', fontWeight: 600 }}
                      onClick={onSetStartDot}
                      title="Make this selected dot the starting Dot #1"
                    >
                      <Star size={12} fill="#f59e0b" />
                      <span>Make Dot #1</span>
                    </button>
                  )}
                  {onReversePath && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      onClick={onReversePath}
                      title="Flip sequence direction between Clockwise and Counter-Clockwise"
                    >
                      <ArrowUpDown size={12} />
                      <span>Reverse Flow</span>
                    </button>
                  )}
                </div>
                {onSplitPathAtSelected && (
                  <button
                    className="btn btn-secondary btn-full"
                    style={{ fontSize: '11px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '10px' }}
                    onClick={onSplitPathAtSelected}
                    title="Split path at this dot into a separate island loop (Lift Pencil)"
                  >
                    <Split size={12} />
                    <span>Split Path Here (New Island)</span>
                  </button>
                )}

                {/* Precision Nudge D-Pad */}
                <div className="sub-section-title">Precision Nudge</div>
                <div className="nudge-pad">
                  <button className="btn-nudge" onClick={() => handleNudge(0, -1)} title="Nudge Up 1px">
                    <ArrowUp size={14} />
                  </button>
                  <div className="nudge-mid-row">
                    <button className="btn-nudge" onClick={() => handleNudge(-1, 0)} title="Nudge Left 1px">
                      <ArrowLeft size={14} />
                    </button>
                    <span className="nudge-center">1 px</span>
                    <button className="btn-nudge" onClick={() => handleNudge(1, 0)} title="Nudge Right 1px">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <button className="btn-nudge" onClick={() => handleNudge(0, 1)} title="Nudge Down 1px">
                    <ArrowDown size={14} />
                  </button>
                </div>
                <p className="hint-text">Use keyboard arrows to move dot; Alt+Arrow to move number label.</p>
              </div>
            ) : (
              <div className="empty-inspector">
                <p>Click any dot or number on canvas to inspect & edit.</p>
              </div>
            )}

            {/* Global Sizing Controls */}
            <div className="global-sizes-card">
              <h4 className="sub-section-title">Global Dimensions</h4>
              <div className="form-group">
                <div className="slider-header">
                  <label>Dot Radius</label>
                  <span>{dotRadius} pt</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="7"
                  step="0.5"
                  value={dotRadius}
                  onChange={(e) => setDotRadius(parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <div className="slider-header">
                  <label>Number Font Size</label>
                  <span>{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="14"
                  step="0.5"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GENERATOR & REFERENCE */}
        {activeTab === 'generator' && (
          <div className="tab-pane">
            <h3 className="section-title">Auto Dot Generation Engine</h3>

            {/* Upload Illustration */}
            <div className="form-group">
              <label>Upload Illustration (PNG / JPG)</label>
              <label className="file-upload-box">
                <Upload size={20} />
                <span>Choose Local Line Art</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={onUploadImage}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Reference Layer Controls */}
            <div className="reference-controls-card">
              <div className="sub-section-title">Reference Layer (Guide Only)</div>
              <div className="toggle-row">
                <span>Show Reference</span>
                <input
                  type="checkbox"
                  checked={referenceVisible}
                  onChange={(e) => setReferenceVisible(e.target.checked)}
                />
              </div>
              <div className="toggle-row">
                <span>Lock Reference</span>
                <button
                  className="btn btn-icon"
                  onClick={() => setReferenceLocked(!referenceLocked)}
                  title={referenceLocked ? 'Unlock Reference' : 'Lock Reference'}
                >
                  {referenceLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>
              <div className="form-group">
                <div className="slider-header">
                  <label>Reference Opacity</label>
                  <span>{Math.round(referenceOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={referenceOpacity}
                  onChange={(e) => setReferenceOpacity(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Presets & Hard Cap 120 */}
            <div className="preset-card">
              <div className="sub-section-title">Difficulty Presets (Max 120)</div>
              <div className="preset-buttons">
                {(['easy', 'medium', 'detailed', 'custom'] as DifficultyPreset[]).map((p) => (
                  <button
                    key={p}
                    className={`btn-preset ${difficultyPreset === p ? 'preset-active' : ''}`}
                    onClick={() => setDifficultyPreset(p)}
                  >
                    <span className="preset-name">{p.toUpperCase()}</span>
                    <span className="preset-sub">
                      {p === 'easy' && '40–60 dots'}
                      {p === 'medium' && '60–90 dots'}
                      {p === 'detailed' && '90–120 dots'}
                      {p === 'custom' && 'User max'}
                    </span>
                  </button>
                ))}
              </div>

              {difficultyPreset === 'custom' && (
                <div className="form-group custom-dots-slider">
                  <div className="slider-header">
                    <label>Custom Max Dots</label>
                    <span className="badge-highlight">{customMaxDots} / 120</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    step="5"
                    value={customMaxDots}
                    onChange={(e) => setCustomMaxDots(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Advanced Detection & Precision Tuning */}
            <div className="preset-card" style={{ marginTop: '14px' }}>
              <div className="sub-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Line Detection & Refinement</span>
                <span className="badge-highlight" style={{ fontSize: '10px', padding: '2px 6px' }}>CV Engine 2.0</span>
              </div>

              {/* Threshold Sensitivity Slider */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div className="slider-header">
                  <label title="Higher values capture faint pencil sketches; lower values isolate dark bold lines">
                    Detection Sensitivity
                  </label>
                  <span className="badge-highlight">{thresholdSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={thresholdSensitivity}
                  onChange={(e) => setThresholdSensitivity(parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  <span>Dark Ink (10%)</span>
                  <span>Balanced (50%)</span>
                  <span>Faint Sketch (90%)</span>
                </div>
              </div>

              {/* Stroke Centerline Snapping */}
              <div className="toggle-row" style={{ marginTop: '8px', padding: '6px 0', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Snap to Ink Centerline</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Medial axis stroke thinning</span>
                </div>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => setSnapToCenterline(!snapToCenterline)}
                  style={{
                    width: '38px',
                    height: '22px',
                    borderRadius: '11px',
                    background: snapToCenterline ? 'var(--primary-color)' : 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                  title={snapToCenterline ? 'Disable Centerline Snapping' : 'Enable Centerline Snapping'}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: snapToCenterline ? '18px' : '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </button>
              </div>

              {/* Magnetic Stroke Snap Toggle */}
              {setMagneticSnapEnabled && (
                <div className="form-group-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', marginTop: '10px' }}>
                  <div>
                    <label style={{ margin: 0, fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Magnet size={13} color="#06b6d4" />
                      <span>Magnetic Stroke Snap</span>
                    </label>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Locks dragged dots to nearest line art stroke
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={() => setMagneticSnapEnabled(!magneticSnapEnabled)}
                    style={{
                      width: '38px',
                      height: '22px',
                      borderRadius: '11px',
                      background: magneticSnapEnabled ? '#0891b2' : 'var(--bg-card-hover)',
                      border: '1px solid var(--border-color)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: 0,
                    }}
                    title={magneticSnapEnabled ? 'Disable Magnetic Snapping' : 'Enable Magnetic Snapping'}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: magneticSnapEnabled ? '18px' : '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </button>
                </div>
              )}

              {/* Algorithm features summary */}
              <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ color: '#10b981' }}>✓</span> <span><b>Locked Anchors:</b> Sharp tips & apexes preserved</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ color: '#10b981' }}>✓</span> <span><b>Curvature-Adaptive:</b> Dense curves, sleek lines</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#10b981' }}>✓</span> <span><b>Zero Criss-Cross:</b> Jordan closed loop verified</span>
                </div>
              </div>
            </div>

            {/* Run Generation */}
            <button
              className="btn btn-primary btn-full btn-large"
              onClick={onGenerateDots}
              disabled={isGenerating}
            >
              <Sparkles size={18} />
              <span>{isGenerating ? 'Analyzing Contours...' : 'Auto-Generate Dots'}</span>
            </button>
            <p className="hint-text text-center">
              Uses OpenCV contour hierarchy, corner curvature detection, and dynamic 120-dot budget allocation.
            </p>

            {/* Pure Dot-to-Dot Styling Customizer */}
            <div className="preset-card" style={{ marginTop: '16px' }}>
              <div className="sub-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Puzzle & Dot Styling</span>
                <span className="badge-highlight" style={{ fontSize: '10px', padding: '2px 6px' }}>KDP Pro</span>
              </div>

              {/* 1. Educational Numbering Mode */}
              {setNumberingMode && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Educational Sequence Mode</label>
                  <select
                    className="input-field select-field"
                    value={numberingMode}
                    onChange={(e) => setNumberingMode(e.target.value as NumberingMode)}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="numbers">Numbers (1, 2, 3... 120)</option>
                    <option value="letters_upper">Alphabet Uppercase (A, B, C... Z, AA...)</option>
                    <option value="letters_lower">Alphabet Lowercase (a, b, c... z, aa...)</option>
                    <option value="skip_2">Skip-Counting by 2s (2, 4, 6, 8...)</option>
                    <option value="skip_5">Skip-Counting by 5s (5, 10, 15, 20...)</option>
                    <option value="skip_10">Skip-Counting by 10s (10, 20, 30, 40...)</option>
                    <option value="roman">Roman Numerals (I, II, III, IV, V...)</option>
                  </select>
                </div>
              )}

              {/* 2. Faint Trace Guidelines (Toddler Mode) */}
              {setFaintGuidelines && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Faint Guidelines (Toddler Mode)</label>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Light trace tracks</span>
                  </div>
                  <select
                    className="input-field select-field"
                    value={faintGuidelines}
                    onChange={(e) => setFaintGuidelines(e.target.value as FaintGuidelineStyle)}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="none">Disabled (Clean blank between dots)</option>
                    <option value="dotted">Dotted Trace Track (· · · ·)</option>
                    <option value="dashed">Dashed Trace Track (- - - -)</option>
                    <option value="solid">Light Solid Trace Line (─────)</option>
                  </select>

                  {faintGuidelines !== 'none' && setFaintGuidelineOpacity && (
                    <div style={{ marginTop: '8px' }}>
                      <div className="slider-header">
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Guideline Opacity</span>
                        <span className="badge-highlight">{Math.round((faintGuidelineOpacity || 0.18) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.4"
                        step="0.05"
                        value={faintGuidelineOpacity}
                        onChange={(e) => setFaintGuidelineOpacity(parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. Dot Shapes */}
              {setDotShape && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Dot Shape</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '4px' }}>
                    {[
                      { id: 'circle', label: 'Circle', glyph: '●' },
                      { id: 'ring', label: 'Hollow', glyph: '○' },
                      { id: 'star', label: 'Star', glyph: '★' },
                      { id: 'diamond', label: 'Diamond', glyph: '◆' },
                      { id: 'square', label: 'Square', glyph: '■' },
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        className={`btn btn-secondary ${dotShape === sh.id ? 'btn-primary' : ''}`}
                        style={{ padding: '6px 2px', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                        onClick={() => setDotShape(sh.id as DotShape)}
                        title={sh.label}
                      >
                        <span style={{ fontSize: '14px' }}>{sh.glyph}</span>
                        <span style={{ fontSize: '9px' }}>{sh.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Start & Stop Markers */}
              <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {setStartMarkerStyle && (
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: 600 }}>Start Marker (#1)</label>
                    <select
                      className="input-field select-field"
                      value={startMarkerStyle}
                      onChange={(e) => setStartMarkerStyle(e.target.value as StartMarkerStyle)}
                      style={{ marginTop: '3px', fontSize: '11px' }}
                    >
                      <option value="star">★ Gold Star</option>
                      <option value="circle">● Standard Dot</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                )}
                {setStopMarkerStyle && (
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: 600 }}>Stop Marker (End)</label>
                    <select
                      className="input-field select-field"
                      value={stopMarkerStyle}
                      onChange={(e) => setStopMarkerStyle(e.target.value as StopMarkerStyle)}
                      style={{ marginTop: '3px', fontSize: '11px' }}
                    >
                      <option value="double_circle">◎ Double Ring</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 5. Number Placement & White Badges */}
              {setNumberPlacement && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Number Label Style</label>
                  <select
                    className="input-field select-field"
                    value={numberPlacement}
                    onChange={(e) => setNumberPlacement(e.target.value as NumberPlacement)}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="outside">Outside Dot (Auto-Collision Avoidance)</option>
                    <option value="badge">Circular White Badge (100% Legibility)</option>
                    <option value="inside">Inside Center of Dot (For Large Dots)</option>
                  </select>
                </div>
              )}

              {/* 6. Path Smoothing Tool */}
              {onSmoothPath && (
                <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    className="btn btn-secondary btn-full"
                    style={{ fontSize: '11px', padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    onClick={() => onSmoothPath(0.22)}
                    title="Laplacian-Chaikin smoothing to eliminate sharp angle zigzags"
                  >
                    <Wand2 size={13} color="#8b5cf6" />
                    <span>Smooth Path Curves</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAGE SETUP & KDP */}
        {activeTab === 'page' && (
          <div className="tab-pane">
            <h3 className="section-title">KDP Page Setup</h3>

            <div className="form-group">
              <label>Page Size Preset</label>
              <select
                className="input-field"
                value={pageSetup.preset}
                onChange={(e) => {
                  const val = e.target.value as keyof typeof PAGE_PRESETS;
                  setPageSetup(PAGE_PRESETS[val]);
                }}
              >
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="custom">Custom Dimensions</option>
              </select>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label>Width (pt)</label>
                <input
                  type="number"
                  className="input-field"
                  value={pageSetup.widthPt}
                  disabled={pageSetup.preset !== 'custom'}
                  onChange={(e) =>
                    setPageSetup({ ...pageSetup, widthPt: parseFloat(e.target.value) || 612 })
                  }
                />
              </div>
              <div className="form-group">
                <label>Height (pt)</label>
                <input
                  type="number"
                  className="input-field"
                  value={pageSetup.heightPt}
                  disabled={pageSetup.preset !== 'custom'}
                  onChange={(e) =>
                    setPageSetup({ ...pageSetup, heightPt: parseFloat(e.target.value) || 792 })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Print-Safe Margin (pt / 0.5" = 36 pt)</label>
              <input
                type="number"
                className="input-field"
                value={pageSetup.marginPt}
                onChange={(e) =>
                  setPageSetup({ ...pageSetup, marginPt: parseFloat(e.target.value) || 36 })
                }
              />
            </div>

            {/* Object Title / Page Caption */}
            <div className="form-group" style={{ marginTop: 12, padding: 10, background: 'rgba(30, 41, 59, 0.6)', borderRadius: 8, border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontWeight: 600, color: '#f8fafc', fontSize: 12 }}>Object / Illustration Name</label>
                <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>Bottom Center</span>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px 0' }}>
                Printed at bottom middle, strictly inside Amazon KDP safe margin.
              </p>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. DINOSAUR, SUNFLOWER, CAR..."
                value={pageCaption || ''}
                onChange={(e) => onUpdatePageCaption?.(e.target.value)}
                style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
              />
            </div>

            <div className="info-card">
              <div className="info-row">
                <span>Safe Area:</span>
                <span>
                  {Math.round(pageSetup.widthPt - 2 * pageSetup.marginPt)} ×{' '}
                  {Math.round(pageSetup.heightPt - 2 * pageSetup.marginPt)} pt
                </span>
              </div>
              <div className="info-row">
                <span>Resolution:</span>
                <span>Vector / 300+ DPI</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QUALITY & VALIDATION */}
        {activeTab === 'quality' && (
          <div className="tab-pane">
            <h3 className="section-title">Puzzle Quality Diagnostics</h3>

            {validationReport ? (
              <div className="quality-summary">
                <div className="health-stats">
                  <div className={`health-badge ${validationReport.is_valid ? 'valid' : 'invalid'}`}>
                    {validationReport.is_valid ? '✓ PUZZLE VALID' : '⚠ ISSUES DETECTED'}
                  </div>
                  <div className="health-count-row">
                    <span>Errors: {validationReport.error_count}</span>
                    <span>Warnings: {validationReport.warning_count}</span>
                  </div>
                </div>

                {/* Line Crossings Untangler Card */}
                <div style={{ marginTop: '12px', marginBottom: '12px', padding: '10px', background: lineCrossingsCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: `1px solid ${lineCrossingsCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: lineCrossingsCount > 0 ? '8px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {lineCrossingsCount > 0 ? (
                        <AlertTriangle size={15} color="#ef4444" />
                      ) : (
                        <CheckCircle2 size={15} color="#10b981" />
                      )}
                      <span style={{ fontSize: '12px', fontWeight: 600, color: lineCrossingsCount > 0 ? '#ef4444' : '#10b981' }}>
                        {lineCrossingsCount > 0 ? `${lineCrossingsCount} Line Crossings Detected` : 'Zero Line Crossings (Clean Topology)'}
                      </span>
                    </div>
                  </div>
                  {lineCrossingsCount > 0 && onUntangleCrossings && (
                    <button
                      className="btn btn-secondary btn-full"
                      style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', backgroundColor: '#ef4444', color: '#fff', border: 'none', marginTop: '6px' }}
                      onClick={onUntangleCrossings}
                      title="Run 2-Opt edge inversion to untie line crossings"
                    >
                      <Wand2 size={13} />
                      <span>Untangle Crossings (2-Opt)</span>
                    </button>
                  )}
                </div>

                <div className="issues-list">
                  {validationReport.issues.length === 0 ? (
                    <div className="issue-item success">
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>All Checks Passed</strong>
                        <p>No sequence gaps, overlapping dots, or margin errors found.</p>
                      </div>
                    </div>
                  ) : (
                    validationReport.issues.map((iss, idx) => (
                      <div
                        key={idx}
                        className={`issue-item ${iss.type}`}
                        onClick={() => {
                          if (iss.dot_ids && iss.dot_ids.length > 0) {
                            onSelectDotById(iss.dot_ids[0]);
                          }
                        }}
                      >
                        {iss.type === 'error' && <XCircle size={18} />}
                        {iss.type === 'warning' && <AlertTriangle size={18} />}
                        {iss.type === 'info' && <Info size={18} />}
                        <div className="issue-content">
                          <span className="issue-msg">{iss.message}</span>
                          {iss.dot_ids && iss.dot_ids.length > 0 && (
                            <span className="issue-link">Click to inspect dot</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p>Click "Check" in toolbar to evaluate puzzle quality.</p>
            )}
          </div>
        )}

        {/* TAB 5: MEDIA LIBRARY */}
        {activeTab === 'media' && (
          <div className="tab-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="section-title" style={{ margin: 0 }}>Project Media</h3>
              {onOpenMediaLibrary && (
                <button
                  className="btn btn-secondary"
                  onClick={onOpenMediaLibrary}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  Manage All
                </button>
              )}
            </div>

            {/* Batch Upload Button */}
            <label
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                marginBottom: 14,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <Upload size={14} />
              <span>Upload Images to Library</span>
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => {
                  onUploadImage(e);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>

            {!mediaLibrary || mediaLibrary.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                <Images size={32} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ fontSize: 12 }}>No images uploaded yet.</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>
                  Upload line-art images to use across your book pages.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mediaLibrary.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: 8,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        backgroundColor: '#fff',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={item.dataUri}
                        alt={item.filename}
                        style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.filename}
                      >
                        {item.filename}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {item.width} × {item.height} px
                      </div>
                    </div>
                    {onApplyMedia && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => onApplyMedia(item)}
                        disabled={isGenerating}
                        style={{ padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
                        title={`Apply to Page ${activePageNumber || 1}`}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
