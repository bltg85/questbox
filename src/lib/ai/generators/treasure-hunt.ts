import { z } from 'zod';
import { generateWithAI } from '../providers';
import type { AIProvider, TreasureHuntContent, AgeGroup, DifficultyLevel, Locale } from '@/types';

const TreasureHuntSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  clues: z.array(
    z.object({
      number: z.number(),
      location_hint: z.string(),
      riddle: z.string(),
      answer: z.string(),
    })
  ),
  final_message: z.string(),
  tips_for_adults: z.array(z.string()),
});

interface GenerateTreasureHuntParams {
  theme: string;
  numberOfClues: number;
  ageGroup: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  location?: string;
  provider?: AIProvider;
}

export async function generateTreasureHunt({
  theme,
  numberOfClues,
  ageGroup,
  difficulty,
  language,
  location = 'indoor',
  provider = 'anthropic',
}: GenerateTreasureHuntParams): Promise<TreasureHuntContent> {
  const ageDescriptions: Record<AgeGroup, string> = {
    toddler: '2-4 years old (simple words, short sentences)',
    child: '5-8 years old (fun rhymes, simple riddles)',
    teen: '9-12 years old (clever puzzles, more complex clues)',
    adult: '13+ years (challenging riddles, sophisticated language)',
    all: 'all ages (family-friendly, medium difficulty)',
  };

  const difficultyDescriptions: Record<DifficultyLevel, string> = {
    easy: 'straightforward clues with obvious hints',
    medium: 'moderate challenge with some thinking required',
    hard: 'challenging riddles that require careful thought',
  };

  const languageInstructions = language === 'sv'
    ? 'Write everything in Swedish. Use Swedish rhymes and wordplay when appropriate.'
    : 'Write everything in English.';

  const systemPrompt = `You are a creative treasure hunt designer specializing in creating engaging, age-appropriate scavenger hunts.

Your output must be valid JSON matching this exact structure:
{
  "title": "string - catchy title for the treasure hunt",
  "introduction": "string - exciting intro text read to participants at the start",
  "clues": [
    {
      "number": number,
      "location_hint": "string - hint about where this clue leads",
      "riddle": "string - the riddle or clue text",
      "answer": "string - the answer/location"
    }
  ],
  "final_message": "string - congratulatory message when treasure is found",
  "tips_for_adults": ["string - helpful tips for the adult organizing the hunt"]
}

${languageInstructions}

IMPORTANT: Only output valid JSON, no other text.`;

  const userPrompt = `Create a treasure hunt with these specifications:
- Theme: ${theme}
- Number of clues: ${numberOfClues}
- Target age: ${ageDescriptions[ageGroup]}
- Difficulty: ${difficultyDescriptions[difficulty]}
- Location type: ${location}

Make the clues creative, fun, and appropriate for the theme. Each riddle should cleverly hint at the next location without being too obvious or too hard.`;

  const response = await generateWithAI({
    systemPrompt,
    userPrompt,
    provider,
  });

  // Parse and validate the response
  try {
    const parsed = JSON.parse(response.content);
    return TreasureHuntSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse treasure hunt response:', error);
    throw new Error('Failed to generate valid treasure hunt content');
  }
}
