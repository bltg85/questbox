'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: Locale) => {
    // Remove the current locale prefix if present
    let newPath = pathname;

    // If current path starts with a locale, remove it
    for (const loc of locales) {
      if (pathname.startsWith(`/${loc}/`)) {
        newPath = pathname.substring(loc.length + 1);
        break;
      } else if (pathname === `/${loc}`) {
        newPath = '/';
        break;
      }
    }

    // Add the new locale prefix if not default (en)
    if (newLocale === 'en') {
      router.push(newPath);
    } else {
      router.push(`/${newLocale}${newPath}`);
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            locale === loc
              ? 'bg-indigo-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
