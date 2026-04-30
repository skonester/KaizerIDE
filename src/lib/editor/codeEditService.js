/**
 * Service for applying code edits to Monaco editor
 * Provides functionality similar to Raptor/Antigravity IDE's inline code editing
 */

/**
 * Apply a code edit suggestion to the Monaco editor
 * @param {Object} editor - Monaco editor instance
 * @param {Object} suggestion - Code edit suggestion
 * @param {Function} onSuccess - Callback on successful application
 * @param {Function} onError - Callback on error
 */
export function applyCodeEdit(editor, suggestion, onSuccess, onError) {
  try {
    const { filePath, oldCode, newCode, lineStart, lineEnd, language } = suggestion;
    
    if (!editor) {
      throw new Error('Editor instance not available');
    }

    const model = editor.getModel();
    if (!model) {
      throw new Error('Editor model not available');
    }

    // Get current content
    const currentContent = model.getValue();
    
    // If we have line numbers, use precise replacement
    if (lineStart && lineEnd) {
      applyEditByLineNumbers(editor, suggestion, currentContent);
    } 
    // Otherwise try to find and replace the old code
    else if (oldCode) {
      applyEditByContent(editor, suggestion, currentContent);
    }
    // If only new code is provided, append it
    else if (newCode) {
      applyEditByAppend(editor, suggestion);
    } else {
      throw new Error('No valid edit content provided');
    }

    if (onSuccess) {
      onSuccess(suggestion);
    }

    return true;
  } catch (error) {
    console.error('Failed to apply code edit:', error);
    if (onError) {
      onError(error, suggestion);
    }
    return false;
  }
}

/**
 * Apply edit using precise line numbers
 */
function applyEditByLineNumbers(editor, suggestion, currentContent) {
  const { lineStart, lineEnd, newCode } = suggestion;
  const model = editor.getModel();
  
  // Convert to 0-based line numbers for Monaco
  const startLine = Math.max(1, lineStart);
  const endLine = Math.max(1, lineEnd);
  
  // Get the range to replace
  const startColumn = 1;
  const endColumn = model.getLineMaxColumn(endLine);
  
  // Create edit operation
  const range = {
    startLineNumber: startLine,
    startColumn: startColumn,
    endLineNumber: endLine,
    endColumn: endColumn
  };
  
  // Apply the edit
  editor.executeEdits('code-edit-suggestion', [
    {
      range,
      text: newCode,
      forceMoveMarkers: true
    }
  ]);
  
  // Move cursor to the end of the edit
  const newEndLine = startLine + newCode.split('\n').length - 1;
  const newEndColumn = model.getLineMaxColumn(newEndLine);
  editor.setPosition({ lineNumber: newEndLine, column: newEndColumn });
}

/**
 * Apply edit by finding and replacing content
 */
function applyEditByContent(editor, suggestion, currentContent) {
  const { oldCode, newCode } = suggestion;
  const model = editor.getModel();
  
  // Find the position of oldCode in the current content
  const oldCodeIndex = currentContent.indexOf(oldCode);
  
  if (oldCodeIndex === -1) {
    throw new Error('Could not find the specified code to replace');
  }
  
  // Convert index to line/column
  const position = model.getPositionAt(oldCodeIndex);
  const endPosition = model.getPositionAt(oldCodeIndex + oldCode.length);
  
  // Create edit operation
  const range = {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: endPosition.lineNumber,
    endColumn: endPosition.column
  };
  
  // Apply the edit
  editor.executeEdits('code-edit-suggestion', [
    {
      range,
      text: newCode,
      forceMoveMarkers: true
    }
  ]);
}

/**
 * Append new code to the end of the file
 */
function applyEditByAppend(editor, suggestion) {
  const { newCode } = suggestion;
  const model = editor.getModel();
  
  // Get the end of the file
  const lineCount = model.getLineCount();
  const lastLineLength = model.getLineLength(lineCount);
  
  // Create edit operation at the end
  const range = {
    startLineNumber: lineCount,
    startColumn: lastLineLength + 1,
    endLineNumber: lineCount,
    endColumn: lastLineLength + 1
  };
  
  // Add newline if needed
  let textToInsert = newCode;
  if (lastLineLength > 0) {
    textToInsert = '\n' + newCode;
  }
  
  // Apply the edit
  editor.executeEdits('code-edit-suggestion', [
    {
      range,
      text: textToInsert,
      forceMoveMarkers: true
    }
  ]);
}

/**
 * Create a diff between old and new code
 */
export function createCodeDiff(oldCode, newCode) {
  if (!oldCode || !newCode) return null;
  
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  
  const diff = [];
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      // Lines are equal
      diff.push({ type: 'equal', line: oldLines[i] });
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      // Line added
      diff.push({ type: 'add', line: newLines[j] });
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      // Line removed
      diff.push({ type: 'remove', line: oldLines[i] });
      i++;
    }
  }
  
  return diff;
}

/**
 * Parse code edit suggestion from AI response
 */
export function parseCodeEditFromMessage(message, filePath, language) {
  try {
    // Look for code blocks with edit markers
    const codeBlockRegex = /```(?:\w+)?\s*(?:EDIT|SUGGESTION|CHANGE):?\s*(.*?)```/gis;
    const matches = [...message.matchAll(codeBlockRegex)];
    
    if (matches.length === 0) {
      // Try to find old/new code patterns
      const oldCodeMatch = message.match(/OLD CODE:\s*```(?:\w+)?\s*([\s\S]*?)```/i);
      const newCodeMatch = message.match(/NEW CODE:\s*```(?:\w+)?\s*([\s\S]*?)```/i);
      
      if (oldCodeMatch && newCodeMatch) {
        return {
          filePath,
          oldCode: oldCodeMatch[1].trim(),
          newCode: newCodeMatch[1].trim(),
          language: language || detectLanguage(oldCodeMatch[1])
        };
      }
      return null;
    }
    
    // Parse the first code edit suggestion
    const match = matches[0];
    const content = match[1].trim();
    
    // Try to parse structured edit format
    const lines = content.split('\n');
    let description = '';
    let oldCode = '';
    let newCode = '';
    let inOldCode = false;
    let inNewCode = false;
    
    for (const line of lines) {
      if (line.startsWith('Description:')) {
        description = line.substring('Description:'.length).trim();
      } else if (line.startsWith('Old:')) {
        inOldCode = true;
        inNewCode = false;
      } else if (line.startsWith('New:')) {
        inNewCode = true;
        inOldCode = false;
      } else if (inOldCode) {
        oldCode += line + '\n';
      } else if (inNewCode) {
        newCode += line + '\n';
      } else if (!oldCode && !newCode) {
        // Assume this is part of the description
        description += (description ? ' ' : '') + line;
      }
    }
    
    if (!oldCode && !newCode) {
      // If no structured format, assume the entire content is new code
      newCode = content;
    }
    
    return {
      filePath,
      description: description || 'Code edit suggestion',
      oldCode: oldCode.trim(),
      newCode: newCode.trim(),
      language: language || detectLanguage(oldCode || newCode),
      diff: oldCode && newCode ? createCodeDiff(oldCode, newCode) : null
    };
  } catch (error) {
    console.error('Failed to parse code edit from message:', error);
    return null;
  }
}

/**
 * Detect language from code content
 */
function detectLanguage(code) {
  if (!code) return 'text';
  
  // Simple language detection based on common patterns
  if (code.includes('function') && (code.includes('{') || code.includes('=>'))) {
    return 'javascript';
  }
  if (code.includes('import') && code.includes('from')) {
    return 'javascript';
  }
  if (code.includes('def ') && code.includes(':')) {
    return 'python';
  }
  if (code.includes('class ') && code.includes('{')) {
    return 'java';
  }
  if (code.includes('<html') || code.includes('<div')) {
    return 'html';
  }
  if (code.includes('{') && code.includes('}') && code.includes(':')) {
    return 'css';
  }
  
  return 'text';
}

/**
 * Create a suggestion object for the chat
 */
export function createSuggestionObject(suggestion, workspacePath) {
  return {
    id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'code-edit',
    filePath: suggestion.filePath,
    description: suggestion.description || 'Code edit suggestion',
    oldCode: suggestion.oldCode || '',
    newCode: suggestion.newCode || '',
    language: suggestion.language || 'text',
    lineStart: suggestion.lineStart,
    lineEnd: suggestion.lineEnd,
    diff: suggestion.diff,
    createdAt: new Date().toISOString(),
    workspacePath
  };
}

/**
 * Check if message contains code edit suggestions
 */
export function hasCodeEditSuggestions(message) {
  if (!message) return false;
  
  const patterns = [
    /EDIT.*?:?\s*```/i,
    /SUGGESTION.*?:?\s*```/i,
    /CHANGE.*?:?\s*```/i,
    /OLD CODE:\s*```/i,
    /NEW CODE:\s*```/i,
    /I suggest.*?:?\s*```/i,
    /Here.*?:?\s*```/i
  ];
  
  return patterns.some(pattern => pattern.test(message));
}