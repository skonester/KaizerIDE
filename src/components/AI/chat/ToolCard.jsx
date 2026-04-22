import React, { memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ToolCard = memo(({ message, index, toolResult, onToggleExpanded, onFileClick }) => {
  const { name, args } = message;

  // Helper to detect language from filename
  const getLanguageFromFilename = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'lua': 'lua',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'bash',
      'sql': 'sql'
    };
    return langMap[ext] || 'text';
  };

  if (name === 'write-file' || name === 'write_file') {
    const filename = args.filePath?.split(/[\\/]/).pop() || 'file';
    const fullPath = args.filePath || '';
    const lines = args.content?.split('\n').length || 0;
    const addedLines = lines;
    const language = getLanguageFromFilename(filename);
    
    return (
      <div className="tool-card write-file">
        <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
          <span className="tool-icon">📄</span>
          <span 
            className="tool-filename clickable"
            onClick={(e) => {
              e.stopPropagation();
              onFileClick(fullPath);
            }}
          >
            {filename}
          </span>
          <span className="tool-badge green">+{addedLines}</span>
          <span className="tool-chevron">{message.expanded ? '▼' : '▶'}</span>
        </div>
        {message.expanded && (
          <div className="tool-card-content">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              showLineNumbers={true}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '11px',
                background: 'var(--bg-0)',
                maxHeight: '400px',
                overflow: 'auto'
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'var(--font-mono)',
                  lineHeight: '1.4'
                }
              }}
            >
              {args.content || ''}
            </SyntaxHighlighter>
          </div>
        )}
        <div className="tool-card-footer">
          <span className="tool-status green">✓ Written</span>
          <span className="tool-path">{fullPath}</span>
        </div>
      </div>
    );
  }

  if (name === 'read-file' || name === 'read_file') {
    const filename = args.path?.split(/[\\/]/).pop() || args.filePath?.split(/[\\/]/).pop() || 'file';
    const fullPath = args.path || args.filePath || '';
    const content = toolResult?.result || '';
    const language = getLanguageFromFilename(filename);
    
    return (
      <div className="tool-card read-file">
        <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
          <span className="tool-icon">📄</span>
          <span 
            className="tool-filename clickable"
            onClick={(e) => {
              e.stopPropagation();
              onFileClick(fullPath);
            }}
          >
            {filename}
          </span>
          <span className="tool-badge">Read</span>
          <span className="tool-chevron">{message.expanded ? '▼' : '▶'}</span>
        </div>
        {message.expanded && (
          <div className="tool-card-content">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              showLineNumbers={true}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '11px',
                background: 'var(--bg-0)',
                maxHeight: '300px',
                overflow: 'auto'
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'var(--font-mono)',
                  lineHeight: '1.4'
                }
              }}
            >
              {content.slice(0, 2000)}{content.length > 2000 ? '\n...' : ''}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    );
  }

  if (name === 'list_directory') {
    const dirPath = args.path || '.';
    const content = toolResult?.result || '';
    
    return (
      <div className="tool-card list-directory">
        <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
          <span className="tool-icon">📁</span>
          <span className="tool-filename">{dirPath}</span>
          <span className="tool-badge">Listed</span>
          <span className="tool-chevron">{message.expanded ? '▼' : '▶'}</span>
        </div>
        {message.expanded && (
          <div className="tool-card-content">
            <pre><code>{content}</code></pre>
          </div>
        )}
      </div>
    );
  }

  if (name === 'run-command' || name === 'run_command') {
    const command = args.command || '';
    const output = toolResult?.result || '';
    const exitCodeMatch = output.match(/\[exit: (\d+)\]/);
    const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : 0;
    
    return (
      <div className="tool-card run-command">
        <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
          <span className="tool-icon">💻</span>
          <span className="tool-filename">$ {command.slice(0, 40)}{command.length > 40 ? '...' : ''}</span>
          <span className={`tool-badge ${exitCode === 0 ? 'green' : 'red'}`}>Exit {exitCode}</span>
          <span className="tool-chevron">{message.expanded ? '▼' : '▶'}</span>
        </div>
        {message.expanded && (
          <div className="tool-card-content">
            <pre><code>{output || 'No output'}</code></pre>
          </div>
        )}
      </div>
    );
  }

  if (name === 'search-files' || name === 'search_files') {
    const query = args.query || '';
    const output = toolResult?.result || '';
    const lines = output.split('\n').filter(l => l.trim());
    const results = lines.length;
    
    return (
      <div className="tool-card search-files">
        <div className="tool-card-header" onClick={() => onToggleExpanded(index)}>
          <span className="tool-icon">🔍</span>
          <span className="tool-filename">search: {query}</span>
          <span className="tool-badge">{results} results</span>
          <span className="tool-chevron">{message.expanded ? '▼' : '▶'}</span>
        </div>
        {message.expanded && (
          <div className="tool-card-content">
            <pre><code>{output}</code></pre>
          </div>
        )}
      </div>
    );
  }

  // Default tool pill
  const argsPreview = JSON.stringify(args).slice(0, 50);
  return (
    <div className="message">
      <div 
        className="tool-pill"
        onClick={() => onToggleExpanded(index)}
      >
        ⚙ {name}({argsPreview}{JSON.stringify(args).length > 50 ? '...' : ''})
      </div>
      {message.expanded && (
        <div className="tool-details">
          {JSON.stringify(args, null, 2)}
        </div>
      )}
    </div>
  );
});

ToolCard.displayName = 'ToolCard';

export default ToolCard;
