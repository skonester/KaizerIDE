import React, { useState } from 'react';
import Icon from '../../Common/Icon';
import { toast } from '../../../lib/stores/toastStore';

/**
 * Map file extension to a Lucide icon name + a CSS accent color variable.
 * Keeps visuals consistent with the rest of the chat chrome.
 */
const EXT_ICON_MAP = {
  js: { name: 'FileCode2', color: '#f7df1e' },
  mjs: { name: 'FileCode2', color: '#f7df1e' },
  jsx: { name: 'FileCode2', color: '#61dafb' },
  ts: { name: 'FileCode2', color: '#3178c6' },
  tsx: { name: 'FileCode2', color: '#3178c6' },
  py: { name: 'FileCode2', color: '#3776ab' },
  java: { name: 'FileCode2', color: '#e76f00' },
  c: { name: 'FileCode2', color: '#7cabdd' },
  h: { name: 'FileCode2', color: '#7cabdd' },
  cpp: { name: 'FileCode2', color: '#00599c' },
  rs: { name: 'FileCode2', color: '#dea584' },
  go: { name: 'FileCode2', color: '#00add8' },
  asm: { name: 'FileCode2', color: '#888' },
  s: { name: 'FileCode2', color: '#888' },
  css: { name: 'FileCode2', color: '#1572b6' },
  scss: { name: 'FileCode2', color: '#c6538c' },
  html: { name: 'FileCode2', color: '#e34c26' },
  json: { name: 'Braces', color: '#8b949e' },
  yaml: { name: 'Braces', color: '#cb171e' },
  yml: { name: 'Braces', color: '#cb171e' },
  toml: { name: 'Braces', color: '#9c4221' },
  md: { name: 'FileText', color: '#9ca3af' },
  txt: { name: 'FileText', color: '#9ca3af' },
  sh: { name: 'Terminal', color: '#4caf50' },
  bash: { name: 'Terminal', color: '#4caf50' },
  ps1: { name: 'Terminal', color: '#012456' },
};

function getFileIcon(name) {
  if (!name || typeof name !== 'string') return { name: 'File', color: 'var(--text-2)' };
  const ext = name.split('.').pop()?.toLowerCase();
  return EXT_ICON_MAP[ext] || { name: 'File', color: 'var(--text-2)' };
}

/**
 * Card showing the set of files changed in the current agent turn,
 * with aggregate +/- line counts and per-file rows + Keep/Undo controls.
 */
function FilesChangedCard({ files, undoStack, onUndo, onAccept, onOpenFile }) {
  const [expanded, setExpanded] = useState(true);

  const totalAdded = files.reduce((sum, f) => sum + f.addedLines, 0);
  const totalRemoved = files.reduce((sum, f) => sum + f.removedLines, 0);

  const handleCopyPaths = async () => {
    const paths = files.map((f) => f.path).join('\n');
    try {
      await navigator.clipboard.writeText(paths);
      toast.success('File paths copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="files-changed-card">
      <div className="files-changed-header">
        <button
          className="files-changed-chevron"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          type="button"
        >
          <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={14} />
        </button>
        <span className="files-changed-count">
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </span>
        {totalAdded > 0 && <span className="files-changed-stat stat-add">+{totalAdded}</span>}
        {totalRemoved > 0 && <span className="files-changed-stat stat-remove">-{totalRemoved}</span>}
        <div className="files-changed-spacer"></div>
        <button className="files-changed-btn btn-keep" onClick={onAccept} type="button">
          Keep
        </button>
        <button className="files-changed-btn btn-undo" onClick={onUndo} type="button">
          Undo
        </button>
        <button
          className="files-changed-btn btn-copy"
          onClick={handleCopyPaths}
          title="Copy file paths"
          aria-label="Copy file paths"
          type="button"
        >
          <Icon name="Copy" size={13} />
        </button>
      </div>
      {expanded && (
        <div className="files-changed-rows">
          {files.map((file, idx) => {
            const dirPath = file.path
              ? file.path.split(/[\\/]/).slice(0, -1).join('/')
              : '';
            const fileName =
              file.name || (file.path ? file.path.split(/[\\/]/).pop() : 'unknown');
            const isNewFile = file.isNew || undoStack[file.path] === null;
            const iconInfo = getFileIcon(fileName);

            return (
              <div
                key={idx}
                className="files-changed-row"
                onClick={() => onOpenFile && onOpenFile(file.path)}
                role="button"
                tabIndex={0}
              >
                <div className="files-changed-row-left">
                  {isNewFile && <span className="new-file-indicator">+</span>}
                  <span className="files-changed-icon" style={{ color: iconInfo.color }}>
                    <Icon name={iconInfo.name} size={13} />
                  </span>
                  <span className="files-changed-filename">{fileName}</span>
                  <span className="files-changed-dirpath">{dirPath}</span>
                </div>
                <div className="files-changed-row-right">
                  {file.addedLines > 0 && <span className="stat-add">+{file.addedLines}</span>}
                  {file.removedLines > 0 && (
                    <span className="stat-remove">-{file.removedLines}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(FilesChangedCard);
