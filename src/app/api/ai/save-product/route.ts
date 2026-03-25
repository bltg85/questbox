import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { TreasureHuntPDF } from '@/lib/pdf/treasure-hunt-template';
import { QuizPDF } from '@/lib/pdf/quiz-template';
import type { DocumentProps } from '@react-pdf/renderer';
import type { TreasureHuntContent, QuizContent } from '@/types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function generatePdfBuffer(
  content: unknown,
  type: string
): Promise<Buffer | null> {
  let element: React.ReactElement<DocumentProps> | null = null;

  switch (type) {
    case 'treasure_hunt':
      element = React.createElement(TreasureHuntPDF, {
        content: content as TreasureHuntContent,
      }) as React.ReactElement<DocumentProps>;
      break;
    case 'quiz':
      element = React.createElement(QuizPDF, {
        content: content as QuizContent,
      }) as React.ReactElement<DocumentProps>;
      break;
    default:
      return null;
  }

  return (await renderToBuffer(element)) as Buffer;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const body = await request.json();
    const { content, type, theme, ageGroup, difficulty, language, imageDataUrl, translatedContent, status = 'draft', mallId } = body;

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
    }

    const title: string = content.title || theme || 'Untitled';
    const slug = slugify(title) + '-' + Date.now().toString(36);

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === 'products');
    if (!bucketExists) {
      await supabase.storage.createBucket('products', { public: true, fileSizeLimit: 52428800 });
    }

    // Upload thumbnail image if provided
    let thumbnailUrl: string | null = null;
    if (imageDataUrl) {
      const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `thumbnails/${slug}.${ext}`;

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

    // Generate and upload PDF
    let fileUrl: string | null = null;
    try {
      const pdfBuffer = await generatePdfBuffer(content, type);
      if (pdfBuffer) {
        const pdfFileName = `files/${slug}.pdf`;
        const { error: pdfUploadError } = await supabase.storage
          .from('products')
          .upload(pdfFileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

        if (!pdfUploadError) {
          const { data: pdfUrlData } = supabase.storage.from('products').getPublicUrl(pdfFileName);
          fileUrl = pdfUrlData.publicUrl;
        } else {
          console.warn('[Save Product] PDF upload failed:', pdfUploadError.message);
        }
      }
    } catch (pdfErr) {
      console.warn('[Save Product] PDF generation failed:', pdfErr);
    }

    const svContent = translatedContent ?? null;
    const svTitle: string = svContent?.title || title;
    const svSlug = slugify(svTitle) + '-' + Date.now().toString(36);

    const localizedTitle = { en: title, sv: svTitle };
    const localizedSlug = { en: slug, sv: svContent ? svSlug : slug };

    // Extract description from AI content
    const introduction: string = (content as Record<string, unknown>).introduction as string || '';
    const shortDesc = introduction.slice(0, 220).trim();
    const svIntroduction: string = svContent?.introduction || introduction;
    const svShortDesc = svIntroduction.slice(0, 220).trim();
    const localizedDesc = { en: introduction, sv: svIntroduction };
    const localizedShortDesc = { en: shortDesc, sv: svShortDesc };

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: localizedTitle,
        slug: localizedSlug,
        description: localizedDesc,
        short_description: localizedShortDesc,
        product_type: type,
        age_group: ageGroup || 'all',
        difficulty_level: difficulty || 'medium',
        status: ['published', 'draft', 'archived'].includes(status) ? status : 'draft',
        is_free: true,
        is_ai_generated: true,
        thumbnail_url: thumbnailUrl,
        file_url: fileUrl,
        mall_id: mallId || null,
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

    return NextResponse.json({ success: true, data, pdfSaved: !!fileUrl });
  } catch (err) {
    console.error('[Save Product] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save product' },
      { status: 500 }
    );
  }
}
