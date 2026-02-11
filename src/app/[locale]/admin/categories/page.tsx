import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Badge } from '@/components/ui';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getLocalizedValue } from '@/lib/utils';
import { DeleteCategoryButton } from './delete-button';

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <Link href="/admin/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Sort Order
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {categories?.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                        📁
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">
                        {getLocalizedValue(category.name as any, 'en')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getLocalizedValue(category.name as any, 'sv')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {getLocalizedValue(category.slug as any, 'en')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {category.sort_order}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/categories/${category.id}`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteCategoryButton categoryId={category.id} />
                  </div>
                </td>
              </tr>
            ))}
            {(!categories || categories.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No categories yet. Create your first category!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
