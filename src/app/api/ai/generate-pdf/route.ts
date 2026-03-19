import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { TreasureHuntPDF } from '@/lib/pdf/treasure-hunt-template';
import { QuizPDF } from '@/lib/pdf/quiz-template';
import type { DocumentProps } from '@react-pdf/renderer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, type } = body;

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
    }

    let element: React.ReactElement<DocumentProps>;

    switch (type) {
      case 'treasure_hunt':
        element = React.createElement(TreasureHuntPDF, { content }) as React.ReactElement<DocumentProps>;
        break;
      case 'quiz':
        element = React.createElement(QuizPDF, { content }) as React.ReactElement<DocumentProps>;
        break;
      default:
        return NextResponse.json({ error: `PDF not supported for type: ${type}` }, { status: 400 });
    }

    const buffer = await renderToBuffer(element);
    const title = content.title || 'product';
    const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[Generate PDF] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PDF generation failed' },
      { status: 500 }
    );
  }
}
