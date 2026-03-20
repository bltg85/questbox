import { createServiceClient } from '@/lib/supabase/server';
import type { Agent } from '@/types';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface FeedbackItem {
  fromProvider: string;
  toProvider: string;
  strengths: string[];
  improvements: string[];
  specificSuggestions: string[];
}

interface FeedbackLogEntry {
  id: string;
  council_run_id: string;
  agent_id: string;
  tier: string;
  product_type: string | null;
  theme: string | null;
  feedback_received: FeedbackItem[] | null;
  final_content: unknown;
  votes_received: number;
  won: boolean;
  elo_before: number | null;
  elo_after: number | null;
  elo_delta: number | null;
  created_at: string;
}

function eloColor(elo: number): string {
  if (elo >= 1700) return 'text-yellow-600';
  if (elo >= 1600) return 'text-green-600';
  if (elo >= 1500) return 'text-blue-600';
  return 'text-red-500';
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createServiceClient();

  const [{ data: agentRaw }, { data: logRaw }] = await Promise.all([
    supabase.from('agents').select('*').eq('id', id).single(),
    supabase
      .from('agent_feedback_log')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!agentRaw) notFound();

  const agent = agentRaw as Agent;
  const log = (logRaw || []) as FeedbackLogEntry[];

  // Aggregate strengths & improvements from all feedback
  const allStrengths: string[] = [];
  const allImprovements: string[] = [];

  for (const entry of log) {
    if (!entry.feedback_received) continue;
    for (const item of entry.feedback_received) {
      allStrengths.push(...(item.strengths || []));
      allImprovements.push(...(item.improvements || []));
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href={`/${locale}/admin/agents`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </Link>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-5xl">{agent.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-sm text-gray-500">
              {agent.provider} · {agent.model} ·{' '}
              <span className="capitalize">{agent.tier}</span>
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-3xl font-bold ${eloColor(agent.elo)}`}>{agent.elo} ELO</p>
            <p className="text-sm text-gray-500">
              {agent.wins}W · {agent.losses}L · {log.length} körningar
            </p>
          </div>
        </div>
      </div>

      {/* Aggregated feedback profile */}
      {(allStrengths.length > 0 || allImprovements.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {allStrengths.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-green-800">
                <TrendingUp className="h-4 w-4" /> Styrkor ({allStrengths.length} omnämnanden)
              </h2>
              <ul className="space-y-1.5">
                {allStrengths.slice(0, 10).map((s, i) => (
                  <li key={i} className="text-sm text-green-700">
                    · {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {allImprovements.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
                <TrendingDown className="h-4 w-4" /> Förbättringsområden ({allImprovements.length}{' '}
                omnämnanden)
              </h2>
              <ul className="space-y-1.5">
                {allImprovements.slice(0, 10).map((s, i) => (
                  <li key={i} className="text-sm text-amber-700">
                    · {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* System prompt */}
      {agent.system_prompt && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 font-semibold text-gray-700">System Prompt</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono">{agent.system_prompt}</pre>
        </div>
      )}

      {/* Feedback history */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Feedback-historik</h2>
        {log.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Inga körningar ännu.</p>
        ) : (
          <div className="space-y-4">
            {log.map((entry) => {
              const delta = entry.elo_delta ?? 0;
              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border p-4 ${entry.won ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {entry.won ? (
                          <span className="flex items-center gap-1 text-sm font-semibold text-green-700">
                            <Trophy className="h-4 w-4" /> Vann
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Förlorade</span>
                        )}
                        {entry.votes_received > 0 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                            {entry.votes_received} röst{entry.votes_received !== 1 ? 'er' : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {entry.product_type && (
                          <span className="capitalize">{entry.product_type}</span>
                        )}
                        {entry.theme && <span> · {entry.theme}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString('sv-SE')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {entry.elo_before !== null && entry.elo_after !== null && (
                        <div>
                          <p className="text-sm text-gray-500">
                            {entry.elo_before} → {entry.elo_after}
                          </p>
                          <p
                            className={`text-sm font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            {delta > 0 ? '+' : delta < 0 ? '' : <Minus className="inline h-3 w-3" />}
                            {delta !== 0 ? delta : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback received */}
                  {entry.feedback_received && entry.feedback_received.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {entry.feedback_received.map((fb, fi) => (
                        <div key={fi} className="rounded-lg bg-white border border-gray-100 p-3">
                          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Feedback från {fb.fromProvider}
                          </p>
                          {fb.strengths?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-green-700 mb-1">Styrkor</p>
                              <ul className="space-y-0.5">
                                {fb.strengths.map((s, si) => (
                                  <li key={si} className="text-xs text-gray-600">
                                    · {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {fb.improvements?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-amber-700 mb-1">
                                Förbättringar
                              </p>
                              <ul className="space-y-0.5">
                                {fb.improvements.map((s, si) => (
                                  <li key={si} className="text-xs text-gray-600">
                                    · {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {fb.specificSuggestions?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-700 mb-1">
                                Specifika förslag
                              </p>
                              <ul className="space-y-0.5">
                                {fb.specificSuggestions.map((s, si) => (
                                  <li key={si} className="text-xs text-gray-600">
                                    · {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
