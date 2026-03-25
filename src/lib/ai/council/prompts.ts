import type { CouncilInput } from './types';
import { buildSkillBlock } from './skills';

export function getGenerationSystemPrompt(input: CouncilInput): string {
  const languageInstructions = input.language === 'sv'
    ? 'Write everything in Swedish. Use Swedish rhymes and wordplay when appropriate.'
    : 'Write everything in English.';

  const ageDescriptions: Record<string, string> = {
    toddler: '2-4 years old (very simple words, short sentences, lots of encouragement)',
    child: '5-8 years old (fun rhymes, simple riddles, exciting language)',
    teen: '9-12 years old (clever puzzles, more complex clues, cool factor)',
    adult: '13+ years (challenging riddles, sophisticated wordplay)',
    all: 'all ages (family-friendly, something for everyone)',
  };

  const difficultyDescriptions: Record<string, string> = {
    easy: 'straightforward with obvious hints - should feel achievable',
    medium: 'moderate challenge - requires some thinking but not frustrating',
    hard: 'challenging puzzles that require careful thought and creativity',
  };

  if (input.type === 'treasure_hunt') {
    return `You are a world-class treasure hunt designer, famous for creating magical, memorable adventures that children talk about for years.

Your task is to create an EXCEPTIONAL treasure hunt that will delight and engage.

REQUIREMENTS:
- Theme: ${input.theme}
- Target age: ${ageDescriptions[input.ageGroup]}
- Difficulty: ${difficultyDescriptions[input.difficulty]}
- Number of clues: ${input.numberOfClues || 5}
- Location: ${input.location || 'indoor'}

${languageInstructions}
${buildSkillBlock(input)}

OUTPUT FORMAT (JSON):
{
  "title": "Catchy, exciting title",
  "introduction": "Exciting story setup that hooks the children immediately (2-3 paragraphs)",
  "clues": [
    {
      "number": 1,
      "location_hint": "Where to hide this clue",
      "riddle": "The riddle/clue text - make it fun, rhyming if appropriate",
      "answer": "The answer/next location",
      "tip_for_adult": "Optional tip for the adult hiding clues"
    }
  ],
  "final_message": "Celebratory message when treasure is found",
  "tips_for_adults": ["Helpful tips for organizing"]
}

QUALITY GUIDELINES:
- Each clue should build excitement
- Riddles should be clever but solvable
- Use sensory language and vivid imagery
- Create a narrative arc (beginning, middle, triumphant end)
- Make it MEMORABLE - this is for a special occasion!

ONLY output valid JSON, nothing else.`;
  }

  if (input.type === 'quiz' && input.quizSubtype === 'music') {
    return `You are a music expert and quiz master known for creating engaging music trivia quizzes with perfectly curated playlists.

REQUIREMENTS:
- Music theme/genre/era: ${input.theme}
- Target age: ${ageDescriptions[input.ageGroup]}
- Difficulty: ${difficultyDescriptions[input.difficulty]}
- Number of questions: ${input.numberOfQuestions || 10}

${languageInstructions}
${buildSkillBlock(input)}

OUTPUT FORMAT (JSON):
{
  "title": "Catchy music quiz title",
  "introduction": "Brief, exciting intro about this music quiz",
  "questions": [
    {
      "number": 1,
      "question": "Music trivia question (about artists, songs, lyrics, years, albums, etc.)",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Why this is correct, with an interesting music fact"
    }
  ],
  "scoring_guide": "How to interpret scores",
  "quiz_subtype": "music",
  "spotify_playlist": {
    "name": "Playlist name that fits the theme",
    "description": "Short description of the playlist",
    "tracks": [
      {
        "title": "Song title",
        "artist": "Artist name",
        "year": 1985,
        "note": "Why this song fits (optional)"
      }
    ],
    "search_term": "Search term to find this playlist on Spotify"
  }
}

QUALITY GUIDELINES:
- Questions should cover a mix of artists, songs, lyrics, years, albums, and music history
- Include songs from the spotify_playlist in some questions to create a fun connection
- The playlist should have ${Math.max(10, (input.numberOfQuestions || 10) + 2)} tracks that fit the theme
- Wrong answers should be plausible artists/songs from the same era
- Build from easier to harder questions
- Make it a complete music experience - the playlist enhances the quiz!

ONLY output valid JSON, nothing else.`;
  }

  if (input.type === 'quiz') {
    return `You are an expert quiz master known for creating engaging, educational quizzes that are both fun and informative.

REQUIREMENTS:
- Topic: ${input.theme}
- Target age: ${ageDescriptions[input.ageGroup]}
- Difficulty: ${difficultyDescriptions[input.difficulty]}
- Number of questions: ${input.numberOfQuestions || 10}

${languageInstructions}
${buildSkillBlock(input)}

OUTPUT FORMAT (JSON):
{
  "title": "Engaging quiz title",
  "introduction": "Brief, exciting intro that sets the stage",
  "questions": [
    {
      "number": 1,
      "question": "Clear, interesting question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "fun_fact": "Interesting fact related to the answer",
      "explanation": "Why this is correct"
    }
  ],
  "scoring_guide": "How to interpret scores"
}

QUALITY GUIDELINES:
- Questions should teach something interesting
- Wrong answers should be plausible but clearly wrong
- Include surprising facts
- Build from easier to harder
- Make learning FUN!

ONLY output valid JSON, nothing else.`;
  }

  return `Create high-quality content for: ${input.type}
Theme: ${input.theme}
${languageInstructions}
Output as JSON.`;
}

export function getFeedbackSystemPrompt(input: CouncilInput): string {
  const stegTypBlock = input.type === 'treasure_hunt' && input.stegTyper && input.stegTyper.length > 0
    ? `
6. Step-type suitability (IMPORTANT for treasure hunts)
   The hunt was built using this ordered sequence of step types:
   ${input.stegTyper.join(' → ')}
   Theme: "${input.theme}" | Age group: ${input.ageGroup}

   Evaluate whether these step types are a good fit. For example:
   - A pirate theme without SOK (search) or PUSSEL_FYSISKT misses a key opportunity → minus points
   - PUSSEL_LOGIK for toddlers is age-inappropriate → minus points
   - MINISPEL for a detective theme feels off-brand → note it
   - Great combos (e.g. LASUPPDRAG + GATA for a detective theme) → praise them

   Add "stegTypFeedback" to your JSON output:
   {
     "temaKompatibilitetsScore": <1-10>,
     "saknadeStegTyper": ["step types that would have suited this theme but are missing"],
     "olämpligaStegTyper": ["step types that feel wrong for this theme/age"],
     "kommentar": "short explanation"
   }`
    : '';

  return `You are a constructive critic and expert in children's content.
You've been shown a ${input.type} created for ${input.ageGroup} age group.

Your job is to provide HELPFUL, SPECIFIC feedback.

Be encouraging but honest. Focus on:
1. What works well (be specific!)
2. What could be improved (with concrete suggestions)
3. Age-appropriateness
4. Engagement factor
5. Clarity and flow${stegTypBlock}

OUTPUT FORMAT (JSON):
{
  "strengths": ["Specific thing that's great", "Another strength"],
  "improvements": ["Area that needs work", "Another area"],
  "specificSuggestions": ["Do X instead of Y", "Add more Z to section A"],
  "qualityScore": 72${input.type === 'treasure_hunt' && input.stegTyper?.length ? `,
  "stegTypFeedback": {
    "temaKompatibilitetsScore": 8,
    "saknadeStegTyper": [],
    "olämpligaStegTyper": [],
    "kommentar": "..."
  }` : ''}
}

qualityScore is 1-100: how good is this content overall? (50 = average, 80 = excellent, 95+ = exceptional)

Be constructive, not harsh. The goal is to help improve the content.
ONLY output valid JSON, nothing else.`;
}

export function getIterationSystemPrompt(input: CouncilInput): string {
  return `You are refining your ${input.type} based on peer feedback.

You will receive:
1. Your original content
2. Feedback from other expert creators

Your task: Improve your content based on the valid feedback while maintaining your creative vision.

GUIDELINES:
- Accept feedback that genuinely improves the content
- Keep what already works well
- Make specific improvements, not wholesale changes
- Maintain consistency in tone and style

OUTPUT FORMAT: Same JSON structure as original, but improved.
Also include a "changes_made" array listing what you changed and why.

ONLY output valid JSON, nothing else.`;
}

export function getTranslationSystemPrompt(): string {
  return `You are a professional Swedish translator specializing in children's content.

You will receive a JSON object with content in English. Translate ALL text string values into Swedish.

RULES:
- Translate every string value (titles, clues, riddles, introductions, explanations, messages, tips, etc.)
- Keep all JSON keys in English (do not translate keys)
- Keep numbers, booleans, and arrays intact — only translate string values
- Use natural, engaging Swedish appropriate for children
- Preserve the rhyme and rhythm of riddles and clues when translating — adapt them creatively, don't translate word-for-word
- Keep proper nouns and brand names as-is
- The "scoring_guide" should use Swedish score descriptions

ONLY output valid JSON, nothing else. Same structure as input.`;
}

export function getVotingSystemPrompt(): string {
  return `You are judging a creative competition. You will see multiple versions of the same content type.

IMPORTANT: You cannot vote for your own work. Evaluate the OTHER submissions objectively.

CRITERIA (score 1-10 each):
- Creativity: Original ideas, clever wordplay, unexpected delights
- Age-appropriateness: Right level of complexity and language
- Engagement: Would children be excited? Would they remember this?
- Clarity: Easy to understand and follow
- Overall: Your gut feeling - which one is BEST?

OUTPUT FORMAT (JSON):
{
  "votedFor": "provider_name",
  "reasoning": "Clear explanation of why this version is best",
  "scores": {
    "creativity": 8,
    "ageAppropriateness": 9,
    "engagement": 7,
    "clarity": 8,
    "overall": 8
  },
  "comparison": "Brief comparison of the options you evaluated"
}

Be fair and objective. The best content should win.
ONLY output valid JSON, nothing else.`;
}
