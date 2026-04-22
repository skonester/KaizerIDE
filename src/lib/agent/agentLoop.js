import { indexer } from '../indexer';
import { buildSystemPrompt } from './systemPrompt';
import { TOOLS } from './tools';
import { executeTool } from './toolExecutor';
import { consumeStream } from './streamProcessor';

/**
 * Main agent loop with tool calling
 */
export async function runAgentTurn({ 
  messages, 
  settings, 
  workspacePath,
  activeFile,
  activeFileContent,
  onToken, 
  onToolCall, 
  onToolResult, 
  onThinkingToken,
  onDone, 
  signal 
}) {
  const { endpoint, apiKey, selectedModel } = settings;
  const MAX_ITERATIONS = 12;
  
  // Process messages to include attached file contents
  const processedMessages = await Promise.all(messages.map(async (msg) => {
    if (msg.role === 'user' && msg.context && msg.context.length > 0) {
      // Read attached files and include their content
      let contextContent = '';
      for (const ctx of msg.context) {
        if (ctx.type === 'file' && ctx.data) {
          try {
            const result = await window.electron.readFile(ctx.data);
            if (result && result.success && result.content !== null && result.content !== undefined) {
              const fileName = ctx.data.split(/[\\/]/).pop();
              contextContent += `\n\n<attached_file path="${ctx.data}">\n${result.content}\n</attached_file>`;
            }
          } catch (e) {
            console.error('[Agent] Failed to read attached file:', ctx.data, e);
          }
        }
      }
      
      if (contextContent) {
        return {
          role: 'user',
          content: (msg.content || '') + contextContent
        };
      }
    }
    
    return {
      role: msg.role,
      content: msg.content || ''
    };
  }));
  
  // Add currently open file as context to the first user message
  if (activeFile && activeFileContent && processedMessages.length > 0) {
    const firstUserMsgIndex = processedMessages.findIndex(m => m.role === 'user');
    if (firstUserMsgIndex !== -1 && processedMessages[firstUserMsgIndex]) {
      const fileName = activeFile.split(/[\\/]/).pop();
      const openFileContext = `\n\n<currently_open_file path="${activeFile}">\n${activeFileContent}\n</currently_open_file>`;
      
      processedMessages[firstUserMsgIndex] = {
        ...processedMessages[firstUserMsgIndex],
        content: (processedMessages[firstUserMsgIndex].content || '') + openFileContext
      };
    }
  }

  // Get relevant context from index for the user's query
  const lastUserMsg = processedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const relevantContext = indexer.getRelevantContext(lastUserMsg);
  if (relevantContext && processedMessages.length > 0) {
    const lastUserMsgIndex = processedMessages.length - 1;
    if (processedMessages[lastUserMsgIndex] && processedMessages[lastUserMsgIndex].role === 'user') {
      processedMessages[lastUserMsgIndex] = {
        ...processedMessages[lastUserMsgIndex],
        content: relevantContext + '\n\n' + (processedMessages[lastUserMsgIndex].content || '')
      };
    }
  }
  
  let loopMessages = [
    { 
      role: 'system', 
      content: buildSystemPrompt(workspacePath, selectedModel.id, settings.systemPrompts) 
    },
    ...processedMessages
  ];
  
  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const body = {
        model: selectedModel.id,
        messages: loopMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        stream: true,
        max_tokens: selectedModel.maxOutputTokens
      };
      
      // Enable thinking if model supports it
      if (selectedModel.thinking) {
        body.thinking = { type: 'enabled', budget_tokens: 8000 };
      }
      
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ${response.status}: ${errorText}`);
      }
      
      // Consume stream and get full message
      // Pass true for alreadyStartedThinking on iterations after the first to prevent duplicate thinking blocks
      const { content, thinkingContent, message } = await consumeStream(
        response, 
        onToken, 
        onThinkingToken, 
        iteration > 0 // Don't start new thinking block on subsequent iterations
      );
      
      console.log(`[Agent] Iteration ${iteration}: content="${content?.slice(0, 50)}...", thinking="${thinkingContent?.slice(0, 50)}...", tool_calls=${message.tool_calls?.length || 0}`);
      
      // Add assistant message to loop
      loopMessages.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls
      });
      
      // If no tool calls, we're done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        console.log('[Agent] No tool calls, finishing');
        break;
      }
      
      console.log(`[Agent] Executing ${message.tool_calls.length} tool(s)`);
      
      // Execute tools and collect results
      const toolResultMessages = [];
      
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let args;
        
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          args = {};
        }
        
        // Notify UI of tool call
        if (onToolCall) {
          onToolCall({
            id: toolCall.id,
            name: toolName,
            args: args
          });
        }
        
        // Execute tool
        let result;
        try {
          result = await executeTool(toolName, args, workspacePath);
        } catch (error) {
          result = `Error executing tool: ${error.message}`;
        }
        
        // Notify UI of tool result
        if (onToolResult) {
          onToolResult({
            id: toolCall.id,
            name: toolName,
            result: result
          });
        }
        
        // Add tool result message
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        });
      }
      
      // Add all tool results to loop messages
      loopMessages.push(...toolResultMessages);
      
      console.log(`[Agent] Added ${toolResultMessages.length} tool result(s), continuing loop...`);
      
      // Continue loop - will send tool results and get final response
    }
    
    console.log('[Agent] Max iterations reached');
    
    // Done
    if (onDone) onDone();
    
  } catch (error) {
    // Handle abort
    if (error.name === 'AbortError') {
      if (onDone) onDone();
      return;
    }
    // Re-throw other errors
    throw error;
  }
}
