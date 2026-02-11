'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { generateSlug } from '@/lib/utils';
import type { Category, CategoryFormData } from '@/types';

interface CategoryFormProps {
  category?: Category;
}

export function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || { en: '', sv: '' },
    slug: category?.slug || { en: '', sv: '' },
    description: category?.description || { en: '', sv: '' },
    parent_id: category?.parent_id || null,
    sort_order: category?.sort_order || 0,
  });

  const handleNameChange = (locale: 'en' | 'sv', value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: { ...prev.name, [locale]: value },
      slug: { ...prev.slug, [locale]: generateSlug(value) },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (category) {
        await fetch(`/api/categories/${category.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Name (English)"
              value={formData.name.en}
              onChange={(e) => handleNameChange('en', e.target.value)}
              required
            />
            <Input
              label="Name (Swedish)"
              value={formData.name.sv}
              onChange={(e) => handleNameChange('sv', e.target.value)}
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Slug (English)"
              value={formData.slug.en}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: { ...prev.slug, en: e.target.value } }))
              }
              required
            />
            <Input
              label="Slug (Swedish)"
              value={formData.slug.sv}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: { ...prev.slug, sv: e.target.value } }))
              }
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Textarea
              label="Description (English)"
              value={formData.description?.en || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: { en: e.target.value, sv: prev.description?.sv || '' },
                }))
              }
              rows={3}
            />
            <Textarea
              label="Description (Swedish)"
              value={formData.description?.sv || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: { en: prev.description?.en || '', sv: e.target.value },
                }))
              }
              rows={3}
            />
          </div>

          <Input
            label="Sort Order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {category ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
