import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateToken } from '@/lib/utils';
import { sendDownloadEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const { productId, email } = await request.json();

    if (!productId || !email) {
      return NextResponse.json(
        { error: 'Product ID and email are required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_free', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or not free' },
        { status: 404 }
      );
    }

    // Create or update subscriber
    const { data: subscriber } = await supabase
      .from('subscribers')
      .upsert(
        { email, status: 'confirmed', confirmed_at: new Date().toISOString() },
        { onConflict: 'email' }
      )
      .select()
      .single();

    // Create download token
    const token = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    const { data: downloadToken, error: tokenError } = await supabase
      .from('download_tokens')
      .insert({
        token,
        product_id: productId,
        email,
        expires_at: expiresAt.toISOString(),
        max_downloads: 3,
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Failed to create download token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create download link' },
        { status: 500 }
      );
    }

    // Send email
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/download/${token}`;
    await sendDownloadEmail({
      to: email,
      productName: (product.name as any).en,
      downloadUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Download request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
