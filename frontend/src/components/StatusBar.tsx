import type { Dot, Tool } from '../types';

interface StatusBarProps {
  dotsCount: number;
  maxDots: number;
  selectedDot: Dot | null;
  referenceVisible: boolean;
  referenceOpacity: number;
  zoom: number;
  activeTool: Tool;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  dotsCount,
  maxDots,
  selectedDot,
  referenceVisible,
  referenceOpacity,
  zoom,
  activeTool,
}) => {
  const isMax = dotsCount >= maxDots;

  return (
    <footer className="status-bar">
      <div className="status-left">
        {/* Live Dot Counter */}
        <div className={`status-item dot-counter-badge ${isMax ? 'counter-max' : ''}`}>
          <span className="dot-led" />
          <span>DOTS: <strong>{dotsCount}</strong> / {maxDots}</span>
          {isMax && <span className="tag-warning">MAX REACHED</span>}
        </div>

        {/* Selected Dot Info */}
        <div className="status-item">
          <span>
            Selected:{' '}
            {selectedDot ? (
              <strong>
                #{selectedDot.displayNumber} ({selectedDot.x.toFixed(1)}, {selectedDot.y.toFixed(1)})
              </strong>
            ) : (
              'None'
            )}
          </span>
        </div>

        {/* Active Tool */}
        <div className="status-item">
          <span>Tool: <strong>{activeTool}</strong></span>
        </div>
      </div>

      <div className="status-right">
        {/* Reference Status */}
        <div className="status-item">
          <span>
            Reference:{' '}
            <strong>
              {referenceVisible ? `ON (${Math.round(referenceOpacity * 100)}%)` : 'OFF'}
            </strong>
          </span>
        </div>

        {/* Zoom */}
        <div className="status-item">
          <span>Zoom: <strong>{zoom}%</strong></span>
        </div>
      </div>
    </footer>
  );
};
