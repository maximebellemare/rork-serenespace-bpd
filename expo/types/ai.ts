export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  saved: boolean;
  preview: string;
}

export interface AIServiceResponse {
  content: string;
  timestamp: number;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export interface AIServiceConfig {
  provider: 'mock' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
