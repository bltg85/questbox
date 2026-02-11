import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Button, Badge } from '@/components/ui';
import { DownloadForm } from './download-form';
import { getLocalizedValue, getAgeGroupLabel, getDifficultyLabel, formatPrice } from '@/lib/utils';
import { Clock, Users, Download, Star } from 'lucide-react';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();
  const { slug } = await params;

  // Find product by slug (checking both en and sv slugs)
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('status', 'published');

  const product = products?.find((p) => {
    const slugData = p.slug as { en: string; sv: string };
    return slugData.en === slug || slugData.sv === slug;
  });

  if (!product) {
    notFound();
  }

  const name = getLocalizedValue(product.name as { en: string; sv: string }, locale);
  const description = getLocalizedValue(product.description as { en: string; sv: string }, locale);

  // Increment view count
  await supabase
    .from('products')
    .update({ view_count: (product.view_count || 0) + 1 })
    .eq('id', product.id);

  return (
    <div className="py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
            {product.thumbnail_url ? (
              <Image
                src={product.thumbnail_url}
                alt={name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl">📦</div>
                  <p className="mt-2">No image</p>
                </div>
              </div>
            )}
            {product.is_free && (
              <Badge variant="success" className="absolute left-4 top-4 text-sm">
                {t('common.free')}
              </Badge>
            )}
          </div>

          {/* Details */}
          <div>
            <Badge variant="secondary" className="mb-4">
              {t(`products.types.${product.product_type}`)}
            </Badge>

            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{name}</h1>

            {/* Meta info */}
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span>
                  {product.duration_minutes} {t('productDetail.minutes')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span>
                  {product.participants_min}
                  {product.participants_max && product.participants_max !== product.participants_min
                    ? `-${product.participants_max}`
                    : '+'}{' '}
                  {t('productDetail.people')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Download className="h-5 w-5" />
                <span>{product.download_count} {t('productDetail.downloads')}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">{getAgeGroupLabel(product.age_group, locale)}</Badge>
              <Badge variant="outline">{getDifficultyLabel(product.difficulty_level, locale)}</Badge>
              {product.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>

            {/* Price / Download */}
            <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
              {product.is_free ? (
                <DownloadForm productId={product.id} />
              ) : (
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price_sek)}
                  </p>
                  <Button size="lg" className="mt-4 w-full">
                    Coming Soon
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('productDetail.description')}
              </h2>
              <div
                className="prose mt-4 text-gray-600"
                dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br>') }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
