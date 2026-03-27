import { NextRequest, NextResponse } from 'next/server';
import { stepGenerate } from '@/lib/ai/council/steps';
import type { CouncilInput } from '@/lib/ai/council/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const input: CouncilInput = await req.json();
    if (!input.theme) {
      return NextResponse.json({ success: false, error: 'theme is required' }, { status: 400 });
    }
    const result = await stepGenerate(input);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[api/council/generate]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
