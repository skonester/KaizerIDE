import { useState, useCallback } from 'react';

/**
 * @deprecated This hook has been moved to `./deprecated/useContextPills.js` and is deprecated.
 * Use `chatStore` from `src/lib/stores/chatStore.js` instead.
 * 
 * See `./deprecated/README.md` for migration guide.
 * 
 * ```js
 * // New way:
 * import { useChatStore } from '../lib/stores/chatStore';
 * const contextPills = useChatStore((s) => s.contextPills);
 * const addContextPill = useChatStore((s) => s.addContextPill);
 * ```
 */
export function useContextPills() {
  const [contextPills, setContextPills] = useState([]);

  const addContext = useCallback((type, data) => {
    setContextPills(prev => [...prev, { type, data, id: Date.now() }]);
  }, []);

  const removeContext = useCallback((id) => {
    setContextPills(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearContext = useCallback(() => {
    setContextPills([]);
  }, []);

  return {
    contextPills,
    addContext,
    removeContext,
    clearContext
  };
}
