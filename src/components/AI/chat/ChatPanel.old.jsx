import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { runAgentTurn } from '../lib/agent';
import { useChatState } from '../hooks/useChatState';
import { useChatHistory } from '../hooks/useChatHistory';
import { useFileChanges } from '../hooks/useFileChanges';
import { useContextPills } from '../hooks/useContextPills';
import { useUIState } from '../hooks/useUIState';
import ChatMessage from './chat/ChatMessage';
import ToolCard from './chat/ToolCard';
import './ChatPanel.css';

function ChatPanel({ workspacePath, activeFile, activeFileContent, settings, onOpenFile }) {
  // Custom hooks for state management
  const { state: chatState, actions: chatActions } = useChatState();
  const { chatHistory, currentChatId, saveChat, loadChat, deleteChat, newChat } = useChatHistory(workspacePath);
  const { fileChanges, trackFileChange, clearFileChanges, getFileChange } = useFileChanges();
  const { contextPills, addContext, removeContext, clearContext } = useContextPills();
  const { uiState, toggleContextMenu, toggleModeMenu, toggleModelMenu, toggleChatList, closeAllMenus } = useUIState();
  
  // Local UI state
  const [input, setInput] = useState('');
  const [currentMode, setCurrentMode] = useState('agent');
  const [editorHeight, setEditorHeight] = useState(36);
  
  // Refs
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const editorRef = useRef(null);
  const contextMenuRef = useRef(null);
  const modeMenuRef = useRef(null);
  const modelMenuRef = useRef(null);
  const chatListRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  // Keyboard shortcuts and click outside handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        editorRef.current?.focus();
      }
    };

    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target) && uiState.showContextMenu) {
        toggleContextMenu();
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target) && uiState.showModeMenu) {
        toggleModeMenu();
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target) && uiState.showModelMenu) {
        toggleModelMenu();
      }
      if (chatListRef.current && !chatListRef.current.contains(e.target) && uiState.showChatList) {
        toggleChatList();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup abort controller on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [toggleContextMenu, toggleModeMenu, toggleModelMenu, toggleChatList]);

  // Unified handleSend function (no duplication)
  const handleSend = useCallback(async () => {
    if (!input.trim() || chatState.isStreaming) return;

    const userMessage = { role: 'user', content: input.trim(), context: [...contextPills] };
    chatActions.addMessage(userMessage);
    setInput('');
    clearContext();
    chatActions.setStreaming(true);
    chatActions.resetThinking();

    const assistantMessage = { role: 'assistant', content: '' };
    chatActions.addMessage(assistantMessage);

    abortControllerRef.current = new AbortController();

    try {
      await runAgentTurn({
        messages: [...chatState.messages, userMessage],
        settings,
        workspacePath,
        onToken: (token) => {
          chatActions.updateLastAssistantMessage(token);
        },
        onToolCall: ({ id, name, args }) => {
          chatActions.setCurrentTool({ name, args });
          chatActions.appendThinking(`\n[Tool Call] ${name}\nArgs: ${JSON.stringify(args, null, 2)}\n`);
          chatActions.addMessage({
            role: 'tool_call',
            id,
            name,
            args,
            expanded: false
          });
          
          // Track file changes
          const filePath = args.filePath || args.path;
          if (filePath) {
            trackFileChange(filePath, name);
          }
        },
        onToolResult: ({ id, name, result }) => {
          chatActions.appendThinking(`\n[Tool Result] ${name}\nResult: ${typeof result === 'string' ? result.slice(0, 200) : JSON.stringify(result).slice(0, 200)}...\n`);
          chatActions.setCurrentTool(null);
          chatActions.addMessage({
            role: 'tool_result',
            id,
            name,
            result,
            expanded: false
          });
          // Add a new empty assistant message for the next response
          chatActions.addMessage({ role: 'assistant', content: '' });
        },
        onDone: () => {
          chatActions.setStreaming(false);
          chatActions.setCurrentTool(null);
          // Save chat to history
          saveChat([...chatState.messages, userMessage, assistantMessage]);
        },
        signal: abortControllerRef.current.signal
      });
    } catch (error) {
      chatActions.updateLastMessage({
        role: 'error',
        content: `Error: ${error.message}`
      });
      chatActions.setStreaming(false);
      chatActions.setCurrentTool(null);
      saveChat(chatState.messages);
    }
  }, [input, chatState.isStreaming, chatState.messages, contextPills, settings, workspacePath, chatActions, clearContext, trackFileChange, saveChat]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      chatActions.setStreaming(false);
      chatActions.setCurrentTool(null);
    }
  }, [chatActions]);

  const handleNewChat = useCallback(() => {
    chatActions.resetChat();
    clearContext();
    newChat();
  }, [chatActions, clearContext, newChat]);

  const handleLoadChat = useCallback((chatId) => {
    const messages = loadChat(chatId);
    if (messages) {
      chatActions.setMessages(messages);
      toggleChatList();
    }
  }, [loadChat, chatActions, toggleChatList]);

  const handleDeleteChat = useCallback(async (chatId) => {
    const shouldReset = await deleteChat(chatId);
    if (shouldReset) {
      handleNewChat();
    }
  }, [deleteChat, handleNewChat]);

  const handleFileAttach = useCallback(async () => {
    const result = await window.electron.openFolder();
    if (!result.canceled) {
      addContext('file', result.path);
    }
    closeAllMenus();
  }, [addContext, closeAllMenus]);

  const handleFileClick = useCallback(async (filePath) => {
    if (!onOpenFile || !workspacePath) {
      console.error('Missing onOpenFile or workspacePath');
      return;
    }
    
    // Normalize the file path
    let absolutePath = filePath.trim();
    
    // Check if it's already an absolute path
    const isAbsolute = /^[a-zA-Z]:[\\\/]/.test(absolutePath) || absolutePath.startsWith('/');
    
    if (!isAbsolute) {
      // Make it absolute using workspace path
      absolutePath = absolutePath.replace(/^\.[\\\/]/, '');
      absolutePath = `${workspacePath}\\${absolutePath}`.replace(/\//g, '\\');
    }
    
    // Normalize slashes
    absolutePath = absolutePath.replace(/\//g, '\\');
    
    // Check if this file has tracked changes
    const fileChange = getFileChange(absolutePath);
    
    if (fileChange && fileChange.content) {
      onOpenFile(absolutePath, { 
        showDiff: true, 
        newContent: fileChange.content,
        changeType: fileChange.type 
      });
    } else {
      onOpenFile(absolutePath);
    }
  }, [onOpenFile, workspacePath, getFileChange]);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Enter to send, Shift+Enter for new line
    editor.addCommand(monaco.KeyCode.Enter, () => {
      handleSend();
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      editor.trigger('keyboard', 'type', { text: '\n' });
    });
    
    editor.addCommand(monaco.KeyCode.Escape, () => {
      closeAllMenus();
    });

    // Auto-resize editor based on content
    const updateHeight = () => {
      const contentHeight = editor.getContentHeight();
      const newHeight = Math.min(Math.max(contentHeight, 36), 160);
      setEditorHeight(newHeight);
    };

    editor.onDidContentSizeChange(updateHeight);
    updateHeight();
  }, [handleSend, closeAllMenus]);

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'agent': return '∞';
      case 'plan': return '☰';
      case 'ask': return '💬';
      default: return '∞';
    }
  };

  const getModeName = (mode) => {
    switch (mode) {
      case 'agent': return 'Agent';
      case 'plan': return 'Plan';
      case 'ask': return 'Ask';
      default: return 'Agent';
    }
  };

  const renderMessage = useCallback((msg, idx) => {
    if (msg.role === 'tool_call') {
      // Find the corresponding tool result
      const toolResult = chatState.messages.find((m, i) => 
        i > idx && m.role === 'tool_result' && m.id === msg.id
      );
      return (
        <ToolCard
          key={idx}
          message={msg}
          index={idx}
          toolResult={toolResult}
          onToggleExpanded={chatActions.toggleMessageExpanded}
          onFileClick={handleFileClick}
        />
      );
    }

    if (msg.role === 'tool_result') {
      return null; // Tool results are merged into tool cards
    }

    return (
      <ChatMessage
        key={idx}
        message={msg}
        index={idx}
        onFileClick={handleFileClick}
      />
    );
  }, [chatState.messages, chatActions.toggleMessageExpanded, handleFileClick]);

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-left">CHAT</div>
        <div className="chat-header-right">
          <div className="toolbar-button-wrapper" ref={chatListRef}>
            <button className="icon-button" onClick={toggleChatList} title="Chat history">
              💬
            </button>
            {uiState.showChatList && (
              <div className="chat-list-popup">
                <div className="chat-list-header">
                  <span>Chat History</span>
                  <button className="icon-button-small" onClick={handleNewChat} title="New chat">+</button>
                </div>
                <div className="chat-list-items">
                  {chatHistory.length === 0 ? (
                    <div className="chat-list-empty">No chat history</div>
                  ) : (
                    chatHistory.map(chat => (
                      <div 
                        key={chat.id} 
                        className={`chat-list-item ${currentChatId === chat.id ? 'active' : ''}`}
                      >
                        <div className="chat-list-item-content" onClick={() => handleLoadChat(chat.id)}>
                          <div className="chat-list-title">{chat.title}</div>
                          <div className="chat-list-time">{new Date(chat.timestamp).toLocaleDateString()}</div>
                        </div>
                        <button 
                          className="chat-list-delete" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                          title="Delete chat"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button className="icon-button" onClick={handleNewChat} title="New chat">
            +
          </button>
        </div>
      </div>

      {chatState.isStreaming && chatState.currentTool && (
        <div className="agent-status-header">
          <div className="agent-status-left">
            <span className="agent-pulse">▶</span>
            <span className="agent-text">Working...</span>
          </div>
          <div className="agent-status-center">
            <span className="agent-tool">⚙ {chatState.currentTool.name}</span>
          </div>
          <button className="agent-stop" onClick={handleStop}>×</button>
        </div>
      )}

      <div className="chat-messages">
        {chatState.messages.length === 0 ? (
          <div className="empty-state">
            Start a conversation with your AI coding assistant
          </div>
        ) : (
          chatState.messages.map(renderMessage)
        )}
        {chatState.isStreaming && chatState.thinkingContent && (
          <div className="thinking-block">
            <div 
              className="thinking-header"
              onClick={chatActions.toggleThinking}
            >
              <span className="thinking-icon">💭</span>
              <span className="thinking-text">Thinking...</span>
              <span className="thinking-chevron">{chatState.showThinking ? '▼' : '▶'}</span>
            </div>
            {chatState.showThinking && (
              <div className="thinking-content">
                <pre>{chatState.thinkingContent}</pre>
              </div>
            )}
          </div>
        )}
        {chatState.isStreaming && chatState.messages[chatState.messages.length - 1]?.content === '' && !chatState.currentTool && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {fileChanges.length > 0 && (
        <div className="file-changes-bar">
          <div className="file-changes-header">
            <span className="file-changes-icon">📝</span>
            <span className="file-changes-title">Files Changed ({fileChanges.length})</span>
            <button 
              className="file-changes-clear"
              onClick={clearFileChanges}
              title="Clear"
            >
              ×
            </button>
          </div>
          <div className="file-changes-list">
            {fileChanges.map((file, idx) => (
              <div 
                key={idx} 
                className="file-change-item"
                onClick={() => handleFileClick(file.path)}
              >
                <span className="file-change-icon">📄</span>
                <span className="file-change-name">{file.path.split(/[\\/]/).pop()}</span>
                <span className={`file-change-badge ${file.type === 'added' ? 'green' : file.type === 'deleted' ? 'red' : ''}`}>
                  {file.type === 'added' ? '+' : file.type === 'deleted' ? '-' : 'M'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-area">
        <div className="composer-container">
          {contextPills.length > 0 && (
            <div className="context-pills-bar">
              {contextPills.map(pill => (
                <div key={pill.id} className="context-pill">
                  <span className="context-pill-icon">{pill.type === 'file' ? '📄' : '📁'}</span>
                  <span className="context-pill-text">{pill.data.split(/[\\/]/).pop()}</span>
                  <button className="context-pill-remove" onClick={() => removeContext(pill.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="composer-editor-wrapper" style={{ height: editorHeight }}>
            {!input && (
              <div className="composer-placeholder">
                Ask anything...
              </div>
            )}
            <Editor
              height="100%"
              language="plaintext"
              theme="vs-dark"
              value={input}
              onChange={(value) => setInput(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'off',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: "system-ui, -apple-system, sans-serif",
                padding: { top: 8, bottom: 8 },
                renderLineHighlight: 'none',
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'hidden'
                },
                readOnly: chatState.isStreaming,
                contextmenu: false
              }}
            />
          </div>

          <div className="composer-toolbar">
            <div className="composer-toolbar-left">
              <div className="toolbar-button-wrapper" ref={contextMenuRef}>
                <button 
                  className="toolbar-button"
                  onClick={toggleContextMenu}
                  title="Add context"
                >
                  @
                </button>
                {uiState.showContextMenu && (
                  <div className="context-menu-popup">
                    <div className="context-menu-search">
                      <input type="text" placeholder="Add files, folders, docs..." />
                    </div>
                    <div className="context-menu-options">
                      <div className="context-menu-option" onClick={handleFileAttach}>
                        <span className="context-menu-icon">📁</span>
                        <span>Files & Folders</span>
                      </div>
                      <div className="context-menu-option" onClick={() => { addContext('terminal', 'Terminal'); closeAllMenus(); }}>
                        <span className="context-menu-icon">💻</span>
                        <span>Terminals</span>
                      </div>
                      <div className="context-menu-option" onClick={() => { addContext('branch', 'Branch diff'); closeAllMenus(); }}>
                        <span className="context-menu-icon">🌿</span>
                        <span>Branch (Diff with Main)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button className="toolbar-button" onClick={handleFileAttach} title="Attach file">
                📎
              </button>
            </div>

            <div className="composer-toolbar-right">
              <div className="toolbar-button-wrapper" ref={modeMenuRef}>
                <button 
                  className="toolbar-selector"
                  onClick={toggleModeMenu}
                >
                  <span>{getModeIcon(currentMode)} {getModeName(currentMode)}</span>
                  <span className="selector-chevron">▾</span>
                </button>
                {uiState.showModeMenu && (
                  <div className="selector-popup">
                    <div className="selector-option" onClick={() => { setCurrentMode('agent'); toggleModeMenu(); }}>
                      <span className="selector-icon">∞</span>
                      <span>Agent</span>
                    </div>
                    <div className="selector-option" onClick={() => { setCurrentMode('plan'); toggleModeMenu(); }}>
                      <span className="selector-icon">☰</span>
                      <span>Plan</span>
                    </div>
                    <div className="selector-option" onClick={() => { setCurrentMode('ask'); toggleModeMenu(); }}>
                      <span className="selector-icon">💬</span>
                      <span>Ask</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="toolbar-button-wrapper" ref={modelMenuRef}>
                <button 
                  className="toolbar-selector"
                  onClick={toggleModelMenu}
                >
                  <span>{settings.selectedModel.name}</span>
                  <span className="selector-chevron">▾</span>
                </button>
                {uiState.showModelMenu && (
                  <div className="selector-popup">
                    {settings.models.map(model => (
                      <div 
                        key={model.id} 
                        className="selector-option"
                        onClick={() => {
                          settings.selectedModel = model;
                          toggleModelMenu();
                        }}
                      >
                        <span className="selector-icon">🧠</span>
                        <span>{model.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                className="send-button" 
                onClick={chatState.isStreaming ? handleStop : handleSend}
                disabled={!input.trim() && !chatState.isStreaming}
              >
                {chatState.isStreaming ? '■' : '➤'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
