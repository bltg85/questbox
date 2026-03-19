import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;
    const slug = (formData.get('slug') as string | null) ?? productId ?? 'product';

    if (!file || !productId) {
      return NextResponse.json({ error: 'Missing file or productId' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `files/${slug}.pdf`;

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === 'products');
    if (!bucketExists) {
      await supabase.storage.createBucket('products', { public: true, fileSizeLimit: 52428800 });
    }

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);

    await supabase.from('products').update({ file_url: urlData.publicUrl }).eq('id', productId);

    return NextResponse.json({ fileUrl: urlData.publicUrl });
  } catch (err) {
    console.error('[Upload PDF] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
