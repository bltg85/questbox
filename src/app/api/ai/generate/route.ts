import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateTreasureHunt, generateQuiz, generateDiploma } from '@/lib/ai';
import type { AgeGroup, DifficultyLevel, Locale, AIProvider } from '@/types';

const GenerateRequestSchema = z.object({
  type: z.enum(['treasure_hunt', 'quiz', 'diploma']),
  params: z.record(z.string(), z.unknown()),
  provider: z.enum(['openai', 'anthropic', 'google']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, params, provider } = GenerateRequestSchema.parse(body);

    let result;
    let generatorProvider = provider;

    switch (type) {
      case 'treasure_hunt':
        generatorProvider = provider || 'anthropic';
        result = await generateTreasureHunt({
          theme: params.theme as string,
          numberOfClues: (params.numberOfClues as number) || 5,
          ageGroup: (params.ageGroup as AgeGroup) || 'child',
          difficulty: (params.difficulty as DifficultyLevel) || 'medium',
          language: (params.language as Locale) || 'en',
          location: params.location as string,
          provider: generatorProvider,
        });
        break;

      case 'quiz':
        generatorProvider = provider || 'openai';
        result = await generateQuiz({
          topic: params.topic as string,
          numberOfQuestions: (params.numberOfQuestions as number) || 10,
          ageGroup: (params.ageGroup as AgeGroup) || 'child',
          difficulty: (params.difficulty as DifficultyLevel) || 'medium',
          language: (params.language as Locale) || 'en',
          provider: generatorProvider,
        });
        break;

      case 'diploma':
        generatorProvider = provider || 'google';
        result = await generateDiploma({
          achievementType: params.achievementType as string,
          recipientName: params.recipientName as string | undefined,
          customMessage: params.customMessage as string | undefined,
          language: (params.language as Locale) || 'en',
          provider: generatorProvider,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        type,
        provider: generatorProvider,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
