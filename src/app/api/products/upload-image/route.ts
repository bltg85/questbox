import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await request.json();
    const { imageDataUrl, slug } = body;

    if (!imageDataUrl || !slug) {
      return NextResponse.json({ error: 'Missing imageDataUrl or slug' }, { status: 400 });
    }

    const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    const fileName = `thumbnails/${slug}-${Date.now()}.${ext}`;

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === 'products');
    if (!bucketExists) {
      await supabase.storage.createBucket('products', { public: true, fileSizeLimit: 10485760 });
    }

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);

    return NextResponse.json({ success: true, thumbnailUrl: urlData.publicUrl });
  } catch (err) {
    console.error('[Upload Image] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
