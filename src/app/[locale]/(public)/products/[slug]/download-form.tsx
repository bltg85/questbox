'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@/components/ui';
import { Mail, CheckCircle } from 'lucide-react';

interface DownloadFormProps {
  productId: string;
}

export function DownloadForm({ productId }: DownloadFormProps) {
  const t = useTranslations('download');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/download/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, email }),
      });

      if (!res.ok) {
        throw new Error('Failed to request download');
      }

      setSuccess(true);
    } catch (err) {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('success')}</h3>
        <p className="mt-2 text-sm text-gray-600">{t('emailSent')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
      <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>

      <div className="mt-4">
        <Input
          type="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={error}
        />
      </div>

      <Button type="submit" className="mt-4 w-full" loading={loading}>
        <Mail className="mr-2 h-4 w-4" />
        {t('submitButton')}
      </Button>
    </form>
  );
}
