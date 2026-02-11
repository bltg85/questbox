import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createServiceClient();

  // Get download token
  const { data: downloadToken, error } = await supabase
    .from('download_tokens')
    .select('*, product:products(*)')
    .eq('token', token)
    .single();

  if (error || !downloadToken) {
    return NextResponse.json(
      { error: 'Invalid download token' },
      { status: 404 }
    );
  }

  // Check if expired
  if (new Date(downloadToken.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Download link has expired' },
      { status: 410 }
    );
  }

  // Check download count
  if (downloadToken.download_count >= downloadToken.max_downloads) {
    return NextResponse.json(
      { error: 'Maximum downloads reached' },
      { status: 429 }
    );
  }

  const product = downloadToken.product as any;
  if (!product?.file_url) {
    return NextResponse.json(
      { error: 'Product file not available' },
      { status: 404 }
    );
  }

  // Update download count
  await supabase
    .from('download_tokens')
    .update({ download_count: downloadToken.download_count + 1 })
    .eq('id', downloadToken.id);

  // Update product download count
  await supabase
    .from('products')
    .update({ download_count: (product.download_count || 0) + 1 })
    .eq('id', product.id);

  // Log download
  await supabase.from('download_logs').insert({
    product_id: product.id,
    token_id: downloadToken.id,
    email: downloadToken.email,
    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  });

  // Generate signed URL for the file (valid for 5 minutes)
  const { data: signedUrl } = await supabase.storage
    .from('products')
    .createSignedUrl(product.file_url, 300);

  if (!signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }

  // Redirect to the signed URL
  return NextResponse.redirect(signedUrl.signedUrl);
}
