import { createServiceClient } from '@/lib/supabase/server';
import type { Agent } from '@/types';
import { Trophy, Swords, TrendingUp, Activity } from 'lucide-react';
import AgentEditPanel from './agent-edit-panel';

function winRate(agent: Agent): number {
  if (agent.total_rounds === 0) return 0;
  return Math.round((agent.wins / agent.total_rounds) * 100);
}

function eloColor(elo: number): string {
  if (elo >= 1700) return 'text-yellow-600';
  if (elo >= 1600) return 'text-green-600';
  if (elo >= 1500) return 'text-blue-600';
  return 'text-red-500';
}

function eloBar(elo: number): number {
  // 1400 → 0%, 1800 → 100%
  return Math.max(0, Math.min(100, ((elo - 1400) / 400) * 100));
}

const TIER_LABELS: Record<string, string> = {
  economy: 'Economy',
  premium: 'Premium',
  image: 'Image',
};

const TIER_COLORS: Record<string, string> = {
  economy: 'bg-blue-50 border-blue-200',
  premium: 'bg-purple-50 border-purple-200',
  image: 'bg-orange-50 border-orange-200',
};

export default async function AgentsPage() {
  const supabase = await createServiceClient();

  const { data: agentsRaw } = await supabase
    .from('agents')
    .select('*')
    .order('elo', { ascending: false });

  const agents = (agentsRaw || []) as Agent[];

  const economy = agents.filter((a) => a.tier === 'economy');
  const premium = agents.filter((a) => a.tier === 'premium');
  const image = agents.filter((a) => a.tier === 'image');

  // Recent runs (last 20 entries for activity)
  const { data: recentLog } = await supabase
    .from('agent_feedback_log')
    .select('agent_id, won, elo_delta, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const totalRuns = Math.max(
    ...agents.map((a) => a.total_rounds),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          ELO-baserad topplista och agenthantering. Alla agenter börjar på 1600.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Activity className="h-4 w-4" /> Totala rundor
          </div>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalRuns}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Swords className="h-4 w-4" /> Aktiva agenter
          </div>
          <p className="mt-1 text-3xl font-bold text-gray-900">{agents.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <TrendingUp className="h-4 w-4" /> Bästa ELO
          </div>
          <p className={`mt-1 text-3xl font-bold ${eloColor(agents[0]?.elo ?? 1600)}`}>
            {agents[0] ? `${agents[0].icon} ${agents[0].elo}` : '—'}
          </p>
        </div>
      </div>

      {/* Tiers */}
      {[
        { tier: 'premium', label: 'Premium', list: premium },
        { tier: 'economy', label: 'Economy', list: economy },
        { tier: 'image', label: 'Image', list: image },
      ].map(({ tier, label, list }) => (
        <section key={tier}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Trophy className="h-5 w-5 text-indigo-500" />
            {label} Tier
          </h2>
          <div className="space-y-3">
            {list.length === 0 && (
              <p className="text-sm text-gray-400">Inga agenter.</p>
            )}
            {list.map((agent, idx) => (
              <div
                key={agent.id}
                className={`rounded-xl border p-4 ${TIER_COLORS[agent.tier]} bg-white`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank + icon */}
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <span className="text-2xl font-bold text-gray-300">#{idx + 1}</span>
                    <span className="text-3xl">{agent.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.provider} · {agent.model}</p>
                    </div>
                  </div>

                  {/* ELO bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-lg font-bold ${eloColor(agent.elo)}`}>
                        {agent.elo} ELO
                      </span>
                      <span className="text-sm text-gray-500">
                        {agent.wins}W · {agent.losses}L · {winRate(agent)}% win rate
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${eloBar(agent.elo)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{agent.total_rounds} rundor totalt</p>
                  </div>

                  {/* Edit panel */}
                  <AgentEditPanel agent={agent} />
                </div>

                {/* System prompt preview */}
                {agent.system_prompt && (
                  <div className="mt-3 rounded-lg bg-white/70 p-3 text-xs text-gray-600 font-mono border border-gray-100 line-clamp-3">
                    {agent.system_prompt}
                  </div>
                )}
                {!agent.system_prompt && (
                  <p className="mt-2 text-xs text-gray-400 italic">Ingen personlig system prompt ännu.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Recent activity */}
      {recentLog && recentLog.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Senaste aktivitet</h2>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Agent</th>
                  <th className="px-4 py-2 text-left">Resultat</th>
                  <th className="px-4 py-2 text-left">ELO</th>
                  <th className="px-4 py-2 text-left">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLog.map((entry: any) => {
                  const agent = agents.find((a) => a.id === entry.agent_id);
                  const delta = entry.elo_delta ?? 0;
                  return (
                    <tr key={entry.agent_id + entry.created_at} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {agent ? `${agent.icon} ${agent.name}` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {entry.won ? (
                          <span className="text-green-600 font-semibold">🏆 Vann</span>
                        ) : (
                          <span className="text-gray-400">Förlorade</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={delta >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {delta >= 0 ? '+' : ''}{delta}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {new Date(entry.created_at).toLocaleString('sv-SE')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
