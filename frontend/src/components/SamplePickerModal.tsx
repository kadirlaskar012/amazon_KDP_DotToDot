import React from 'react';
import { X, Sparkles, Check, Upload } from 'lucide-react';
import type { SampleItem } from '../types';

interface SamplePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
  selectedSampleId: string | null;
  onSelectSample: (sampleId: string) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

export const SamplePickerModal: React.FC<SamplePickerModalProps> = ({
  isOpen,
  onClose,
  samples,
  selectedSampleId,
  onSelectSample,
  onUploadImage,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container sample-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Sparkles className="icon-accent" size={20} />
            <h2>Sample Line-Art Gallery</h2>
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="modal-description">
          Choose a built-in black-and-white test illustration or upload your own custom line-art image.
        </p>

        <div className="samples-grid">
          {/* Custom Upload Card */}
          <label className="sample-card sample-card-upload" title="Upload your own custom black and white illustration">
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={(e) => {
                onUploadImage(e);
                onClose();
              }}
              style={{ display: 'none' }}
            />
            <div className="sample-thumbnail-box sample-upload-box">
              <Upload size={32} className="icon-accent" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Upload Your Own</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG / JPG Line-Art</span>
            </div>
            <div className="sample-card-footer">
              <span className="sample-title">Custom Image</span>
              <span className="btn btn-primary btn-sm">Browse...</span>
            </div>
          </label>
          {samples.map((s) => {
            const isCurrent = selectedSampleId === s.id;
            return (
              <div
                key={s.id}
                className={`sample-card ${isCurrent ? 'sample-selected' : ''}`}
                onClick={() => onSelectSample(s.id)}
              >
                <div className="sample-thumbnail-box">
                  <img
                    src={`http://127.0.0.1:8000/api/samples/${s.filename}`}
                    alt={s.title}
                    className="sample-img"
                  />
                  {isCurrent && (
                    <div className="sample-check-badge">
                      <Check size={14} />
                    </div>
                  )}
                </div>
                <div className="sample-card-footer">
                  <span className="sample-title">{s.title}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSample(s.id);
                    }}
                  >
                    Load & Trace
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
