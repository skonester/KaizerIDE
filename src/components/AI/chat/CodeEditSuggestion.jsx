import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Icon from '../../Common/Icon';
import './CodeEditSuggestion.css';

/**
 * Component for displaying code edit suggestions with approve/deny functionality
 * Similar to Raptor/Antigravity IDE's inline code edit approval system
 */
function CodeEditSuggestion({ 
  suggestion, 
  onApprove, 
  onDeny, 
  onApplyEdit,
  workspacePath,
  activeFile,
  activeFileContent,
  isStreaming = false
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState(null);

  const {
    id,
    filePath,
    description,
    oldCode,
    newCode,
    language,
    lineStart,
    lineEnd,
    diff,
    createdAt = new Date().toISOString()
  } = suggestion;

  // Determine if this suggestion is for the currently active file
  const isForActiveFile = activeFile && filePath === activeFile;

  // Handle approve action
  const handleApprove = async () => {
    if (onApprove) {
      onApprove(suggestion);
    }
    
    // If we have an apply function, apply the edit
    if (onApplyEdit) {
      setIsApplying(true);
      setError(null);
      try {
        await onApplyEdit(suggestion);
        setApplied(true);
      } catch (err) {
        setError(err.message || 'Failed to apply edit');
        console.error('Failed to apply edit:', err);
      } finally {
        setIsApplying(false);
      }
    }
  };

  // Handle deny action
  const handleDeny = () => {
    if (onDeny) {
      onDeny(suggestion);
    }
  };

  // Format the file path for display
  const formatFilePath = (path) => {
    if (!workspacePath || !path.startsWith(workspacePath)) {
      return path;
    }
    return path.substring(workspacePath.length + 1);
  };

  // Render diff view if available
  const renderDiff = () => {
    if (!diff) return null;

    return (
      <div className="code-edit-diff">
        <div className="diff-header">
          <span className="diff-label old">Original</span>
          <span className="diff-label new">Suggested</span>
        </div>
        <div className="diff-content">
          <div className="diff-side old">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                fontSize: '12px',
                background: 'var(--bg-2)',
                borderRight: '1px solid var(--border)'
              }}
            >
              {oldCode}
            </SyntaxHighlighter>
          </div>
          <div className="diff-side new">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                fontSize: '12px',
                background: 'var(--bg-2)'
              }}
            >
              {newCode}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    );
  };

  // Render inline code block
  const renderCodeBlock = ({ code, isNew = false }) => (
    <div className={`code-block-container ${isNew ? 'new-code' : 'old-code'}`}>
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        {isNew && <span className="code-badge">Suggested</span>}
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          fontSize: '12px',
          background: 'var(--bg-2)'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );

  return (
    <div className={`code-edit-suggestion ${applied ? 'applied' : ''} ${isForActiveFile ? 'for-active-file' : ''}`}>
      <div className="suggestion-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={14} />
          <div className="suggestion-title">
            <Icon name="Edit" size={14} />
            <span>Code Edit Suggestion</span>
            {isForActiveFile && (
              <span className="active-file-badge">
                <Icon name="File" size={10} />
                Current File
              </span>
            )}
          </div>
        </div>
        <div className="header-right">
          <span className="file-path">{formatFilePath(filePath)}</span>
          {lineStart && lineEnd && (
            <span className="line-range">Lines {lineStart}-{lineEnd}</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="suggestion-content">
          {description && (
            <div className="suggestion-description">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: '8px 0',
                          fontSize: '12px',
                          background: 'var(--bg-2)'
                        }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {description}
              </ReactMarkdown>
            </div>
          )}

          {diff ? renderDiff() : (
            <div className="code-comparison">
              {oldCode && renderCodeBlock({ code: oldCode, isNew: false })}
              {newCode && renderCodeBlock({ code: newCode, isNew: true })}
            </div>
          )}

          {error && (
            <div className="error-message">
              <Icon name="AlertCircle" size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="suggestion-actions">
            <button
              className="action-btn deny-btn"
              onClick={handleDeny}
              disabled={isApplying || applied}
            >
              <Icon name="X" size={12} />
              Deny
            </button>
            <button
              className="action-btn approve-btn"
              onClick={handleApprove}
              disabled={isApplying || applied}
            >
              {isApplying ? (
                <>
                  <Icon name="Loader" size={12} className="spinning" />
                  Applying...
                </>
              ) : applied ? (
                <>
                  <Icon name="Check" size={12} />
                  Applied
                </>
              ) : (
                <>
                  <Icon name="Check" size={12} />
                  Approve & Apply
                </>
              )}
            </button>
          </div>

          <div className="suggestion-meta">
            <span className="meta-item">
              <Icon name="Clock" size={10} />
              {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {language && (
              <span className="meta-item">
                <Icon name="Code" size={10} />
                {language}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeEditSuggestion;