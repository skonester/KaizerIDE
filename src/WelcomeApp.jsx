import React, { useCallback } from 'react';
import TitleBar from './components/Layout/TitleBar';
import WelcomeScreen from './components/Welcome/WelcomeScreen';
import './index.css';

/**
 * Handles menu actions from the Help menu shown on the welcome screen.
 * The original implementation did not pass any handler, so clicking the
 * Help items resulted in no action. This function provides minimal but
 * functional behavior for each supported action.
 */
const handleMenuAction = (action) => {
  switch (action) {
    case 'show-welcome':
      // Already on the welcome screen – no navigation needed.
      break;
    case 'show-docs':
      // Open the documentation in a new browser tab. Adjust the URL as needed.
      window.open('https://github.com/KaizerIDE/KaizerIDE/blob/main/docs/README.md', '_blank');
      break;
    case 'open-settings':
      // If the Electron preload exposes a settings window, use it.
      if (window.electron?.openSettings) {
        window.electron.openSettings();
      } else {
        // Fallback: open a generic settings URL if available.
        window.open('about:blank', '_blank');
      }
      break;
    case 'show-about':
      // Simple about dialog – can be replaced with a proper modal later.
      alert('KaizerIDE – AI‑Powered Code Editor\nVersion 5.2.0');
      break;
    default:
      console.warn('Unhandled menu action:', action);
  }
};

function WelcomeApp() {
  // Memoize the handler to avoid unnecessary re‑renders of TitleBar.
  const onMenuAction = useCallback(handleMenuAction, []);

  return (
    <div className="app">
      {/* Pass the handler to TitleBar so the Help menu works */}
      <TitleBar hideMenu={true} onMenuAction={onMenuAction} />
      <WelcomeScreen />
    </div>
  );
}

export default WelcomeApp;
