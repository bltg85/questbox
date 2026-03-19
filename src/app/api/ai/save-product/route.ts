import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await request.json();
    const { content, type, theme, ageGroup, difficulty, language, imageDataUrl } = body;

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
    }

    const title: string = content.title || theme || 'Untitled';
    const slug = slugify(title) + '-' + Date.now().toString(36);

    // Upload image to Supabase Storage if provided
    let thumbnailUrl: string | null = null;
    if (imageDataUrl) {
      const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `thumbnails/${slug}.${ext}`;

        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.id === 'products');
        if (!bucketExists) {
          await supabase.storage.createBucket('products', { public: true, fileSizeLimit: 10485760 });
        }

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
          thumbnailUrl = urlData.publicUrl;
        } else {
          console.warn('[Save Product] Image upload failed:', uploadError.message);
        }
      }
    }

    const localizedTitle = { en: title, sv: title };
    const localizedSlug = { en: slug, sv: slug };

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: localizedTitle,
        slug: localizedSlug,
        description: { en: '', sv: '' },
        short_description: { en: '', sv: '' },
        product_type: type,
        age_group: ageGroup || 'all',
        difficulty_level: difficulty || 'medium',
        status: 'draft',
        is_free: true,
        is_ai_generated: true,
        thumbnail_url: thumbnailUrl,
        tags: [theme, language].filter(Boolean),
        ai_generation_data: {
          provider: 'council',
          model: 'multi-agent',
          prompt: theme,
          generated_at: new Date().toISOString(),
          parameters: { content, language },
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Save Product] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save product' },
      { status: 500 }
    );
  }
}
