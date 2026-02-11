import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const { email, locale = 'en' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.status === 'confirmed') {
        return NextResponse.json({ message: 'Already subscribed' });
      }

      // Re-confirm if was unsubscribed
      await supabase
        .from('subscribers')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', existing.id);

      return NextResponse.json({ success: true });
    }

    // Create new subscriber
    const { error } = await supabase.from('subscribers').insert({
      email,
      locale,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to create subscriber:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      );
    }

    // Send welcome email
    await sendWelcomeEmail({ to: email, locale });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
