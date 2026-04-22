import React, { useState } from 'react';
import './SettingsModal.css';

function SettingsModal({ settings, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveGeneral = () => {
    onSave(localSettings);
  };

  const handleAddModel = () => {
    const id = prompt('Model ID (e.g., kr/claude-sonnet-4.5):');
    if (!id) return;
    
    const name = prompt('Model Name:');
    if (!name) return;
    
    const maxTokens = parseInt(prompt('Max Output Tokens:', '16000'));
    if (isNaN(maxTokens)) return;

    const newModel = { id, name, maxOutputTokens: maxTokens };
    setLocalSettings(prev => ({
      ...prev,
      models: [...prev.models, newModel]
    }));
  };

  const handleDeleteModel = (modelId) => {
    if (localSettings.models.length <= 1) {
      alert('Cannot delete the last model');
      return;
    }
    
    setLocalSettings(prev => ({
      ...prev,
      models: prev.models.filter(m => m.id !== modelId)
    }));
  };

  const handleSaveModels = () => {
    onSave(localSettings);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-panel">
              <div className="setting-group">
                <label>Endpoint URL</label>
                <input
                  type="text"
                  className="endpoint-input"
                  value={localSettings.endpoint}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="http://localhost:20128/v1"
                />
              </div>

              <div className="setting-group">
                <label>API Key</label>
                <div className="api-key-input-wrapper">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="api-key-input"
                    value={localSettings.apiKey}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Optional"
                  />
                  <button
                    className="toggle-visibility"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button className="save-btn" onClick={handleSaveGeneral}>
                Save
              </button>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="settings-panel">
              <div className="models-list">
                {localSettings.models.map(model => (
                  <div key={model.id} className="model-row">
                    <div className="model-info">
                      <div className="model-id">{model.id}</div>
                      <div className="model-name">{model.name}</div>
                      <div className="model-tokens">{model.maxOutputTokens} tokens</div>
                    </div>
                    <button
                      className="delete-model-btn"
                      onClick={() => handleDeleteModel(model.id)}
                      title="Delete model"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-model-section">
                <button className="add-model-btn" onClick={handleAddModel}>
                  + Add Model
                </button>
              </div>

              <button className="save-btn" onClick={handleSaveModels}>
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
