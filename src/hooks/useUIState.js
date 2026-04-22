import { useState, useCallback } from 'react';

export function useUIState() {
  const [uiState, setUIState] = useState({
    showContextMenu: false,
    showModeMenu: false,
    showModelMenu: false,
    showChatList: false
  });

  const toggleContextMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, showContextMenu: !prev.showContextMenu }));
  }, []);

  const toggleModeMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, showModeMenu: !prev.showModeMenu }));
  }, []);

  const toggleModelMenu = useCallback(() => {
    setUIState(prev => ({ ...prev, showModelMenu: !prev.showModelMenu }));
  }, []);

  const toggleChatList = useCallback(() => {
    setUIState(prev => ({ ...prev, showChatList: !prev.showChatList }));
  }, []);

  const closeAllMenus = useCallback(() => {
    setUIState({
      showContextMenu: false,
      showModeMenu: false,
      showModelMenu: false,
      showChatList: false
    });
  }, []);

  return {
    uiState,
    toggleContextMenu,
    toggleModeMenu,
    toggleModelMenu,
    toggleChatList,
    closeAllMenus
  };
}
