import { useState, useCallback } from 'react';

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
