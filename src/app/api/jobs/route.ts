import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const EnqueueSchema = z.object({
  type: z.enum(['council', 'illustrate', 'validate_all', 'review_loop', 'evolve_agent']),
  input: z.record(z.unknown()),
});

// POST /api/jobs — lägg till ett nytt jobb i kön
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input } = EnqueueSchema.parse(body);

    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({ type, input, status: 'pending', progress: 0 })
      .select('id, type, status, progress, created_at')
      .single();

    if (error) {
      console.error('[Jobs API] Insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 }
    );
  }
}

// GET /api/jobs — lista senaste jobben (max 50)
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, type, status, step, progress, progress_msg, error, created_at, started_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: jobs });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
