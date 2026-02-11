import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ProductGrid, ProductFilters } from '@/components/products';

interface ProductsPageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    age?: string;
    difficulty?: string;
    free?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const t = await getTranslations();
  const supabase = await createClient();
  const params = await searchParams;

  // Build query
  let query = supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // Apply filters
  if (params.type) {
    query = query.eq('product_type', params.type);
  }
  if (params.category) {
    query = query.eq('category_id', params.category);
  }
  if (params.age) {
    query = query.eq('age_group', params.age);
  }
  if (params.difficulty) {
    query = query.eq('difficulty_level', params.difficulty);
  }
  if (params.free === 'true') {
    query = query.eq('is_free', true);
  }

  const { data: products } = await query;
  const { data: categories } = await supabase.from('categories').select('*');

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 md:text-4xl">
          {t('products.title')}
        </h1>

        <ProductFilters categories={categories || []} />

        <p className="mb-6 text-sm text-gray-500">
          {t('products.showingResults', { count: products?.length || 0 })}
        </p>

        <ProductGrid products={(products as any) || []} />
      </div>
    </div>
  );
}
