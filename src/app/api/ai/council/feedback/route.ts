import { NextRequest, NextResponse } from 'next/server';
import { stepFeedback } from '@/lib/ai/council/steps';
import type { CouncilInput, GeneratedProposal } from '@/lib/ai/council/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: { input: CouncilInput; proposals: GeneratedProposal[] } = await req.json();
    const result = await stepFeedback(body.input, body.proposals);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[api/council/feedback]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
