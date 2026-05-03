import { AgentBase } from '../core/AgentBase';
import { buildSystemPrompt } from '../systemPrompt';
import { TOOLS } from '../tools';
import { executeTool } from '../toolExecutor';
import { consumeStream } from '../streamProcessor';
import { makeAgentApiCall } from '../apiClient';
import { indexer } from '../../indexer';

/**
 * ExecutorAgent - Main agent for executing tasks with tool calling
 * Refactored from agentLoop.js to use AgentBase architecture
 */
export class ExecutorAgent extends AgentBase {
  constructor(config = {}) {
    super('executor', config);
    this.maxIterations = config.maxIterations || 12;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: true,
      canExecute: true,
      allowedTools: null // All tools allowed
    };
  }

  /**
   * Get agent-specific system prompt
   */
  getSystemPrompt(context) {
    const basePrompt = buildSystemPrompt(
      context.workspacePath,
      context.settings?.selectedModel?.id,
      context.settings?.systemPrompts
    );

    const executorPrompt = `

${basePrompt}

AGENT MODE - SPECIAL INSTRUCTIONS:
You are in AGENT mode (Executor). Your role is to autonomously execute tasks, implement features, and make changes to the codebase.

CAPABILITIES:
- You can READ files to understand the codebase
- You can WRITE files to implement features and fix issues
- You can EXECUTE commands to run tests, build, install packages, etc.
- You can SEARCH the codebase to find relevant code
- You have FULL ACCESS to all tools

WORKFLOW:
1. **Understand** - Read relevant files and explore the project structure
2. **Plan** - Think through the solution approach
3. **Implement** - Make precise, targeted changes
4. **Verify** - Test your changes when possible
5. **Report** - Summarize what you accomplished

BEST PRACTICES:
- Always read files before editing them
- Make surgical, minimal changes that match existing code style
- Use the indexer to find relevant files quickly
- Execute commands to verify your changes work
- Handle errors gracefully and fix issues autonomously
- Think step-by-step using <think>...</think> tags

You are the primary agent for getting work done. Be proactive, thorough, and reliable.`;

    return executorPrompt;
  }

  /**
   * Main execution logic
   */
  async doExecute(context) {
    const { endpoint, apiKey, selectedModel } = context.settings;
    
    // Process messages to include attached file contents
    const processedMessages = await this.processMessages(context);
    
    // Add currently open file as context
    const messagesWithActiveFile = this.addActiveFileContext(
      processedMessages,
      context.activeFile,
      context.activeFileContent
    );
    
    // Get relevant context from indexer
    const messagesWithIndexContext = this.addIndexerContext(
      messagesWithActiveFile,
      context
    );
    
    // Initialize loop messages with system prompt
    let loopMessages = [
      { 
        role: 'system', 
        content: this.getSystemPrompt(context)
      },
      ...messagesWithIndexContext
    ];
    
    try {
      // Main agent loop
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        context.incrementIteration();
        
        // Check for abort
        if (context.isAborted()) {
          context.logger?.info('[ExecutorAgent] Execution aborted');
          break;
        }
        
        // Check max iterations
        if (context.hasReachedMaxIterations()) {
          context.logger?.warn('[ExecutorAgent] Max iterations reached');
          break;
        }
        
        context.logger?.debug(`[ExecutorAgent] Iteration ${iteration + 1}/${this.maxIterations}`);
        
        // Make API call
        const { content, thinkingContent, message } = await this.makeApiCall(
          endpoint,
          apiKey,
          selectedModel,
          loopMessages,
          context,
          iteration
        );
        
        context.logger?.debug(`[ExecutorAgent] Response: content="${content?.slice(0, 50)}...", thinking="${thinkingContent?.slice(0, 50)}...", tool_calls=${message.tool_calls?.length || 0}`);
        
        // Add assistant message to loop
        loopMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // If no tool calls, we're done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          context.logger?.info('[ExecutorAgent] No tool calls, finishing');
          break;
        }
        
        context.logger?.info(`[ExecutorAgent] Executing ${message.tool_calls.length} tool(s)`);
        
        // Execute tools and collect results
        const toolResultMessages = await this.executeTools(
          message.tool_calls,
          context
        );
        
        // Add tool results to loop messages
        loopMessages.push(...toolResultMessages);
        
        context.logger?.debug(`[ExecutorAgent] Added ${toolResultMessages.length} tool result(s), continuing loop...`);
      }
      
      // Done
      if (context.onDone) {
        context.onDone();
      }
      
    } catch (error) {
      // Handle abort
      if (error.name === 'AbortError') {
        if (context.onDone) {
          context.onDone();
        }
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Process messages to include attached file contents
   */
  async processMessages(context) {
    return await Promise.all(context.messages
      .filter(m => m.role !== 'error')
      .map(async (msg) => {
      if (msg.role === 'user' && msg.context && msg.context.length > 0) {
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
              context.logger?.error('[ExecutorAgent] Failed to read attached file:', ctx.data, e);
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

  }

  /**
   * Add active file context to messages
   */
  addActiveFileContext(messages, activeFile, activeFileContent) {
    if (!activeFile || !activeFileContent || messages.length === 0) {
      return messages;
    }

    const firstUserMsgIndex = messages.findIndex(m => m.role === 'user');
    if (firstUserMsgIndex === -1 || !messages[firstUserMsgIndex]) {
      return messages;
    }

    const fileName = activeFile.split(/[\\/]/).pop();
    const openFileContext = `\n\n<currently_open_file path="${activeFile}">\n${activeFileContent}\n</currently_open_file>`;
    
    const updatedMessages = [...messages];
    updatedMessages[firstUserMsgIndex] = {
      ...messages[firstUserMsgIndex],
      content: (messages[firstUserMsgIndex].content || '') + openFileContext
    };

    return updatedMessages;
  }

  /**
   * Add indexer context to messages
   */
  addIndexerContext(messages, context) {
    if (messages.length === 0) return messages;

    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const relevantContext = indexer.getRelevantContext(lastUserMsg);
    
    if (!relevantContext) return messages;

    const lastUserMsgIndex = messages.length - 1;
    if (!messages[lastUserMsgIndex] || messages[lastUserMsgIndex].role !== 'user') {
      return messages;
    }

    const updatedMessages = [...messages];
    updatedMessages[lastUserMsgIndex] = {
      ...messages[lastUserMsgIndex],
      content: relevantContext + '\n\n' + (messages[lastUserMsgIndex].content || '')
    };

    return updatedMessages;
  }

  /**
   * Make API call with streaming
   */
  async makeApiCall(endpoint, apiKey, selectedModel, loopMessages, context, iteration) {
    return await makeAgentApiCall(context, loopMessages, TOOLS, iteration);
  }

  /**
   * Execute tools and collect results
   */
  async executeTools(toolCalls, context) {
    const toolResultMessages = [];
    
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let args;
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        args = {};
      }
      
      // Check if agent can use this tool
      if (!this.canUseTool(toolName)) {
        context.logger?.warn(`[ExecutorAgent] Tool not allowed: ${toolName}`);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: `Error: Tool '${toolName}' is not allowed for this agent`
        });
        continue;
      }
      
      // Notify UI of tool call
      if (context.onToolCall) {
        context.onToolCall({
          id: toolCall.id,
          name: toolName,
          args: args
        });
      }
      
      // Execute tool with retry logic
      let result;
      try {
        const startTime = Date.now();
        result = await executeTool(toolName, args, context.workspacePath, context);
        const duration = Date.now() - startTime;
        
        context.metrics?.recordToolExecution(toolName, duration, true);
        
      } catch (error) {
        context.logger?.error(`[ExecutorAgent] Tool execution failed: ${toolName}`, error);
        result = `Error executing tool: ${error.message}`;
        context.metrics?.recordToolExecution(toolName, 0, false);
      }
      
      // Notify UI of tool result
      if (context.onToolResult) {
        context.onToolResult({
          id: toolCall.id,
          name: toolName,
          result: result
        });
      }
      
      // Add tool result message
      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolName,
        content: typeof result === 'string' ? result : JSON.stringify(result)
      });
    }
    
    return toolResultMessages;
  }
}
