/**
 * Tool definitions in OpenAI function calling format
 */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative to workspace root)'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write (relative to workspace root)'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List entries in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the directory to list (relative to workspace root, or empty for root)'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute'
          },
          cwd: {
            type: 'string',
            description: 'Working directory (relative to workspace root, optional)'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for text across files in the workspace',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text to search for'
          },
          directory: {
            type: 'string',
            description: 'Directory to search in (relative to workspace root, optional)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_index',
      description: 'Search the workspace index for files by name, path, symbols, or content. Returns each match with file metadata AND a short code snippet (5 lines around the hit), so you can usually answer without a follow-up read_file. Much faster than list_directory.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (filename, symbol name, or keyword)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 20)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'grep_index',
      description: 'Line-level text search across the first ~50 lines of every indexed file. Returns file path, line number, and matching line content grouped by file. Use this to quickly locate usages/definitions without reading files. Case-insensitive literal match.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Literal text to match (case-insensitive).'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of matches to return (default: 30).'
          }
        },
        required: ['query']
      }
    }
  }
];
