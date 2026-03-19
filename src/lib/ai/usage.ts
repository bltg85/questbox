import { createClient } from '@supabase/supabase-js';

// Direct service client — no cookies/request context needed
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Pricing in USD per 1M tokens (estimates for 2026 models — update as actual pricing changes)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.2':           { input: 15.00, output: 60.00 },
  'gpt-5-mini':        { input: 0.15,  output: 0.60  },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':  { input: 0.25,  output: 1.25  },
  'gemini-2.5-pro':    { input: 1.25,  output: 5.00  },
  'gemini-2.5-flash':  { input: 0.075, output: 0.30  },
};

// Image generation pricing per image (flat rate estimates)
const IMAGE_MODEL_PRICING: Record<string, number> = {
  'gemini-3-pro-image-preview': 0.04,
  'gemini-2.5-flash-image':     0.02,
};

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}

export async function logUsage(params: {
  provider: string;
  model: string;
  operation: string;
  context: string;
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  const totalTokens = params.promptTokens + params.completionTokens;
  const estimatedCostUsd = calculateCost(params.model, params.promptTokens, params.completionTokens);

  try {
    const supabase = getServiceClient();
    await supabase.from('ai_usage').insert({
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      context: params.context,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCostUsd,
    });
  } catch (error) {
    // Non-fatal — don't let logging failures break the main flow
    console.error('[Usage] Failed to log usage:', error);
  }
}

export async function logImageUsage(params: {
  model: string;
  context: string;
}): Promise<void> {
  const estimatedCostUsd = IMAGE_MODEL_PRICING[params.model] || 0;

  try {
    const supabase = getServiceClient();
    await supabase.from('ai_usage').insert({
      provider: 'google',
      model: params.model,
      operation: 'image',
      context: params.context,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: estimatedCostUsd,
    });
  } catch (error) {
    console.error('[Usage] Failed to log image usage:', error);
  }
}
