import React, { useState } from 'react';
import { X, FileDown, Image as ImageIcon, CheckCircle, ShieldCheck, BookOpen } from 'lucide-react';
import type { Dot, PageSetup } from '../types';

export interface FrontMatterOptions {
  belongsTo: boolean;
  toc: boolean;
  copyright: boolean;
  instructions: boolean;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dots: Dot[];
  pageSetup: PageSetup;
  dotRadius: number;
  fontSize: number;
  editedIllustration: string | null;
  caption?: string;
  onExportPdf: (includeAnswerKey: boolean, includeIllustration: boolean) => void;
  onExportPng: (dpi: number, includeAnswerKey: boolean, includeIllustration: boolean) => void;
  onExportBookPdf?: (includeAnswerKey: boolean, includeIllustration: boolean, frontMatter: FrontMatterOptions) => void;
  isExporting: boolean;
  totalPages?: number;
  activePageNumber?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dots,
  pageSetup,
  dotRadius,
  fontSize,
  editedIllustration,
  caption,
  onExportPdf,
  onExportPng,
  onExportBookPdf,
  isExporting,
  totalPages = 1,
  activePageNumber = 1,
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'book'>('current');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [includeIllustration, setIncludeIllustration] = useState(true);
  const [frontMatter, setFrontMatter] = useState<FrontMatterOptions>({
    belongsTo: true,
    toc: true,
    copyright: true,
    instructions: true,
  });

  // When modal opens or editedIllustration changes, default to TRUE if an illustration exists
  React.useEffect(() => {
    if (isOpen) {
      setIncludeIllustration(Boolean(editedIllustration));
    }
  }, [isOpen, editedIllustration]);

  if (!isOpen) return null;

  const sortedDots = [...dots].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const pathPoints = sortedDots.map((d) => `${d.x},${d.y}`).join(' ');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <ShieldCheck className="icon-success" size={22} />
            <h2>FINAL PDF PREVIEW</h2>
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="export-security-banner">
          <CheckCircle size={16} />
          <span>
            {includeIllustration && editedIllustration ? (
              <>
                <strong>Hybrid Dot-to-Dot Mode Active</strong>: Remaining un-erased illustration lines are embedded cleanly underneath the vector numbered dots.
              </>
            ) : (
              <>
                <strong>Pure Vector Puzzle Mode</strong>: Exclusively pure vector black dots and numbers on white paper.
              </>
            )}
          </span>
        </div>

        <div className="modal-body export-body">
          {/* Exact Print Simulation Canvas */}
          <div className="preview-canvas-wrapper">
            <svg
              className="export-preview-svg"
              viewBox={`0 0 ${pageSetup.widthPt} ${pageSetup.heightPt}`}
              style={{
                aspectRatio: `${pageSetup.widthPt} / ${pageSetup.heightPt}`,
                maxHeight: '100%',
                maxWidth: '100%',
                background: '#ffffff',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                borderRadius: '4px',
              }}
            >
              {/* Pure White Background */}
              <rect
                x={0}
                y={0}
                width={pageSetup.widthPt}
                height={pageSetup.heightPt}
                fill="#ffffff"
              />

              {/* Remaining Illustration Line-Art (Hybrid Mode) */}
              {includeIllustration && editedIllustration && (
                <image
                  href={editedIllustration}
                  x={pageSetup.marginPt}
                  y={pageSetup.marginPt}
                  width={pageSetup.widthPt - 2 * pageSetup.marginPt}
                  height={pageSetup.heightPt - 2 * pageSetup.marginPt}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}

              {/* Optional Answer Key Lines */}
              {includeAnswerKey && sortedDots.length > 1 && (
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="#333333"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
              )}

              {/* Black Dots */}
              {dots.map((dot) => (
                <circle
                  key={`exp-dot-${dot.id}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dotRadius}
                  fill="#000000"
                />
              ))}

              {/* Black Numbers */}
              {dots.map((dot) => (
                <text
                  key={`exp-num-${dot.id}`}
                  x={dot.numberX}
                  y={dot.numberY}
                  fontSize={fontSize}
                  fontFamily="Helvetica, Arial, sans-serif"
                  fontWeight="700"
                  fill="#000000"
                  dominantBaseline="central"
                  textAnchor="middle"
                >
                  {dot.displayNumber}
                </text>
              ))}

              {/* Bottom-Middle Object Caption Preview */}
              {caption && caption.trim() && (
                <text
                  x={pageSetup.widthPt / 2}
                  y={pageSetup.heightPt - pageSetup.marginPt - 12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(18, Math.max(10, Math.floor((pageSetup.widthPt - 2 * pageSetup.marginPt - 24) / (caption.trim().length * 0.72))))}
                  fontWeight="bold"
                  letterSpacing="1.5"
                  fill="#000000"
                  fontFamily="Helvetica, Arial, sans-serif"
                >
                  {caption.trim().toUpperCase()}
                </text>
              )}
            </svg>
          </div>

          {/* Export Configurations & Actions */}
          <div className="export-controls-pane">
            {/* Scope Selection: Current Page vs Entire Book */}
            {totalPages > 1 && onExportBookPdf && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', padding: '4px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <button
                  type="button"
                  onClick={() => setExportScope('current')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: exportScope === 'current' ? '#2563eb' : 'transparent',
                    color: exportScope === 'current' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Current Page ({activePageNumber})
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('book')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: exportScope === 'book' ? '#2563eb' : 'transparent',
                    color: exportScope === 'book' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Entire Book ({totalPages} Pages)
                </button>
              </div>
            )}

            <div className="export-spec-card">
              <h4>Print Specifications</h4>
              <div className="spec-row">
                <span>Export Scope:</span>
                <strong>{exportScope === 'book' ? `All ${totalPages} Book Pages` : `Page ${activePageNumber} Only`}</strong>
              </div>
              <div className="spec-row">
                <span>Page Format:</span>
                <strong>{pageSetup.name}</strong>
              </div>
              <div className="spec-row">
                <span>Dimensions:</span>
                <strong>{pageSetup.widthPt} × {pageSetup.heightPt} pt</strong>
              </div>
              <div className="spec-row">
                <span>Active Dots (Page {activePageNumber}):</span>
                <strong>{dots.length} / 120</strong>
              </div>
              <div className="spec-row">
                <span>Dot Radius:</span>
                <strong>{dotRadius} pt</strong>
              </div>
              <div className="spec-row">
                <span>Font Size:</span>
                <strong>{fontSize} pt (Helvetica Bold)</strong>
              </div>
              {caption && caption.trim() && (
                <div className="spec-row">
                  <span>Page Caption:</span>
                  <strong style={{ color: '#38bdf8' }}>{caption.trim().toUpperCase()}</strong>
                </div>
              )}
            </div>

            {/* Front Matter Checkboxes for KDP Book Export */}
            {exportScope === 'book' && (
              <div style={{ marginTop: '8px', padding: '10px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <BookOpen size={14} color="#38bdf8" />
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Important Front Pages (KDP Compliant)
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label className="checkbox-label" style={{ fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={frontMatter.belongsTo}
                      onChange={(e) => setFrontMatter({ ...frontMatter, belongsTo: e.target.checked })}
                    />
                    <span>"This Book Belongs To"</span>
                  </label>
                  <label className="checkbox-label" style={{ fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={frontMatter.toc}
                      onChange={(e) => setFrontMatter({ ...frontMatter, toc: e.target.checked })}
                    />
                    <span>Table of Contents</span>
                  </label>
                  <label className="checkbox-label" style={{ fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={frontMatter.copyright}
                      onChange={(e) => setFrontMatter({ ...frontMatter, copyright: e.target.checked })}
                    />
                    <span>Copyright & Disclaimer</span>
                  </label>
                  <label className="checkbox-label" style={{ fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={frontMatter.instructions}
                      onChange={(e) => setFrontMatter({ ...frontMatter, instructions: e.target.checked })}
                    />
                    <span>How to Solve Instructions</span>
                  </label>
                </div>
              </div>
            )}

            {editedIllustration && (
              <div
                className="export-option-row export-option-highlight"
                style={{
                  background: includeIllustration ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: includeIllustration ? '1px solid #2563eb' : '1px solid #334155',
                  transition: 'all 0.2s ease',
                  marginTop: '8px',
                }}
              >
                <label className="checkbox-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={includeIllustration}
                    onChange={(e) => setIncludeIllustration(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                      Include Illustration Lines (Hybrid Mode)
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Embeds un-erased drawing lines underneath the vector dots and numbers.
                    </span>
                  </div>
                </label>
              </div>
            )}

            <div className="export-option-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeAnswerKey}
                  onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                />
                <span>Include Solution Path (Answer Key mode)</span>
              </label>
            </div>

            <div className="export-action-buttons">
              {exportScope === 'book' && onExportBookPdf ? (
                <button
                  className="btn btn-primary btn-large btn-full"
                  onClick={() => onExportBookPdf(includeAnswerKey, includeIllustration, frontMatter)}
                  disabled={isExporting}
                >
                  <FileDown size={18} />
                  <span>{isExporting ? 'Generating Book...' : `Download Entire Book PDF (${totalPages} Pages)`}</span>
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-large btn-full"
                    onClick={() => onExportPdf(includeAnswerKey, includeIllustration)}
                    disabled={isExporting || dots.length === 0}
                  >
                    <FileDown size={18} />
                    <span>{isExporting ? 'Generating...' : `Download Page ${activePageNumber} Vector PDF`}</span>
                  </button>

                  <div className="png-buttons-row">
                    <button
                      className="btn btn-secondary btn-full"
                      onClick={() => onExportPng(300, includeAnswerKey, includeIllustration)}
                      disabled={isExporting || dots.length === 0}
                    >
                      <ImageIcon size={16} />
                      <span>PNG 300 DPI</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-full"
                      onClick={() => onExportPng(600, includeAnswerKey, includeIllustration)}
                      disabled={isExporting || dots.length === 0}
                    >
                      <ImageIcon size={16} />
                      <span>PNG 600 DPI</span>
                    </button>
                  </div>
                </>
              )}

              <button className="btn btn-ghost btn-full" onClick={onClose}>
                Back to Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
