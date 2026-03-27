import { NextRequest, NextResponse } from 'next/server';
import { processNextJob } from '@/lib/jobs/runner';

export const maxDuration = 55; // säkerhetsmarginal mot Vercels 60s-limit

// GET /api/cron/process-jobs — anropas av Vercel Cron varje minut
export async function GET(request: NextRequest) {
  // Verifiera att anropet kommer från Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processNextJob();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[CronHandler] Unexpected error:', err);
    return NextResponse.json(
      { processed: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
