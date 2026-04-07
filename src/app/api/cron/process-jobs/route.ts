import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { processNextJob } from '@/lib/jobs/runner';

export const maxDuration = 55;

function triggerProcessJobs(jobId: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const secret = process.env.CRON_SECRET ?? '';
  return fetch(`${appUrl}/api/cron/process-jobs?jobId=${jobId}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  }).then(() => {}).catch(() => {});
}

// GET /api/cron/process-jobs?jobId=xxx — kör nästa steg för ett specifikt jobb
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get('jobId') ?? undefined;

  try {
    const result = await processNextJob(jobId);

    // Self-chain: trigga nästa steg med samma jobId
    if (result.processed && !result.error && !result.done && result.jobId) {
      waitUntil(triggerProcessJobs(result.jobId));
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
