/**
 * BulkBookModal.tsx
 * End-to-End Amazon KDP Bulk Book Creator Wizard.
 * Batch processes 5 to 50+ illustrations, auto-traces numbered dots with CV Engine 2.0,
 * and compiles a complete KDP-ready interior PDF with Front Matter and 4-Up Solution Keys.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  BookPlus,
  Sparkles,
  Layers,
  FileDown,
  Trash2,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import type { PageSetup, DifficultyPreset, PageItem, Dot } from '../types';
import { PAGE_PRESETS } from '../types';

export interface BulkImageItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  dotsCount?: number;
  errorMsg?: string;
  resultDots?: Dot[];
  referenceImage?: string;
}

interface BulkBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBatchPagesToProject: (pages: PageItem[], bookTitle: string, setup: PageSetup) => void;
  apiBase: string;
}

export const BulkBookModal: React.FC<BulkBookModalProps> = ({
  isOpen,
  onClose,
  onApplyBatchPagesToProject,
  apiBase,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [bookTitle, setBookTitle] = useState('My Dot-to-Dot Puzzle Book');
  const [pagePreset, setPagePreset] = useState<keyof typeof PAGE_PRESETS>('letter');
  const [difficultyPreset, setDifficultyPreset] = useState<DifficultyPreset>('detailed');
  const [customMaxDots, setCustomMaxDots] = useState(80);
  const [thresholdSensitivity, setThresholdSensitivity] = useState(50);
  const [snapToCenterline, setSnapToCenterline] = useState(true);

  // KDP Front Matter
  const [includeBelongsTo, setIncludeBelongsTo] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [includeInstructions, setIncludeInstructions] = useState(true);

  // Answer Key
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [answerKeyFormat, setAnswerKeyFormat] = useState<'compact_4up' | 'full_page'>('compact_4up');

  // Queue
  const [queue, setQueue] = useState<BulkImageItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [activeFileName, setActiveFileName] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: BulkImageItem[] = [];

    for (const file of arr) {
      if (!file.type.startsWith('image/')) continue;
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim()
        .toUpperCase();
      const previewUrl = URL.createObjectURL(file);

      newItems.push({
        id: 'bulk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        file,
        previewUrl,
        caption: cleanName,
        status: 'pending',
      });
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      setIsFinished(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateCaption = (id: string, newCaption: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption: newCaption } : item))
    );
  };

  // Run Batch Processing
  const handleStartBatch = async () => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    setIsFinished(false);

    const setup = PAGE_PRESETS[pagePreset];
    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      setProgressIndex(i + 1);
      setActiveFileName(item.caption || item.file.name);

      // Set status to processing
      item.status = 'processing';
      setQueue([...updatedQueue]);

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('preset', difficultyPreset);
        if (difficultyPreset === 'custom') {
          formData.append('custom_max_dots', String(customMaxDots));
        }
        formData.append('canvas_width', String(setup.widthPt));
        formData.append('canvas_height', String(setup.heightPt));
        formData.append('page_margin', String(setup.marginPt));
        formData.append('dot_radius', '3.5');
        formData.append('font_size', '9');
        formData.append('threshold_sensitivity', String(thresholdSensitivity));
        formData.append('snap_to_centerline', String(snapToCenterline));

        const res = await fetch(`${apiBase}/api/analyze-and-generate`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        if (data.success && data.dots) {
          item.status = 'done';
          item.dotsCount = data.dots.length;
          item.resultDots = data.dots;
          item.referenceImage = data.reference_image;
        } else {
          item.status = 'error';
          item.errorMsg = data.detail || 'Could not trace outline';
        }
      } catch (err) {
        console.error('Batch error for item:', item.caption, err);
        item.status = 'error';
        item.errorMsg = (err as Error).message || 'Processing failed';
      }

      setQueue([...updatedQueue]);
    }

    setIsProcessing(false);
    setIsFinished(true);
  };

  // Download Direct Book PDF
  const handleDirectDownloadPdf = async () => {
    const setup = PAGE_PRESETS[pagePreset];
    const exportPages = queue
      .filter((q) => q.status === 'done' && q.resultDots && q.resultDots.length > 0)
      .map((q) => ({
        dots: q.resultDots || [],
        includeIllustration: true,
        illustrationImageBase64: q.referenceImage || null,
        caption: q.caption,
      }));

    if (exportPages.length === 0) {
      alert('No successfully traced pages to export.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/export-book-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: exportPages,
          widthPt: setup.widthPt,
          heightPt: setup.heightPt,
          pageMargin: setup.marginPt,
          dotRadiusPt: 3.5,
          fontSizePt: 9.0,
          includeAnswerKey,
          answerKeyFormat,
          bookTitle: bookTitle || 'Dot-to-Dot Puzzle Book',
          includeBelongsTo,
          includeToc,
          includeCopyright,
          includeInstructions,
        }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (bookTitle || 'kdp_puzzle_book').replace(/[^a-z0-9_-]/gi, '_');
      a.download = `${safeName}_${exportPages.length}pages_kdp.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF book: ' + (err as Error).message);
    }
  };

  // Load All into Project Timeline
  const handleLoadIntoEditor = () => {
    const setup = PAGE_PRESETS[pagePreset];
    const generatedPages: PageItem[] = queue
      .filter((q) => q.status === 'done' && q.resultDots)
      .map((q, idx) => ({
        id: 'page-' + Date.now() + '-' + idx,
        pageNumber: idx + 1,
        title: q.caption || `Page ${idx + 1}`,
        caption: q.caption,
        dots: q.resultDots || [],
        initialAutoDots: q.resultDots || [],
        referenceImage: q.referenceImage || null,
        editedIllustration: q.referenceImage || null,
        sampleId: null,
      }));

    if (generatedPages.length === 0) {
      alert('No processed pages found to load.');
      return;
    }

    onApplyBatchPagesToProject(generatedPages, bookTitle, setup);
    onClose();
  };

  const completedCount = queue.filter((q) => q.status === 'done').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container bulk-book-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, width: '92%', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <BookPlus size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Bulk Book Creator (Amazon KDP)
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                  }}
                >
                  CV ENGINE 2.0
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                Upload multiple illustrations to automatically trace, format, and compile a complete KDP puzzle book.
              </p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 20,
            overflowY: 'auto',
            maxHeight: 'calc(92vh - 140px)',
            padding: '16px 20px',
          }}
        >
          {/* Left Column: Image Queue & Dropzone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#f8fafc' }}>
                1. Illustrations Queue ({queue.length})
              </h3>
              {queue.length > 0 && !isProcessing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => setQueue([])}
                >
                  Clear Queue
                </button>
              )}
            </div>

            {/* Dropzone */}
            <div
              className={`media-upload-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragOver ? '2px dashed #3b82f6' : '2px dashed #334155',
                backgroundColor: dragOver ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                borderRadius: 8,
                padding: '18px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <Upload size={24} style={{ color: '#3b82f6', margin: '0 auto 6px auto' }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                Drop 5 to 50+ Line-Art Images Here
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                or click to browse PNG/JPG files from your computer
              </div>
            </div>

            {/* Queue List Table */}
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                maxHeight: 330,
                overflowY: 'auto',
                padding: 6,
              }}
            >
              {queue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: '#64748b', fontSize: 12 }}>
                  No illustrations added yet. Drop images above to begin.
                </div>
              ) : (
                queue.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 6,
                      backgroundColor: '#1e293b',
                      marginBottom: 6,
                      border: '1px solid #334155',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', minWidth: 20 }}>
                      #{index + 1}
                    </span>
                    <img
                      src={item.previewUrl}
                      alt={item.caption}
                      style={{
                        width: 38,
                        height: 38,
                        objectFit: 'contain',
                        backgroundColor: '#ffffff',
                        borderRadius: 4,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => handleUpdateCaption(item.id, e.target.value)}
                        disabled={isProcessing}
                        placeholder="Object Caption..."
                        style={{
                          width: '100%',
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 4,
                          padding: '3px 6px',
                          color: '#f8fafc',
                        }}
                      />
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.status === 'pending' && (
                        <span style={{ fontSize: 10, color: '#94a3b8', padding: '2px 6px', borderRadius: 4, backgroundColor: '#334155' }}>
                          Ready
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span style={{ fontSize: 10, color: '#38bdf8', padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(56, 189, 248, 0.15)' }}>
                          Tracing...
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span style={{ fontSize: 10, color: '#10b981', padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                          ✓ {item.dotsCount} dots
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span style={{ fontSize: 10, color: '#ef4444', padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                          Error
                        </span>
                      )}
                    </div>

                    {!isProcessing && (
                      <button
                        className="btn-icon"
                        onClick={() => handleRemoveItem(item.id)}
                        style={{ color: '#94a3b8', padding: 4 }}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Live Progress Bar */}
            {isProcessing && (
              <div style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    Processing {progressIndex} of {queue.length}: {activeFileName}
                  </span>
                  <span style={{ color: '#94a3b8' }}>{Math.round((progressIndex / queue.length) * 100)}%</span>
                </div>
                <div style={{ width: '100%', height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(progressIndex / queue.length) * 100}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Amazon KDP Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#f8fafc' }}>
              2. KDP Print Specifications
            </h3>

            {/* Book Title */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>Book Project Title</label>
              <input
                type="text"
                className="input-field"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. Cute Animals Dot-to-Dot"
                style={{ fontSize: 12 }}
              />
            </div>

            {/* Trim Size Preset */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>KDP Trim Size</label>
              <select
                className="input-field"
                value={pagePreset}
                onChange={(e) => setPagePreset(e.target.value as keyof typeof PAGE_PRESETS)}
                style={{ fontSize: 12 }}
              >
                <option value="letter">US Letter (8.5 × 11 in) - KDP Standard</option>
                <option value="square">Square KDP (8.5 × 8.5 in)</option>
                <option value="novel">Novel KDP (6 × 9 in)</option>
                <option value="a4">A4 (210 × 297 mm)</option>
              </select>
            </div>

            {/* Difficulty Preset */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>Dot Density / Target Age</label>
              <select
                className="input-field"
                value={difficultyPreset}
                onChange={(e) => setDifficultyPreset(e.target.value as DifficultyPreset)}
                style={{ fontSize: 12 }}
              >
                <option value="easy">Ages 3-5 (Toddler: ~20-30 Dots)</option>
                <option value="medium">Ages 6-8 (Kids: ~50-60 Dots)</option>
                <option value="detailed">Ages 8-12 (Detailed: ~80-110 Dots)</option>
                <option value="custom">Custom Maximum Budget</option>
              </select>
            </div>

            {difficultyPreset === 'custom' && (
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1' }}>
                  <span>Max Dots per Puzzle</span>
                  <strong>{customMaxDots} / 120</strong>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  value={customMaxDots}
                  onChange={(e) => setCustomMaxDots(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
              </div>
            )}

            {/* Line Detection & Snapping */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1' }}>
                <span>Line Detection Sensitivity</span>
                <strong>{thresholdSensitivity}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={thresholdSensitivity}
                onChange={(e) => setThresholdSensitivity(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>Centerline Skeleton Snap</span>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Snaps dots to the medial axis of lines</p>
              </div>
              <button
                type="button"
                onClick={() => setSnapToCenterline(!snapToCenterline)}
                style={{
                  width: '38px',
                  height: '20px',
                  borderRadius: '10px',
                  background: snapToCenterline ? '#2563eb' : '#334155',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: snapToCenterline ? '20px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {/* KDP Front Matter Section */}
            <div
              style={{
                backgroundColor: '#0f172a',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <BookOpen size={14} color="#38bdf8" />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#f8fafc' }}>
                  Front Matter Pages (KDP Compliant)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <label className="checkbox-label" style={{ fontSize: 11, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={includeBelongsTo}
                    onChange={(e) => setIncludeBelongsTo(e.target.checked)}
                  />
                  <span>"Belongs To" Page</span>
                </label>
                <label className="checkbox-label" style={{ fontSize: 11, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={includeToc}
                    onChange={(e) => setIncludeToc(e.target.checked)}
                  />
                  <span>Table of Contents</span>
                </label>
                <label className="checkbox-label" style={{ fontSize: 11, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={includeCopyright}
                    onChange={(e) => setIncludeCopyright(e.target.checked)}
                  />
                  <span>Copyright Notice</span>
                </label>
                <label className="checkbox-label" style={{ fontSize: 11, color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={includeInstructions}
                    onChange={(e) => setIncludeInstructions(e.target.checked)}
                  />
                  <span>Instructions Guide</span>
                </label>
              </div>
            </div>

            {/* Answer Key / Solution Format */}
            <div
              style={{
                backgroundColor: '#0f172a',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #1e293b',
              }}
            >
              <label
                className="checkbox-label"
                style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 8, display: 'flex' }}
              >
                <input
                  type="checkbox"
                  checked={includeAnswerKey}
                  onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                />
                <span>Include Solution / Answer Key Pages</span>
              </label>

              {includeAnswerKey && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setAnswerKeyFormat('compact_4up')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: answerKeyFormat === 'compact_4up' ? '1px solid #38bdf8' : '1px solid #334155',
                      backgroundColor: answerKeyFormat === 'compact_4up' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: answerKeyFormat === 'compact_4up' ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    4-Up Grid (Saves KDP Cost)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswerKeyFormat('full_page')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: answerKeyFormat === 'full_page' ? '1px solid #38bdf8' : '1px solid #334155',
                      backgroundColor: answerKeyFormat === 'full_page' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: answerKeyFormat === 'full_page' ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    Full Page per Solution
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!isFinished ? (
                <button
                  className="btn btn-primary btn-large btn-full"
                  onClick={handleStartBatch}
                  disabled={isProcessing || queue.length === 0}
                  style={{ gap: 8 }}
                >
                  <Sparkles size={18} />
                  <span>
                    {isProcessing
                      ? `Tracing Puzzles (${progressIndex}/${queue.length})...`
                      : `Batch Generate All (${queue.length} Puzzles)`}
                  </span>
                </button>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      color: '#10b981',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Successfully traced {completedCount} puzzles! Ready to publish.</span>
                  </div>

                  <button
                    className="btn btn-primary btn-large btn-full"
                    onClick={handleDirectDownloadPdf}
                    style={{ gap: 8, background: 'linear-gradient(135deg, #059669, #10b981)' }}
                  >
                    <FileDown size={18} />
                    <span>Download Complete KDP Book PDF</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-full"
                    onClick={handleLoadIntoEditor}
                    style={{ gap: 8 }}
                  >
                    <Layers size={16} />
                    <span>Open in Multi-Page Filmstrip Editor</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
