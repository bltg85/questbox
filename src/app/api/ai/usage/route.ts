import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Total cost and tokens
    const { data: totals } = await supabase
      .from('ai_usage')
      .select('estimated_cost_usd, total_tokens, provider, model, operation, context, created_at');

    if (!totals) {
      return NextResponse.json({ success: true, data: emptyStats() });
    }

    // Aggregate by provider
    const byProvider: Record<string, { cost: number; tokens: number; calls: number }> = {};
    // Aggregate by operation
    const byOperation: Record<string, { cost: number; tokens: number; calls: number }> = {};
    // Aggregate by model
    const byModel: Record<string, { cost: number; tokens: number; calls: number; provider: string }> = {};

    let totalCost = 0;
    let totalTokens = 0;

    // Cost this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    let monthCost = 0;
    let monthTokens = 0;

    for (const row of totals) {
      const cost = Number(row.estimated_cost_usd) || 0;
      const tokens = Number(row.total_tokens) || 0;

      totalCost += cost;
      totalTokens += tokens;

      if (row.created_at >= startOfMonth) {
        monthCost += cost;
        monthTokens += tokens;
      }

      // By provider
      if (!byProvider[row.provider]) byProvider[row.provider] = { cost: 0, tokens: 0, calls: 0 };
      byProvider[row.provider].cost += cost;
      byProvider[row.provider].tokens += tokens;
      byProvider[row.provider].calls += 1;

      // By operation
      if (!byOperation[row.operation]) byOperation[row.operation] = { cost: 0, tokens: 0, calls: 0 };
      byOperation[row.operation].cost += cost;
      byOperation[row.operation].tokens += tokens;
      byOperation[row.operation].calls += 1;

      // By model
      if (!byModel[row.model]) byModel[row.model] = { cost: 0, tokens: 0, calls: 0, provider: row.provider };
      byModel[row.model].cost += cost;
      byModel[row.model].tokens += tokens;
      byModel[row.model].calls += 1;
    }

    // Recent logs (last 50)
    const { data: recentLogs } = await supabase
      .from('ai_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        totalCost,
        totalTokens,
        totalCalls: totals.length,
        monthCost,
        monthTokens,
        monthCalls: totals.filter(r => r.created_at >= startOfMonth).length,
        byProvider,
        byOperation,
        byModel,
        recentLogs: recentLogs || [],
      },
    });
  } catch (error) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}

function emptyStats() {
  return {
    totalCost: 0,
    totalTokens: 0,
    totalCalls: 0,
    monthCost: 0,
    monthTokens: 0,
    monthCalls: 0,
    byProvider: {},
    byOperation: {},
    byModel: {},
    recentLogs: [],
  };
}
