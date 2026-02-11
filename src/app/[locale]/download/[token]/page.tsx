import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, Button } from '@/components/ui';
import { Download, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { getLocalizedValue } from '@/lib/utils';

interface DownloadPageProps {
  params: Promise<{ token: string }>;
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const t = await getTranslations('download');
  const { token } = await params;
  const supabase = await createClient();

  // Get download token
  const { data: downloadToken, error } = await supabase
    .from('download_tokens')
    .select('*, product:products(*)')
    .eq('token', token)
    .single();

  if (error || !downloadToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">
              {t('invalidToken')}
            </h1>
            <p className="mt-2 text-gray-500">
              The download link you used is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  const isExpired = new Date(downloadToken.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8">
            <Clock className="mx-auto h-12 w-12 text-yellow-500" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">
              Link Expired
            </h1>
            <p className="mt-2 text-gray-500">
              This download link has expired. Please request a new download link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check download count
  const maxReached = downloadToken.download_count >= downloadToken.max_downloads;
  if (maxReached) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">
              {t('maxDownloads')}
            </h1>
            <p className="mt-2 text-gray-500">
              You have used all {downloadToken.max_downloads} downloads for this link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const product = downloadToken.product as { name: { en: string; sv: string } };
  const productName = getLocalizedValue(product.name, 'en');
  const remainingDownloads = downloadToken.max_downloads - downloadToken.download_count;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md">
        <CardContent className="pt-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Your Download is Ready
          </h1>
          <p className="mt-2 text-gray-600">
            {productName}
          </p>

          <form action={`/api/download/${token}`} method="GET" className="mt-6">
            <Button type="submit" size="lg" className="w-full">
              <Download className="mr-2 h-5 w-5" />
              Download Now
            </Button>
          </form>

          <p className="mt-4 text-sm text-gray-500">
            {remainingDownloads} download{remainingDownloads !== 1 ? 's' : ''} remaining
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
