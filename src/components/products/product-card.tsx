'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, Users, Download } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { getLocalizedValue, getAgeGroupLabel, getDifficultyLabel } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const name = getLocalizedValue(product.name, locale);
  const slug = getLocalizedValue(product.slug, locale);
  const shortDescription = product.short_description
    ? getLocalizedValue(product.short_description, locale)
    : '';

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/products/${slug}`}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {product.thumbnail_url ? (
            <Image
              src={product.thumbnail_url}
              alt={name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <Package className="h-12 w-12" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {product.is_free && (
              <Badge variant="success">{t('common.free')}</Badge>
            )}
            {product.is_featured && (
              <Badge variant="default">Featured</Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Type badge */}
          <Badge variant="secondary" className="mb-2">
            {t(`products.types.${product.product_type}`)}
          </Badge>

          <h3 className="mb-2 text-lg font-semibold text-gray-900 line-clamp-1">
            {name}
          </h3>

          {shortDescription && (
            <p className="mb-3 text-sm text-gray-600 line-clamp-2">
              {shortDescription}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {product.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {product.duration_minutes} {t('productDetail.minutes')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {product.participants_min}
              {product.participants_max && product.participants_max !== product.participants_min
                ? `-${product.participants_max}`
                : '+'}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {product.download_count}
            </span>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {getAgeGroupLabel(product.age_group, locale)}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {getDifficultyLabel(product.difficulty_level, locale)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

// Placeholder icon for when no image
function Package(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
