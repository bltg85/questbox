import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default async function AdminSubscribersPage() {
  const supabase = await createClient();

  const { data: subscribers, count } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'unsubscribed':
        return <Badge variant="secondary">Unsubscribed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscribers</h1>
          <p className="mt-1 text-sm text-gray-500">{count || 0} total subscribers</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Locale
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Subscribed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {subscribers?.map((subscriber) => (
              <tr key={subscriber.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                  {subscriber.email}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {subscriber.name || '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {getStatusBadge(subscriber.status)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {subscriber.locale?.toUpperCase() || 'EN'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {formatDate(subscriber.created_at)}
                </td>
              </tr>
            ))}
            {(!subscribers || subscribers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
