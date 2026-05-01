import React, { useState, useEffect, Suspense, lazy } from 'react';
import TitleBar from './components/Layout/TitleBar';
import FileExplorer from './components/Sidebar/FileExplorer';
import EditorArea from './components/Editor/EditorArea';
import ChatPanel from './components/AI/chat/ChatPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import StatusBar from './components/Common/StatusBar';
import ErrorToast from './components/Common/ErrorToast';
import Toaster from './components/Common/Toaster';
import { indexer } from './lib/indexer';
import { toast } from './lib/stores/toastStore';
import './App.css';

// Expose indexer globally for debugging
if (typeof window !== 'undefined') {
  window.indexer = indexer;
}

// Lazy-load modals to keep initial bundle small.
// These are only mounted when their boolean flag is true.
const SettingsModal = lazy(() => import('./components/Modals/SettingsModal'));
const FilePicker = lazy(() => import('./components/Common/FilePicker'));
const HelpModal = lazy(() => import('./components/UI/HelpModal'));
const RemoteConnectionModal = lazy(() => import('./components/Modals/RemoteConnectionModal'));
const CommandPalette = lazy(() => import('./components/Common/CommandPalette'));

const DEFAULT_SETTINGS = {
  provider: "openai-compatible",
  endpoint: "http://localhost:20128/v1",
  apiKey: "",
  selectedModel: { id: 'kaizer/qwen-coder', name: 'Qwen 2.5 Coder 1.5B (GPU Forced)', maxOutputTokens: 16000 },
  models: [
    // GPU Forced Local Models
    { id: 'kaizer/qwen-coder', name: 'Qwen 2.5 Coder 1.5B (GPU Forced)', maxOutputTokens: 16000 },
    { id: 'qwen/qwen-2.5-coder-7b', name: 'Qwen 2.5 Coder 7B (Ollama)', maxOutputTokens: 16000 },
    { id: 'qwen/qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B (Ollama)', maxOutputTokens: 16000 },
    { id: 'opencode/opencode-ai', name: 'OpenCode AI (Ollama)', maxOutputTokens: 16000 },
    { id: 'codex/codex-cli', name: 'Codex CLI (Ollama)', maxOutputTokens: 16000 },
    { id: 'openclaw/openclaw-local', name: 'OpenClaw (Ollama)', maxOutputTokens: 16000 },
    { id: 'claude/claude-local', name: 'Claude Local (Ollama)', maxOutputTokens: 16000 },
    { id: 'droid/droid-local', name: 'Droid (Ollama)', maxOutputTokens: 16000 },
    { id: 'pi/pi-local', name: 'Pi (Ollama)', maxOutputTokens: 16000 },
    { id: 'letta/letta-local', name: 'Letta (Local)', maxOutputTokens: 16000 },
    { id: 'mistral/mistral-vibe', name: 'Mistral Vibe', maxOutputTokens: 16000 },
    
    // OpenRouter Models (Cloud)
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', maxOutputTokens: 16000 },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus (OpenRouter)', maxOutputTokens: 16000 },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (OpenRouter)', maxOutputTokens: 16000 },
    { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', maxOutputTokens: 16000 },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (OpenRouter)', maxOutputTokens: 16000 },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (OpenRouter)', maxOutputTokens: 16000 },
    
    // Gemini Models
    { id: "gemini/gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", maxOutputTokens: 16000 },
    { id: "gemini/gemini-1.5-pro", name: "Gemini 1.5 Pro", maxOutputTokens: 16000 },
    { id: "gemini/gemini-1.5-flash", name: "Gemini 1.5 Flash", maxOutputTokens: 16000 },
    
    // Anthropic Models
    { id: "anthropic/claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", maxOutputTokens: 16000 },
    { id: "anthropic/claude-3-opus-20240229", name: "Claude 3 Opus", maxOutputTokens: 16000 },
    { id: "anthropic/claude-3-haiku-20240307", name: "Claude 3 Haiku", maxOutputTokens: 16000 },
    
    // OpenAI Models
    { id: "openai/gpt-4o", name: "GPT-4o", maxOutputTokens: 16000 },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", maxOutputTokens: 16000 },
    { id: "openai/o1-preview", name: "OpenAI o1 Preview", maxOutputTokens: 16000 },
    
    // Qwen Models
    { id: "qw/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", maxOutputTokens: 16000 },
    { id: "qw/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", maxOutputTokens: 16000 },
    
    // Mistral Models
    { id: "mistral/mistral-large-latest", name: "Mistral Large", maxOutputTokens: 16000 },
    { id: "mistral/codestral-latest", name: "Codestral", maxOutputTokens: 16000 },
    
    // Specialized & Local Models
    { id: "opencode/opencode-2.1", name: "OpenCode 2.1", maxOutputTokens: 16000 },
    { id: "letta/letta-memory-1", name: "Letta Memory", maxOutputTokens: 16000 },
    { id: "ds/deepseek-chat-v3", name: "DeepSeek V3", maxOutputTokens: 16000 },
    { id: "openrouter/auto", name: "OpenRouter Auto", maxOutputTokens: 16000 }
  ],
  systemPrompts: {}
};

function App() {
  const [workspacePath, setWorkspacePath] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('kaizer-settings');
    let providerKeys = JSON.parse(localStorage.getItem('kaizer-provider-keys') || '{}');
    
    // Migration: If we have old single API key but no provider keys, migrate it
    if (saved && Object.keys(providerKeys).length === 0) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.provider) {
        providerKeys = {
          [parsed.provider]: parsed.apiKey
        };
        localStorage.setItem('kaizer-provider-keys', JSON.stringify(providerKeys));
        console.log('Migrated single API key to provider-specific storage');
      }
    }
    
    if (!saved) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(saved);
    // Merge default models into saved models, avoiding duplicates by ID
    const savedModelIds = new Set(parsed.models.map(m => m.id));
    const newModels = [...parsed.models];
    
    DEFAULT_SETTINGS.models.forEach(m => {
      if (!savedModelIds.has(m.id)) {
        newModels.push(m);
      }
    });
    
    // Get the API key for the current provider from providerKeys
    const currentProvider = parsed.provider || DEFAULT_SETTINGS.provider;
    const apiKey = providerKeys[currentProvider] || parsed.apiKey || '';
    
    return { 
      ...parsed, 
      models: newModels,
      apiKey: apiKey
    };
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerStartPath, setFilePickerStartPath] = useState('');
  const [filePickerMode, setFilePickerMode] = useState('attach'); // 'attach' or 'folder'
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [showSSHModal, setShowSSHModal] = useState(false);
  const [sshConnection, setSSHConnection] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  // Track AI file changes globally so diff highlighting works when opening files
  const [aiFileChanges, setAiFileChanges] = useState({});

  // Utility: Normalize file paths to use consistent separators (Windows backslashes)
  const normalizePath = (path) => {
    if (!path) return path;
    return path.replace(/\//g, '\\');
  };

  // Debounce tracker for handleOpenPath
  const lastOpenPathCall = React.useRef({ path: null, timestamp: 0 });

  // Helper function to open a file in the editor
  const handleFileOpen = async (filePath, options = {}) => {
    console.log('[App] handleFileOpen called for:', filePath, options);
    
    // Don't normalize remote paths (they use forward slashes)
    const normalizedPath = sshConnection ? filePath : normalizePath(filePath);
    console.log('[App] Normalized path:', normalizedPath);
    
    const existingTab = tabs.find(tab => tab.path === normalizedPath);
    
    if (existingTab) {
      console.log('[App] Tab already exists, activating:', normalizedPath);
      setActiveTabPath(normalizedPath);
      
      // If diff view is requested, update the tab with diff info
      if (options.showDiff && options.newContent) {
        setTabs(prev => prev.map(tab => 
          tab.path === normalizedPath 
            ? { 
                ...tab, 
                showDiff: true, 
                newContent: options.newContent,
                changeType: options.changeType,
                originalContent: tab.content 
              }
            : tab
        ));
      }
      return;
    }

    console.log('[App] Reading file:', normalizedPath);
    // Use remote or local file reading based on SSH connection
    const result = sshConnection 
      ? await window.electron.readRemoteFile(normalizedPath)
      : await window.electron.readFile(normalizedPath);
    
    if (result.success) {
      console.log('[App] File read successfully, adding tab');
      const fileName = normalizedPath.split(/[\\/]/).pop();
      
      // Check if this file has pending AI changes
      const aiChange = aiFileChanges[normalizedPath];
      
      const newTab = {
        path: normalizedPath,
        name: fileName,
        content: result.content,
        dirty: false,
        showDiff: aiChange ? true : (options.showDiff || false),
        newContent: aiChange ? aiChange.newContent : (options.newContent || null),
        changeType: aiChange ? aiChange.changeType : (options.changeType || null),
        originalContent: aiChange ? aiChange.oldContent : result.content,
        isRemote: !!sshConnection
      };
      
      setTabs(prev => [...prev, newTab]);
      setActiveTabPath(normalizedPath);
    } else {
      console.error('[App] Failed to read file:', normalizedPath, result.error);
      setErrorMessage(`Failed to open file: ${result.error}`);
    }
  };

  // Helper function to handle paths from context menu
  const handleOpenPath = async (p, options = {}) => {
    if (!p) return;
    
    const normalizedPath = normalizePath(p);
    
    // Debounce: prevent duplicate calls within 100ms
    const now = Date.now();
    if (lastOpenPathCall.current.path === normalizedPath && 
        now - lastOpenPathCall.current.timestamp < 100) {
      console.log('[App] Debounced duplicate handleOpenPath call for:', normalizedPath);
      return;
    }
    lastOpenPathCall.current = { path: normalizedPath, timestamp: now };
    
    // Check if path is file or folder
    const info = await window.electron.getFileInfo(normalizedPath);
    
    if (info.isDirectory) {
      // Open as workspace
      console.log('[App] Opening folder as workspace:', normalizedPath);
      setWorkspacePath(normalizedPath);
      await window.electron.saveWorkspacePath(normalizedPath);
      
      const tree = await window.electron.getFileTree(normalizedPath);
      console.log('[App] Tree load result:', tree.success ? 'success' : 'failure');
      if (tree.success) {
        window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: tree.tree }));
      } else {
        console.warn('[App] Failed to load tree:', tree.error);
      }
    } else {
      // It's a file
      console.log('[App] Opening file:', normalizedPath);
      
      // If fileOnly mode, just open the file without loading workspace
      if (options.fileOnly) {
        await handleFileOpen(normalizedPath);
      } else {
        // Legacy behavior: open parent as workspace, then open the file
        const parentDir = normalizedPath.split(/[\\/]/).slice(0, -1).join('\\') || normalizedPath;
        setWorkspacePath(parentDir);
        await window.electron.saveWorkspacePath(parentDir);
        
        const tree = await window.electron.getFileTree(parentDir);
        if (tree.success) {
          window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: tree.tree }));
        }
        
        await handleFileOpen(normalizedPath);
      }
    }
  };

  // Load workspace path on mount (but skip if we have a context menu path)
  useEffect(() => {
    const loadWorkspace = async () => {
      // Check if we have a context menu path first
      if (window.electron) {
        const contextPath = await window.electron.getOpenPath();
        if (contextPath) {
          // Context menu path will be handled by the other useEffect
          console.log('[App] Skipping workspace load, context menu path detected');
          return;
        }
      }
      
      console.log('[App] Attempting to load workspace path...');
      const result = await window.electron.loadWorkspacePath();
      console.log('[App] loadWorkspacePath result:', result);
      if (result.success && result.workspacePath) {
        console.log('[App] Setting workspacePath to:', result.workspacePath);
        setWorkspacePath(result.workspacePath);
        
        // Auto-open AI installation script if it exists in the workspace
        const installScriptPath = `${result.workspacePath}\\scripts\\install-ai-clis.ps1`;
        window.electron.getFileInfo(installScriptPath).then(info => {
          if (info && !info.isDirectory && info.success !== false) {
            handleFileOpen(installScriptPath);
          }
        });
      } else {
        console.log('[App] No workspace path found - you need to open a folder via File → Open Folder');
      }
    };
    loadWorkspace();
  }, []);

  // Trigger indexing when workspace changes
  useEffect(() => {
    if (!workspacePath) return;
    
    console.log('[App] Workspace changed to:', workspacePath);
    
    // Check if workspace actually changed (not just re-render)
    if (indexer.workspacePath && indexer.workspacePath !== workspacePath) {
      console.log('[App] Workspace changed from', indexer.workspacePath, 'to', workspacePath);
      console.log('[App] Clearing old index and starting fresh...');
      indexer.indexStore.clear(); // Clear old index
    }
    
    console.log('[App] Checking index cache...');
    indexer.loadFromStorage(workspacePath).then(cached => {
      if (!cached) {
        console.log('[App] No cache found, starting indexing...');
        indexer.startIndexing(workspacePath);
      } else {
        console.log('[App] Loaded index from cache');
      }
    });
  }, [workspacePath]);

  // Handle context menu integration - consolidated single listener
  useEffect(() => {
    let cleanupCallback = null;
    let fileSystemCleanup = null;
    let sshModalCleanup = null;

    async function checkOpenPath() {
      if (!window.electron) return;
      
      // Method 1: get path that was available at startup
      const startupPath = await window.electron.getOpenPath();
      if (startupPath) {
        console.log('[App] Received path from context menu:', startupPath);
        await handleOpenPath(startupPath, { fileOnly: true });
      }
    }
    
    checkOpenPath();

    // Method 2: listen for paths sent after startup (second instance)
    if (window.electron?.onOpenPath) {
      cleanupCallback = window.electron.onOpenPath((p) => {
        console.log('[App] Received path from second instance:', p);
        handleOpenPath(p, { fileOnly: true });
      });
    }

    // Method 3: listen for file system changes and update file tree
    if (window.electron?.onFileSystemChanged) {
      fileSystemCleanup = window.electron.onFileSystemChanged((data) => {
        console.log('[App] File system changed, refreshing tree and index');
        
        // Update file tree
        if (data.tree) {
          window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: data.tree }));
        }
        
        // Trigger incremental re-indexing (will be implemented in FileWatcher)
        if (workspacePath && indexer.enabled) {
          console.log('[App] Triggering incremental re-index');
          window.dispatchEvent(new CustomEvent('kaizer:file-system-changed', { detail: data }));
        }
      });
    }

    // Method 4: listen for SSH modal trigger from welcome screen
    const handleOpenSSHModal = () => {
      console.log('[App] Opening SSH modal from welcome screen');
      setShowSSHModal(true);
    };

    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('open-ssh-modal', handleOpenSSHModal);
      sshModalCleanup = () => {
        window.electron.ipcRenderer.removeListener('open-ssh-modal', handleOpenSSHModal);
      };
    }

    // Method 5: listen for remote workspace open from SSH modal
    const handleOpenRemoteWorkspace = (event) => {
      const { path, connection } = event.detail;
      console.log('[App] Opening remote workspace:', path, connection);
      
      // Set the workspace path to the remote path
      setWorkspacePath(path);
      setSSHConnection(connection);
      
      // Trigger tree refresh with remote path
      window.dispatchEvent(new CustomEvent('kaizer:tree-refresh-remote', { 
        detail: { path, remoteMode: true } 
      }));
    };

    window.addEventListener('kaizer:open-remote-workspace', handleOpenRemoteWorkspace);

    return () => {
      if (cleanupCallback) {
        cleanupCallback();
      }
      if (fileSystemCleanup) {
        fileSystemCleanup();
      }
      if (sshModalCleanup) {
        sshModalCleanup();
      }
      window.removeEventListener('kaizer:open-remote-workspace', handleOpenRemoteWorkspace);
    };
  }, [workspacePath]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarVisible(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        // Ctrl+Shift+P → Command Palette
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        // Ctrl+L → focus chat composer
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kaizer:focus-chat'));
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        // Ctrl+Shift+L → new chat
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('kaizer:new-chat'));
      } else if (e.shiftKey && e.key === 'Delete') {
        e.preventDefault();
        handleMenuAction('delete-file');
      }
    };

    const handleFileWritten = (event) => {
      const { path, type, content, originalContent, oldContent, newContent } = event.detail;
      
      // Store AI file changes globally for diff highlighting when file is opened later
      const normalizedPath = normalizePath(path);
      setAiFileChanges(prev => ({
        ...prev,
        [normalizedPath]: {
          oldContent: oldContent || originalContent || '',
          newContent: newContent || content || '',
          changeType: type
        }
      }));
      
      // Refresh file tree
      if (workspacePath) {
        window.electron.getFileTree(workspacePath).then(result => {
          if (result.success) {
            window.dispatchEvent(new CustomEvent('kaizer:tree-refresh', { detail: result.tree }));
          }
        });
      }
      
      // Check if file is currently open in a tab (including preview tabs)
      const tab = tabs.find(t => t.path === normalizedPath);
      const previewTab = tabs.find(t => t.path === `${normalizedPath}:preview`);
      
      if (tab) {
        // Update regular tab with diff view
        // Use the tab's existing originalContent if it already has a diff, otherwise use current content
        const tabOriginalContent = tab.showDiff ? tab.originalContent : tab.content;
        
        setTabs(prev => prev.map(t => 
          t.path === normalizedPath ? { 
            ...t, 
            content: tabOriginalContent, // Keep original content for diff
            newContent: newContent || content, // New content from AI
            dirty: false,
            showDiff: true,
            changeType: type,
            originalContent: tabOriginalContent
          } : t
        ));
        
        // Make sure this tab is active so user sees the diff
        setActiveTabPath(normalizedPath);
      }
      
      // Update preview tab in real-time (for plan files)
      if (previewTab) {
        setTabs(prev => prev.map(t => 
          t.path === `${normalizedPath}:preview` ? { 
            ...t, 
            content: newContent || content // Update preview with new content in real-time
          } : t
        ));
      }
      
      if (!tab && !previewTab) {
        // Check if it's a plan file - open in preview mode automatically
        if (path.includes('.kaizer') && path.includes('plans') && path.endsWith('.md')) {
          // Open plan file in preview mode automatically
          const fileName = path.split(/[\\/]/).pop();
          const previewPath = `${path}:preview`;
          
          setTabs(prev => [...prev, {
            path: previewPath,
            name: `${fileName} (Preview)`,
            content: content,
            dirty: false,
            isPreview: true
          }]);
          setActiveTabPath(previewPath);
        }
        // For regular files, don't auto-open them
        // User can manually open from file explorer if needed
      }
    };

    const handleOpenFilePicker = (event) => {
      setFilePickerStartPath(event.detail.startPath || workspacePath || '');
      setFilePickerMode('attach'); // Chat always uses attach mode
      setFilePickerOpen(true);
    };

    const handleOpenPreview = (event) => {
      const { originalPath, content } = event.detail;
      const fileName = originalPath.split(/[\\/]/).pop();
      const previewPath = `${originalPath}:preview`;
      
      // Check if preview already exists
      const existingPreview = tabs.find(t => t.path === previewPath);
      if (existingPreview) {
        setActiveTabPath(previewPath);
        return;
      }
      
      // Create new preview tab
      const previewTab = {
        path: previewPath,
        name: `${fileName} [Preview]`,
        content: content,
        dirty: false,
        isPreview: true,
        originalPath: originalPath
      };
      
      setTabs(prev => [...prev, previewTab]);
      setActiveTabPath(previewPath);
    };

    const handleOpenIncludeFile = async (event) => {
      const { path } = event.detail;
      
      // Check if file exists and open it
      try {
        const info = await window.electron.getFileInfo(path);
        
        if (info && info.success !== false && !info.isDirectory) {
          await handleFileOpen(path);
        } else {
          setErrorMessage(`Could not find include file: ${path}`);
        }
      } catch (error) {
        setErrorMessage(`Error opening include file: ${error.message}`);
      }
    };

    const handleCloseTerminal = () => {
      setTerminalVisible(false);
    };

    const handleNewTerminal = () => {
      setTerminalVisible(true);
    };
    
    const handleClearDiff = () => {
      // Clear all AI file changes when user accepts or reverts
      setAiFileChanges({});
    };

    const handleOpenSettings = (event) => {
      const { tab } = event.detail || {};
      setShowSettings(true);
      if (tab) {
        // Store the tab to open in a ref or state that SettingsModal can read
        setTimeout(() => {
          setShowSettings(false);
          setTimeout(() => {
            setShowSettings(tab);
          }, 50);
        }, 0);
      }
    };

    const handleOpenSSHModal = () => {
      setShowSSHModal(true);
    };

    const handleOpenFile = async (e) => {
      const { path, showPreview } = e.detail;
      console.log('[App] kaizer:open-file event received for:', path, { showPreview });
      
      if (!path) return;
      
      // If showPreview is true and it's a markdown file, handle separately
      if (showPreview && path.endsWith('.md')) {
        const result = await window.electron.readFile(path);
        if (!result.success) {
          setErrorMessage(`Failed to open preview: ${result.error}`);
          return;
        }
        
        const fileName = path.split(/[\\/]/).pop();
        const previewPath = `${path}:preview`;
        const previewExists = tabs.find(t => t.path === previewPath);
        
        if (!previewExists) {
          setTabs(prev => [...prev, {
            path: previewPath,
            name: `${fileName} (Preview)`,
            content: result.content,
            dirty: false,
            isPreview: true
          }]);
        }
        setActiveTabPath(previewPath);
        return;
      }
      
      // Otherwise use unified handleFileOpen
      await handleFileOpen(path);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('kaizer:file-written', handleFileWritten);
    window.addEventListener('kaizer:open-filepicker', handleOpenFilePicker);
    window.addEventListener('kaizer:open-file', handleOpenFile);
    window.addEventListener('kaizer:open-preview', handleOpenPreview);
    window.addEventListener('kaizer:open-include-file', handleOpenIncludeFile);
    window.addEventListener('kaizer:close-terminal', handleCloseTerminal);
    window.addEventListener('kaizer:new-terminal', handleNewTerminal);
    window.addEventListener('kaizer:clear-diff', handleClearDiff);
    window.addEventListener('kaizer:open-settings', handleOpenSettings);
    window.addEventListener('kaizer:open-ssh-modal', handleOpenSSHModal);
    window.addEventListener('kaizer:terminal-execute', handleNewTerminal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('kaizer:file-written', handleFileWritten);
      window.removeEventListener('kaizer:open-filepicker', handleOpenFilePicker);
      window.removeEventListener('kaizer:open-file', handleOpenFile);
      window.removeEventListener('kaizer:open-preview', handleOpenPreview);
      window.removeEventListener('kaizer:open-include-file', handleOpenIncludeFile);
      window.removeEventListener('kaizer:close-terminal', handleCloseTerminal);
      window.removeEventListener('kaizer:new-terminal', handleNewTerminal);
      window.removeEventListener('kaizer:clear-diff', handleClearDiff);
      window.removeEventListener('kaizer:open-settings', handleOpenSettings);
      window.removeEventListener('kaizer:open-ssh-modal', handleOpenSSHModal);
    };
  }, [activeTabPath, tabs, workspacePath]);

  const handleOpenFolder = async () => {
    console.log('[App] Opening folder picker...');
    setFilePickerStartPath(workspacePath || '');
    setFilePickerMode('folder');
    setFilePickerOpen(true);
  };

  const handleTabSelect = (path) => {
    setActiveTabPath(path);
  };

  const handleTabClose = (path) => {
    const normalizedPath = normalizePath(path);
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(tab => tab.path === normalizedPath);
      const newTabs = prevTabs.filter(tab => tab.path !== normalizedPath);

      if (activeTabPath === normalizedPath) {
        if (newTabs.length > 0) {
          const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          setActiveTabPath(newTabs[newActiveIndex].path);
        } else {
          setActiveTabPath(null);
        }
      }
      
      return newTabs;
    });
  };

  const handleContentChange = (newContent) => {
    setTabs(prev => prev.map(tab => {
      if (tab.path === activeTabPath) {
        return { ...tab, content: newContent, dirty: true };
      }
      return tab;
    }));
  };

  const saveActiveTab = async () => {
    if (!activeTabPath) return;
    const tab = tabs.find(t => t.path === activeTabPath);
    if (!tab) return;

    let targetPath = tab.path;
    
    // If it's an untitled file, we need to ask for a save location
    if (tab.isUntitled) {
      console.log('[App] Saving untitled file, opening save dialog...');
      const result = await window.electron.showSaveDialog({
        title: 'Save File',
        defaultPath: workspacePath ? `${workspacePath}/untitled.txt` : 'untitled.txt',
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.canceled || !result.filePath) {
        console.log('[App] Save canceled');
        return;
      }
      
      targetPath = result.filePath;
    }

    console.log('[App] Saving file to:', targetPath);
    const result = await window.electron.writeFile(targetPath, tab.content);
    if (result.success) {
      setTabs(prev => prev.map(t => 
        t.path === activeTabPath 
          ? { ...t, path: targetPath, name: targetPath.split(/[\\/]/).pop(), dirty: false, isUntitled: false } 
          : t
      ));
      if (tab.isUntitled) {
        setActiveTabPath(targetPath);
      }
      toast.success(`Saved: ${targetPath.split(/[\\/]/).pop()}`);
      
      // Refresh tree if in workspace
      if (workspacePath && targetPath.startsWith(workspacePath)) {
        window.dispatchEvent(new CustomEvent('kaizer:tree-refresh'));
      }
    } else {
      setErrorMessage(`Failed to save file: ${result.error}`);
    }
  };

  const handleSettingsSave = (newSettings) => {
    // Note: The SettingsModal now handles saving provider keys separately
    // The newSettings.apiKey contains the key for the CURRENT provider only
    setSettings(newSettings);
    localStorage.setItem('kaizer-settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const handleModelSelect = (model) => {
    setSettings(prev => {
      const providerKeys = JSON.parse(localStorage.getItem('kaizer-provider-keys') || '{}');
      const newSettings = { ...prev, selectedModel: model };
      
      // Auto-switch provider if the model ID matches a specific provider
      if (model.id.startsWith('gemini/')) {
        newSettings.provider = 'google-gemini';
        newSettings.endpoint = 'https://generativelanguage.googleapis.com/v1beta';
      } else if (model.id.startsWith('kr/') || model.id.startsWith('anthropic/')) {
        newSettings.provider = 'anthropic';
        newSettings.endpoint = 'https://api.anthropic.com/v1';
      } else if (model.id.startsWith('openrouter/')) {
        newSettings.provider = 'openrouter';
        newSettings.endpoint = 'https://openrouter.ai/api/v1';
      } else if (model.id.startsWith('openai/') || model.id.startsWith('gpt-')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'https://api.openai.com/v1';
      } else if (model.id.startsWith('qw/') || model.id.startsWith('qwen/')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      } else if (model.id.startsWith('opencode/')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      } else if (model.id.startsWith('codex/')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      } else if (model.id.startsWith('openclaw/')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      } else if (model.id.startsWith('claude/') && model.id.endsWith('-local')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      } else if (model.id.startsWith('droid/')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      } else if (model.id.startsWith('pi/')) {
        newSettings.provider = 'openai-compatible';
        newSettings.endpoint = 'http://localhost:11434/v1';
      }
      
      // Load the API key for the new provider
      newSettings.apiKey = providerKeys[newSettings.provider] || '';
      
      localStorage.setItem('kaizer-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Validate settings on load to ensure endpoint consistency
  useEffect(() => {
    if (settings.selectedModel) {
      const model = settings.selectedModel;
      // If endpoint is still the local one but model is Gemini/Claude, fix it.
      if (settings.endpoint === "http://localhost:20128/v1") {
        if (model.id.startsWith('gemini/')) {
          handleModelSelect(model);
        } else if (model.id.startsWith('kr/') || model.id.startsWith('anthropic/')) {
          handleModelSelect(model);
        } else if (model.id.startsWith('droid/') || model.id.startsWith('pi/') || model.id.startsWith('openclaw/') || (model.id.startsWith('claude/') && model.id.endsWith('-local'))) {
          handleModelSelect(model);
        }
      }
    }
    
    // Ensure we have the correct API key for the current provider
    const providerKeys = JSON.parse(localStorage.getItem('kaizer-provider-keys') || '{}');
    const currentKey = providerKeys[settings.provider] || settings.apiKey || '';
    
    if (currentKey !== settings.apiKey) {
      setSettings(prev => ({
        ...prev,
        apiKey: currentKey
      }));
    }
  }, []);

  const handleAddModel = (newModel) => {
    setSettings(prev => {
      const newSettings = { ...prev, models: [...prev.models, newModel], selectedModel: newModel };
      localStorage.setItem('kaizer-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const handleMenuAction = async (action) => {
    switch (action) {
      case 'new-file': {
        const untitledId = `untitled-${Date.now()}`;
        const newTab = {
          path: untitledId,
          name: 'Untitled',
          content: '',
          dirty: true,
          isUntitled: true
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabPath(untitledId);
        break;
      }
      
      case 'open-folder':
        handleOpenFolder();
        break;
      
      case 'save-file':
        saveActiveTab();
        break;
      
      case 'save-all':
        for (const tab of tabs) {
          if (tab.dirty && !tab.isUntitled) {
            await window.electron.writeFile(tab.path, tab.content);
          }
        }
        setTabs(prev => prev.map(tab => ({ ...tab, dirty: false })));
        break;
      
      case 'close-tab':
        if (activeTabPath) {
          console.log('[App] Closing active tab:', activeTabPath);
          handleTabClose(activeTabPath);
        } else {
          console.log('[App] No active tab to close, closing folder instead.');
          handleMenuAction('close-folder');
        }
        break;
      
      case 'close-folder':
        console.log('[App] Closing folder and returning to welcome...');
        setWorkspacePath(null);
        setTabs([]);
        setActiveTabPath(null);
        indexer.reset();
        // Explicitly clear workspace path on disk as well
        window.electron.saveWorkspacePath(null);
        window.electron.showWelcome();
        break;
      
      case 'close-all-tabs':
        console.log('[App] Closing all tabs');
        setTabs([]);
        setActiveTabPath(null);
        break;
      
      case 'delete-file':
        if (activeTabPath) {
          const confirm = window.confirm(`Are you sure you want to PERMANENTLY delete "${activeTabPath}"?\n\nThis action cannot be undone.`);
          if (confirm) {
            console.log('[App] Deleting file:', activeTabPath);
            const result = await window.electron.deleteFile(activeTabPath);
            if (result.success) {
              handleTabClose(activeTabPath);
              // The FileExplorer will refresh via the file-system-changed event
            } else {
              setErrorMessage(`Failed to delete file: ${result.error}`);
            }
          }
        } else {
          setErrorMessage('No file selected to delete');
        }
        break;
      
      case 'save-workspace':
        if (workspacePath) {
          const folderName = workspacePath.split(/[\\\/]/).pop() || 'Project';
          const workspaceData = {
            name: folderName,
            path: workspacePath,
            tabs: tabs.map(tab => ({ path: tab.path })), // Only save paths
            timestamp: Date.now()
          };
          
          console.log('[App] Saving workspace to file...');
          const result = await window.electron.saveWorkspaceFile(workspaceData);
            
            if (result.success) {
              toast.success(`Workspace saved to: ${result.filePath}`);
            } else if (result.error) {
              toast.error(`Failed to save workspace: ${result.error}`);
              setErrorMessage(`Failed to save workspace: ${result.error}`);
            }
        } else {
          toast.error('You must open a folder first before saving it as a workspace.');
        }
        break;
      
      case 'open-workspace':
        console.log('[App] Opening workspace from file...');
        const openResult = await window.electron.openWorkspaceFile();
        if (openResult.success && openResult.workspaceData) {
          const { path: wsPath, tabs: savedTabs } = openResult.workspaceData;
          console.log('[App] Loading workspace:', wsPath);
          
          setWorkspacePath(wsPath);
          await window.electron.saveWorkspacePath(wsPath);
          
          // Clear current tabs before loading new ones
          setTabs([]);
          
          // Open tabs
          if (savedTabs && savedTabs.length > 0) {
            for (const tab of savedTabs) {
              await handleFileOpen(tab.path);
            }
          }
          
          toast.success(`Loaded workspace: ${openResult.filePath}`);
        } else if (openResult.error) {
          toast.error(`Failed to load workspace: ${openResult.error}`);
          setErrorMessage(`Failed to load workspace: ${openResult.error}`);
        }
        break;

      case 'close-session':
        console.log('[App] Closing session');
        // Clear all state
        setWorkspacePath(null);
        setTabs([]);
        setActiveTabPath(null);
        setSidebarVisible(true);
        setTerminalVisible(false);
        indexer.reset();
        // Explicitly clear workspace path on disk
        window.electron.saveWorkspacePath(null);
        // Clear chat history for this session
        localStorage.removeItem('kaizer-current-chat');
        // Show welcome screen
        window.electron.showWelcome();
        break;
      
      case 'exit-app':
        console.log('[App] Exiting application');
        window.electron.exitApp();
        break;
      
      case 'show-welcome':
        window.electron.showWelcome();
        break;
      
      case 'toggle-sidebar':
        setSidebarVisible(prev => !prev);
        break;
      
      case 'toggle-explorer':
        setSidebarVisible(prev => !prev);
        break;
      
      case 'show-docs':
        setShowHelpModal(true);
        break;
      
      case 'open-settings':
        setShowSettings(true);
        break;
      
      case 'new-terminal':
        setTerminalVisible(true);
        window.dispatchEvent(new CustomEvent('kaizer:new-terminal'));
        break;
      
      default:
        console.log('Menu action not implemented:', action);
    }
  };

  return (
    <div className="app">
      <TitleBar 
        workspacePath={workspacePath} 
        onSettingsClick={() => setShowSettings(true)}
        onMenuAction={handleMenuAction}
      />
      <div className="main-content">
        <FileExplorer
          workspacePath={workspacePath}
          activeFile={activeTabPath}
          onFileOpen={handleFileOpen}
          onOpenFolder={handleOpenFolder}
          onOpenFilePicker={(startPath) => {
            setFilePickerStartPath(startPath);
            setFilePickerOpen(true);
          }}
          visible={sidebarVisible}
        />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}>
          <EditorArea
            tabs={tabs}
            activeTab={activeTabPath}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onContentChange={handleContentChange}
          />
          {terminalVisible && <TerminalPanel workspacePath={workspacePath} />}
        </div>
        <div style={{
          width: '340px',
          minWidth: '340px',
          maxWidth: '340px',
          height: '100%',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <ChatPanel 
            workspacePath={workspacePath}
            activeFile={activeTabPath}
            activeFileContent={tabs.find(tab => tab.path === activeTabPath)?.content}
            settings={settings}
            onOpenFile={handleFileOpen}
            onSelectModel={handleModelSelect}
            onAddModel={handleAddModel}
          />
        </div>
      </div>
      <StatusBar
        activeFile={activeTabPath}
        modelName={settings.selectedModel.name}
        endpoint={settings.endpoint}
      />
      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSettingsSave}
            onClose={() => setShowSettings(false)}
            initialTab={typeof showSettings === 'string' ? showSettings : undefined}
          />
        )}
        {filePickerOpen && (
          <FilePicker
            startPath={filePickerStartPath}
            workspacePath={workspacePath}
            mode={filePickerMode}
            onAttach={(items) => {
              if (filePickerMode === 'folder' && items.length > 0) {
                // Folder selection mode - set as workspace
                const folderPath = items[0].path;
                console.log('[App] Selected folder:', folderPath);
                setWorkspacePath(folderPath);
                window.electron.saveWorkspacePath(folderPath);
                setFilePickerOpen(false);
              } else {
                // File attachment mode - dispatch event
                window.dispatchEvent(new CustomEvent('kaizer:attach-context', { detail: { items } }));
                setFilePickerOpen(false);
              }
            }}
            onClose={() => setFilePickerOpen(false)}
          />
        )}
        {showHelpModal && (
          <HelpModal 
            onClose={() => setShowHelpModal(false)} 
            onOpenSettings={() => {
              setShowHelpModal(false);
              setShowSettings(true);
            }}
          />
        )}
        {showSSHModal && (
          <RemoteConnectionModal
            onClose={() => setShowSSHModal(false)}
            onConnect={(connection) => {
              setSSHConnection(connection);
              console.log('[App] SSH connected:', connection);
            }}
          />
        )}
        {showCommandPalette && (
          <CommandPalette
            open={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            commands={[
              { id: 'file.new', group: 'File', title: 'New File',
                shortcut: 'Ctrl+N', run: () => handleMenuAction('new-file') },
              { id: 'file.openFolder', group: 'File', title: 'Open Folder…',
                shortcut: 'Ctrl+K Ctrl+O', run: () => handleMenuAction('open-folder') },
              { id: 'file.openWorkspace', group: 'File', title: 'Open Workspace…',
                run: () => handleMenuAction('open-workspace') },
              { id: 'file.save', group: 'File', title: 'Save',
                shortcut: 'Ctrl+S', run: () => handleMenuAction('save-file') },
              { id: 'file.saveAll', group: 'File', title: 'Save All',
                shortcut: 'Ctrl+K S', run: () => handleMenuAction('save-all') },
              { id: 'file.closeTab', group: 'File', title: 'Close Tab',
                shortcut: 'Ctrl+W', run: () => handleMenuAction('close-tab') },
              { id: 'file.closeAllTabs', group: 'File', title: 'Close All Tabs',
                run: () => handleMenuAction('close-all-tabs') },
              { id: 'file.deleteFile', group: 'File', title: 'Delete File',
                shortcut: 'Shift+Delete', run: () => handleMenuAction('delete-file') },
              { id: 'file.saveWorkspace', group: 'File', title: 'Save Workspace As…',
                run: () => handleMenuAction('save-workspace') },
              { id: 'file.closeFolder', group: 'File', title: 'Close Folder',
                run: () => handleMenuAction('close-folder') },
              { id: 'file.closeSession', group: 'File', title: 'Close Session',
                run: () => handleMenuAction('close-session') },
              { id: 'file.exitApp', group: 'File', title: 'Exit',
                shortcut: 'Alt+F4', run: () => handleMenuAction('exit-app') },
              { id: 'view.toggleSidebar', group: 'View', title: 'Toggle Sidebar',
                shortcut: 'Ctrl+B', run: () => handleMenuAction('toggle-sidebar') },
              { id: 'view.toggleTerminal', group: 'View', title: 'New Terminal',
                run: () => handleMenuAction('new-terminal') },
              { id: 'view.toggleTerminalHide', group: 'View', title: 'Toggle Terminal Panel',
                run: () => setTerminalVisible((v) => !v) },
              { id: 'app.settings', group: 'Preferences', title: 'Open Settings',
                shortcut: 'Ctrl+,', run: () => handleMenuAction('open-settings') },
              { id: 'app.help', group: 'Help', title: 'Show Docs / Help',
                run: () => handleMenuAction('show-docs') },
              { id: 'remote.ssh', group: 'Remote', title: 'Connect via SSH…',
                run: () => setShowSSHModal(true) },
              { id: 'workspace.reindex', group: 'Workspace', title: 'Reindex Workspace',
                run: () => {
                  if (workspacePath) indexer.reindex(workspacePath);
                } },
            ]}
          />
        )}
      </Suspense>
      <Toaster />
    </div>
  );
}

export default App;
