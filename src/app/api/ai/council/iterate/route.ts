import { NextRequest, NextResponse } from 'next/server';
import { stepIterate } from '@/lib/ai/council/steps';
import type { CouncilInput, FeedbackItem, GeneratedProposal } from '@/lib/ai/council/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: { input: CouncilInput; proposals: GeneratedProposal[]; feedback: FeedbackItem[] } = await req.json();
    const result = await stepIterate(body.input, body.proposals, body.feedback);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[api/council/iterate]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
