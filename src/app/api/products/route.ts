import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false });

  // Apply filters
  const status = searchParams.get('status');
  if (status) {
    query = query.eq('status', status);
  }

  const type = searchParams.get('type');
  if (type) {
    query = query.eq('product_type', type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('products')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
