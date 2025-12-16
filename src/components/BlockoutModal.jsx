import { useState, useEffect } from 'react';
import './BlockoutModal.css';

function BlockoutModal({ isOpen, onClose, onAdd, availableTerms = [], editBlockout = null }) {
  const [name, setName] = useState('Blockout');
  const [day, setDay] = useState('mon');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [applyTo, setApplyTo] = useState('both'); // 'both', 'sem1', or 'sem2'

  // Populate form when editing
  useEffect(() => {
    if (editBlockout) {
      setName(editBlockout.name);
      setDay(editBlockout.day);
      setStartTime(editBlockout.startTime);
      setEndTime(editBlockout.endTime);
      setApplyTo(editBlockout.applyTo || 'both');
    } else {
      // Reset form for new blockout
      setName('Blockout');
      setDay('mon');
      setStartTime('08:00');
      setEndTime('10:00');
      setApplyTo('both');
    }
  }, [editBlockout, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate times
    const start = startTime.split(':').map(n => parseInt(n));
    const end = endTime.split(':').map(n => parseInt(n));
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    if (startMinutes >= endMinutes) {
      alert('End time must be after start time');
      return;
    }
    
    if (startMinutes < 8 * 60 || endMinutes > 20 * 60) {
      alert('Time must be between 08:00 and 20:00');
      return;
    }
    
    const blockout = {
      id: editBlockout ? editBlockout.id : `blockout-${Date.now()}`,
      name: name.trim() || 'Blockout',
      day,
      startTime,
      endTime,
      applyTo, // 'both', 'sem1', or 'sem2'
      isBlockout: true
    };
    
    onAdd(blockout, !!editBlockout);
    
    // Reset form
    setName('Blockout');
    setDay('mon');
    setStartTime('08:00');
    setEndTime('10:00');
    setApplyTo('both');
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="blockout-modal-overlay">
      <div className="blockout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="blockout-modal-header">
          <h2>{editBlockout ? 'Edit Blockout Time' : 'Add Blockout Time'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="blockout-form">
          <div className="blockout-form-group">
            <label htmlFor="blockout-name">Name:</label>
            <input
              id="blockout-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Blockout"
              maxLength={50}
            />
          </div>
          
          <div className="blockout-form-group">
            <label htmlFor="blockout-day">Day:</label>
            <select
              id="blockout-day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              <option value="mon">Monday</option>
              <option value="tue">Tuesday</option>
              <option value="wed">Wednesday</option>
              <option value="thu">Thursday</option>
              <option value="fri">Friday</option>
              <option value="sat">Saturday</option>
              <option value="sun">Sunday</option>
            </select>
          </div>
          
          <div className="blockout-form-group">
            <label htmlFor="blockout-apply">Apply to:</label>
            <select
              id="blockout-apply"
              value={applyTo}
              onChange={(e) => setApplyTo(e.target.value)}
            >
              <option value="both">Both Semesters</option>
              <option value="sem1">Semester 1 Only</option>
              <option value="sem2">Semester 2 Only</option>
            </select>
          </div>
          
          <div className="blockout-form-row">
            <div className="blockout-form-group">
              <label htmlFor="blockout-start">Start Time:</label>
              <input
                id="blockout-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min="08:00"
                max="20:00"
                step="300"
              />
            </div>
            
            <div className="blockout-form-group">
              <label htmlFor="blockout-end">End Time:</label>
              <input
                id="blockout-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min="08:00"
                max="20:00"
                step="300"
              />
            </div>
          </div>
          
          <div className="blockout-form-actions">
            <button type="button" onClick={onClose} className="blockout-btn-cancel">
              Cancel
            </button>
            <button type="submit" className="blockout-btn-add">
              {editBlockout ? 'Save Changes' : 'Add Blockout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlockoutModal;
