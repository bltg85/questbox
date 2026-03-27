import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateProductImage } from '@/lib/ai/providers';

export const maxDuration = 60; // Max for Vercel Hobby plan

const ImageRequestSchema = z.object({
  type: z.string(),
  theme: z.string(),
  ageGroup: z.string(),
  language: z.enum(['en', 'sv']).optional(),
});

function buildImagePrompt(type: string, theme: string, ageGroup: string): string {
  const typeLabel: Record<string, string> = {
    treasure_hunt: 'treasure hunt adventure',
    quiz: 'quiz game',
    diploma: 'achievement diploma',
    party_game: 'party game',
    escape_game: 'escape room adventure',
  };

  const ageLabel: Record<string, string> = {
    toddler: 'toddlers (2–4 years)',
    child: 'children (5–8 years)',
    teen: 'kids (9–12 years)',
    adult: 'teenagers and adults',
    all: 'all ages',
  };

  const activityType = typeLabel[type] || type;
  const audience = ageLabel[ageGroup] || ageGroup;

  return `Create a vibrant, professional digital product cover image.

Activity type: ${activityType}
Theme: ${theme}
Target audience: ${audience}

Art direction:
- Eye-catching and colorful with a clear focal point
- Warm, magical, inviting atmosphere
- Whimsical illustration style, like a premium children's book cover or board game box
- Rich details that make the theme instantly recognizable (e.g. treasure chest and map for pirates, stars and planets for space)
- Bright, saturated colors that pop on a white e-commerce background
- Professional product thumbnail quality — looks like something parents would happily pay for
- Do NOT include any text, letters, or numbers anywhere in the image
- Horizontal or square composition, not portrait
- Make it feel exciting and premium, not clipart or generic`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, theme, ageGroup } = ImageRequestSchema.parse(body);

    const prompt = buildImagePrompt(type, theme, ageGroup);
    console.log('[Generate Image] Prompt:', prompt);

    const timeoutMs = 55_000; // 55s — safely under Vercel's 60s hard limit
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Image generation timed out (55s). Try again.')), timeoutMs)
    );

    const imageDataUrl = await Promise.race([generateProductImage(prompt), timeoutPromise]);

    if (!imageDataUrl) {
      return NextResponse.json(
        { success: false, error: 'Bildgenerering misslyckades — Googles AI-modell är tillfälligt otillgänglig (503). Försök igen om en stund.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, imageDataUrl });
  } catch (error) {
    console.error('[Generate Image] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    );
  }
}
