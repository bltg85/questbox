import { createServiceClient } from '@/lib/supabase/server';
import type { Agent, AIProvider } from '@/types';

export type { Agent };

export async function getAgentsByTier(tier: 'economy' | 'premium'): Promise<Agent[]> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('tier', tier)
      .order('provider'); // consistent order: anthropic, google, openai

    if (error) {
      console.error('[Agents] Failed to load agents:', error);
      return [];
    }
    return (data || []) as Agent[];
  } catch (err) {
    console.error('[Agents] Exception loading agents:', err);
    return [];
  }
}

export function buildAgentMap(agents: Agent[]): Record<AIProvider, Agent> {
  return agents.reduce(
    (acc, agent) => ({ ...acc, [agent.provider]: agent }),
    {} as Record<AIProvider, Agent>
  );
}

// Combine agent's personal system prompt with the base prompt
export function buildSystemPrompt(agent: Agent | undefined, basePrompt: string): string {
  if (!agent?.system_prompt) return basePrompt;
  return `${agent.system_prompt}\n\n---\n\n${basePrompt}`;
}

// ============== ELO ==============
const K = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export interface EloUpdate {
  agent: Agent;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  won: boolean;
}

export function calculateEloUpdates(agents: Agent[], winnerAgentId: string): EloUpdate[] {
  const winner = agents.find((a) => a.id === winnerAgentId);
  if (!winner) return [];

  const losers = agents.filter((a) => a.id !== winnerAgentId);
  const deltas: Record<string, number> = {};
  for (const a of agents) deltas[a.id] = 0;

  // Pairwise: winner vs each loser
  for (const loser of losers) {
    const expWinner = expectedScore(winner.elo, loser.elo);
    const expLoser = expectedScore(loser.elo, winner.elo);
    deltas[winner.id] += Math.round(K * (1 - expWinner));
    deltas[loser.id] += Math.round(K * (0 - expLoser));
  }

  return agents.map((agent) => ({
    agent,
    eloBefore: agent.elo,
    eloAfter: agent.elo + deltas[agent.id],
    eloDelta: deltas[agent.id],
    won: agent.id === winnerAgentId,
  }));
}

export async function applyEloUpdates(updates: EloUpdate[]): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await Promise.allSettled(
      updates.map(({ agent, eloAfter, won }) =>
        supabase
          .from('agents')
          .update({
            elo: eloAfter,
            wins: won ? agent.wins + 1 : agent.wins,
            losses: won ? agent.losses : agent.losses + 1,
            total_rounds: agent.total_rounds + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id)
      )
    );
  } catch (err) {
    console.error('[Agents] Failed to apply ELO updates:', err);
  }
}

export interface FeedbackLogEntry {
  councilRunId: string;
  agentId: string;
  tier: string;
  productType: string;
  theme: string;
  feedbackReceived: unknown;
  finalContent: unknown;
  votesReceived: number;
  won: boolean;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
}

export async function logAgentFeedback(entries: FeedbackLogEntry[]): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await supabase.from('agent_feedback_log').insert(
      entries.map((e) => ({
        council_run_id: e.councilRunId,
        agent_id: e.agentId,
        tier: e.tier,
        product_type: e.productType,
        theme: e.theme,
        feedback_received: e.feedbackReceived,
        final_content: e.finalContent,
        votes_received: e.votesReceived,
        won: e.won,
        elo_before: e.eloBefore,
        elo_after: e.eloAfter,
        elo_delta: e.eloDelta,
        component_wins: { overall: e.won ? e.agentId : null },
      }))
    );
  } catch (err) {
    console.error('[Agents] Failed to log feedback:', err);
  }
}
