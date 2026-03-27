import { NextRequest, NextResponse } from 'next/server';
import { stepVote, stepTranslate } from '@/lib/ai/council/steps';
import type { CouncilInput, IteratedProposal } from '@/lib/ai/council/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: {
      input: CouncilInput;
      iteratedProposals: IteratedProposal[];
      agentNames: Record<string, string>;
      councilRunId: string;
    } = await req.json();

    const result = await stepVote(body.input, body.iteratedProposals, body.agentNames, body.councilRunId);

    // Optional bilingual translation of winner
    let translatedContent: any = undefined;
    if (body.input.bilingualMode) {
      try {
        translatedContent = await stepTranslate(body.input, result.winner.content);
      } catch (err) {
        console.error('[api/council/vote] Translation failed:', err);
      }
    }

    return NextResponse.json({ success: true, data: { ...result, translatedContent } });
  } catch (err) {
    console.error('[api/council/vote]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
