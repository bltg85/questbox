'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle,
  Archive,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import type { Product } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  treasure_hunt: 'Treasure Hunt',
  quiz: 'Quiz',
  diploma: 'Diploma',
  party_game: 'Party Game',
  escape_game: 'Escape Game',
};

const AGE_LABELS: Record<string, string> = {
  toddler: 'Liten (toddler)',
  child: 'Barn',
  teen: 'Tonåring',
  adult: 'Vuxen',
  all: 'Alla åldrar',
};

const DIFF_LABELS: Record<string, string> = {
  easy: 'Lätt',
  medium: 'Medel',
  hard: 'Svår',
};

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [pdfKey, setPdfKey] = useState(0);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        setProduct(data);
        setNotes((data as Product & { review_notes?: string })?.review_notes ?? '');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function updateProduct(fields: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      setProduct(json.data);
      return true;
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Fel', type: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    const ok = await updateProduct({ status: 'published', review_notes: notes });
    if (ok) setMessage({ text: 'Produkt godkänd och publicerad!', type: 'success' });
  }

  async function handleArchive() {
    const ok = await updateProduct({ status: 'archived', review_notes: notes });
    if (ok) setMessage({ text: 'Produkt arkiverad.', type: 'success' });
  }

  async function handleSaveNotes() {
    const ok = await updateProduct({ review_notes: notes });
    if (ok) setMessage({ text: 'Anteckningar sparade.', type: 'success' });
  }

  async function handleRegeneratePdf() {
    if (!product) return;
    setSaving(true);
    setMessage(null);
    try {
      const genRes = await fetch('/api/ai/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: (product.ai_generation_data as unknown as Record<string, unknown>)?.parameters
            ? ((product.ai_generation_data as unknown as Record<string, unknown>).parameters as Record<string, unknown>).content
            : null,
          type: product.product_type,
        }),
      });
      if (!genRes.ok) throw new Error('PDF-generering misslyckades');
      const pdfBuffer = await genRes.arrayBuffer();

      // Upload via a FormData POST to a small helper
      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'product.pdf');
      formData.append('productId', product.id);
      formData.append('slug', product.slug?.en ?? product.id);

      const uploadRes = await fetch('/api/products/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed');

      await updateProduct({ file_url: uploadJson.fileUrl });
      setPdfKey((k) => k + 1);
      setMessage({ text: 'PDF regenererad och sparad!', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Fel', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return <p className="text-gray-500">Produkt hittades inte.</p>;
  }

  const title = product.name?.en || 'Untitled';
  const genData = product.ai_generation_data as unknown as Record<string, unknown> | null;
  const theme = genData?.prompt as string | undefined;
  const genParams = genData?.parameters as Record<string, unknown> | undefined;
  const aiContent = genParams?.content ?? null;

  const pdfPreviewUrl = `/api/products/${id}/pdf`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/review')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till listan
        </button>
        <span className="text-gray-300">|</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            product.status === 'published'
              ? 'bg-green-100 text-green-800'
              : product.status === 'archived'
                ? 'bg-gray-100 text-gray-700'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {product.status}
        </span>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* LEFT: PDF Preview */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">PDF Preview</h2>
            <div className="flex gap-2">
              {!product.file_url && (
                <button
                  onClick={handleRegeneratePdf}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Generera PDF
                </button>
              )}
              <a
                href={pdfPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                Öppna i nytt fönster
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <iframe
              key={pdfKey}
              src={pdfPreviewUrl}
              className="h-[70vh] w-full"
              title="PDF Preview"
            />
          </div>
        </div>

        {/* RIGHT: Info + Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex gap-3">
              {product.thumbnail_url && (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={product.thumbnail_url}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                  {TYPE_LABELS[product.product_type] ?? product.product_type}
                </p>
                <h1 className="font-bold text-gray-900 leading-tight">{title}</h1>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {theme && (
                <>
                  <dt className="text-gray-500">Tema</dt>
                  <dd className="font-medium text-gray-900 truncate">{theme}</dd>
                </>
              )}
              <dt className="text-gray-500">Åldersgrupp</dt>
              <dd className="font-medium text-gray-900">
                {AGE_LABELS[product.age_group] ?? product.age_group}
              </dd>
              <dt className="text-gray-500">Svårighetsgrad</dt>
              <dd className="font-medium text-gray-900">
                {DIFF_LABELS[product.difficulty_level] ?? product.difficulty_level}
              </dd>
              <dt className="text-gray-500">PDF sparad</dt>
              <dd className={`font-medium ${product.file_url ? 'text-green-700' : 'text-orange-500'}`}>
                {product.file_url ? 'Ja' : 'Nej'}
              </dd>
            </dl>

            <Link
              href={`/admin/products/${product.id}`}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Redigera i admin
            </Link>
          </div>

          {/* Review notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Granskningsanteckningar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Skriv kommentarer, förbättringsförslag eller godkännandenoter..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              {saving ? 'Sparar...' : 'Spara anteckningar'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleApprove}
              disabled={saving || product.status === 'published'}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {product.status === 'published' ? 'Redan publicerad' : 'Godkänn och publicera'}
            </button>
            <button
              onClick={handleArchive}
              disabled={saving || product.status === 'archived'}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              {product.status === 'archived' ? 'Redan arkiverad' : 'Avvisa (arkivera)'}
            </button>
          </div>

          {/* JSON content collapsible */}
          {aiContent && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <button
                onClick={() => setShowJson((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900"
              >
                AI-innehåll (JSON)
                {showJson ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {showJson && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(aiContent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
