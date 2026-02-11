import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, locale: string = 'sv-SE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date, locale: string = 'sv-SE'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function getLocalizedValue<T>(obj: { en: T; sv: T }, locale: string): T {
  return locale === 'sv' ? obj.sv : obj.en;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function getAgeGroupLabel(ageGroup: string, locale: string = 'en'): string {
  const labels: Record<string, { en: string; sv: string }> = {
    toddler: { en: '2-4 years', sv: '2-4 år' },
    child: { en: '5-8 years', sv: '5-8 år' },
    teen: { en: '9-12 years', sv: '9-12 år' },
    adult: { en: '13+ years', sv: '13+ år' },
    all: { en: 'All ages', sv: 'Alla åldrar' },
  };
  return labels[ageGroup]?.[locale as 'en' | 'sv'] || ageGroup;
}

export function getDifficultyLabel(difficulty: string, locale: string = 'en'): string {
  const labels: Record<string, { en: string; sv: string }> = {
    easy: { en: 'Easy', sv: 'Lätt' },
    medium: { en: 'Medium', sv: 'Medel' },
    hard: { en: 'Hard', sv: 'Svår' },
  };
  return labels[difficulty]?.[locale as 'en' | 'sv'] || difficulty;
}

export function getProductTypeLabel(type: string, locale: string = 'en'): string {
  const labels: Record<string, { en: string; sv: string }> = {
    treasure_hunt: { en: 'Treasure Hunt', sv: 'Skattjakt' },
    quiz: { en: 'Quiz', sv: 'Frågesport' },
    diploma: { en: 'Diploma', sv: 'Diplom' },
    party_game: { en: 'Party Game', sv: 'Festlek' },
    escape_game: { en: 'Escape Game', sv: 'Escape-spel' },
  };
  return labels[type]?.[locale as 'en' | 'sv'] || type;
}
