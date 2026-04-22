import React from 'react';
import './StatusBar.css';

function StatusBar({ activeFile, modelName, endpoint }) {
  const getEndpointHost = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.host;
    } catch {
      return url;
    }
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        {activeFile ? (
          <span className="status-file">{activeFile}</span>
        ) : (
          <span className="status-file status-empty">No file open</span>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
