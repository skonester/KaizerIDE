import { consumeStream } from './streamProcessor';

/**
 * Shared API client for agents
 * Handles different providers and provides consistent error handling
 */
export async function makeAgentApiCall(context, messages, tools = null, iteration = 0) {
  const { provider, endpoint, apiKey, selectedModel } = context.settings;
  const signal = context.abortSignal;

  try {
    // Determine which provider logic to use
    if (provider === 'google-gemini') {
      return await makeGeminiCall(context, messages, tools, iteration);
    } else if (provider === 'anthropic') {
      return await makeAnthropicCall(context, messages, tools, iteration);
    } else if (provider === 'openai' || provider === 'deepseek' || provider === 'qwen' || provider === 'opencode' || provider === 'mistral-vibe' || provider === 'openrouter' || provider === 'letta') {
      // These all use OpenAI-compatible format
      return await makeOpenAiCall(context, messages, tools, iteration);
    } else {
      // Default to OpenAI compatible
      return await makeOpenAiCall(context, messages, tools, iteration);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    
    // Catch generic fetch failures
    if (error.message === 'Failed to fetch') {
      const target = endpoint || (provider === 'google-gemini' ? 'Google Gemini' : provider === 'anthropic' ? 'Anthropic' : 'AI Provider');
      const isLocal = target.includes('localhost') || target.includes('127.0.0.1');
      
      if (isLocal) {
        throw new Error(`Failed to connect to local AI service at ${target}.

Please ensure your local AI provider is running.
If you are using the scripted models (Codex, Qwen, etc.), open 'scripts/start-local-ai.ps1' and click the '⚡ Start AI Server' button to bridge the connection.`);
      }
      
      throw new Error(`Failed to connect to ${target}. Please ensure the AI provider is running, your internet is connected, and the endpoint URL is correct. (Reason: Network Error or CSP violation)`);
    }

    // Catch unauthorized/forbidden errors
    if (error.message.includes('API Error 401') || error.message.includes('API Error 403')) {
      throw new Error(`Authentication Failed (${error.message}). Please check your API Key in Settings > General. Ensure you have copied the full key and that it is active.`);
    }
    
    throw error;
  }
}

/**
 * OpenAI-compatible call
 */
async function makeOpenAiCall(context, messages, tools, iteration) {
  const { endpoint, apiKey, selectedModel } = context.settings;
  
  const headers = {
    'Content-Type': 'application/json',
    'anthropic-beta': 'interleaved-thinking-2025-05-14'
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    // Check if it's a known cloud provider that REQUIRES a key
    const isLocal = endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
    const cloudProviders = ['openai', 'deepseek', 'openrouter', 'mistral-vibe'];
    
    if (cloudProviders.includes(context.settings.provider) && !isLocal) {
      throw new Error(`API Key is missing for ${context.settings.provider}. Please go to Settings > General and enter your API key.`);
    }
  }
  
  let finalModel = selectedModel.id;
  let finalEndpoint = endpoint;
  
  const scriptedPrefixes = ['qwen/', 'opencode/', 'codex/', 'letta/', 'mistral/'];
  if (scriptedPrefixes.some(p => finalModel.startsWith(p))) {
    finalEndpoint = 'http://localhost:11434/v1'; // Ollama direct OpenAI endpoint
    finalModel = finalModel.split('/')[1];
    if (finalModel.includes('qwen') || finalModel.includes('opencode') || finalModel.includes('codex')) {
      finalModel = 'qwen2.5-coder:7b';
    }
  }

  const body = {
    model: finalModel,
    messages: messages.filter(m => ['user', 'assistant', 'system', 'tool', 'function'].includes(m.role)),
    stream: true,
    max_tokens: selectedModel.maxOutputTokens,
    // Pass num_gpu through to Ollama via OpenAI compatibility layer
    options: {
      num_gpu: 28, // Perfect for 6GB VRAM (GTX 1660 Super)
      temperature: 0.7,
      num_ctx: 8000 // Slightly smaller context for better speed on 6GB
    }
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  
  if (selectedModel.thinking) {
    body.thinking = { type: 'enabled', budget_tokens: 8000 };
  }
  
  const response = await fetch(`${finalEndpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: context.abortSignal
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  return await consumeStream(
    response, 
    context.onToken, 
    context.onThinkingToken, 
    iteration > 0
  );
}

/**
 * Native Gemini call
 * Note: Gemini native API has a different structure for tools and messages
 */
async function makeGeminiCall(context, messages, tools, iteration) {
  const { endpoint, apiKey, selectedModel } = context.settings;
  const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1beta';
  
  // Transform messages to Gemini format
  const contents = messages
    .filter(m => ['user', 'assistant', 'system'].includes(m.role))
    .map(msg => {
    let role = msg.role === 'assistant' ? 'model' : 'user';
    // System messages are handled differently in Gemini (as system_instruction)
    // but for simplicity in the loop, we can map them to 'user' or use the dedicated field
    return {
      role: role,
      parts: [{ text: msg.content }]
    };
  });


  const body = {
    contents: contents,
    generationConfig: {
      maxOutputTokens: selectedModel.maxOutputTokens,
      temperature: 0.7
    }
  };

  // Handle tools if supported
  if (tools && tools.length > 0) {
    // Gemini tool format is different, but for now we'll skip complex tool mapping 
    // and rely on OpenAI-compatible proxies if tools are needed for Gemini.
    // If the user is using native Gemini, they might only be using it for Ask mode.
    // TODO: Implement Gemini native tool calling
  }

  // Strip 'gemini/' prefix if present for the native API call
  const modelName = selectedModel.id.replace(/^gemini\//, '');
  
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

  if (!apiKey && !isLocal) {
    throw new Error('Gemini API Key is missing. Please go to Settings > General and enter your Google AI Studio API key.');
  }

  const url = `${baseUrl}/models/${modelName}:streamGenerateContent?key=${apiKey || ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: context.abortSignal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
  }

  // We need a Gemini-specific stream processor or a way to map Gemini chunks to OpenAI-like chunks
  // For now, let's implement a simple Gemini stream consumer here
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      // Gemini streams usually come in JSON chunks that might be partial
      // This is a simplified version
      try {
        // Find complete JSON objects in the buffer
        // Note: Gemini sometimes returns a list [ {}, {} ]
        let cleaned = buffer.trim();
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
          const parsed = JSON.parse(cleaned);
          for (const item of parsed) {
            const token = item.candidates?.[0]?.content?.parts?.[0]?.text;
            if (token) {
              fullContent += token;
              if (context.onToken) context.onToken(token);
            }
          }
          buffer = '';
        } else if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          const item = JSON.parse(cleaned);
          const token = item.candidates?.[0]?.content?.parts?.[0]?.text;
          if (token) {
            fullContent += token;
            if (context.onToken) context.onToken(token);
          }
          buffer = '';
        }
      } catch (e) {
        // Wait for more data
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: fullContent,
    message: {
      role: 'assistant',
      content: fullContent
    }
  };
}

/**
 * Native Anthropic call
 */
async function makeAnthropicCall(context, messages, tools, iteration) {
  const { endpoint, apiKey, selectedModel } = context.settings;
  const apiEndpoint = endpoint || 'https://api.anthropic.com/v1';
  
  // Strip 'anthropic/' or 'kr/' prefix if present
  const modelName = selectedModel.id.replace(/^(anthropic|kr)\//, '');
  
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

  if (!apiKey && !isLocal) {
    throw new Error('Anthropic API Key is missing. Please go to Settings > General and enter your Anthropic API key.');
  }
  
  // Anthropic format
  const body = {
    model: modelName,
    messages: messages.filter(m => ['user', 'assistant'].includes(m.role)),
    system: messages.find(m => m.role === 'system')?.content || '',
    stream: true,
    max_tokens: selectedModel.maxOutputTokens
  };


  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters
    }));
  }

  const response = await fetch(`${apiEndpoint}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body),
    signal: context.abortSignal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API Error ${response.status}: ${errorText}`);
  }

  // Simplified Anthropic stream consumer
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let toolCalls = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        const data = JSON.parse(line.slice(6));
        
        if (data.type === 'content_block_delta') {
          const token = data.delta?.text;
          if (token) {
            fullContent += token;
            if (context.onToken) context.onToken(token);
          }
        }
        // TODO: Handle tool calls for native Anthropic
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: fullContent,
    message: {
      role: 'assistant',
      content: fullContent
    }
  };
}
