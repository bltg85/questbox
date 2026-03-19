import { z } from 'zod';
import { generateWithAI } from '../providers';
import type { AIProvider, DiplomaContent, Locale } from '@/types';

const DiplomaSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  body_text: z.string(),
  footer_text: z.string(),
});

interface GenerateDiplomaParams {
  achievementType: string;
  recipientName?: string;
  customMessage?: string;
  language: Locale;
  provider?: AIProvider;
}

export async function generateDiploma({
  achievementType,
  recipientName,
  customMessage,
  language,
  provider = 'google',
}: GenerateDiplomaParams): Promise<DiplomaContent> {
  const languageInstructions = language === 'sv'
    ? 'Write everything in Swedish. Use formal but warm Swedish.'
    : 'Write everything in English.';

  const systemPrompt = `You are a diploma writer creating celebratory certificates.

Your output must be valid JSON matching this exact structure:
{
  "title": "string - main diploma title (e.g., 'Certificate of Achievement')",
  "subtitle": "string - secondary title describing the achievement",
  "body_text": "string - the main celebratory text, use {name} as placeholder for recipient name",
  "footer_text": "string - closing/signature line text"
}

${languageInstructions}

IMPORTANT: Only output valid JSON, no other text.`;

  const userPrompt = `Create a diploma for:
- Achievement type: ${achievementType}
${recipientName ? `- Recipient name: ${recipientName} (use this name in the text)` : '- Use {name} as placeholder for the recipient name'}
${customMessage ? `- Custom message to include: ${customMessage}` : ''}

Make it celebratory, warm, and appropriate for the achievement.`;

  const response = await generateWithAI({
    systemPrompt,
    userPrompt,
    provider,
  });

  try {
    const clean = response.content.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const parsed = JSON.parse(clean);
    return DiplomaSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse diploma response:', error);
    throw new Error('Failed to generate valid diploma content');
  }
}
