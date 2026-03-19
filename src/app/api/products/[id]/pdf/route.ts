import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { TreasureHuntPDF } from '@/lib/pdf/treasure-hunt-template';
import { QuizPDF } from '@/lib/pdf/quiz-template';
import type { DocumentProps } from '@react-pdf/renderer';
import type { TreasureHuntContent, QuizContent } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('product_type, ai_generation_data, name')
    .eq('id', id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const content = (product.ai_generation_data as Record<string, unknown> | null)
    ?.parameters as Record<string, unknown> | undefined;

  if (!content?.content) {
    return NextResponse.json({ error: 'No AI content found for this product' }, { status: 400 });
  }

  let element: React.ReactElement<DocumentProps> | null = null;

  switch (product.product_type) {
    case 'treasure_hunt':
      element = React.createElement(TreasureHuntPDF, {
        content: content.content as TreasureHuntContent,
      }) as React.ReactElement<DocumentProps>;
      break;
    case 'quiz':
      element = React.createElement(QuizPDF, {
        content: content.content as QuizContent,
      }) as React.ReactElement<DocumentProps>;
      break;
    default:
      return NextResponse.json(
        { error: `PDF preview not supported for type: ${product.product_type}` },
        { status: 400 }
      );
  }

  const buffer = await renderToBuffer(element);
  const title = (product.name as unknown as Record<string, string>)?.en || 'product';
  const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}.pdf"`,
    },
  });
}
