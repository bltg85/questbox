import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function logError(params: {
  errorType: string;
  errorMessage: string;
  context?: string;
  model?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('system_errors').insert({
      error_type: params.errorType,
      error_message: params.errorMessage,
      context: params.context ?? null,
      model: params.model ?? null,
      provider: params.provider ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error('[ErrorLog] Failed to persist error:', err);
  }
}
