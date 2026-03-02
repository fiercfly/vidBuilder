import React, { useState, useEffect } from 'react';
import './TransitionPanel.css';
import { COMMON_TRANSITIONS } from './transitions';

const TransitionPanel = ({ transition, onClose, onApply, onRemove, isOpen, height }) => {
  const [transitionType, setTransitionType] = useState('fade');
  const [duration, setDuration] = useState(1.0);

  // Sync state when the selected transition changes
  useEffect(() => {
    if (transition) {
      setTransitionType(transition.type || 'fade');
      setDuration(transition.duration || 1.0);
    }
  }, [transition]);

  if (!isOpen || !transition) return null;

  const handleApply = () => {
    onApply({
      ...transition,
      type: transitionType,
      duration: parseFloat(duration),
    });
  };

  const getIcon = (id) => {
    switch(id) {
      case 'fade': return 'gradient';
      case 'wipeRight': return 'arrow_forward';
      case 'wipeLeft': return 'arrow_back';
      case 'slideRight': return 'login';
      case 'slideLeft': return 'logout';
      case 'zoom': return 'zoom_out_map';
      default: return 'animation';
    }
  };

  // --- THE FIX IS HERE ---
  // We subtract 90px (80px top offset + 10px buffer) to keep it on screen
  const panelStyle = height > 0 ? { height: `${Math.max(200, height - 90)}px` } : {};

  return (
    <div
      className={`transition-panel ${isOpen ? 'open' : ''} right`}
      style={panelStyle} 
    >
      <div className="transition-header">
        <h3>
          <span className="material-icons">timeline</span>
          Video Transition
        </h3>
        <button className="close-btn" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="transition-content">
        
        {/* Info Section */}
        <div className="transition-section">
          <label className="transition-label">Type</label>
          <div className="transition-types-grid">
            {COMMON_TRANSITIONS.map((t) => (
              <button
                key={t.id}
                className={`transition-type-btn ${transitionType === t.id ? 'active' : ''}`}
                onClick={() => setTransitionType(t.id)}
                title={t.name}
              >
                <span className="material-icons">{getIcon(t.id)}</span>
                <span className="transition-type-name">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="transition-divider" />

        {/* Duration Control */}
        <div className="transition-section">
          <label className="transition-label">
            <span className="material-icons">schedule</span>
            Duration: {Number(duration).toFixed(1)}s
          </label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="transition-slider"
          />
          <div className="slider-marks">
            <span>0.1s</span>
            <span>1.0s</span>
            <span>2.0s</span>
          </div>
        </div>
      </div>

      <div className="transition-footer">
        {transition.applied && (
          <button 
            className="btn-secondary" 
            onClick={() => { onRemove(transition.id); onClose(); }}
            style={{ backgroundColor: '#d32f2f', color: '#fff', borderColor: '#d32f2f' }}
          >
            Remove
          </button>
        )}
        <button className="btn-primary" onClick={handleApply}>
          {transition.applied ? 'Update' : 'Apply'}
        </button>
      </div>
    </div>
  );
};

export default TransitionPanel;