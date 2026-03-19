'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: t('navigation.treasureHunts'), href: '/products?type=treasure_hunt' },
    { name: t('navigation.quizzes'), href: '/products?type=quiz' },
    { name: t('navigation.diplomas'), href: '/products?type=diploma' },
    { name: t('navigation.partyGames'), href: '/products?type=party_game' },
    { name: t('navigation.freeProducts'), href: '/products?free=true' },
  ];

  const companyLinks = [
    { name: t('footer.about'), href: '/about' },
    { name: t('footer.contact'), href: '/contact' },
    { name: t('footer.faq'), href: '/faq' },
  ];

  const legalLinks = [
    { name: t('footer.terms'), href: '/terms' },
    { name: t('footer.privacy'), href: '/privacy' },
    { name: t('footer.cookies'), href: '/cookies' },
  ];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                Q
              </div>
              <span className="text-xl font-bold text-gray-900">QuestBox</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600">{t('footer.tagline')}</p>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('footer.products')}</h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('footer.company')}</h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('footer.legal')}</h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <p className="text-xs text-gray-400">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
              <span className="ml-1">({process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)})</span>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
