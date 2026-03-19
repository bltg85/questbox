'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface UsageStats {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  monthCost: number;
  monthTokens: number;
  monthCalls: number;
  byProvider: Record<string, { cost: number; tokens: number; calls: number }>;
  byOperation: Record<string, { cost: number; tokens: number; calls: number }>;
  byModel: Record<string, { cost: number; tokens: number; calls: number; provider: string }>;
  recentLogs: Array<{
    id: string;
    provider: string;
    model: string;
    operation: string;
    context: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_usd: string;
    created_at: string;
  }>;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-800',
  anthropic: 'bg-orange-100 text-orange-800',
  google: 'bg-blue-100 text-blue-800',
};

const OPERATION_LABELS: Record<string, string> = {
  generate: 'Generering',
  feedback: 'Feedback',
  iterate: 'Iteration',
  vote: 'Röstning',
  image: 'Bildgenerering',
  single: 'Enstaka anrop',
};

function formatCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 100).toFixed(4)}¢`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AiCostsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai/usage')
      .then(r => r.json())
      .then(res => {
        if (res.success) setStats(res.data);
        else setError(res.error || 'Okänt fel');
      })
      .catch(() => setError('Kunde inte hämta data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">AI-kostnader</h1>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const totalCostSEK = stats.totalCost * 10.5; // rough USD→SEK
  const monthCostSEK = stats.monthCost * 10.5;

  // Sort models by cost descending
  const modelEntries = Object.entries(stats.byModel).sort((a, b) => b[1].cost - a[1].cost);
  const providerEntries = Object.entries(stats.byProvider).sort((a, b) => b[1].cost - a[1].cost);
  const operationEntries = Object.entries(stats.byOperation).sort((a, b) => b[1].cost - a[1].cost);

  const totalProviderCost = providerEntries.reduce((s, [, v]) => s + v.cost, 0) || 1;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">AI-kostnader</h1>
        <p className="text-sm text-gray-500">Priser är uppskattningar — uppdateras inte automatiskt</p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total kostnad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCost(stats.totalCost)}</div>
            <div className="text-sm text-gray-500">≈ {totalCostSEK.toFixed(2)} SEK</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Denna månad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatCost(stats.monthCost)}</div>
            <div className="text-sm text-gray-500">≈ {monthCostSEK.toFixed(2)} SEK</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Totalt tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatTokens(stats.totalTokens)}</div>
            <div className="text-sm text-gray-500">{stats.totalCalls} anrop totalt</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Denna månad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatTokens(stats.monthTokens)}</div>
            <div className="text-sm text-gray-500">{stats.monthCalls} anrop</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* By provider */}
        <Card>
          <CardHeader>
            <CardTitle>Per leverantör</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {providerEntries.length === 0 && (
              <p className="text-center text-sm text-gray-500">Ingen data ännu</p>
            )}
            {providerEntries.map(([provider, data]) => {
              const pct = Math.round((data.cost / totalProviderCost) * 100);
              return (
                <div key={provider}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`rounded px-2 py-0.5 font-medium capitalize ${PROVIDER_COLORS[provider] ?? 'bg-gray-100 text-gray-800'}`}>
                      {provider}
                    </span>
                    <span className="font-medium text-gray-900">{formatCost(data.cost)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{formatTokens(data.tokens)} tokens · {data.calls} anrop</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By operation */}
        <Card>
          <CardHeader>
            <CardTitle>Per operation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {operationEntries.length === 0 && (
              <p className="text-center text-sm text-gray-500">Ingen data ännu</p>
            )}
            {operationEntries.map(([op, data]) => (
              <div key={op} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900">{OPERATION_LABELS[op] ?? op}</div>
                  <div className="text-xs text-gray-500">{data.calls} anrop · {formatTokens(data.tokens)} tokens</div>
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatCost(data.cost)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By model */}
        <Card>
          <CardHeader>
            <CardTitle>Per modell</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {modelEntries.length === 0 && (
              <p className="text-center text-sm text-gray-500">Ingen data ännu</p>
            )}
            {modelEntries.map(([model, data]) => (
              <div key={model} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-gray-900 font-mono">{model}</div>
                  <div className="text-xs text-gray-500">{data.calls} anrop · {formatTokens(data.tokens)} tokens</div>
                </div>
                <div className="text-sm font-semibold text-gray-900">{formatCost(data.cost)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent logs */}
      <Card>
        <CardHeader>
          <CardTitle>Senaste anrop</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">Ingen data ännu — kör council eller generering för att se kostnader här</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4">Tid</th>
                    <th className="pb-2 pr-4">Leverantör</th>
                    <th className="pb-2 pr-4">Modell</th>
                    <th className="pb-2 pr-4">Operation</th>
                    <th className="pb-2 pr-4">Tokens (in/ut)</th>
                    <th className="pb-2">Kostnad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${PROVIDER_COLORS[log.provider] ?? 'bg-gray-100 text-gray-800'}`}>
                          {log.provider}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">{log.model}</td>
                      <td className="py-2 pr-4 text-gray-700">{OPERATION_LABELS[log.operation] ?? log.operation}</td>
                      <td className="py-2 pr-4 text-gray-600">
                        {log.operation === 'image'
                          ? '—'
                          : `${formatTokens(log.prompt_tokens)} / ${formatTokens(log.completion_tokens)}`}
                      </td>
                      <td className="py-2 font-medium text-gray-900">{formatCost(Number(log.estimated_cost_usd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
