import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Package, FileDown, Users, TrendingUp } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch stats
  const [productsResult, subscribersResult, downloadsResult] = await Promise.all([
    supabase.from('products').select('id, status', { count: 'exact' }),
    supabase.from('subscribers').select('id', { count: 'exact' }),
    supabase.from('download_logs').select('id', { count: 'exact' }),
  ]);

  const totalProducts = productsResult.count || 0;
  const publishedProducts = productsResult.data?.filter((p) => p.status === 'published').length || 0;
  const totalSubscribers = subscribersResult.count || 0;
  const totalDownloads = downloadsResult.count || 0;

  // Today's stats
  const today = new Date().toISOString().split('T')[0];
  const [todayDownloads, todaySubscribers] = await Promise.all([
    supabase
      .from('download_logs')
      .select('id', { count: 'exact' })
      .gte('downloaded_at', today),
    supabase
      .from('subscribers')
      .select('id', { count: 'exact' })
      .gte('created_at', today),
  ]);

  const stats = [
    {
      name: 'Total Products',
      value: totalProducts,
      description: `${publishedProducts} published`,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Downloads',
      value: totalDownloads,
      description: `${todayDownloads.count || 0} today`,
      icon: FileDown,
      color: 'bg-green-500',
    },
    {
      name: 'Subscribers',
      value: totalSubscribers,
      description: `${todaySubscribers.count || 0} new today`,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Conversion Rate',
      value: totalDownloads > 0 ? `${Math.round((totalSubscribers / totalDownloads) * 100)}%` : '0%',
      description: 'Downloads to subscribers',
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="mt-1 text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/admin/products/new"
            className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <Package className="h-8 w-8 text-indigo-600" />
            <h3 className="mt-2 font-medium text-gray-900">Create Product</h3>
            <p className="text-sm text-gray-500">Add a new product manually</p>
          </a>
          <a
            href="/admin/ai-tools"
            className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <TrendingUp className="h-8 w-8 text-green-600" />
            <h3 className="mt-2 font-medium text-gray-900">AI Generator</h3>
            <p className="text-sm text-gray-500">Generate products with AI</p>
          </a>
          <a
            href="/admin/categories"
            className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <Users className="h-8 w-8 text-purple-600" />
            <h3 className="mt-2 font-medium text-gray-900">Manage Categories</h3>
            <p className="text-sm text-gray-500">Organize your products</p>
          </a>
        </div>
      </div>
    </div>
  );
}
