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
}) => {
  return (
    <header className="top-toolbar">
      {/* Brand & Project Name */}
      <div className="toolbar-section project-meta">
        <div className="app-logo">
          <span className="logo-dot"></span>
          <span className="logo-text">Dot2Dot<span className="pro-badge">PRO</span></span>
        </div>
        <input
          type="text"
          className="project-name-input"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Untitled Puzzle"
          title="Click to rename project"
        />
        {totalPages > 1 && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              padding: '2px 7px',
              borderRadius: '10px',
              whiteSpace: 'nowrap',
            }}
            title={`Active Page: ${activePageNumber} of ${totalPages}`}
          >
            Page {activePageNumber}/{totalPages}
          </span>
        )}
      </div>

      {/* Project & Media Actions */}
      <div className="toolbar-section">
        <button
          className="btn btn-primary"
          onClick={onOpenNewProject}
          title="Create New Multi-Page Book Project"
          style={{ padding: '6px 12px' }}
        >
          <BookPlus size={16} />
          <span>New Project</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onOpenMediaLibrary}
          title="Open Media Library to batch upload and manage illustrations"
          style={{ position: 'relative' }}
        >
          <Images size={16} />
          <span>Media Library</span>
          {mediaCount > 0 && (
            <span
              style={{
                marginLeft: 4,
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 8,
              }}
            >
              {mediaCount}
            </span>
          )}
        </button>

        <label className="btn btn-upload" title="Upload custom black & white line-art illustration (PNG, JPG)">
          <Upload size={16} />
          <span>Upload Image</span>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={(e) => {
              onUploadImage(e);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>

        <button className="btn btn-ghost" onClick={onOpenSamples} title="Open Sample Illustration Gallery">
          <Library size={16} />
          <span>Samples</span>
        </button>

        <button className="btn btn-ghost" onClick={onLoadProject} title="Open .dotproj Project">
          <FolderOpen size={16} />
          <span>Open</span>
        </button>
        <button className="btn btn-ghost" onClick={onSaveProject} title="Save .dotproj Project File">
          <Save size={16} />
          <span>Save</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* History Actions */}
      <div className="toolbar-section">
        <button
          className="btn btn-icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="btn btn-icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Zoom Controls */}
      <div className="toolbar-section zoom-controls">
        <button
          className="btn btn-icon"
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} />
        </button>
        <select
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
          className="btn btn-icon"
          onClick={() => onZoomChange(Math.min(800, zoom + 25))}
          title="Zoom In (+)"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="btn btn-icon"
          onClick={onFitToScreen}
          title="Fit Page to Screen"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Core Dot & Sequence Operations */}
      <div className="toolbar-section main-actions">
        <button className="btn btn-secondary" onClick={onAutoDots} title="Auto Generate Dots from Illustration">
          <Sparkles size={16} />
          <span>Auto Dots</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onResetAuto}
          title="Reset to Initial Auto Generated Dots"
        >
          <RotateCcw size={16} />
          <span>Reset Auto</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onRenumberAll}
          title="Renumber All Dots Sequentially (1 to N)"
        >
          <ListOrdered size={16} />
          <span>Renumber All</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onAutoPositionNumbers}
          title="Auto Position Numbers to Avoid Collisions"
        >
          <Compass size={16} />
          <span>Auto Numbers</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Layer Toggles & Verification */}
      <div className="toolbar-section">
        <button
          className={`btn ${referenceVisible ? 'btn-active' : 'btn-ghost'}`}
          onClick={onToggleReference}
          title={referenceVisible ? 'Hide Reference Image' : 'Show Reference Image'}
        >
          <ImageIcon size={16} />
          <span>Ref {referenceVisible ? 'ON' : 'OFF'}</span>
        </button>

        <button
          className={`btn ${showAnswer ? 'btn-active' : 'btn-ghost'}`}
          onClick={onToggleShowAnswer}
          title={showAnswer ? 'Hide Answer Connecting Lines' : 'Show Answer Connecting Lines'}
        >
          {showAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showAnswer ? 'Hide Answer' : 'Show Answer'}</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onOpenQualityCheck}
          title="Run Puzzle Quality Check"
        >
          <CheckCircle2 size={16} />
          <span>Check</span>
        </button>
      </div>

      {/* Primary Export Action */}
      <div className="toolbar-section export-section">
        <button
          className="btn btn-primary"
          onClick={onOpenExportModal}
          disabled={dotsCount === 0 && totalPages <= 1}
          title="Preview and Export Vector PDF / PNG"
        >
          <FileDown size={16} />
          <span>Export PDF</span>
        </button>
      </div>
    </header>
  );
};
