import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { runAgentTurn } from '../lib/agent';
import './ChatPanel.css';

function ChatPanel({ workspacePath, activeFile, activeFileContent, settings, onOpenFile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [contextPills, setContextPills] = useState([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [currentMode, setCurrentMode] = useState('agent');
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);
  const contextMenuRef = useRef(null);
  const modeMenuRef = useRef(null);
  const modelMenuRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target) && showContextMenu) {
        setShowContextMenu(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target) && showModeMenu) {
        setShowModeMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target) && showModelMenu) {
        setShowModelMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextMenu, showModeMenu, showModelMenu]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input.trim(), context: [...contextPills] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setContextPills([]);
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    abortControllerRef.current = new AbortController();

    try {
      await runAgentTurn({
        messages: newMessages,
        settings,
        workspacePath,
        onToken: (token) => {
          setMessages(prev => {
            const updated = [...prev];
            let lastAssistantIdx = -1;
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === 'assistant') {
                lastAssistantIdx = i;
                break;
              }
            }
            
            if (lastAssistantIdx === -1) {
              updated.push({ role: 'assistant', content: token });
            } else {
              updated[lastAssistantIdx] = {
                ...updated[lastAssistantIdx],
                content: updated[lastAssistantIdx].content + token
              };
            }
            return updated;
          });
        },
        onToolCall: ({ id, name, args }) => {
          setCurrentTool({ name, args, status: 'running' });
          setMessages(prev => [...prev, {
            role: 'tool_call',
            id,
            name,
            args,
            status: 'running',
            expanded: false
          }]);
        },
        onToolResult: ({ id, name, result }) => {
          setCurrentTool(null);
          setMessages(prev => {
            const updated = prev.map(m => 
              m.role === 'tool_call' && m.id === id 
                ? { ...m, status: 'done', result }
                : m
            );
            updated.push({ role: 'assistant', content: '' });
            return updated;
          });
        },
        onDone: () => {
          setIsStreaming(false);
          setCurrentTool(null);
        },
        signal: abortControllerRef.current.signal
      });
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'error',
          content: `Error: ${error.message}`
        };
        return updated;
      });
      setIsStreaming(false);
      setCurrentTool(null);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setCurrentTool(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleAddContext = (type, data) => {
    setContextPills(prev => [...prev, { type, data, id: Date.now() }]);
    setShowContextMenu(false);
  };

  const handleRemoveContext = (id) => {
    setContextPills(prev => prev.filter(p => p.id !== id));
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'agent': return '∞';
      case 'plan': return '📋';
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

  const renderToolCall = (msg) => {
    const isRunning = msg.status === 'running';
    const isDone = msg.status === 'done';
    const argsPreview = JSON.stringify(msg.args).slice(0, 40);

    return (
      <div className={`tool-call-pill ${isRunning ? 'running' : ''} ${isDone ? 'done' : ''}`}>
        <div className="tool-call-header" onClick={() => {
          if (isDone) {
            setMessages(prev => prev.map(m => 
              m.id === msg.id ? { ...m, expanded: !m.expanded } : m
            ));
          }
        }}>
          <div className="tool-call-left">
            <span className={`tool-icon ${isRunning ? 'spinning' : ''}`}>
              {isRunning ? '⚙' : '✓'}
            </span>
            <span className="tool-name">{msg.name}</span>
          </div>
          <div className="tool-call-right">
            <span className="tool-args">{argsPreview}...</span>
            {isDone && <span className="tool-chevron">{msg.expanded ? '▾' : '▸'}</span>}
          </div>
        </div>
        {isDone && msg.expanded && msg.result && (
          <div className="tool-result-content">
            <pre>{typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (msg, idx) => {
    if (msg.role === 'user') {
      return (
        <div key={idx} className="message-row user-row">
          <div className="user-message">
            {msg.content}
            {msg.context && msg.context.length > 0 && (
              <div className="message-context-pills">
                {msg.context.map(ctx => (
                  <span key={ctx.id} className="context-pill-tiny">
                    {ctx.type === 'file' ? '📄' : '📁'} {ctx.data.split(/[\\/]/).pop()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.role === 'assistant') {
      return (
        <div key={idx} className="message-row assistant-row">
          <div className="assistant-message">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (!inline && language) {
                    return (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">
                          <span className="code-block-lang">{language}</span>
                          <button className="code-copy-btn" onClick={() => {
                            navigator.clipboard.writeText(String(children));
                          }}>
                            Copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={language}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0 0 8px 8px',
                            fontSize: '12.5px',
                            background: 'var(--bg-2)',
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily: 'var(--font-mono)',
                              lineHeight: '1.5'
                            }
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  
                  return (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="assistant-paragraph">{children}</p>,
                strong: ({ children }) => <strong className="assistant-bold">{children}</strong>
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    if (msg.role === 'tool_call') {
      return (
        <div key={idx} className="message-row tool-row">
          {renderToolCall(msg)}
        </div>
      );
    }

    if (msg.role === 'error') {
      return (
        <div key={idx} className="message-row error-row">
          <div className="error-message">{msg.content}</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header-new">
        <div className="chat-header-left">
          <span className="chat-icon">💬</span>
          <span className="chat-title">Chat</span>
        </div>
        <div className="chat-header-right">
          <button className="icon-btn" onClick={() => {
            setMessages([]);
            setContextPills([]);
          }} title="New chat">
            +
          </button>
          <button className="icon-btn" onClick={() => {
            alert('Coming soon');
          }} title="History">
            🕐
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages-new">
        {messages.length === 0 ? (
          <div className="empty-state-new">
            <div className="empty-logo">K</div>
            <div className="empty-title">KaizerIDE</div>
            <div className="empty-subtitle">Ask anything about your code</div>
            <div className="suggestion-chips">
              <button className="suggestion-chip" onClick={() => handleSuggestionClick('Explain this codebase')}>
                Explain this codebase
              </button>
              <button className="suggestion-chip" onClick={() => handleSuggestionClick('Fix bugs in open file')}>
                Fix bugs in open file
              </button>
              <button className="suggestion-chip" onClick={() => handleSuggestionClick('Add a new feature')}>
                Add a new feature
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {isStreaming && messages[messages.length - 1]?.content === '' && !currentTool && (
              <div className="streaming-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="chat-composer-new">
        <div className={`composer-container-new ${input ? 'has-content' : ''}`}>
          {contextPills.length > 0 && (
            <div className="context-pills-row">
              {contextPills.map(pill => (
                <div key={pill.id} className="context-pill-new">
                  <span className="pill-icon">{pill.type === 'file' ? '📄' : '📁'}</span>
                  <span className="pill-text">{pill.data.split(/[\\/]/).pop()}</span>
                  <button className="pill-remove" onClick={() => handleRemoveContext(pill.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
          />

          <div className="composer-toolbar-new">
            <div className="toolbar-left">
              <div className="toolbar-btn-wrapper" ref={contextMenuRef}>
                <button className="icon-btn-small" onClick={() => setShowContextMenu(!showContextMenu)}>
                  @
                </button>
                {showContextMenu && (
                  <div className="context-popup">
                    <div className="context-search">
                      <input type="text" placeholder="Add files, folders, docs..." />
                    </div>
                    <div className="context-options">
                      <div className="context-option" onClick={() => handleAddContext('file', 'example.js')}>
                        <span>📁</span>
                        <span>Files & Folders</span>
                      </div>
                      <div className="context-option" onClick={() => alert('Coming soon')}>
                        <span>📄</span>
                        <span>Docs</span>
                      </div>
                      <div className="context-option" onClick={() => handleAddContext('terminal', 'Terminal')}>
                        <span>💻</span>
                        <span>Terminals</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button className="icon-btn-small" title="Attach file">
                📎
              </button>
            </div>

            <div className="toolbar-right">
              <div className="toolbar-btn-wrapper" ref={modeMenuRef}>
                <button className="pill-btn" onClick={() => setShowModeMenu(!showModeMenu)}>
                  <span>{getModeIcon(currentMode)} {getModeName(currentMode)}</span>
                </button>
                {showModeMenu && (
                  <div className="mode-popup">
                    <div className={`mode-option ${currentMode === 'agent' ? 'active' : ''}`} onClick={() => { setCurrentMode('agent'); setShowModeMenu(false); }}>
                      <span>∞ Agent</span>
                      {currentMode === 'agent' && <span className="checkmark">✓</span>}
                    </div>
                    <div className={`mode-option ${currentMode === 'plan' ? 'active' : ''}`} onClick={() => { setCurrentMode('plan'); setShowModeMenu(false); }}>
                      <span>📋 Plan</span>
                      {currentMode === 'plan' && <span className="checkmark">✓</span>}
                    </div>
                    <div className={`mode-option ${currentMode === 'ask' ? 'active' : ''}`} onClick={() => { setCurrentMode('ask'); setShowModeMenu(false); }}>
                      <span>💬 Ask</span>
                      {currentMode === 'ask' && <span className="checkmark">✓</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="toolbar-btn-wrapper" ref={modelMenuRef}>
                <button className="pill-btn" onClick={() => setShowModelMenu(!showModelMenu)}>
                  <span>{settings.selectedModel.name.slice(0, 16)}{settings.selectedModel.name.length > 16 ? '…' : ''}</span>
                </button>
                {showModelMenu && (
                  <div className="model-popup">
                    {settings.models.map(model => (
                      <div 
                        key={model.id} 
                        className={`model-option ${settings.selectedModel.id === model.id ? 'active' : ''}`}
                        onClick={() => {
                          settings.selectedModel = model;
                          setShowModelMenu(false);
                        }}
                      >
                        <span>{model.name}</span>
                        {settings.selectedModel.id === model.id && <span className="model-indicator">◉</span>}
                      </div>
                    ))}
                    <div className="model-divider"></div>
                    <div className="model-option add-model" onClick={() => alert('Opens Settings')}>
                      <span>+ Add Model</span>
                    </div>
                  </div>
                )}
              </div>

              <button 
                className="send-btn-new" 
                onClick={isStreaming ? handleStop : handleSend}
                disabled={!input.trim() && !isStreaming}
              >
                {isStreaming ? '■' : '➤'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
