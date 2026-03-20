import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }
    if (!['published', 'draft', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { error } = await supabase
      .from('products')
      .update({ status })
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update products' },
      { status: 500 }
    );
  }
}
