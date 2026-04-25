import { useState, useCallback } from 'react';

/**
 * @deprecated This hook has been moved to `./deprecated/useUIState.js` and is deprecated.
 * Use `chatStore` from `src/lib/stores/chatStore.js` instead.
 * 
 * See `./deprecated/README.md` for migration guide.
 * 
 * ```js
 * // New way:
 * import { useChatStore, POPUP_CONTEXT } from '../lib/stores/chatStore';
 * const openPopup = useChatStore((s) => s.openPopup);
 * const openPopupMenu = useChatStore((s) => s.openPopupMenu);
 * ```
 */
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
