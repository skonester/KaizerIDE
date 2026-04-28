import React, { useState } from 'react';
import Icon from '../../../Common/Icon';

/**
 * AddModelModal - real form for adding a model.
 */
function AddModelModal({ endpoint, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [localEndpoint, setLocalEndpoint] = useState(endpoint || '');
  const [apiKey, setApiKey] = useState('');
  const [maxTokens, setMaxTokens] = useState(16000);

  const handleSubmit = () => {
    if (!name || !id) {
      alert('Please enter both Name and ID');
      return;
    }
    
    onAdd({
      id: id,
      name: name,
      maxOutputTokens: parseInt(maxTokens) || 16000
    });
    onClose();
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Add Model</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="settings-modal-body">
          <div className="settings-section">
            <label className="settings-label">Model Name</label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g., Claude 3.5 Sonnet"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="settings-section">
            <label className="settings-label">Model ID</label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g., anthropic/claude-3-5-sonnet-20241022"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <span className="setting-description">Prefix with 'gemini/' or 'anthropic/' for native providers.</span>
          </div>
          <div className="settings-section">
            <label className="settings-label">Max Output Tokens</label>
            <input
              type="number"
              className="settings-input"
              placeholder="16000"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
            />
          </div>
        </div>
        <div className="settings-modal-footer">
          <button className="settings-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="settings-btn-primary"
            onClick={handleSubmit}
          >
            Add Model
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AddModelModal);
