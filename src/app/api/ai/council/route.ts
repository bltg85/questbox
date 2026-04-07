import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { waitUntil } from '@vercel/functions';
import { createClient } from '@/lib/supabase/server';

const CouncilRequestSchema = z.object({
  type: z.enum(['treasure_hunt', 'quiz', 'diploma', 'party_game', 'escape_game']),
  theme: z.string().min(1),
  ageGroup: z.enum(['toddler', 'child', 'teen', 'adult', 'all']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.enum(['en', 'sv']),
  modelTier: z.enum(['economy', 'premium']).optional(),
  bilingualMode: z.boolean().optional(),
  additionalInstructions: z.string().optional(),
  numberOfClues: z.number().optional(),
  numberOfQuestions: z.number().optional(),
  location: z.string().optional(),
  quizSubtype: z.enum(['standard', 'music']).optional(),
  mallId: z.string().optional(),
  mallNamn: z.string().optional(),
  stegTyper: z.array(z.string()).optional(),
});

function triggerProcessJobs(): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const secret = process.env.CRON_SECRET ?? '';
  return fetch(`${appUrl}/api/cron/process-jobs`, {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  }).then(() => {}).catch(() => {});
}

// POST /api/ai/council — lägg till ett council-jobb i kön och returnera job_id direkt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = CouncilRequestSchema.parse(body);

    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        type: 'council',
        input,
        status: 'pending',
        progress: 0,
        progress_msg: 'Väntar på att starta...',
      })
      .select('id, type, status, progress, progress_msg, created_at')
      .single();

    if (error) {
      console.error('[Council API] Insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Kicka igång första steget — waitUntil håller funktionen vid liv tills fetch är klar
    waitUntil(triggerProcessJobs());

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (err) {
    console.error('[Council API] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
