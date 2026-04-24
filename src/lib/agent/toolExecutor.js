import { indexer } from '../indexer';
import { RetryPolicy } from './reliability/RetryPolicy';
import { ErrorHandler } from './reliability/ErrorHandler';

// Create retry policy and error handler for tool execution
const retryPolicy = RetryPolicy.getPolicy('FAST');
const errorHandler = new ErrorHandler();

/**
 * Execute a tool call via Electron IPC with retry logic
 */
export async function executeTool(toolName, args, workspacePath, context = {}) {
  // Simple path joining for browser context
  const joinPath = (base, relative) => {
    if (!base) return relative;
    if (!relative) return base;
    const separator = base.includes('\\') ? '\\' : '/';
    return base.endsWith(separator) ? base + relative : base + separator + relative;
  };
  
  // Wrap tool execution with retry logic for transient failures
  const executeWithRetry = async (attemptNumber) => {
    switch (toolName) {
      case 'read_file': {
        const fullPath = workspacePath 
          ? joinPath(workspacePath, args.path)
          : args.path;
        console.log('[Agent] read_file called for:', fullPath);
        const result = await window.electron.readFile(fullPath);
        console.log('[Agent] read_file result:', { success: result?.success, hasContent: result?.content !== null && result?.content !== undefined, error: result?.error });
        if (result.success && result.content !== null && result.content !== undefined) {
          return result.content;
        } else {
          const errorMsg = `Error reading file: ${result.error || 'File content is empty or null'}`;
          console.error('[Agent]', errorMsg, 'Path:', fullPath);
          throw new Error(errorMsg);
        }
      }
    
    case 'write_file': {
      const fullPath = workspacePath 
        ? joinPath(workspacePath, args.path)
        : args.path;
      
      // Read original content before writing
      const existsResult = await window.electron.readFile(fullPath);
      const fileType = existsResult.success ? 'modified' : 'added';
      const originalContent = (existsResult.success && existsResult.content !== null && existsResult.content !== undefined) ? existsResult.content : '';
      
      const result = await window.electron.writeFile(fullPath, args.content);
      if (result.success) {
        // Dispatch event to notify UI of file change with diff data
        window.dispatchEvent(new CustomEvent('kaizer:file-written', { 
          detail: { 
            path: fullPath,
            type: fileType,
            content: args.content,
            originalContent: originalContent,
            oldContent: originalContent,
            newContent: args.content
          } 
        }));
        return `File written successfully: ${args.path}`;
      } else {
        return `Error writing file: ${result.error}`;
      }
    }
    
    case 'list_directory': {
      const fullPath = workspacePath 
        ? joinPath(workspacePath, args.path || '')
        : args.path || '.';
      const result = await window.electron.listDir(fullPath);
      if (result.success) {
        return result.entries
          .map(e => `${e.type === 'directory' ? '[DIR] ' : '[FILE]'} ${e.name}`)
          .join('\n');
      } else {
        return `Error listing directory: ${result.error}`;
      }
    }
    
    case 'run_command': {
      const cwd = args.cwd 
        ? (workspacePath ? joinPath(workspacePath, args.cwd) : args.cwd)
        : workspacePath;
      
      // Request user permission before executing
      const permission = await new Promise((resolve) => {
        window.dispatchEvent(new CustomEvent('kaizer:request-command-permission', {
          detail: {
            command: args.command,
            cwd: cwd,
            onResponse: resolve
          }
        }));
      });
      
      if (!permission.allowed) {
        return `Command execution denied by user: ${args.command}`;
      }
      
      const result = await window.electron.runCommand(args.command, cwd);
      let output = `$ ${args.command}\n`;
      if (result.stdout) output += result.stdout + '\n';
      if (result.stderr) output += result.stderr + '\n';
      output += `[exit: ${result.exitCode}]`;
      return output;
    }
    
    case 'search_files': {
      const searchDir = args.directory 
        ? (workspacePath ? joinPath(workspacePath, args.directory) : args.directory)
        : workspacePath;
      const result = await window.electron.searchFiles(args.query, searchDir);
      if (result.success) {
        return result.results
          .map(r => `${r.file}:${r.line}  ${r.content}`)
          .join('\n');
      } else {
        return `Error searching files: ${result.error}`;
      }
    }
    
    case 'search_index': {
      const limit = args.limit || 20;
      const results = indexer.search(args.query, limit);
      if (results.length === 0) {
        return `No files found matching "${args.query}"`;
      }
      const needle = (args.query || '').toLowerCase();
      // Build a richer per-result block: metadata + a short code snippet
      // so the AI sees actual code, not just "Lines: 40".
      return results
        .map((f) => {
          const symbolsStr = (f.symbols || []).slice(0, 5).join(', ') || 'none';
          const header = `${f.path}\n  Type: ${f.ext} | Lines: ${f.lines} | Symbols: ${symbolsStr}`;

          if (!f.preview) return header;
          const lines = f.preview.split('\n');
          const matchIdx = lines.findIndex((ln) =>
            ln.toLowerCase().includes(needle)
          );
          let snippetLines;
          let startLine;
          if (matchIdx !== -1) {
            const from = Math.max(0, matchIdx - 2);
            const to = Math.min(lines.length, matchIdx + 3);
            snippetLines = lines.slice(from, to);
            startLine = from + 1;
          } else {
            snippetLines = lines.slice(0, 5);
            startLine = 1;
          }
          const snippet = snippetLines
            .map((ln, i) => `  ${String(startLine + i).padStart(4, ' ')}  ${ln}`)
            .join('\n');
          return `${header}\n${snippet}`;
        })
        .join('\n\n');
    }

    case 'grep_index': {
      const limit = args.limit || 30;
      const results = indexer.grep(args.query, limit);
      if (results.length === 0) {
        return `No matches for "${args.query}" in indexed previews.`;
      }
      // Group by file for a compact, grep-like output.
      const byFile = new Map();
      for (const r of results) {
        if (!byFile.has(r.path)) byFile.set(r.path, []);
        byFile.get(r.path).push(r);
      }
      return Array.from(byFile.entries())
        .map(([path, matches]) => {
          const lines = matches
            .map((m) => `  ${String(m.line).padStart(4, ' ')}: ${m.content}`)
            .join('\n');
          return `${path}\n${lines}`;
        })
        .join('\n\n');
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
  };

  // Execute with retry logic for transient failures
  try {
    return await retryPolicy.execute(executeWithRetry, { errorHandler });
  } catch (error) {
    // Format error message for user
    const formattedError = errorHandler.formatErrorMessage(error);
    console.error('[Agent] Tool execution failed after retries:', toolName, error);
    return formattedError;
  }
}
