import { NextRequest, NextResponse } from 'next/server';
import { getAgentsByTier } from '@/lib/ai/council/agents';

export async function GET(req: NextRequest) {
  const tier = (req.nextUrl.searchParams.get('tier') ?? 'economy') as 'economy' | 'premium';
  try {
    const agents = await getAgentsByTier(tier);
    return NextResponse.json({ success: true, data: agents });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
