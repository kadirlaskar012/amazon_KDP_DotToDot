import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  FolderOpen,
  Wand2,
  AlertCircle,
  Check,
} from 'lucide-react';
import type { MediaItem } from '../types';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaLibrary: MediaItem[];
  onUploadMedia: (files: FileList | File[]) => void;
  onApplyImageToPage: (media: MediaItem) => void;
  onDeleteMedia: (id: string) => void;
  activePageNumber: number;
  isGenerating: boolean;
  totalPages: number;
  onBatchAutoPlot?: (expandBook: boolean) => Promise<void>;
  isBatchPlotting?: boolean;
  batchPlotProgress?: { current: number; total: number } | null;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  mediaLibrary,
  onUploadMedia,
  onApplyImageToPage,
  onDeleteMedia,
  activePageNumber,
  isGenerating,
  totalPages,
  onBatchAutoPlot,
  isBatchPlotting = false,
  batchPlotProgress = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showConfirmPlot, setShowConfirmPlot] = useState(false);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadMedia(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadMedia(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content media-library-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 780, width: '90%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <ImageIcon className="modal-title-icon" size={20} />
            <h2 className="modal-title">Project Media Library</h2>
            <span
              style={{
                fontSize: 12,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 600,
                marginLeft: 8,
              }}
            >
              {mediaLibrary.length} {mediaLibrary.length === 1 ? 'image' : 'images'}
            </span>
            {mediaLibrary.length > 0 && onBatchAutoPlot && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowConfirmPlot(true)}
                disabled={isBatchPlotting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  marginLeft: 12,
                }}
                title="Automatically assign and trace illustrations onto pages"
              >
                <Wand2 size={14} />
                <span>Auto Plot to Canvas</span>
              </button>
            )}
          </div>
          <button className="btn-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px 20px' }}>
          {/* Multiple File Upload Dropzone */}
          <div
            className={`media-upload-dropzone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragOver ? '2px dashed #3b82f6' : '2px dashed #334155',
              backgroundColor: dragOver ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.6)',
              borderRadius: 10,
              padding: '24px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 20,
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg"
              style={{ display: 'none' }}
              onChange={handleFilesSelected}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={22} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc' }}>
                Click to Upload Multiple Images, or Drag & Drop Here
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Select multiple PNG or JPG line-art files at once. You can apply any image to any page.
              </div>
            </div>
          </div>

          {/* Media Items Grid */}
          {mediaLibrary.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FolderOpen size={40} strokeWidth={1.5} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>No images in project media library yet.</p>
              <p style={{ fontSize: 12 }}>Upload black and white line-art images above to get started.</p>
            </div>
          ) : (
            <div
              className="media-library-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              {mediaLibrary.map((item) => (
                <div
                  key={item.id}
                  className="media-card"
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Image Preview */}
                  <div
                    style={{
                      height: 140,
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={item.dataUri}
                      alt={item.filename}
                      style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        objectFit: 'contain',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMedia(item.id);
                      }}
                      title="Delete image from media library"
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        backgroundColor: 'rgba(239, 68, 68, 0.85)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Info & Apply Action */}
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 12,
                          color: '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.filename}
                      >
                        {item.filename}
                      </div>
                      {item.width > 0 && item.height > 0 && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {item.width} × {item.height} px
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-primary"
                      disabled={isGenerating}
                      onClick={() => {
                        onApplyImageToPage(item);
                        onClose();
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 'auto',
                      }}
                      title={`Place this image on Page ${activePageNumber} and generate intelligent dots`}
                    >
                      <Sparkles size={14} />
                      <span>Apply to Page {activePageNumber}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Applying an image will place it on <strong>Page {activePageNumber}</strong> and automatically generate dots.
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>

        {/* Batch Auto-Plot Confirmation Dialog */}
        {showConfirmPlot && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #3b82f6',
                borderRadius: 12,
                padding: '24px',
                maxWidth: 480,
                width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <AlertCircle size={24} color="#3b82f6" />
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: 17, fontWeight: 700 }}>Auto-Plot Images to Pages</h3>
              </div>

              {mediaLibrary.length > totalPages ? (
                <>
                  <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    You have <strong style={{ color: '#60a5fa' }}>{mediaLibrary.length} images</strong> in your Media Library, but your book currently has <strong style={{ color: '#f59e0b' }}>{totalPages} pages</strong>.
                    <br /><br />
                    Would you like to expand your book by adding <strong style={{ color: '#10b981' }}>{mediaLibrary.length - totalPages} extra pages</strong> to fit all images, or plot only the first {totalPages} images?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={async () => {
                        setShowConfirmPlot(false);
                        await onBatchAutoPlot?.(true);
                      }}
                      style={{ justifyContent: 'center', padding: '10px 14px', fontSize: 13 }}
                    >
                      <Check size={16} style={{ marginRight: 6 }} />
                      Add {mediaLibrary.length - totalPages} Pages & Plot All {mediaLibrary.length} Images
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        setShowConfirmPlot(false);
                        await onBatchAutoPlot?.(false);
                      }}
                      style={{ justifyContent: 'center', padding: '10px 14px', fontSize: 13 }}
                    >
                      Plot First {totalPages} Images on Existing Pages Only
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowConfirmPlot(false)}
                      style={{ justifyContent: 'center', padding: '8px 14px', fontSize: 13 }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    This will plot all <strong style={{ color: '#60a5fa' }}>{mediaLibrary.length} images</strong> onto <strong>Pages 1 to {mediaLibrary.length}</strong> and automatically generate intelligent numbered dots for each page.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowConfirmPlot(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={async () => {
                        setShowConfirmPlot(false);
                        await onBatchAutoPlot?.(false);
                      }}
                    >
                      <Wand2 size={16} style={{ marginRight: 6 }} />
                      Proceed & Auto-Plot All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Batch Plot Progress Modal Overlay */}
        {isBatchPlotting && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #3b82f6',
                borderRadius: 12,
                padding: '24px',
                textAlign: 'center',
                maxWidth: 420,
                width: '85%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            >
              <Sparkles size={32} color="#60a5fa" style={{ marginBottom: 12, display: 'inline-block' }} />
              <h3 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: 16 }}>Auto-Plotting Images to Pages</h3>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px 0' }}>
                {batchPlotProgress ? `Analyzing & placing dots for Page ${batchPlotProgress.current} of ${batchPlotProgress.total}...` : 'Processing line-art illustrations...'}
              </p>
              {batchPlotProgress && (
                <div style={{ width: '100%', height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      width: `${(batchPlotProgress.current / batchPlotProgress.total) * 100}%`,
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
