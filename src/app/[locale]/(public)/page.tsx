import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui';
import { ProductGrid } from '@/components/products';
import { createClient } from '@/lib/supabase/server';
import { ArrowRight, Sparkles, Gift, Trophy, Gamepad2 } from 'lucide-react';

export default async function HomePage() {
  const t = await getTranslations();
  const supabase = await createClient();

  // Fetch featured products
  const { data: featuredProducts } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .eq('is_featured', true)
    .limit(4);

  // Fetch latest products
  const { data: latestProducts } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(8);

  const features = [
    {
      icon: Sparkles,
      title: 'Treasure Hunts',
      description: 'Exciting adventures with riddles and clues for all ages',
      href: '/products?type=treasure_hunt',
    },
    {
      icon: Trophy,
      title: 'Quizzes',
      description: 'Fun trivia games for parties and learning',
      href: '/products?type=quiz',
    },
    {
      icon: Gift,
      title: 'Diplomas',
      description: 'Beautiful certificates to celebrate achievements',
      href: '/products?type=diploma',
    },
    {
      icon: Gamepad2,
      title: 'Party Games',
      description: 'Entertaining games for memorable gatherings',
      href: '/products?type=party_game',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-20 text-white md:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-6 text-lg text-white/90 md:text-xl">
              {t('hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/products">
                <Button size="lg" className="bg-green-500 text-white hover:bg-green-400 shadow-lg">
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/products?free=true">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  {t('hero.secondaryCta')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="bg-white py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {t('products.featured')}
              </h2>
              <Link href="/products" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                {t('common.viewDetails')} <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
            <ProductGrid products={featuredProducts as any} />
          </div>
        </section>
      )}

      {/* Latest Products */}
      {latestProducts && latestProducts.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {t('products.latest')}
              </h2>
              <Link href="/products" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                {t('common.viewDetails')} <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
            <ProductGrid products={latestProducts as any} />
          </div>
        </section>
      )}

      {/* Newsletter Section */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              {t('newsletter.title')}
            </h2>
            <p className="mt-4 text-indigo-100">
              {t('newsletter.subtitle')}
            </p>
            <form className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <input
                type="email"
                placeholder={t('newsletter.placeholder')}
                className="w-full rounded-lg border-0 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white sm:w-80"
              />
              <Button className="bg-white text-indigo-600 hover:bg-gray-100">
                {t('newsletter.button')}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
