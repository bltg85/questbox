import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runCouncil } from '@/lib/ai/council';
import type { CouncilInput } from '@/lib/ai/council';

const CouncilRequestSchema = z.object({
  type: z.enum(['treasure_hunt', 'quiz', 'diploma', 'party_game', 'escape_game']),
  theme: z.string().min(1),
  ageGroup: z.enum(['toddler', 'child', 'teen', 'adult', 'all']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.enum(['en', 'sv']),
  modelTier: z.enum(['economy', 'premium']).optional(),
  additionalInstructions: z.string().optional(),
  numberOfClues: z.number().optional(),
  numberOfQuestions: z.number().optional(),
  location: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = CouncilRequestSchema.parse(body) as CouncilInput;

    console.log('[Council API] Starting council with input:', input);

    const result = await runCouncil(input, (stage, progress, message) => {
      console.log(`[Council API] ${stage} - ${progress}% - ${message}`);
    });

    return NextResponse.json({
      success: true,
      data: {
        winner: {
          provider: result.winner.provider,
          content: result.winner.content,
          version: result.winner.version,
          changesApplied: result.winner.changesApplied,
        },
        runnerUp: result.runnerUp ? {
          provider: result.runnerUp.provider,
          content: result.runnerUp.content,
          version: result.runnerUp.version,
        } : null,
        allProposals: result.allProposals.map(p => ({
          provider: p.provider,
          content: p.content,
          version: p.version,
        })),
        votes: result.votes,
        summary: result.summary,
        totalTimeMs: result.totalTimeMs,
      },
    });
  } catch (error) {
    console.error('[Council API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Council failed'
      },
      { status: 500 }
    );
  }
}
