import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const PRIMARY_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const FALLBACK_IMAGE_MODEL = 'gemini-3-pro-image-preview';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || token !== process.env.MONITORING_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const checks: Record<string, unknown> = {};

  // --- Image generation check ---
  try {
    const supabase = await createServiceClient();
    const { data: imageUsage, error } = await supabase
      .from('ai_usage')
      .select('model, created_at')
      .eq('operation', 'image')
      .gte('created_at', oneHourAgo);

    if (error) throw error;

    const rows = imageUsage || [];
    const primary = rows.filter(r => r.model === PRIMARY_IMAGE_MODEL);
    const fallback = rows.filter(r => r.model === FALLBACK_IMAGE_MODEL);

    checks.image_generation = {
      status: fallback.length > 0 ? 'warning' : 'ok',
      total_last_hour: rows.length,
      primary_count: primary.length,
      fallback_count: fallback.length,
      message: fallback.length > 0
        ? `${fallback.length} fallback(s) to ${FALLBACK_IMAGE_MODEL} — primary may be failing`
        : rows.length === 0
          ? 'No image generations in the last hour'
          : `${primary.length}/${rows.length} used primary model`,
    };
  } catch (err) {
    checks.image_generation = { status: 'error', message: String(err) };
  }

  // --- Vercel deployments (optional) ---
  if (process.env.VERCEL_TOKEN) {
    try {
      const res = await fetch(
        'https://api.vercel.com/v6/deployments?app=questbox&limit=5',
        {
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
          next: { revalidate: 0 },
        }
      );
      const data = await res.json();
      const deployments: Array<{ uid: string; state: string; createdAt: number }> =
        data.deployments || [];
      const failed = deployments.filter(d => d.state === 'ERROR' || d.state === 'CANCELED');

      checks.deployments = {
        status: failed.length > 0 ? 'warning' : 'ok',
        checked: deployments.length,
        failed_count: failed.length,
        message: failed.length > 0
          ? `${failed.length} failed deployment(s)`
          : 'All recent deployments OK',
        recent: deployments.slice(0, 3).map(d => ({
          id: d.uid,
          state: d.state,
          created_at: new Date(d.createdAt).toISOString(),
        })),
      };
    } catch (err) {
      checks.deployments = { status: 'error', message: String(err) };
    }
  } else {
    checks.deployments = { status: 'skipped', message: 'VERCEL_TOKEN not configured' };
  }

  const statuses = Object.values(checks).map(c => (c as { status: string }).status);
  const overall = statuses.includes('error') ? 'error'
    : statuses.includes('warning') ? 'warning'
    : 'ok';

  return NextResponse.json({
    status: overall,
    checked_at: new Date().toISOString(),
    checks,
  });
}
