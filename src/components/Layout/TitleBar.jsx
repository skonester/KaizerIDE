import React from 'react';
import MenuBar from './MenuBar';
import './TitleBar.css';

function TitleBar({ workspacePath, onSettingsClick, onMenuAction }) {
  const handleMinimize = () => {
    window.electron?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electron?.windowMaximize();
  };

  const handleClose = () => {
    window.electron?.windowClose();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <div className="logo">K</div>
        <MenuBar onMenuAction={onMenuAction} />
      </div>
      <div className="titlebar-center">
        <button className="titlebar-icon-btn" onClick={onSettingsClick} title="Settings (Ctrl+,)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
            <path d="M14 8a1.5 1.5 0 01-1.5 1.5h-.5a.5.5 0 00-.5.5v.5a1.5 1.5 0 01-1.5 1.5h-.5a.5.5 0 00-.5.5v.5a1.5 1.5 0 01-1.5 1.5h-1a1.5 1.5 0 01-1.5-1.5v-.5a.5.5 0 00-.5-.5h-.5A1.5 1.5 0 012 10.5v-.5a.5.5 0 00-.5-.5h-.5A1.5 1.5 0 010 8v-1a1.5 1.5 0 011.5-1.5h.5a.5.5 0 00.5-.5v-.5A1.5 1.5 0 014 3h.5a.5.5 0 00.5-.5v-.5A1.5 1.5 0 016.5 0h1A1.5 1.5 0 019 1.5v.5a.5.5 0 00.5.5h.5A1.5 1.5 0 0111.5 4v.5a.5.5 0 00.5.5h.5A1.5 1.5 0 0114 6.5V8z"/>
          </svg>
        </button>
      </div>
      <div className="titlebar-right">
        <button className="titlebar-btn minimize" onClick={handleMinimize}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="0" y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button className="titlebar-btn maximize" onClick={handleMaximize}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={handleClose}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
