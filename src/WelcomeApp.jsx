import React, { useCallback, useState, lazy, Suspense } from 'react';
import TitleBar from './components/Layout/TitleBar';
import WelcomeScreen from './components/Welcome/WelcomeScreen';
import Toaster from './components/Common/Toaster';
import { toast } from './lib/stores/toastStore';
import './index.css';

// Lazy load modals for performance
const SettingsModal = lazy(() => import('./components/Modals/SettingsModal'));
const HelpModal = lazy(() => import('./components/UI/HelpModal'));

function WelcomeApp() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Default settings for the modal if none exist
  const [settings] = useState(() => {
    const saved = localStorage.getItem('kaizer-settings');
    return saved ? JSON.parse(saved) : {
      editor: { fontSize: 14, fontFamily: 'JetBrains Mono', theme: 'vs-dark' },
      ai: { provider: 'openai', model: 'gpt-4' }
    };
  });

  const handleMenuAction = (action) => {
    console.log('[WelcomeApp] Menu action:', action);
    switch (action) {
      case 'show-welcome':
        // Already on the welcome screen
        break;
      case 'show-docs':
        setShowHelpModal(true);
        break;
      case 'open-settings':
        setShowSettings(true);
        break;
      case 'show-about':
        alert('KaizerIDE – AI‑Powered Code Editor\nVersion 5.2.1');
        break;
      default:
        console.warn('Unhandled menu action:', action);
    }
  };

  const handleSaveSettings = (newSettings) => {
    localStorage.setItem('kaizer-settings', JSON.stringify(newSettings));
    setShowSettings(false);
    // Reload to apply certain settings if needed, though most are reactive
  };

  return (
    <div className="app">
      <TitleBar 
        hideMenu={true} 
        onMenuAction={handleMenuAction} 
        onSettingsClick={() => setShowSettings(true)}
      />
      <WelcomeScreen />

      {/* Modals */}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showHelpModal && (
          <HelpModal 
            onClose={() => setShowHelpModal(false)} 
            onOpenSettings={() => {
              setShowHelpModal(false);
              setShowSettings(true);
            }}
          />
        )}
      </Suspense>

      <Toaster position="bottom-right" />
    </div>
  );
}

export default WelcomeApp;
