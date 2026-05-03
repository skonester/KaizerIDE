const TOOL_UNSUPPORTED_PATTERN = /does not support tools|tools.*not supported|tool.*not supported/i;

function getModelId(settings) {
  return settings?.selectedModel?.id || settings?.model || 'unknown';
}

function toolSpecsForPrompt(tools = []) {
  return tools.map((tool) => {
    const fn = tool.function || {};
    return {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters
    };
  });
}

export class OllamaAgentServer {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.memoryToolSupport = new Map();
  }

  isOllama(settings) {
    const provider = settings?.provider;
    const endpoint = settings?.endpoint || '';
    return provider === 'ollama' || endpoint.includes('localhost:11434') || endpoint.includes('127.0.0.1:11434');
  }

  supportsTextToolFallback(settings, tools) {
    return this.isOllama(settings) && Array.isArray(tools) && tools.length > 0;
  }

  shouldUseNativeTools(settings, tools) {
    if (!this.supportsTextToolFallback(settings, tools)) return Array.isArray(tools) && tools.length > 0;
    return this.getToolSupport(settings) !== 'text';
  }

  isToolsUnsupportedError(status, errorText) {
    return status === 400 && TOOL_UNSUPPORTED_PATTERN.test(errorText || '');
  }

  markTextToolFallback(settings) {
    const modelId = getModelId(settings);
    this.memoryToolSupport.set(modelId, 'text');
    try {
      const raw = this.storage?.getItem('kaizer-ollama-tool-support') || '{}';
      const support = JSON.parse(raw);
      support[modelId] = 'text';
      this.storage?.setItem('kaizer-ollama-tool-support', JSON.stringify(support));
    } catch {
      // Storage is best-effort. The in-memory map still protects this turn.
    }
  }

  getToolSupport(settings) {
    const modelId = getModelId(settings);
    if (this.memoryToolSupport.has(modelId)) {
      return this.memoryToolSupport.get(modelId);
    }

    try {
      const raw = this.storage?.getItem('kaizer-ollama-tool-support') || '{}';
      return JSON.parse(raw)[modelId] || 'native';
    } catch {
      return 'native';
    }
  }

  buildTextToolInstructions(tools) {
    return [
      '',
      'OLLAMA TEXT TOOL MODE:',
      'This local Ollama model may not support native tool calling. You still have IDE tools through a JSON text protocol.',
      'When you need to view, inspect, create, edit, patch, delete, rename, search, or run a command, respond with exactly one JSON object and no markdown, no prose, no code fence.',
      'Use this exact shape:',
      '{"name":"tool_name","arguments":{"key":"value"}}',
      'After KaizerIDE returns the tool result, continue normally or request the next tool using the same JSON-only shape.',
      'Use write_file or patch_file to edit files. The IDE will update any open Monaco tab with the result.',
      'Available tools:',
      JSON.stringify(toolSpecsForPrompt(tools))
    ].join('\n');
  }

  prepareMessages(messages, tools, useTextToolFallback) {
    if (!useTextToolFallback) {
      return messages.filter(m => ['user', 'assistant', 'system', 'tool', 'function'].includes(m.role));
    }

    const toolInstructions = this.buildTextToolInstructions(tools);
    const prepared = [];
    let injected = false;

    for (const message of messages) {
      if (message.role === 'system') {
        prepared.push({
          role: 'system',
          content: `${message.content || ''}\n${toolInstructions}`
        });
        injected = true;
        continue;
      }

      if (message.role === 'tool' || message.role === 'function') {
        prepared.push({
          role: 'user',
          content: `Tool result for ${message.name || message.tool_call_id || 'previous tool'}:\n${message.content || ''}`
        });
        continue;
      }

      if (message.role === 'assistant') {
        prepared.push({ role: 'assistant', content: message.content || '' });
        continue;
      }

      if (message.role === 'user') {
        prepared.push(message);
      }
    }

    if (!injected) {
      prepared.unshift({ role: 'system', content: toolInstructions });
    }

    return prepared;
  }
}

export const ollamaAgentServer = new OllamaAgentServer();
