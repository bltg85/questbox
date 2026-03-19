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
  modelTier?: 'economy' | 'premium';
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
  modelTier = 'premium',
}: AIGenerationRequest): Promise<AIGenerationResponse> {
  switch (provider) {
    case 'openai':
      return generateWithOpenAI(systemPrompt, userPrompt, modelTier);
    case 'anthropic':
      return generateWithAnthropic(systemPrompt, userPrompt, modelTier);
    case 'google':
      return generateWithGoogle(systemPrompt, userPrompt, modelTier);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  modelTier: 'economy' | 'premium' = 'premium'
): Promise<AIGenerationResponse> {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  // Model configurable via env var, otherwise based on tier
  const defaultModel = modelTier === 'economy' ? 'gpt-5-mini' : 'gpt-5.2';
  const model = process.env.OPENAI_MODEL || defaultModel;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'openai',
    model,
  };
}

async function generateWithAnthropic(
  systemPrompt: string,
  userPrompt: string,
  modelTier: 'economy' | 'premium' = 'premium'
): Promise<AIGenerationResponse> {
  if (!anthropic) {
    throw new Error('Anthropic not configured');
  }

  // Model configurable via env var, otherwise based on tier
  const defaultModel = modelTier === 'economy' ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';
  const model = process.env.ANTHROPIC_MODEL || defaultModel;

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
  userPrompt: string,
  modelTier: 'economy' | 'premium' = 'premium'
): Promise<AIGenerationResponse> {
  if (!google) {
    throw new Error('Google AI not configured');
  }

  // Model configurable via env var, otherwise based on tier
  const defaultModel = modelTier === 'economy' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  const modelName = process.env.GOOGLE_AI_MODEL || defaultModel;
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

// Returns a base64 data URL or null if unavailable
export async function generateProductImage(prompt: string): Promise<string | null> {
  if (!google) return null;

  const primaryModel = process.env.GOOGLE_AI_IMAGE_MODEL || 'gemini-3-pro-image-preview'; // Nano Banana Pro
  const fallbackModel = 'gemini-2.5-flash-image'; // Nano Banana 2

  const tryGenerate = async (modelName: string): Promise<string | null> => {
    const model = google.getGenerativeModel({ model: modelName });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
      } as any,
    });

    const imagePart = response.response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData
    );

    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    return null;
  };

  try {
    return await tryGenerate(primaryModel);
  } catch (error: any) {
    const status = error?.status ?? error?.httpStatus;
    if (status === 503 || status === 429) {
      console.warn(`[Image] ${primaryModel} unavailable (${status}), falling back to ${fallbackModel}`);
      return await tryGenerate(fallbackModel);
    }
    throw error;
  }
}
