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
