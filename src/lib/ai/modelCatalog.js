export const OLLAMA_ENDPOINT = 'http://localhost:11434/v1';

export const DEFAULT_MODEL_CATALOG_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

export const DEFAULT_MODELS = [
  { id: 'qwen2.5-coder:1.5b', name: 'Qwen 2.5 Coder 1.5B (Ollama)', provider: 'ollama', endpoint: OLLAMA_ENDPOINT, maxOutputTokens: 16000 },
  { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B (Ollama)', provider: 'ollama', endpoint: OLLAMA_ENDPOINT, maxOutputTokens: 16000 },
  { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder 32B (Ollama)', provider: 'ollama', endpoint: OLLAMA_ENDPOINT, maxOutputTokens: 16000 },
  { id: 'deepseek-coder-v2:latest', name: 'DeepSeek Coder V2 (Ollama)', provider: 'ollama', endpoint: OLLAMA_ENDPOINT, maxOutputTokens: 16000 },
  { id: 'codellama:latest', name: 'Code Llama (Ollama)', provider: 'ollama', endpoint: OLLAMA_ENDPOINT, maxOutputTokens: 16000 },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B (Ollama)', provider: 'ollama', endpoint: OLLAMA_ENDPOINT, maxOutputTokens: 16000 },

  { id: 'openrouter/auto', name: 'OpenRouter Auto', provider: 'openrouter', endpoint: 'https://openrouter.ai/api/v1', maxOutputTokens: 16000 },
  { id: 'anthropic/claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1', maxOutputTokens: 16000 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai-compatible', endpoint: 'https://api.openai.com/v1', maxOutputTokens: 16000 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai-compatible', endpoint: 'https://api.openai.com/v1', maxOutputTokens: 16000 },
  { id: 'gemini/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google-gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', maxOutputTokens: 16000 },
  { id: 'gemini/gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google-gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', maxOutputTokens: 16000 },
];

export function mergeModels(...modelLists) {
  const byId = new Map();
  for (const list of modelLists) {
    for (const model of list || []) {
      if (!model?.id) continue;
      byId.set(model.id, { ...byId.get(model.id), ...model });
    }
  }
  return Array.from(byId.values());
}

export function getModelProvider(model) {
  if (model?.provider) return model.provider;
  const id = model?.id || '';
  if (id.includes(':') && !id.includes('/')) return 'ollama';
  if (id.startsWith('gemini/')) return 'google-gemini';
  if (id.startsWith('anthropic/')) return 'anthropic';
  if (id.startsWith('openrouter/')) return 'openrouter';
  return 'openai-compatible';
}

export function getModelEndpoint(model, fallbackEndpoint = OLLAMA_ENDPOINT) {
  if (model?.endpoint) return model.endpoint;
  const provider = getModelProvider(model);
  if (provider === 'ollama') return OLLAMA_ENDPOINT;
  if (provider === 'google-gemini') return 'https://generativelanguage.googleapis.com/v1beta';
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  return fallbackEndpoint;
}

export function modelsFromOllamaTags(tags) {
  return (tags || []).map((tag) => ({
    id: tag.name,
    name: `${tag.name} (Ollama)`,
    provider: 'ollama',
    endpoint: OLLAMA_ENDPOINT,
    maxOutputTokens: 16000,
  }));
}

function modelFromLiteLlmEntry(id, metadata) {
  const mode = metadata?.mode || '';
  if (mode && mode !== 'chat' && mode !== 'completion') return null;

  const provider = metadata?.litellm_provider || metadata?.provider || '';
  let mappedProvider = 'openai-compatible';
  let endpoint;

  if (provider === 'anthropic') {
    mappedProvider = 'anthropic';
    endpoint = 'https://api.anthropic.com/v1';
  } else if (provider === 'gemini' || provider === 'vertex_ai') {
    mappedProvider = 'google-gemini';
    endpoint = 'https://generativelanguage.googleapis.com/v1beta';
  } else if (provider === 'openrouter') {
    mappedProvider = 'openrouter';
    endpoint = 'https://openrouter.ai/api/v1';
  } else if (provider === 'ollama') {
    mappedProvider = 'ollama';
    endpoint = OLLAMA_ENDPOINT;
  }

  return {
    id,
    name: metadata?.display_name || id,
    provider: mappedProvider,
    endpoint,
    maxOutputTokens: metadata?.max_output_tokens || metadata?.max_tokens || 16000,
    contextWindow: metadata?.max_input_tokens || metadata?.max_context_tokens,
  };
}

function normalizeCatalogModels(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.models)) return data.models;

  const entries = Object.entries(data || {});
  if (entries.length === 0) return [];

  const models = entries
    .map(([id, metadata]) => modelFromLiteLlmEntry(id, metadata))
    .filter(Boolean);

  if (models.length > 0) return models;
  throw new Error('Catalog JSON must be an array, an object with a models array, or a LiteLLM model metadata object');
}

export async function fetchOllamaModels() {
  const response = await fetch('http://localhost:11434/api/tags');
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }
  const data = await response.json();
  return modelsFromOllamaTags(data.models);
}

export async function fetchRemoteModelCatalog(catalogUrl) {
  if (!catalogUrl) {
    throw new Error('No catalog URL configured');
  }
  const response = await fetch(catalogUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Catalog returned ${response.status}`);
  }
  const data = await response.json();
  return normalizeCatalogModels(data);
}
