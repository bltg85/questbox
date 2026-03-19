import { z } from 'zod';
import { generateWithAI } from '../providers';
import type { AIProvider, QuizContent, AgeGroup, DifficultyLevel, Locale } from '@/types';

const QuizSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  questions: z.array(
    z.object({
      number: z.number(),
      question: z.string(),
      options: z.array(z.string()).length(4),
      correct_answer: z.number().min(0).max(3),
      explanation: z.string().optional(),
    })
  ),
  scoring_guide: z.string(),
});

interface GenerateQuizParams {
  topic: string;
  numberOfQuestions: number;
  ageGroup: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  provider?: AIProvider;
}

export async function generateQuiz({
  topic,
  numberOfQuestions,
  ageGroup,
  difficulty,
  language,
  provider = 'openai',
}: GenerateQuizParams): Promise<QuizContent> {
  const ageDescriptions: Record<AgeGroup, string> = {
    toddler: '2-4 years old (very simple, picture-based questions)',
    child: '5-8 years old (simple facts, fun topics)',
    teen: '9-12 years old (educational, interesting facts)',
    adult: '13+ years (challenging trivia, detailed knowledge)',
    all: 'all ages (family-friendly, mixed difficulty)',
  };

  const difficultyDescriptions: Record<DifficultyLevel, string> = {
    easy: 'straightforward questions with obvious answers',
    medium: 'moderate challenge requiring some knowledge',
    hard: 'challenging questions testing detailed knowledge',
  };

  const languageInstructions = language === 'sv'
    ? 'Write everything in Swedish.'
    : 'Write everything in English.';

  const systemPrompt = `You are a quiz master specializing in creating engaging, educational quizzes.

Your output must be valid JSON matching this exact structure:
{
  "title": "string - catchy quiz title",
  "introduction": "string - brief intro explaining the quiz theme",
  "questions": [
    {
      "number": number,
      "question": "string - the question",
      "options": ["string", "string", "string", "string"] - exactly 4 options,
      "correct_answer": number (0-3, index of correct option),
      "explanation": "string - brief explanation of the correct answer"
    }
  ],
  "scoring_guide": "string - how to interpret scores"
}

${languageInstructions}

IMPORTANT:
- Ensure all facts are accurate
- Make wrong options plausible but clearly incorrect
- Only output valid JSON, no other text`;

  const userPrompt = `Create a quiz with these specifications:
- Topic: ${topic}
- Number of questions: ${numberOfQuestions}
- Target age: ${ageDescriptions[ageGroup]}
- Difficulty: ${difficultyDescriptions[difficulty]}

Make questions interesting and educational. Each question should have exactly 4 options with one correct answer.`;

  const response = await generateWithAI({
    systemPrompt,
    userPrompt,
    provider,
  });

  try {
    const clean = response.content.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const parsed = JSON.parse(clean);
    return QuizSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse quiz response:', error);
    throw new Error('Failed to generate valid quiz content');
  }
}
