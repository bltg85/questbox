import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from '@/types';
import { logUsage, logImageUsage } from './usage';

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
  operation?: string; // 'generate', 'feedback', 'iterate', 'vote', 'single'
  context?: string;   // 'council', 'generate', 'generate-image'
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
  operation = 'single',
  context = 'generate',
}: AIGenerationRequest): Promise<AIGenerationResponse> {
  switch (provider) {
    case 'openai':
      return generateWithOpenAI(systemPrompt, userPrompt, modelTier, operation, context);
    case 'anthropic':
      return generateWithAnthropic(systemPrompt, userPrompt, modelTier, operation, context);
    case 'google':
      return generateWithGoogle(systemPrompt, userPrompt, modelTier, operation, context);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  modelTier: 'economy' | 'premium' = 'premium',
  operation = 'single',
  context = 'generate'
): Promise<AIGenerationResponse> {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const defaultModel = modelTier === 'economy' ? 'gpt-5-mini' : 'gpt-5.2';
  const model = process.env.OPENAI_MODEL || defaultModel;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  // Log usage (fire-and-forget)
  logUsage({
    provider: 'openai',
    model,
    operation,
    context,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
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
  modelTier: 'economy' | 'premium' = 'premium',
  operation = 'single',
  context = 'generate'
): Promise<AIGenerationResponse> {
  if (!anthropic) {
    throw new Error('Anthropic not configured');
  }

  const defaultModel = modelTier === 'economy' ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';
  const model = process.env.ANTHROPIC_MODEL || defaultModel;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // Log usage (fire-and-forget)
  logUsage({
    provider: 'anthropic',
    model,
    operation,
    context,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
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
  modelTier: 'economy' | 'premium' = 'premium',
  operation = 'single',
  context = 'generate'
): Promise<AIGenerationResponse> {
  if (!google) {
    throw new Error('Google AI not configured');
  }

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

  // Log usage (fire-and-forget)
  const meta = response.response.usageMetadata;
  logUsage({
    provider: 'google',
    model: modelName,
    operation,
    context,
    promptTokens: meta?.promptTokenCount ?? 0,
    completionTokens: meta?.candidatesTokenCount ?? 0,
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

  const primaryModel = process.env.GOOGLE_AI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'; // Nano Banana 2 (fast)
  const fallbackModel = 'gemini-3-pro-image-preview'; // Nano Banana Pro (slower, fallback)

  const tryGenerate = async (modelName: string): Promise<string | null> => {
    const model = google.getGenerativeModel({ model: modelName });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
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
    const result = await tryGenerate(primaryModel);
    if (result) {
      console.log(`[Image] Success with primary model: ${primaryModel}`);
      logImageUsage({ model: primaryModel, context: 'generate-image' });
      return result;
    }
    // Primary returned null (no image part) — try fallback
    console.warn(`[Image] ${primaryModel} returned no image, falling back to ${fallbackModel}`);
    const fallback = await tryGenerate(fallbackModel);
    if (fallback) logImageUsage({ model: fallbackModel, context: 'generate-image' });
    return fallback;
  } catch (error: any) {
    const status = error?.status ?? error?.httpStatus;
    if (status === 503 || status === 429) {
      console.warn(`[Image] ${primaryModel} unavailable (${status}), falling back to ${fallbackModel}`);
      const result = await tryGenerate(fallbackModel);
      if (result) logImageUsage({ model: fallbackModel, context: 'generate-image' });
      return result;
    }
    throw error;
  }
}
