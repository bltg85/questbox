import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from '@/types';
import { logUsage, logImageUsage } from './usage';
import { logError } from './errors';

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

  const defaultModel = modelTier === 'economy' ? 'gpt-5.4-nano' : 'gpt-5.4';
  const model = process.env.OPENAI_MODEL || defaultModel;

  let response;
  try {
    response = await openai.chat.completions.create({
      model,
      max_completion_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
  } catch (err: any) {
    logError({ errorType: 'text_generation_failure', errorMessage: err?.message ?? String(err), context, model, provider: 'openai' });
    throw err;
  }

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

  const defaultModel = modelTier === 'economy' ? 'claude-haiku-4-5-20251001' : 'claude-opus-4-6';
  const model = process.env.ANTHROPIC_MODEL || defaultModel;

  let response;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err: any) {
    logError({ errorType: 'text_generation_failure', errorMessage: err?.message ?? String(err), context, model, provider: 'anthropic' });
    throw err;
  }

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

  const defaultModel = modelTier === 'economy' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview';
  const modelName = process.env.GOOGLE_AI_MODEL || defaultModel;
  const model = google.getGenerativeModel({ model: modelName });

  let response;
  try {
    response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
    });
  } catch (err: any) {
    logError({ errorType: 'text_generation_failure', errorMessage: err?.message ?? String(err), context, model: modelName, provider: 'google' });
    throw err;
  }

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

  const tryGenerate = async (modelName: string, timeoutMs = 25_000): Promise<string | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`[Image] ${modelName} aborted after ${timeoutMs}ms`);
    }, timeoutMs);

    try {
      const model = google.getGenerativeModel({ model: modelName });
      const response = await model.generateContent(
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any,
        },
        { signal: controller.signal } as any
      );

      const candidates = response.response.candidates;
      const parts = candidates?.[0]?.content?.parts ?? [];
      console.log(`[Image] ${modelName}: ${candidates?.length ?? 0} candidates, ${parts.length} parts — ${parts.map((p: any) => p.inlineData ? 'image' : p.text ? 'text' : '?').join(', ')}`);

      const imagePart = parts.find((part: any) => part.inlineData);
      return imagePart?.inlineData
        ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
        : null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const runWithFallback = async (): Promise<string | null> => {
    try {
      const result = await tryGenerate(primaryModel, 24_000);
      if (result) {
        console.log(`[Image] Success with primary model: ${primaryModel}`);
        logImageUsage({ model: primaryModel, context: 'generate-image' });
        return result;
      }
      console.warn(`[Image] ${primaryModel} returned no image, falling back to ${fallbackModel}`);
    } catch (error: any) {
      const status = error?.status ?? error?.httpStatus;
      const isRetryable = status >= 500 || status === 429 || error?.message?.includes('timed out');
      if (!isRetryable) throw error;
      console.warn(`[Image] ${primaryModel} failed (${status ?? 'timeout'}), falling back to ${fallbackModel}`);
      logError({ errorType: 'image_generation_failure', errorMessage: error?.message ?? String(error), context: 'generate-image', model: primaryModel, provider: 'google', metadata: { status, is_primary: true } });
    }

    try {
      const fallback = await tryGenerate(fallbackModel, 28_000);
      if (fallback) logImageUsage({ model: fallbackModel, context: 'generate-image' });
      return fallback;
    } catch (error: any) {
      console.error(`[Image] Fallback model ${fallbackModel} also failed:`, error?.message);
      logError({ errorType: 'image_generation_failure', errorMessage: error?.message ?? String(error), context: 'generate-image', model: fallbackModel, provider: 'google', metadata: { is_fallback: true } });
      return null;
    }
  };

  return runWithFallback();
}
