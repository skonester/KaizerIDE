/**
 * SessionManager - Save and resume agent sessions
 * Provides session persistence and recovery
 */
export class SessionManager {
  constructor(config = {}) {
    this.logger = config.logger;
    this.storageKey = config.storageKey || 'kaizer-agent-sessions';
    this.maxSessions = config.maxSessions || 50;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save current session
   */
  async saveSession(sessionData) {
    try {
      const sessionId = sessionData.id || this.generateSessionId();
      
      const session = {
        id: sessionId,
        timestamp: Date.now(),
        workspacePath: sessionData.workspacePath,
        messages: sessionData.messages,
        settings: sessionData.settings,
        iteration: sessionData.iteration,
        metadata: sessionData.metadata || {}
      };

      // Get existing sessions
      const sessions = this.getAllSessions();
      
      // Add or update session
      const existingIndex = sessions.findIndex(s => s.id === sessionId);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      // Keep only recent sessions
      if (sessions.length > this.maxSessions) {
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        sessions.splice(this.maxSessions);
      }

      // Save to storage
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      
      this.logger?.info(`Session saved: ${sessionId}`);
      return sessionId;

    } catch (error) {
      this.logger?.error('Failed to save session', error);
      throw error;
    }
  }

  /**
   * Load session by ID
   */
  async loadSession(sessionId) {
    try {
      const sessions = this.getAllSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      this.logger?.info(`Session loaded: ${sessionId}`);
      return session;

    } catch (error) {
      this.logger?.error('Failed to load session', error);
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      this.logger?.error('Failed to get sessions', error);
      return [];
    }
  }

  /**
   * Get sessions for workspace
   */
  getSessionsForWorkspace(workspacePath) {
    const sessions = this.getAllSessions();
    return sessions.filter(s => s.workspacePath === workspacePath);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      
      this.logger?.info(`Session deleted: ${sessionId}`);
      return true;

    } catch (error) {
      this.logger?.error('Failed to delete session', error);
      return false;
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions() {
    try {
      localStorage.removeItem(this.storageKey);
      this.logger?.info('All sessions cleared');
      return true;
    } catch (error) {
      this.logger?.error('Failed to clear sessions', error);
      return false;
    }
  }

  /**
   * Export session to JSON
   */
  exportSession(sessionId) {
    const session = this.getAllSessions().find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from JSON
   */
  async importSession(jsonString) {
    try {
      const session = JSON.parse(jsonString);
      
      // Validate session structure
      if (!session.id || !session.messages) {
        throw new Error('Invalid session format');
      }

      // Save imported session
      return await this.saveSession(session);

    } catch (error) {
      this.logger?.error('Failed to import session', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = this.getAllSessions();
    
    return {
      total: sessions.length,
      byWorkspace: sessions.reduce((acc, s) => {
        acc[s.workspacePath] = (acc[s.workspacePath] || 0) + 1;
        return acc;
      }, {}),
      oldest: sessions.length > 0 ? Math.min(...sessions.map(s => s.timestamp)) : null,
      newest: sessions.length > 0 ? Math.max(...sessions.map(s => s.timestamp)) : null
    };
  }
}
