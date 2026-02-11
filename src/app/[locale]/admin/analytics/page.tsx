import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { getLocalizedValue, formatDate } from '@/lib/utils';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Get download logs with product info
  const { data: recentDownloads } = await supabase
    .from('download_logs')
    .select('*, product:products(name)')
    .order('downloaded_at', { ascending: false })
    .limit(20);

  // Get top products by downloads
  const { data: topProducts } = await supabase
    .from('products')
    .select('id, name, download_count, view_count')
    .order('download_count', { ascending: false })
    .limit(10);

  // Get page views (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: recentViews } = await supabase
    .from('page_views')
    .select('id', { count: 'exact' })
    .gte('viewed_at', sevenDaysAgo.toISOString());

  const { count: recentDownloadCount } = await supabase
    .from('download_logs')
    .select('id', { count: 'exact' })
    .gte('downloaded_at', sevenDaysAgo.toISOString());

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Analytics</h1>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Page Views (Last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{recentViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Downloads (Last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{recentDownloadCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts?.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">
                      {getLocalizedValue(product.name as any, 'en')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {product.download_count} downloads
                  </div>
                </div>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <p className="text-center text-gray-500">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Downloads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDownloads?.map((download) => (
                <div key={download.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {download.product?.name
                        ? getLocalizedValue(download.product.name as any, 'en')
                        : 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">{download.email}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(download.downloaded_at)}
                  </div>
                </div>
              ))}
              {(!recentDownloads || recentDownloads.length === 0) && (
                <p className="text-center text-gray-500">No downloads yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
