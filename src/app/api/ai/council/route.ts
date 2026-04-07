import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { waitUntil } from '@vercel/functions';
import { createClient } from '@/lib/supabase/server';
import { processNextJob } from '@/lib/jobs/runner';

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

// Triggar process-jobs med ett specifikt jobb-ID
function triggerProcessJobs(jobId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const secret = process.env.CRON_SECRET ?? '';
  return fetch(`${appUrl}/api/cron/process-jobs?jobId=${jobId}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  }).then(() => {}).catch(() => {});
}

// POST /api/ai/council — lägg till ett council-jobb och starta steg 1 direkt
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

    const jobId = job.id;

    // Kör steg 1 direkt med detta jobb-ID (ingen race condition).
    // waitUntil håller funktionen vid liv under körningen (~35s).
    // Steg 2+ triggas via HTTP med jobId i URL.
    waitUntil(
      processNextJob(jobId).then((result) => {
        if (result.processed && !result.done && !result.error) {
          return triggerProcessJobs(jobId);
        }
      })
    );

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (err) {
    console.error('[Council API] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
