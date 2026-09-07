import React from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  RotateCcw,
  ListOrdered,
  Eye,
  EyeOff,
  Image as ImageIcon,
  CheckCircle2,
  FileDown,
  FolderOpen,
  Save,
  Library,
  Compass,
  Upload,
  BookPlus,
  Images,
} from 'lucide-react';

interface TopToolbarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onFitToScreen: () => void;
  onAutoDots: () => void;
  onResetAuto: () => void;
  onRenumberAll: () => void;
  onAutoPositionNumbers: () => void;
  showAnswer: boolean;
  onToggleShowAnswer: () => void;
  referenceVisible: boolean;
  onToggleReference: () => void;
  onOpenQualityCheck: () => void;
  onOpenExportModal: () => void;
  onOpenSamples: () => void;
  onOpenNewProject: () => void;
  onOpenMediaLibrary: () => void;
  mediaCount: number;
  onSaveProject: () => void;
  onLoadProject: () => void;
  dotsCount: number;
  totalPages?: number;
  activePageNumber?: number;
  onOpenBulkBookModal?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  projectName,
  setProjectName,
  onUploadImage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onFitToScreen,
  onAutoDots,
  onResetAuto,
  onRenumberAll,
  onAutoPositionNumbers,
  showAnswer,
  onToggleShowAnswer,
  referenceVisible,
  onToggleReference,
  onOpenQualityCheck,
  onOpenExportModal,
  onOpenSamples,
  onOpenNewProject,
  onOpenMediaLibrary,
  mediaCount,
  onSaveProject,
  onLoadProject,
  dotsCount,
  totalPages = 1,
  activePageNumber = 1,
  onOpenBulkBookModal,
}) => {
  return (
    <header className="top-toolbar">
      {/* 1. LEFT ZONE: Brand & Project Name (Pinned, Never overflows) */}
      <div className="top-toolbar-left">
        <div className="app-logo">
          <span className="logo-dot"></span>
          <span className="logo-text">Dot2Dot<span className="pro-badge">PRO</span></span>
        </div>
        <input
          id="project-name-input"
          name="projectName"
          aria-label="Project Name"
          type="text"
          className="project-name-input"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Untitled Puzzle"
          title="Click to rename project"
        />
        {totalPages > 1 && (
          <span
            className="page-badge"
            title={`Active Page: ${activePageNumber} of ${totalPages}`}
          >
            {activePageNumber}/{totalPages}
          </span>
        )}
      </div>

      {/* 2. CENTER ZONE: Document & Editing Controls */}
      <div className="top-toolbar-center">
        {/* Project & File Actions */}
        <div className="toolbar-section">
          <button
            className="btn btn-primary-soft btn-sm"
            onClick={onOpenNewProject}
            title="Create New Multi-Page Book Project"
          >
            <BookPlus size={15} />
            <span className="btn-label btn-label-secondary">New Project</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenMediaLibrary}
            title="Open Media Library to batch upload and manage illustrations"
            style={{ position: 'relative' }}
          >
            <Images size={15} />
            <span className="btn-label btn-label-secondary">Media</span>
            {mediaCount > 0 && (
              <span className="toolbar-badge">
                {mediaCount}
              </span>
            )}
          </button>

          <label className="btn btn-upload btn-sm" title="Upload custom black & white line-art illustration (PNG, JPG)">
            <Upload size={15} />
            <span className="btn-label btn-label-secondary">Upload</span>
            <input
              id="toolbar-image-upload-input"
              name="imageUpload"
              aria-label="Upload Line Art Image"
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={(e) => {
                onUploadImage(e);
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
          </label>

          <button className="btn btn-ghost btn-sm btn-icon-adaptive" onClick={onOpenSamples} title="Open Sample Illustration Gallery">
            <Library size={15} />
            <span className="btn-label btn-label-adaptive">Samples</span>
          </button>

          <button className="btn btn-ghost btn-sm btn-icon-adaptive" onClick={onLoadProject} title="Open .dotproj Project">
            <FolderOpen size={15} />
            <span className="btn-label btn-label-adaptive">Open</span>
          </button>
          <button className="btn btn-ghost btn-sm btn-icon-adaptive" onClick={onSaveProject} title="Save .dotproj Project File">
            <Save size={15} />
            <span className="btn-label btn-label-adaptive">Save</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* History Actions */}
        <div className="toolbar-section">
          <button
            className="btn btn-icon btn-sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="btn btn-icon btn-sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Zoom & Viewport */}
        <div className="toolbar-section">
          <button
            className="btn btn-icon btn-sm"
            onClick={() => onZoomChange(Math.max(25, zoom - 25))}
            title="Zoom Out (-)"
          >
            <ZoomOut size={15} />
          </button>
          <select
            id="zoom-select"
            name="zoomSelect"
            aria-label="Canvas Zoom Level"
            className="zoom-select"
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
          >
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
            <option value={300}>300%</option>
            <option value={400}>400%</option>
            <option value={800}>800%</option>
          </select>
          <button
            className="btn btn-icon btn-sm"
            onClick={() => onZoomChange(Math.min(800, zoom + 25))}
            title="Zoom In (+)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            className="btn btn-icon btn-sm"
            onClick={onFitToScreen}
            title="Fit Page to Screen"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Core Dot & Sequence Operations */}
        <div className="toolbar-section main-actions">
          <button className="btn btn-secondary btn-sm" onClick={onAutoDots} title="Auto Generate Dots from Illustration">
            <Sparkles size={15} />
            <span className="btn-label">Auto Dots</span>
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon-adaptive"
            onClick={onResetAuto}
            title="Reset to Initial Auto Generated Dots"
          >
            <RotateCcw size={15} />
            <span className="btn-label btn-label-adaptive">Reset</span>
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon-adaptive"
            onClick={onRenumberAll}
            title="Renumber All Dots Sequentially (1 to N)"
          >
            <ListOrdered size={15} />
            <span className="btn-label btn-label-adaptive">Renumber</span>
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon-adaptive"
            onClick={onAutoPositionNumbers}
            title="Auto Position Numbers to Avoid Collisions"
          >
            <Compass size={15} />
            <span className="btn-label btn-label-adaptive">Numbers</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Layer Toggles & Verification */}
        <div className="toolbar-section">
          <button
            className={`btn btn-sm ${referenceVisible ? 'btn-active' : 'btn-ghost'}`}
            onClick={onToggleReference}
            title={referenceVisible ? 'Hide Reference Image' : 'Show Reference Image'}
          >
            <ImageIcon size={15} />
            <span className="btn-label">Ref {referenceVisible ? 'ON' : 'OFF'}</span>
          </button>

          <button
            className={`btn btn-sm btn-icon-adaptive ${showAnswer ? 'btn-active' : 'btn-ghost'}`}
            onClick={onToggleShowAnswer}
            title={showAnswer ? 'Hide Answer Connecting Lines' : 'Show Answer Connecting Lines'}
          >
            {showAnswer ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="btn-label btn-label-adaptive">{showAnswer ? 'Hide Ans' : 'Answer'}</span>
          </button>

          <button
            className="btn btn-ghost btn-sm btn-icon-adaptive"
            onClick={onOpenQualityCheck}
            title="Run Puzzle Quality Check"
          >
            <CheckCircle2 size={15} />
            <span className="btn-label btn-label-adaptive">Check</span>
          </button>
        </div>
      </div>

      {/* 3. RIGHT ZONE: Highlighted Bulk Book Creator & Export Button */}
      <div className="top-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenBulkBookModal && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenBulkBookModal}
            title="Open Bulk Book Creator to batch process multiple illustrations into a KDP book"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(124, 58, 237, 0.25))',
              borderColor: '#6366f1',
              color: '#c7d2fe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 11px',
              fontWeight: 600,
              fontSize: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <BookPlus size={15} color="#818cf8" />
            <span>Bulk Book</span>
          </button>
        )}

        <button
          className="btn-export-highlight"
          onClick={onOpenExportModal}
          disabled={dotsCount === 0 && totalPages <= 1}
          title="Preview and Export Vector PDF / PNG for Amazon KDP"
        >
          <FileDown size={17} />
          <span className="export-label">Export PDF</span>
        </button>
      </div>
    </header>
  );
};
