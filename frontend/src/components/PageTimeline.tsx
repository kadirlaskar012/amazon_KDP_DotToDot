import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Layers,
} from 'lucide-react';
import type { PageItem } from '../types';

interface PageTimelineProps {
  pages: PageItem[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
}

export const PageTimeline: React.FC<PageTimelineProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  return (
    <div className="page-timeline">
      {/* Timeline Controls / Meta Header */}
      <div className="timeline-meta">
        <div className="timeline-title-row">
          <Layers size={14} className="timeline-icon" />
          <span className="timeline-title">Pages</span>
          <span className="timeline-badge">
            {activePageIndex + 1} / {pages.length}
          </span>
        </div>
        <div className="timeline-nav-buttons">
          <button
            className="timeline-nav-btn"
            onClick={handleScrollLeft}
            title="Scroll timeline left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="timeline-nav-btn"
            onClick={handleScrollRight}
            title="Scroll timeline right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Filmstrip Strip Cards Container */}
      <div className="timeline-strip-container" ref={scrollContainerRef}>
        {pages.map((page, index) => {
          const isActive = index === activePageIndex;
          const dotsCount = page.dots ? page.dots.length : 0;
          const hasImage = Boolean(page.editedIllustration || page.referenceImage);

          return (
            <div
              key={page.id || `page-${index}`}
              className={`timeline-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPage(index)}
              title={`Page ${index + 1}: ${dotsCount} dots`}
            >
              {/* Card Thumbnail Area */}
              <div className="timeline-card-preview">
                {hasImage ? (
                  <img
                    src={page.editedIllustration || page.referenceImage || ''}
                    alt={`Page ${index + 1}`}
                    className="timeline-card-img"
                  />
                ) : (
                  <div className="timeline-card-placeholder">
                    <span className="timeline-placeholder-text">Blank</span>
                  </div>
                )}

                {/* Dot Count Badge */}
                <div className={`timeline-dot-badge ${dotsCount > 0 ? 'has-dots' : 'no-dots'}`}>
                  {dotsCount > 0 ? `${dotsCount} dots` : 'No dots'}
                </div>

                {/* Quick Action Overlay Buttons */}
                <div className="timeline-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="timeline-action-btn"
                    onClick={() => onDuplicatePage(index)}
                    title="Duplicate Page"
                  >
                    <Copy size={12} />
                  </button>
                  {pages.length > 1 && (
                    <button
                      className="timeline-action-btn delete"
                      onClick={() => onDeletePage(index)}
                      title="Delete Page"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Footer: Page Number */}
              <div className="timeline-card-footer">
                <span className="timeline-page-num">Page {index + 1}</span>
              </div>
            </div>
          );
        })}

        {/* Add New Page Button Card */}
        <button
          className="timeline-add-card"
          onClick={onAddPage}
          title="Add a new blank page to project"
        >
          <div className="timeline-add-inner">
            <Plus size={20} />
            <span>Add Page</span>
          </div>
        </button>
      </div>
    </div>
  );
};
