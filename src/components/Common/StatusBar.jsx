import React, { useState, useEffect } from 'react';
import { indexer } from '../../lib/indexer';
import './StatusBar.css';

function StatusBar({ activeFile, modelName, endpoint }) {
  const [indexStatus, setIndexStatus] = useState(() => ({
    status: indexer.status,
    progress: indexer.progress,
    fileCount: indexer.index.length,
    enabled: indexer.enabled
  }));
  const [sshStatus, setSSHStatus] = useState({ connected: false, isRemote: false });

  useEffect(() => {
    return indexer.subscribe(setIndexStatus);
  }, []);

  useEffect(() => {
    // Check SSH status on mount and periodically
    const checkSSHStatus = async () => {
      if (window.electron?.getSSHStatus) {
        const status = await window.electron.getSSHStatus();
        setSSHStatus(status);
      }
    };

    checkSSHStatus();
    const interval = setInterval(checkSSHStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getEndpointHost = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.host;
    } catch {
      return url;
    }
  };

  const handleIndexerClick = () => {
    window.dispatchEvent(new CustomEvent('kaizer:open-settings', { detail: { tab: 'indexer' } }));
  };

  const getIndexerIndicator = () => {
    if (!indexStatus.enabled) return null;

    if (indexStatus.status === 'indexing') {
      return (
        <div className="status-indexer indexing" onClick={handleIndexerClick} title={`Indexing workspace... ${indexStatus.progress}%`}>
          <span className="indexer-dot pulsing"></span>
          <span className="indexer-text">Indexing {indexStatus.progress}%</span>
        </div>
      );
    }

    if (indexStatus.status === 'ready') {
      return (
        <div className="status-indexer ready" onClick={handleIndexerClick} title={`Index ready — ${indexStatus.fileCount} files`}>
          <span className="indexer-dot"></span>
        </div>
      );
    }

    if (indexStatus.status === 'error') {
      return (
        <div className="status-indexer error" onClick={handleIndexerClick} title="Indexing failed">
          <span className="indexer-dot"></span>
        </div>
      );
    }

    if (indexStatus.status === 'idle') {
      return (
        <div className="status-indexer idle" onClick={handleIndexerClick} title="Not indexed">
          <span className="indexer-dot"></span>
        </div>
      );
    }

    return null;
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
      <div className="status-right">
        {sshStatus.connected && (
          <div className="status-ssh connected" title="SSH Connected">
            <span className="ssh-dot"></span>
            <span className="ssh-text">SSH</span>
          </div>
        )}
        {getIndexerIndicator()}
      </div>
    </div>
  );
}

export default StatusBar;
