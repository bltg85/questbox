import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyCronAuth } from '@/lib/cron/auth';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';

export const maxDuration = 60;

const TEST_PROMPT = 'Reply with exactly one word: ok';

interface ModelResult {
  provider: string;
  tier: string;
  model: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

async function testOpenAI(model: string, tier: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: TEST_PROMPT }],
      max_tokens: 5,
    });
    return { provider: 'OpenAI', tier, model, ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { provider: 'OpenAI', tier, model, ok: false, error: err?.message?.substring(0, 120) };
  }
}

async function testAnthropic(model: string, tier: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    await client.messages.create({
      model,
      max_tokens: 5,
      messages: [{ role: 'user', content: TEST_PROMPT }],
    });
    return { provider: 'Anthropic', tier, model, ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { provider: 'Anthropic', tier, model, ok: false, error: err?.message?.substring(0, 120) };
  }
}

async function testGoogle(model: string, tier: string): Promise<ModelResult> {
  const start = Date.now();
  try {
    const google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const m = google.getGenerativeModel({ model });
    await m.generateContent({ contents: [{ role: 'user', parts: [{ text: TEST_PROMPT }] }] });
    return { provider: 'Google', tier, model, ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { provider: 'Google', tier, model, ok: false, error: err?.message?.substring(0, 120) };
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3 economy + 3 premium text models (one per lab each)
  const results = await Promise.allSettled([
    testOpenAI('gpt-5-mini',        'Economy'),
    testOpenAI('gpt-5.2',           'Premium'),
    testAnthropic('claude-haiku-4-5',   'Economy'),
    testAnthropic('claude-sonnet-4-6',  'Premium'),
    testGoogle('gemini-2.5-flash',  'Economy'),
    testGoogle('gemini-2.5-pro',    'Premium'),
  ]);

  const models: ModelResult[] = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { provider: '?', tier: '?', model: '?', ok: false, error: 'Promise rejected' }
  );

  const allOk = models.every((m) => m.ok);
  const failed = models.filter((m) => !m.ok);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const icon = (ok: boolean) => ok ? '✅' : '❌';
    const rows = models.map((m) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:center;">${icon(m.ok)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">${m.provider}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">${m.tier}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-family:monospace;font-size:13px;">${m.model}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:${m.ok ? '#16a34a' : '#dc2626'};">
          ${m.latencyMs ? `${m.latencyMs} ms` : m.error || '—'}
        </td>
      </tr>`).join('');

    const subject = allOk
      ? '[SuitedPlay] ✅ Alla AI-modeller OK'
      : `[SuitedPlay] ❌ ${failed.length} AI-modell(er) svarar ej`;

    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject,
        html: `
          <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:20px;color:#18181b;">
            <h2 style="color:${allOk ? '#16a34a' : '#dc2626'};">
              Veckorapport: AI-modellstatus
            </h2>
            <p style="color:#52525b;">
              ${allOk
                ? 'Alla 6 modeller (3 economy + 3 premium) svarar korrekt.'
                : `${failed.length} av 6 modeller svarar ej — kontrollera konfigurationen.`}
            </p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <thead>
                <tr style="background:#f4f4f5;text-align:left;">
                  <th style="padding:8px 12px;text-align:center;"></th>
                  <th style="padding:8px 12px;">Lab</th>
                  <th style="padding:8px 12px;">Tier</th>
                  <th style="padding:8px 12px;">Modell-ID</th>
                  <th style="padding:8px 12px;">Latens / Fel</th>
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
      console.error('[Cron:verify-models] Failed to send email:', emailErr);
    }
  }

  return NextResponse.json({ ok: allOk, models });
}
