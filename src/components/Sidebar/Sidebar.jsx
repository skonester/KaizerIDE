import React, { useState } from 'react';
import './Sidebar.css';
import FileExplorer from './FileExplorer';

function Sidebar({ onFileOpen }) {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
          title="Explorer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3h6l2 2h8v12H2V3z" />
          </svg>
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          title="Search"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="5" />
            <path d="M12 12l5 5" />
          </svg>
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
          title="Source Control"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="5" r="2" />
            <circle cx="15" cy="15" r="2" />
            <path d="M5 7v6M7 5h6M15 13V7" />
          </svg>
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'files' && (
          <FileExplorer onFileOpen={onFileOpen} />
        )}
        {activeTab === 'search' && (
          <div className="sidebar-panel">
            <div className="sidebar-header">
              <span>SEARCH</span>
            </div>
            <div className="search-container">
              <input type="text" placeholder="Search..." className="search-input" />
            </div>
          </div>
        )}
        {activeTab === 'git' && (
          <div className="sidebar-panel">
            <div className="sidebar-header">
              <span>SOURCE CONTROL</span>
            </div>
            <div className="git-status">
              <p className="empty-state">No changes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
