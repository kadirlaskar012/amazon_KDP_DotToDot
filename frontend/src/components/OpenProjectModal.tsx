import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Clock, FileText, Trash2, RefreshCw, Upload, HardDrive } from 'lucide-react';
import { type LocalProjectMeta } from '../utils/projectIO';

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProjectFromFilePath: (filePath: string) => void;
  onBrowseFileFromDisk: () => void;
}

export const OpenProjectModal: React.FC<OpenProjectModalProps> = ({
  isOpen,
  onClose,
  onLoadProjectFromFilePath,
  onBrowseFileFromDisk,
}) => {
  const [projects, setProjects] = useState<LocalProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderLocation, setFolderLocation] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/projects');
      if (!res.ok) throw new Error('Failed to load projects list');
      const data = await res.json();
      setProjects(data.projects || []);
      setFolderLocation(data.location || 'projects/');
    } catch (err: any) {
      setError(err.message || 'Could not load local projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/projects/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.filename !== filename));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content open-project-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(680px, 95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <FolderOpen className="modal-title-icon" size={20} color="#38bdf8" />
            <h2 className="modal-title">Open Saved Project</h2>
          </div>
          <button className="btn-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Location Info Banner */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <HardDrive size={14} color="#38bdf8" />
            <span>Folder:</span>
            <code style={{ color: '#f8fafc', backgroundColor: '#0f172a', padding: '2px 6px', borderRadius: 4 }}>
              {folderLocation || 'projects/'}
            </code>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchProjects}
            title="Refresh list"
            disabled={loading}
            style={{ padding: '2px 6px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Project List Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {error && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
              <p>Scanning projects folder...</p>
            </div>
          ) : projects.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 8,
                border: '1px dashed #334155',
              }}
            >
              <FileText size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ color: '#f8fafc', marginBottom: 6, fontSize: 14 }}>No Saved Projects Yet</h4>
              <p style={{ color: '#94a3b8', fontSize: 12, maxWidth: 360, margin: '0 auto 16px' }}>
                When you create or save a project, it is auto-saved directly into the tool's <code>projects/</code> folder on your computer without browser downloads.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.map((proj) => (
                <div
                  key={proj.filename}
                  onClick={() => {
                    onLoadProjectFromFilePath(proj.filePath);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.backgroundColor = '#0f172a';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>
                        {proj.projectName}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {proj.pageCount} {proj.pageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748b' }}>
                      <code>{proj.filename}</code>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {proj.updatedAt}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        onLoadProjectFromFilePath(proj.filePath);
                        onClose();
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-sm"
                      onClick={(e) => handleDelete(e, proj.filename)}
                      title="Delete project file"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onClose();
              onBrowseFileFromDisk();
            }}
            title="Browse external .dotproj or JSON file from computer"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Upload size={14} />
            <span>Browse File from Computer...</span>
          </button>

          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
