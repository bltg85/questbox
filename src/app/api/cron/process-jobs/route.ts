import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { processNextJob } from '@/lib/jobs/runner';

export const maxDuration = 55;

function triggerProcessJobs(): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const secret = process.env.CRON_SECRET ?? '';
  return fetch(`${appUrl}/api/cron/process-jobs`, {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  }).then(() => {}).catch(() => {});
}

// GET /api/cron/process-jobs — anropas av Vercel Cron eller self-chain
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processNextJob();

    // Self-chain: om ett steg kördes och jobbet INTE är klart, trigga nästa steg.
    // waitUntil håller Vercel-funktionen vid liv tills fetch-anropet har skickats.
    if (result.processed && !result.error && !result.done) {
      waitUntil(triggerProcessJobs());
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[CronHandler] Unexpected error:', err);
    return NextResponse.json(
      { processed: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
