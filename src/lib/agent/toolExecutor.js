import { indexer } from '../indexer';

/**
 * Execute a tool call via Electron IPC
 */
export async function executeTool(toolName, args, workspacePath) {
  // Simple path joining for browser context
  const joinPath = (base, relative) => {
    if (!base) return relative;
    if (!relative) return base;
    const separator = base.includes('\\') ? '\\' : '/';
    return base.endsWith(separator) ? base + relative : base + separator + relative;
  };
  
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
        return errorMsg;
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
      return results.map(f => 
        `${f.path}\n  Type: ${f.ext} | Lines: ${f.lines} | Symbols: ${f.symbols.slice(0, 5).join(', ') || 'none'}`
      ).join('\n\n');
    }
    
    default:
      return `Unknown tool: ${toolName}`;
  }
}
