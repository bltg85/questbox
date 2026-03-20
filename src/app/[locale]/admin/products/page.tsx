'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import { Plus, Edit, Eye, Globe } from 'lucide-react';
import { getLocalizedValue } from '@/lib/utils';
import { DeleteProductButton } from './delete-button';

interface Product {
  id: string;
  name: unknown;
  slug: unknown;
  status: string;
  product_type: string;
  price_sek: number;
  is_free: boolean;
  is_ai_generated: boolean;
  download_count: number;
  thumbnail_url: string | null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      setProducts(data.data ?? []);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(products.map((p) => p.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkPublish = async () => {
    if (selected.size === 0) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), status: 'published' }),
      });
      if (res.ok) {
        setSelected(new Set());
        await loadProducts();
      }
    } finally {
      setPublishing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge variant="success">Published</Badge>;
      case 'draft': return <Badge variant="warning">Draft</Badge>;
      case 'archived': return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const allChecked = products.length > 0 && selected.size === products.length;
  const someChecked = selected.size > 0 && !allChecked;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <Button onClick={bulkPublish} disabled={publishing} size="sm">
              <Globe className="mr-2 h-4 w-4" />
              {publishing ? 'Publishing...' : `Publish ${selected.size} selected`}
            </Button>
          )}
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Downloads
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {products.map((product) => (
              <tr key={product.id} className={`hover:bg-gray-50 ${selected.has(product.id) ? 'bg-indigo-50' : ''}`}>
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggleOne(product.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-100">
                      {product.thumbnail_url ? (
                        <img
                          src={product.thumbnail_url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center text-gray-400">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">
                        {getLocalizedValue(product.name as any, 'en')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.is_free ? 'Free' : `${product.price_sek} SEK`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge variant="outline">{product.product_type}</Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {getStatusBadge(product.status)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {product.download_count}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {product.status === 'published' ? (
                      <Link href={`/en/products/${getLocalizedValue(product.slug as any, 'en')}`}>
                        <Button variant="ghost" size="icon" title="View public page">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (product as any).is_ai_generated ? (
                      <Link href={`/admin/review/${product.id}`}>
                        <Button variant="ghost" size="icon" title="Review (draft)">
                          <Eye className="h-4 w-4 text-amber-400" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="icon" disabled title="Not published">
                        <Eye className="h-4 w-4 text-gray-300" />
                      </Button>
                    )}
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteProductButton productId={product.id} onDeleted={loadProducts} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No products yet. Create your first product!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
