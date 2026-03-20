'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Select, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { generateSlug } from '@/lib/utils';
import type { Product, Category, ProductFormData, Agent } from '@/types';
import { ImageIcon, Upload, Sparkles, FileText, ClipboardCheck } from 'lucide-react';

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.thumbnail_url || null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [textAgent, setTextAgent] = useState<Agent | null>(null);
  const [imageAgent, setImageAgent] = useState<Agent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || { en: '', sv: '' },
    slug: product?.slug || { en: '', sv: '' },
    description: product?.description || { en: '', sv: '' },
    short_description: product?.short_description || { en: '', sv: '' },
    product_type: product?.product_type || 'treasure_hunt',
    category_id: product?.category_id || null,
    age_group: product?.age_group || 'all',
    difficulty_level: product?.difficulty_level || 'medium',
    duration_minutes: product?.duration_minutes || 30,
    participants_min: product?.participants_min || 1,
    participants_max: product?.participants_max || null,
    price_sek: product?.price_sek || 0,
    is_free: product?.is_free ?? true,
    status: product?.status || 'draft',
    is_featured: product?.is_featured || false,
    tags: product?.tags || [],
    thumbnail_url: product?.thumbnail_url || null,
  });

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data as any);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!product) return;
    async function fetchAgents() {
      const ids = [product!.text_agent_id, product!.image_agent_id].filter(Boolean);
      if (!ids.length) return;
      const { data } = await supabase.from('agents').select('*').in('id', ids);
      if (!data) return;
      if (product!.text_agent_id) setTextAgent(data.find((a) => a.id === product!.text_agent_id) ?? null);
      if (product!.image_agent_id) setImageAgent(data.find((a) => a.id === product!.image_agent_id) ?? null);
    }
    fetchAgents();
  }, [product]);

  const uploadImageDataUrl = async (dataUrl: string) => {
    const slug = formData.slug.en || formData.slug.sv || 'product';
    setImageUploading(true);
    setImageError('');
    try {
      const res = await fetch('/api/products/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
      setFormData((prev) => ({ ...prev, thumbnail_url: data.thumbnailUrl }));
      setImagePreview(data.thumbnailUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      await uploadImageDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiImage = async () => {
    const theme = formData.name.en || formData.name.sv || 'product';
    setImageUploading(true);
    setImageError('');
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.product_type,
          theme,
          ageGroup: formData.age_group,
        }),
      });
      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        throw new Error(res.status === 504 ? 'Image generation timed out. Try again.' : `Server error (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      setImagePreview(data.imageDataUrl);
      await uploadImageDataUrl(data.imageDataUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Generation failed');
      setImageUploading(false);
    }
  };

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
      if (product) {
        // Update
        await fetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // Create
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setLoading(false);
    }
  };

  const productTypeOptions = [
    { value: 'treasure_hunt', label: 'Treasure Hunt' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'diploma', label: 'Diploma' },
    { value: 'party_game', label: 'Party Game' },
    { value: 'escape_game', label: 'Escape Game' },
  ];

  const ageGroupOptions = [
    { value: 'toddler', label: '2-4 years' },
    { value: 'child', label: '5-8 years' },
    { value: 'teen', label: '9-12 years' },
    { value: 'adult', label: '13+ years' },
    { value: 'all', label: 'All ages' },
  ];

  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
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
              label="Short Description (English)"
              value={formData.short_description?.en || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  short_description: { en: e.target.value, sv: prev.short_description?.sv || '' },
                }))
              }
              rows={2}
            />
            <Textarea
              label="Short Description (Swedish)"
              value={formData.short_description?.sv || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  short_description: { en: prev.short_description?.en || '', sv: e.target.value },
                }))
              }
              rows={2}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Textarea
              label="Description (English)"
              value={formData.description.en}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: { ...prev.description, en: e.target.value },
                }))
              }
              rows={5}
              required
            />
            <Textarea
              label="Description (Swedish)"
              value={formData.description.sv}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: { ...prev.description, sv: e.target.value },
                }))
              }
              rows={5}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Image */}
      <Card>
        <CardHeader>
          <CardTitle>Product Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {/* Preview */}
            <div className="h-40 w-40 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {imagePreview ? (
                <img src={imagePreview} alt="Thumbnail" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>
            {/* Controls */}
            <div className="flex flex-col justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAiImage}
                disabled={imageUploading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {imageUploading ? 'Generating...' : 'Generate with AI'}
              </Button>
              {formData.thumbnail_url && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData((prev) => ({ ...prev, thumbnail_url: null }));
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove image
                </button>
              )}
              {imageError && <p className="text-xs text-red-500">{imageError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Details */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Select
              label="Product Type"
              options={productTypeOptions}
              value={formData.product_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_type: e.target.value as any }))}
            />
            <Select
              label="Age Group"
              options={ageGroupOptions}
              value={formData.age_group}
              onChange={(e) => setFormData((prev) => ({ ...prev, age_group: e.target.value as any }))}
            />
            <Select
              label="Difficulty"
              options={difficultyOptions}
              value={formData.difficulty_level}
              onChange={(e) => setFormData((prev) => ({ ...prev, difficulty_level: e.target.value as any }))}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.duration_minutes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, duration_minutes: parseInt(e.target.value) || null }))}
            />
            <Input
              label="Min Participants"
              type="number"
              value={formData.participants_min}
              onChange={(e) => setFormData((prev) => ({ ...prev, participants_min: parseInt(e.target.value) || 1 }))}
            />
            <Input
              label="Max Participants"
              type="number"
              value={formData.participants_max || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, participants_max: parseInt(e.target.value) || null }))}
            />
          </div>

          <Select
            label="Category"
            options={[
              { value: '', label: 'No category' },
              ...categories.map((c) => ({
                value: c.id,
                label: (c.name as any).en,
              })),
            ]}
            value={formData.category_id || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value || null }))}
          />
        </CardContent>
      </Card>

      {/* Pricing & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Free Product</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_free}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_free: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">This product is free</span>
              </label>
            </div>
            {!formData.is_free && (
              <Input
                label="Price (SEK)"
                type="number"
                value={formData.price_sek}
                onChange={(e) => setFormData((prev) => ({ ...prev, price_sek: parseFloat(e.target.value) || 0 }))}
              />
            )}
            <Select
              label="Status"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">Featured product (show on homepage)</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* AI Content (read-only) */}
      {product?.is_ai_generated && (
        <Card>
          <CardHeader>
            <CardTitle>AI-genererat innehåll</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(textAgent || imageAgent) && (
            <div className="flex flex-wrap gap-3 mb-3">
              {textAgent && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
                  <span>{textAgent.icon}</span>
                  <span className="font-medium">{textAgent.name}</span>
                  <span className="text-indigo-400">·</span>
                  <span className="text-xs text-indigo-500">text</span>
                </div>
              )}
              {imageAgent && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm text-purple-700">
                  <span>{imageAgent.icon}</span>
                  <span className="font-medium">{imageAgent.name}</span>
                  <span className="text-purple-400">·</span>
                  <span className="text-xs text-purple-500">bild</span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
              <a
                href={`/api/products/${product.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  product.file_url
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                {product.file_url ? 'Visa PDF' : 'Generera PDF-preview'}
              </a>
              <a
                href={`/admin/review/${product.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ClipboardCheck className="h-4 w-4" />
                Öppna i Review
              </a>
            </div>
            {product.ai_generation_data && (
              <details className="rounded-lg border border-gray-100 bg-gray-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-600">
                  Visa AI-innehåll (JSON)
                </summary>
                <pre className="max-h-64 overflow-auto p-3 text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(
                    (product.ai_generation_data as unknown as Record<string, unknown>)?.parameters,
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
