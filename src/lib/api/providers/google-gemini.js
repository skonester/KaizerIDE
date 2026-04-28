/**
 * Google Gemini API provider
 */
export async function streamChat({ messages, settings, onToken, onDone, signal }) {
  const { endpoint, apiKey, selectedModel } = settings;
  const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1beta';
  
  const systemPrompt = "You are KaizerIDE's AI coding assistant — an intelligent agent running inside a VS Code-style IDE built on Electron. CLIENT: KaizerIDE v0.1.0. Be direct and concise. Format code in fenced blocks. Match existing code style. Make surgical edits.";

  // Gemini uses a different message format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add system instruction if supported by the model/endpoint
  const body = {
    contents: contents,
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      maxOutputTokens: selectedModel.maxOutputTokens || 16000,
      temperature: 0.7
    }
  };

  const url = `${baseUrl}/models/${selectedModel.id}:streamGenerateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Gemini returns chunks of JSON objects in an array-like format for streaming
      // This is a simplified parser for Gemini's stream format
      try {
        // Look for completed JSON objects in the stream
        // Gemini's stream usually looks like: [ {...}, {...} ] or individual lines
        let startIdx = 0;
        while ((startIdx = buffer.indexOf('{', startIdx)) !== -1) {
          let bracketCount = 0;
          let endIdx = -1;
          
          for (let i = startIdx; i < buffer.length; i++) {
            if (buffer[i] === '{') bracketCount++;
            else if (buffer[i] === '}') bracketCount--;
            
            if (bracketCount === 0) {
              endIdx = i + 1;
              break;
            }
          }
          
          if (endIdx !== -1) {
            const jsonStr = buffer.slice(startIdx, endIdx);
            try {
              const chunk = JSON.parse(jsonStr);
              const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullContent += text;
                onToken(text);
              }
            } catch (e) {
              // Not a full JSON yet or invalid
            }
            buffer = buffer.slice(endIdx);
            startIdx = 0;
          } else {
            break;
          }
        }
      } catch (e) {
        console.warn('Failed to parse Gemini chunk:', e);
      }
    }

    onDone(fullContent);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request cancelled');
    }
    
    // Catch generic fetch failures
    if (error.message === 'Failed to fetch') {
      const baseUrl = endpoint || 'https://generativelanguage.googleapis.com/v1beta';
      throw new Error(`Failed to connect to Google Gemini at ${baseUrl}. Please check your internet connection and ensure the endpoint URL is correct.`);
    }
    
    throw error;
  }
}
