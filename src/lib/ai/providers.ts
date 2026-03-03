import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from '@/types';

// Initialize clients
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const google = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

export interface AIGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
}

export interface AIGenerationResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

export async function generateWithAI({
  systemPrompt,
  userPrompt,
  provider = 'openai',
}: AIGenerationRequest): Promise<AIGenerationResponse> {
  switch (provider) {
    case 'openai':
      return generateWithOpenAI(systemPrompt, userPrompt);
    case 'anthropic':
      return generateWithAnthropic(systemPrompt, userPrompt);
    case 'google':
      return generateWithGoogle(systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<AIGenerationResponse> {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  // Model configurable via env var, defaults to gpt-4.1
  const model = process.env.OPENAI_MODEL || 'gpt-4.1';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'openai',
    model,
  };
}

async function generateWithAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<AIGenerationResponse> {
  if (!anthropic) {
    throw new Error('Anthropic not configured');
  }

  // Model configurable via env var
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  return {
    content: textContent?.type === 'text' ? textContent.text : '',
    provider: 'anthropic',
    model,
  };
}

async function generateWithGoogle(
  systemPrompt: string,
  userPrompt: string
): Promise<AIGenerationResponse> {
  if (!google) {
    throw new Error('Google AI not configured');
  }

  // Model configurable via env var
  const modelName = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
  const model = google.getGenerativeModel({ model: modelName });

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ],
  });

  return {
    content: response.response.text(),
    provider: 'google',
    model: modelName,
  };
}

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (openai) providers.push('openai');
  if (anthropic) providers.push('anthropic');
  if (google) providers.push('google');
  return providers;
}
