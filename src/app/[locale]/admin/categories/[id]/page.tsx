import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CategoryForm } from '../category-form';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (!category) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Edit Category</h1>
      <CategoryForm category={category as any} />
    </div>
  );
}
