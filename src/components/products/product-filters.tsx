'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, Button } from '@/components/ui';
import { X } from 'lucide-react';
import type { Category } from '@/types';

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get('type') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentAge = searchParams.get('age') || '';
  const currentDifficulty = searchParams.get('difficulty') || '';
  const currentFree = searchParams.get('free') || '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/products');
  };

  const hasFilters = currentType || currentCategory || currentAge || currentDifficulty || currentFree;

  const typeOptions = [
    { value: '', label: t('common.all') },
    { value: 'treasure_hunt', label: t('products.types.treasure_hunt') },
    { value: 'quiz', label: t('products.types.quiz') },
    { value: 'diploma', label: t('products.types.diploma') },
    { value: 'party_game', label: t('products.types.party_game') },
    { value: 'escape_game', label: t('products.types.escape_game') },
  ];

  const ageOptions = [
    { value: '', label: t('common.all') },
    { value: 'toddler', label: t('products.ageGroups.toddler') },
    { value: 'child', label: t('products.ageGroups.child') },
    { value: 'teen', label: t('products.ageGroups.teen') },
    { value: 'adult', label: t('products.ageGroups.adult') },
    { value: 'all', label: t('products.ageGroups.all') },
  ];

  const difficultyOptions = [
    { value: '', label: t('common.all') },
    { value: 'easy', label: t('products.difficulty.easy') },
    { value: 'medium', label: t('products.difficulty.medium') },
    { value: 'hard', label: t('products.difficulty.hard') },
  ];

  const freeOptions = [
    { value: '', label: t('common.all') },
    { value: 'true', label: t('common.free') },
  ];

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-auto sm:min-w-[150px]">
          <Select
            label={t('products.filters.type')}
            options={typeOptions}
            value={currentType}
            onChange={(e) => updateFilter('type', e.target.value)}
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[150px]">
          <Select
            label={t('products.filters.ageGroup')}
            options={ageOptions}
            value={currentAge}
            onChange={(e) => updateFilter('age', e.target.value)}
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[150px]">
          <Select
            label={t('products.filters.difficulty')}
            options={difficultyOptions}
            value={currentDifficulty}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
          />
        </div>

        <div className="w-full sm:w-auto sm:min-w-[150px]">
          <Select
            label={t('products.filters.price')}
            options={freeOptions}
            value={currentFree}
            onChange={(e) => updateFilter('free', e.target.value)}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
