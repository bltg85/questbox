import { z } from 'zod';
import { generateWithAI } from '../providers';
import type { AIProvider, QuizContent, AgeGroup, DifficultyLevel, Locale, QuizSubtype } from '@/types';

const SpotifyTrackSchema = z.object({
  title: z.string(),
  artist: z.string(),
  year: z.number().optional(),
  note: z.string().optional(),
});

const SpotifyPlaylistSchema = z.object({
  name: z.string(),
  description: z.string(),
  tracks: z.array(SpotifyTrackSchema),
  search_term: z.string().optional(),
});

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
  quiz_subtype: z.enum(['standard', 'music']).optional(),
  spotify_playlist: SpotifyPlaylistSchema.optional(),
});

interface GenerateQuizParams {
  topic: string;
  numberOfQuestions: number;
  ageGroup: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  provider?: AIProvider;
  quizSubtype?: QuizSubtype;
}

export async function generateQuiz({
  topic,
  numberOfQuestions,
  ageGroup,
  difficulty,
  language,
  provider = 'openai',
  quizSubtype = 'standard',
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

  const isMusicQuiz = quizSubtype === 'music';

  const systemPrompt = isMusicQuiz
    ? `You are a music expert and quiz master specializing in music trivia quizzes with curated playlists.

Your output must be valid JSON matching this exact structure:
{
  "title": "string - catchy music quiz title",
  "introduction": "string - brief intro about this music quiz",
  "questions": [
    {
      "number": number,
      "question": "string - music trivia question",
      "options": ["string", "string", "string", "string"] - exactly 4 options,
      "correct_answer": number (0-3, index of correct option),
      "explanation": "string - brief explanation with a music fact"
    }
  ],
  "scoring_guide": "string - how to interpret scores",
  "quiz_subtype": "music",
  "spotify_playlist": {
    "name": "string - playlist name",
    "description": "string - short description",
    "tracks": [
      {
        "title": "string - song title",
        "artist": "string - artist name",
        "year": number (optional),
        "note": "string - why this song fits (optional)"
      }
    ],
    "search_term": "string - search term for Spotify"
  }
}

${languageInstructions}

IMPORTANT:
- Mix question types: artists, songs, lyrics, years, albums, music history
- Include songs from the playlist in some questions for a fun connection
- The playlist should have ${Math.max(10, numberOfQuestions + 2)} tracks
- Wrong options should be plausible artists/songs from the same era
- Only output valid JSON, no other text`
    : `You are a quiz master specializing in creating engaging, educational quizzes.

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

  const userPrompt = isMusicQuiz
    ? `Create a music quiz with these specifications:
- Music theme/genre/era: ${topic}
- Number of questions: ${numberOfQuestions}
- Target age: ${ageDescriptions[ageGroup]}
- Difficulty: ${difficultyDescriptions[difficulty]}

Create engaging music trivia and a matching Spotify playlist. Each question should have exactly 4 options with one correct answer.`
    : `Create a quiz with these specifications:
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
