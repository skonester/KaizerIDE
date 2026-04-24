import { AgentBase } from '../core/AgentBase';
import { buildSystemPrompt } from '../systemPrompt';
import { TOOLS } from '../tools';
import { executeTool } from '../toolExecutor';
import { consumeStream } from '../streamProcessor';
import { indexer } from '../../indexer';

/**
 * PlannerAgent - Planning agent for creating structured plans
 * Read-only mode, focuses on analysis and planning
 */
export class PlannerAgent extends AgentBase {
  constructor(config = {}) {
    super('planner', config);
    this.maxIterations = config.maxIterations || 5; // Fewer iterations for planning
  }

  /**
   * Get agent capabilities - read-only
   */
  getCapabilities() {
    return {
      canRead: true,
      canWrite: false,
      canExecute: false,
      allowedTools: [
        'read_file',
        'list_directory',
        'search_files',
        'search_index',
        'grep_index'
      ]
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

    const plannerPrompt = `

${basePrompt}

PLANNER MODE - SPECIAL INSTRUCTIONS:
You are in PLANNER mode. Your role is to analyze the request and create a detailed, structured plan before any implementation.

CAPABILITIES:
- You can READ files and explore the codebase
- You can SEARCH and analyze code structure
- You CANNOT write files or execute commands
- You CANNOT make changes to the codebase

YOUR TASK:
1. Understand the user's request thoroughly
2. Explore the relevant parts of the codebase
3. Create a detailed, step-by-step plan
4. Present the plan to the user for approval

PLAN FORMAT:
Use this structured format for your plan:

## Plan: [Brief Title]

### Overview
[High-level description of what needs to be done]

### Analysis
[Your analysis of the current codebase and requirements]

### Implementation Steps
1. **[Step Title]** (*dependencies: step X, Y*)
   - [Detailed description]
   - Files to modify: \`file1.js\`, \`file2.js\`
   - Estimated complexity: Low/Medium/High

2. **[Step Title]**
   - [Detailed description]
   - Files to create: \`newfile.js\`
   - Estimated complexity: Low/Medium/High

[Continue with all steps...]

### Verification Steps
1. [How to verify step 1]
2. [How to verify step 2]
[...]

### Risks & Considerations
- [Potential issue 1]
- [Potential issue 2]

### Alternative Approaches
- [Alternative 1]: [Brief description]
- [Alternative 2]: [Brief description]

IMPORTANT:
- Be thorough and specific
- Identify dependencies between steps
- Consider edge cases and potential issues
- Provide verification steps
- Do NOT execute the plan - just create it
- Present the plan and ask for user approval before any implementation`;

    return plannerPrompt;
  }

  /**
   * Main execution logic
   */
  async doExecute(context) {
    const { endpoint, apiKey, selectedModel } = context.settings;
    
    // Create plan file in AppData temp folder
    const planFilePath = await this.createPlanFile(context.workspacePath);
    let accumulatedPlan = '';
    
    // Store planFilePath in context for access in makeApiCall
    context.planFilePath = planFilePath;
    context.accumulatedPlan = { value: '' }; // Use object to pass by reference
    context.lastUpdateTime = 0; // Track last update time for throttling
    
    // Send a message to chat that plan is being created in file
    if (context.onToken) {
      const fileName = planFilePath.split(/[\\/]/).pop();
      context.onToken(`📋 **Creating plan in file:** \`${fileName}\`\n\n`);
      context.onToken(`The plan will open in a preview tab and update in real-time as I generate it.\n\n`);
      context.onToken(`> ⏳ Analyzing and generating plan...\n\n`);
    }
    
    // Process messages
    const processedMessages = await this.processMessages(context);
    
    // Add context
    const messagesWithContext = this.addContext(processedMessages, context);
    
    // Initialize loop messages
    let loopMessages = [
      { 
        role: 'system', 
        content: this.getSystemPrompt(context)
      },
      ...messagesWithContext
    ];
    
    try {
      // Planning loop (fewer iterations)
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        context.incrementIteration();
        
        if (context.isAborted()) {
          context.logger?.info('[PlannerAgent] Execution aborted');
          break;
        }
        
        context.logger?.debug(`[PlannerAgent] Iteration ${iteration + 1}/${this.maxIterations}`);
        
        // Make API call
        const { content, thinkingContent, message } = await this.makeApiCall(
          endpoint,
          apiKey,
          selectedModel,
          loopMessages,
          context,
          iteration
        );
        
        // Add assistant message
        loopMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        });
        
        // If no tool calls, we're done
        if (!message.tool_calls || message.tool_calls.length === 0) {
          context.logger?.info('[PlannerAgent] Plan complete');
          break;
        }
        
        // Execute read-only tools
        const toolResultMessages = await this.executeTools(
          message.tool_calls,
          context
        );
        
        loopMessages.push(...toolResultMessages);
      }
      
      // Final update - write the complete plan one last time and refresh preview
      if (context.planFilePath && context.accumulatedPlan.value && window.electron?.writeFile) {
        await window.electron.writeFile(context.planFilePath, context.accumulatedPlan.value);
        
        // Read the file back to ensure we have the latest content
        const finalContent = await window.electron.readFile(context.planFilePath);
        const contentToShow = finalContent.success ? finalContent.content : context.accumulatedPlan.value;
        
        // Dispatch final event to update preview tab with complete content
        window.dispatchEvent(new CustomEvent('kaizer:file-written', {
          detail: {
            path: context.planFilePath,
            type: 'modified',
            content: contentToShow,
            originalContent: contentToShow
          }
        }));
        
        // Force a refresh of the preview tab
        window.dispatchEvent(new CustomEvent('kaizer:refresh-preview', {
          detail: { path: `${context.planFilePath}:preview` }
        }));
      }
      
      if (context.onDone) {
        context.onDone();
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        if (context.onDone) context.onDone();
        return;
      }
      throw error;
    }
  }

  /**
   * Create a plan file in .kaizer/plans folder
   */
  async createPlanFile(workspacePath) {
    if (!workspacePath) {
      throw new Error('No workspace path provided');
    }
    
    const isWindows = navigator.platform.toLowerCase().includes('win');
    const separator = isWindows ? '\\' : '/';
    const kaizerDir = `${workspacePath}${separator}.kaizer`;
    const plansDir = `${kaizerDir}${separator}plans`;
    
    // Ensure .kaizer/plans directory exists
    if (window.electron?.runCommand) {
      const mkdirCmd = isWindows 
        ? `if not exist "${plansDir}" mkdir "${plansDir}"` 
        : `mkdir -p "${plansDir}"`;
      await window.electron.runCommand(mkdirCmd, workspacePath);
    }
    
    // Create plan file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const workspaceName = workspacePath.split(/[\\/]/).pop();
    const planFileName = `plan-${workspaceName}-${timestamp}.md`;
    const planFilePath = `${plansDir}${separator}${planFileName}`;
    
    // Create initial plan file
    const initialContent = `# Plan: [In Progress...]

*Generated: ${new Date().toLocaleString()}*
*Workspace: ${workspacePath}*

---

## Overview
Analyzing your request and creating a detailed plan...

`;
    
    if (window.electron?.writeFile) {
      await window.electron.writeFile(planFilePath, initialContent);
    }
    
    // Open the plan file in preview only
    window.dispatchEvent(new CustomEvent('kaizer:open-file', {
      detail: { path: planFilePath, showPreview: true }
    }));
    
    return planFilePath;
  }

  /**
   * Process messages
   */
  async processMessages(context) {
    return await Promise.all(context.messages.map(async (msg) => {
      if (msg.role === 'user' && msg.context && msg.context.length > 0) {
        let contextContent = '';
        
        for (const ctx of msg.context) {
          if (ctx.type === 'file' && ctx.data) {
            try {
              const result = await window.electron.readFile(ctx.data);
              if (result && result.success && result.content !== null) {
                contextContent += `\n\n<attached_file path="${ctx.data}">\n${result.content}\n</attached_file>`;
              }
            } catch (e) {
              context.logger?.error('[PlannerAgent] Failed to read attached file:', ctx.data, e);
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
   * Add context to messages
   */
  addContext(messages, context) {
    if (messages.length === 0) return messages;

    // Add active file context
    if (context.activeFile && context.activeFileContent) {
      const firstUserMsgIndex = messages.findIndex(m => m.role === 'user');
      if (firstUserMsgIndex !== -1) {
        const fileName = context.activeFile.split(/[\\/]/).pop();
        const openFileContext = `\n\n<currently_open_file path="${context.activeFile}">\n${context.activeFileContent}\n</currently_open_file>`;
        
        messages[firstUserMsgIndex] = {
          ...messages[firstUserMsgIndex],
          content: (messages[firstUserMsgIndex].content || '') + openFileContext
        };
      }
    }

    // Add indexer context
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const relevantContext = indexer.getRelevantContext(lastUserMsg);
    
    if (relevantContext) {
      const lastUserMsgIndex = messages.length - 1;
      if (messages[lastUserMsgIndex]?.role === 'user') {
        messages[lastUserMsgIndex] = {
          ...messages[lastUserMsgIndex],
          content: relevantContext + '\n\n' + (messages[lastUserMsgIndex].content || '')
        };
      }
    }

    return messages;
  }

  /**
   * Make API call
   */
  async makeApiCall(endpoint, apiKey, selectedModel, loopMessages, context, iteration) {
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-beta': 'interleaved-thinking-2025-05-14'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Filter tools to only read-only ones
    const allowedTools = TOOLS.filter(tool => 
      this.canUseTool(tool.function.name)
    );
    
    const body = {
      model: selectedModel.id,
      messages: loopMessages,
      tools: allowedTools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: selectedModel.maxOutputTokens
    };
    
    if (selectedModel.thinking) {
      body.thinking = { type: 'enabled', budget_tokens: 8000 };
    }
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: context.abortSignal
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    
    return await consumeStream(
      response, 
      async (token) => {
        context.accumulatedPlan.value += token;
        
        // Update plan file in real-time with throttling (every 500ms)
        const now = Date.now();
        if (context.planFilePath && window.electron?.writeFile && (now - context.lastUpdateTime > 500)) {
          context.lastUpdateTime = now;
          
          await window.electron.writeFile(context.planFilePath, context.accumulatedPlan.value);
          
          // Dispatch event to update preview tab in real-time
          window.dispatchEvent(new CustomEvent('kaizer:file-written', {
            detail: {
              path: context.planFilePath,
              type: 'modified',
              content: context.accumulatedPlan.value,
              originalContent: context.accumulatedPlan.value
            }
          }));
        }
        
        // Don't send tokens to chat - plan is only in the file
        // if (context.onToken) context.onToken(token);
      }, 
      context.onThinkingToken, 
      iteration > 0
    );
  }

  /**
   * Execute tools (read-only)
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
      
      // Check if tool is allowed
      if (!this.canUseTool(toolName)) {
        context.logger?.warn(`[PlannerAgent] Tool not allowed: ${toolName}`);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Tool '${toolName}' is not allowed in Planner mode. Only read-only tools are available.`
        });
        continue;
      }
      
      if (context.onToolCall) {
        context.onToolCall({
          id: toolCall.id,
          name: toolName,
          args: args
        });
      }
      
      let result;
      try {
        const startTime = Date.now();
        result = await executeTool(toolName, args, context.workspacePath);
        const duration = Date.now() - startTime;
        context.metrics?.recordToolExecution(toolName, duration, true);
      } catch (error) {
        context.logger?.error(`[PlannerAgent] Tool execution failed: ${toolName}`, error);
        result = `Error executing tool: ${error.message}`;
        context.metrics?.recordToolExecution(toolName, 0, false);
      }
      
      if (context.onToolResult) {
        context.onToolResult({
          id: toolCall.id,
          name: toolName,
          result: result
        });
      }
      
      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: typeof result === 'string' ? result : JSON.stringify(result)
      });
    }
    
    return toolResultMessages;
  }
}
