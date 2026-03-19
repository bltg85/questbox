import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { ClipboardCheck, FileText, Clock } from 'lucide-react';
import type { Product } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  treasure_hunt: 'Treasure Hunt',
  quiz: 'Quiz',
  diploma: 'Diploma',
  party_game: 'Party Game',
  escape_game: 'Escape Game',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-700',
};

export default async function ReviewPage() {
  const supabase = await createServiceClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_ai_generated', true)
    .order('created_at', { ascending: false });

  const items = (products || []) as Product[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-genererade produkter som väntar på granskning och godkännande.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
          <ClipboardCheck className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Inga AI-genererade produkter att granska.</p>
          <Link
            href="/admin/ai-tools"
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
          >
            Generera med AI Council →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => {
            const title = product.name?.en || 'Untitled';
            const theme =
              (product.ai_generation_data as Record<string, unknown> | null)?.prompt as
                | string
                | undefined;
            const hasPdf = !!product.file_url;
            const createdAt = new Date(product.created_at).toLocaleDateString('sv-SE');

            return (
              <Link
                key={product.id}
                href={`/admin/review/${product.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative h-40 w-full bg-gray-100">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  {/* Status badge */}
                  <span
                    className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[product.status] ?? ''}`}
                  >
                    {product.status}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                    {TYPE_LABELS[product.product_type] ?? product.product_type}
                  </p>
                  <h2 className="font-semibold text-gray-900 group-hover:text-indigo-700 line-clamp-2">
                    {title}
                  </h2>
                  {theme && (
                    <p className="text-xs text-gray-500 line-clamp-1">Tema: {theme}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {createdAt}
                    </span>
                    <span
                      className={`text-xs font-medium ${hasPdf ? 'text-green-600' : 'text-orange-400'}`}
                    >
                      {hasPdf ? 'PDF klar' : 'Ingen PDF'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
