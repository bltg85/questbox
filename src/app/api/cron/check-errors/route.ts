import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCronAuth } from '@/lib/cron/auth';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';

export const maxDuration = 30;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const supabase = getServiceClient();

  const { data: errors, error: dbError } = await supabase
    .from('system_errors')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (dbError) {
    console.error('[Cron:check-errors] DB error:', dbError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const count = errors?.length ?? 0;

  if (count === 0) {
    console.log('[Cron:check-errors] No errors in last 24h');
    return NextResponse.json({ ok: true, errors: 0 });
  }

  // Group by error type
  const grouped = (errors ?? []).reduce<Record<string, typeof errors>>((acc, err) => {
    acc[err.error_type] = acc[err.error_type] ?? [];
    acc[err.error_type]!.push(err);
    return acc;
  }, {});

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const rows = Object.entries(grouped).map(([type, items]) => {
      const models = [...new Set(items!.map((i: any) => i.model).filter(Boolean))].join(', ');
      const latest: any = items![0];
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">${type}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:center;">${items!.length}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-family:monospace;font-size:12px;">${models || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#71717a;font-size:12px;">${latest.error_message?.substring(0, 100) || '—'}</td>
        </tr>`;
    }).join('');

    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `[SuitedPlay] ⚠️ ${count} fel senaste 24h`,
        html: `
          <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:20px;color:#18181b;">
            <h2 style="color:#dc2626;">Systemfel: ${count} fel senaste 24 timmar</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <thead>
                <tr style="background:#f4f4f5;text-align:left;">
                  <th style="padding:8px 12px;">Feltyp</th>
                  <th style="padding:8px 12px;text-align:center;">Antal</th>
                  <th style="padding:8px 12px;">Modell(er)</th>
                  <th style="padding:8px 12px;">Senaste meddelande</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:24px;color:#71717a;font-size:12px;">
              SuitedPlay Cron · ${new Date().toISOString()}
            </p>
          </body></html>
        `,
      });
    } catch (emailErr) {
      console.error('[Cron:check-errors] Failed to send email:', emailErr);
    }
  }

  return NextResponse.json({ ok: true, errors: count, summary: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v!.length])) });
}
