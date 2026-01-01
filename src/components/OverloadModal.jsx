import React, { useState, useEffect } from 'react';
import './OverloadModal.css';

function OverloadModal({ isOpen, onClose, overloadEnabled, setOverloadEnabled, maxPerSemester, setMaxPerSemester }) {
  const [localEnabled, setLocalEnabled] = useState(overloadEnabled);
  const [localValue, setLocalValue] = useState(String(maxPerSemester || ''));
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalEnabled(overloadEnabled);
    setLocalValue(String(maxPerSemester || ''));
    setError('');
  }, [isOpen, overloadEnabled, maxPerSemester]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (localEnabled) {
      const parsed = parseInt(localValue, 10);
      if (isNaN(parsed) || !(parsed > 6 && parsed < 12)) {
        setError('Please enter an integer between 7 and 11.');
        return;
      }
      setMaxPerSemester(parsed);
    }
    setOverloadEnabled(localEnabled);
    onClose();
  };

  return (
    <div className="overload-modal-backdrop" onClick={onClose}>
      <div className="overload-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="overload-modal-title">Overload Options</h3>
        <div className="overload-modal-body">
          <label className="overload-row">
            <input type="checkbox" checked={localEnabled} onChange={(e) => setLocalEnabled(e.target.checked)} />
            <span style={{ marginLeft: '8px' }}>Enable Overload</span>
          </label>

          <label className="overload-row">
            <span style={{ minWidth: '160px', display: 'inline-block' }}>Max per semester</span>
            <input
              className="overload-input"
              type="number"
              min={7}
              max={11}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              disabled={!localEnabled}
            />
          </label>
          {error && <div className="overload-error">{error}</div>}
        </div>

        <div className="overload-modal-actions">
          <button className="modal-btn" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default OverloadModal;
