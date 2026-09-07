import React, { useState, useEffect } from 'react';
import { X, BookPlus, Check, Folder } from 'lucide-react';
import { PAGE_PRESETS } from '../types';
import type { PagePreset, PageSetup } from '../types';
import { getDefaultProjectLocation } from '../utils/projectIO';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (
    projectName: string,
    pageSetup: PageSetup,
    pageCount: number,
    populateSamples: boolean,
    saveLocation?: string
  ) => void;
}

const PAGE_COUNT_PRESETS = [10, 24, 32, 50, 80];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('My Dot-to-Dot Puzzle Book');
  const [selectedPreset, setSelectedPreset] = useState<PagePreset>('letter');
  const [pageCount, setPageCount] = useState<number>(10);
  const [populateSamples, setPopulateSamples] = useState(true);
  const [customSaveLocation, setCustomSaveLocation] = useState('');
  const [defaultLocationPath, setDefaultLocationPath] = useState('projects/');

  useEffect(() => {
    if (isOpen) {
      getDefaultProjectLocation()
        .then((data) => {
          if (data.defaultLocation) setDefaultLocationPath(data.defaultLocation);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, Math.min(200, pageCount || 10));
    const setup = PAGE_PRESETS[selectedPreset] || PAGE_PRESETS.letter;
    onCreateProject(
      name.trim() || 'Untitled Book Project',
      setup,
      count,
      populateSamples,
      customSaveLocation.trim() || undefined
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content new-project-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <BookPlus className="modal-title-icon" size={20} />
            <h2 className="modal-title">Create New Book Project</h2>
          </div>
          <button className="btn-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Project Title */}
            <div className="form-group">
              <label className="form-label">Project / Book Title</label>
              <input
                type="text"
                className="input-text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dinosaur Coloring & Dot-to-Dot Book"
                autoFocus
                required
              />
              <span className="form-hint">Used for PDF export metadata and file naming.</span>
            </div>

            {/* Project Save Location */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Folder size={14} color="#38bdf8" />
                  <span>Project Save Location</span>
                </label>
                {customSaveLocation && (
                  <button
                    type="button"
                    onClick={() => setCustomSaveLocation('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: 11,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Reset to Default Folder
                  </button>
                )}
              </div>
              <input
                type="text"
                className="input-text"
                value={customSaveLocation}
                onChange={(e) => setCustomSaveLocation(e.target.value)}
                placeholder={defaultLocationPath || 'Default: projects/ folder'}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <span className="form-hint">
                {customSaveLocation.trim()
                  ? `Project will be saved to custom path: ${customSaveLocation.trim()}`
                  : `Auto-saves directly to "${defaultLocationPath || 'projects/'}" folder on your computer. No browser download.`}
              </span>
            </div>

            {/* Page Trim Size */}
            <div className="form-group">
              <label className="form-label">Book Trim Size (KDP & D2D Compliant)</label>
              <div className="preset-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(PAGE_PRESETS).map(([key, setup]) => (
                  <button
                    key={key}
                    type="button"
                    className={`preset-card ${selectedPreset === key ? 'active' : ''}`}
                    onClick={() => setSelectedPreset(key as PagePreset)}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      borderRadius: 8,
                      border: selectedPreset === key ? '2px solid #3b82f6' : '1px solid #334155',
                      backgroundColor: selectedPreset === key ? 'rgba(59, 130, 246, 0.15)' : '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                        {setup.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {Math.round(setup.widthPt)} × {Math.round(setup.heightPt)} pt
                      </div>
                    </div>
                    {selectedPreset === key && <Check size={16} color="#3b82f6" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Page Count */}
            <div className="form-group">
              <label className="form-label">Initial Number of Pages</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="number"
                  className="input-text"
                  value={pageCount}
                  min={1}
                  max={200}
                  onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 1)}
                  style={{ width: 100, textAlign: 'center', fontSize: 15, fontWeight: 700 }}
                />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>pages will appear in the timeline</span>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PAGE_COUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`btn btn-secondary ${pageCount === preset ? 'active' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      borderColor: pageCount === preset ? '#3b82f6' : undefined,
                      backgroundColor: pageCount === preset ? '#1e3a8a' : undefined,
                    }}
                    onClick={() => setPageCount(preset)}
                  >
                    {preset} Pages
                  </button>
                ))}
              </div>
              <span className="form-hint" style={{ marginTop: 6, display: 'block' }}>
                You can easily add, duplicate, or remove pages anytime in the bottom timeline.
              </span>
            </div>

            {/* Initial Content Option */}
            <div className="form-group" style={{ padding: '12px', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                <input
                  type="checkbox"
                  checked={populateSamples}
                  onChange={(e) => setPopulateSamples(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                />
                <span>Populate pages with sample line-art illustrations</span>
              </label>
              <p style={{ fontSize: 12, color: '#94a3b8', marginLeft: 26, marginTop: 4 }}>
                If checked, pages will automatically load built-in illustrations (dinosaur, rocket, cat, bear, car, flower). You can replace any page illustration using the Media Library anytime.
              </p>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookPlus size={16} />
              <span>Create Project ({pageCount} Pages)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
