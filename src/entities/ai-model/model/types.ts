export interface AIModel {
  id: string;
  name: string;
  description?: string;
}

export const MODELS: AIModel[] = [
  { id: 'gemini-3-pro-high', name: 'Gemini 3 Pro (High)' },
  { id: 'gemini-3-pro-low', name: 'Gemini 3 Pro (Low)' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
  { id: 'claude-sonnet-4-6-thinking', name: 'Claude sonnet 4.6 (thinking)' },
  { id: 'claude-opus-4-6-thinking', name: 'Claude opus 4.6 (thinking)' },
  { id: 'gpt-oss-120b-medium', name: 'GPT-OSS 120B (Medium)' },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

// Chat-level AI provider, persisted on the chat via PUT /v1/ai-chat/:chat-id
// and read by the backend's ChatProcessor on every message. This is a separate
// concept from MODELS above (per-message generation model ids).
export type ChatProvider = 'auto' | 'claude' | 'gemini' | 'openai';

export interface ChatProviderOption {
  id: ChatProvider;
  name: string;
}

export const CHAT_PROVIDERS: ChatProviderOption[] = [
  { id: 'auto', name: 'Auto' },
  { id: 'claude', name: 'Claude' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'gemini', name: 'Gemini' },
];

// "Auto" is first, so it's the default provider in both the dashboard input and
// the workspace chat selector (lets the backend pick the model).
export const DEFAULT_CHAT_PROVIDER: ChatProvider = 'auto';

// An empty/unrecognized stored model (e.g. a legacy chat, or a provider added
// later) falls back to the default ("Auto") so the selector always resolves to a
// valid option.
export const normalizeChatProvider = (model?: string | null): ChatProvider =>
  CHAT_PROVIDERS.some((p) => p.id === model)
    ? (model as ChatProvider)
    : DEFAULT_CHAT_PROVIDER;
