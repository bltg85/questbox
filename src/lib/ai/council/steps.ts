/**
 * Individual council step functions.
 * Each step is a separate async function, designed to be called from separate API routes
 * so that no single HTTP request exceeds Vercel's timeout limit.
 */
import { generateWithAI, getAvailableProviders } from '../providers';
import {
  getGenerationSystemPrompt,
  getFeedbackSystemPrompt,
  getIterationSystemPrompt,
  getVotingSystemPrompt,
  getTranslationSystemPrompt,
} from './prompts';
import {
  getAgentsByTier,
  buildAgentMap,
  buildSystemPrompt,
  calculateEloUpdates,
  applyEloUpdates,
  logAgentFeedback,
  appendReflectionNotes,
} from './agents';
import type {
  CouncilInput,
  GeneratedProposal,
  FeedbackItem,
  IteratedProposal,
  Vote,
} from './types';
import type { AIProvider } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJSON(content: string): any {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  return JSON.parse(content);
}

function normalizeVotedFor(
  raw: string | undefined,
  agentMap: Record<string, { provider: string; name: string }>,
  candidateProviders: string[]
): string {
  if (!raw) return candidateProviders[0];
  const lower = raw.toLowerCase();
  if (candidateProviders.includes(lower)) return lower;
  for (const provider of candidateProviders) {
    const agent = agentMap[provider];
    if (agent && agent.name.toLowerCase() === lower) return provider;
  }
  for (const provider of candidateProviders) {
    if (lower.includes(provider)) return provider;
    const agent = agentMap[provider];
    if (agent && lower.includes(agent.name.toLowerCase())) return provider;
  }
  return candidateProviders[0];
}

function buildGenerationPrompt(input: CouncilInput): string {
  if (input.type === 'treasure_hunt') {
    return `Create an amazing treasure hunt with:
- Theme: ${input.theme}
- Number of clues: ${input.numberOfClues || 5}
- Location type: ${input.location || 'indoor'}
${input.additionalInstructions ? `- Special instructions: ${input.additionalInstructions}` : ''}

Make it MAGICAL and MEMORABLE!`;
  }
  if (input.type === 'quiz') {
    return `Create an engaging quiz about:
- Topic: ${input.theme}
- Number of questions: ${input.numberOfQuestions || 10}
${input.additionalInstructions ? `- Special instructions: ${input.additionalInstructions}` : ''}

Make it FUN and EDUCATIONAL!`;
  }
  return `Create ${input.type} about: ${input.theme}`;
}

function generateSummary(
  winner: IteratedProposal,
  runnerUp: IteratedProposal | null,
  votes: Vote[],
  voteCounts: Record<string, number>,
  agentNames: Record<string, string>
): string {
  const label = (provider: string) => agentNames[provider] || provider.toUpperCase();
  const winnerVotes = voteCounts[winner.provider] || 0;
  const winnerReasons = votes
    .filter((v) => v.votedFor === winner.provider)
    .map((v) => v.reasoning);

  let summary = `🏆 **${label(winner.provider)} WINS** with ${winnerVotes} vote(s)!\n\n`;
  summary += `**Why ${label(winner.provider)} won:**\n`;
  winnerReasons.forEach((r) => { summary += `- ${r}\n`; });

  if (runnerUp) {
    const runnerUpVotes = voteCounts[runnerUp.provider] || 0;
    summary += `\n**Runner-up:** ${label(runnerUp.provider)} (${runnerUpVotes} votes)`;
  }

  summary += `\n\n**Changes made by winner after feedback:**\n`;
  winner.changesApplied.forEach((c) => { summary += `- ${c}\n`; });

  return summary;
}

// ─── Step 1: Generate ─────────────────────────────────────────────────────────

export interface GenerateStepResult {
  proposals: GeneratedProposal[];
  agentNames: Record<string, string>;
  councilRunId: string;
}

export async function stepGenerate(input: CouncilInput): Promise<GenerateStepResult> {
  const councilRunId = crypto.randomUUID();
  const providers = getAvailableProviders().slice(0, 3) as AIProvider[];

  if (providers.length < 2) {
    throw new Error('At least 2 AI providers must be configured for the council');
  }

  const tier = input.modelTier ?? 'premium';
  const agents = await getAgentsByTier(tier);
  const agentMap = buildAgentMap(agents);

  const agentNames: Record<string, string> = {};
  for (const provider of providers) {
    const agent = agentMap[provider];
    agentNames[provider] = agent ? `${agent.icon} ${agent.name}` : provider;
  }

  const generationPrompt = buildGenerationPrompt(input);
  const baseSystemPrompt = getGenerationSystemPrompt(input);

  const results = await Promise.allSettled(
    providers.map((provider) =>
      generateWithAI({
        systemPrompt: buildSystemPrompt(agentMap[provider], baseSystemPrompt),
        userPrompt: generationPrompt,
        provider,
        modelTier: input.modelTier,
        operation: 'generate',
        context: 'council',
      }).then((r) => ({ provider, content: parseJSON(r.content) }))
    )
  );

  const proposals: GeneratedProposal[] = results
    .filter((r): r is PromiseFulfilledResult<{ provider: AIProvider; content: any }> => r.status === 'fulfilled')
    .map((r) => ({ provider: r.value.provider, content: r.value.content, generatedAt: new Date().toISOString() }));

  results
    .filter((r) => r.status === 'rejected')
    .forEach((r, i) => console.error(`[Council/generate] Failed for ${providers[i]}:`, (r as PromiseRejectedResult).reason));

  if (proposals.length < 2) {
    throw new Error('Not enough successful generations to continue council');
  }

  return { proposals, agentNames, councilRunId };
}

// ─── Step 2: Feedback ─────────────────────────────────────────────────────────

export interface FeedbackStepResult {
  feedback: FeedbackItem[];
}

export async function stepFeedback(
  input: CouncilInput,
  proposals: GeneratedProposal[],
): Promise<FeedbackStepResult> {
  const tier = input.modelTier ?? 'premium';
  const agents = await getAgentsByTier(tier);
  const agentMap = buildAgentMap(agents);

  const baseFeedbackPrompt = getFeedbackSystemPrompt(input);
  const feedbackPairs = proposals.flatMap((reviewer) =>
    proposals
      .filter((target) => target.provider !== reviewer.provider)
      .map((target) => ({ reviewer, target }))
  );

  const results = await Promise.allSettled(
    feedbackPairs.map(({ reviewer, target }) =>
      generateWithAI({
        systemPrompt: buildSystemPrompt(agentMap[reviewer.provider], baseFeedbackPrompt),
        userPrompt: `Review this ${input.type}:\n\n${JSON.stringify(target.content, null, 2)}`,
        provider: reviewer.provider,
        modelTier: input.modelTier,
        operation: 'feedback',
        context: 'council',
      }).then((r) => {
        const fb = parseJSON(r.content);
        return {
          fromProvider: reviewer.provider,
          toProvider: target.provider,
          strengths: fb.strengths || [],
          improvements: fb.improvements || [],
          specificSuggestions: fb.specificSuggestions || [],
          qualityScore: typeof fb.qualityScore === 'number'
            ? Math.min(100, Math.max(1, Math.round(fb.qualityScore)))
            : 50,
          stegTypFeedback: fb.stegTypFeedback ?? undefined,
        } as FeedbackItem;
      })
    )
  );

  const feedback: FeedbackItem[] = results
    .filter((r): r is PromiseFulfilledResult<FeedbackItem> => r.status === 'fulfilled')
    .map((r) => r.value);

  results
    .filter((r) => r.status === 'rejected')
    .forEach((r, i) => console.error(`[Council/feedback] Failed for pair ${i}:`, (r as PromiseRejectedResult).reason));

  return { feedback };
}

// ─── Step 3: Iterate ──────────────────────────────────────────────────────────

export interface IterateStepResult {
  iteratedProposals: IteratedProposal[];
}

export async function stepIterate(
  input: CouncilInput,
  proposals: GeneratedProposal[],
  feedback: FeedbackItem[],
): Promise<IterateStepResult> {
  const tier = input.modelTier ?? 'premium';
  const agents = await getAgentsByTier(tier);
  const agentMap = buildAgentMap(agents);

  const baseIterationPrompt = getIterationSystemPrompt(input);

  const results = await Promise.allSettled(
    proposals.map((proposal) => {
      const feedbackForThis = feedback.filter((f) => f.toProvider === proposal.provider);
      const feedbackSummary = feedbackForThis
        .map(
          (f) =>
            `Feedback from ${f.fromProvider}:\n` +
            `Strengths: ${f.strengths.join(', ')}\n` +
            `Improvements: ${f.improvements.join(', ')}\n` +
            `Suggestions: ${f.specificSuggestions.join(', ')}`
        )
        .join('\n\n');

      return generateWithAI({
        systemPrompt: buildSystemPrompt(agentMap[proposal.provider], baseIterationPrompt),
        userPrompt: `Your original ${input.type}:\n${JSON.stringify(proposal.content, null, 2)}\n\nFeedback received:\n${feedbackSummary}\n\nPlease improve your content based on this feedback.`,
        provider: proposal.provider,
        modelTier: input.modelTier,
        operation: 'iterate',
        context: 'council',
      })
        .then((r) => {
          const improved = parseJSON(r.content);
          const feedbackForThis2 = feedback.filter((f) => f.toProvider === proposal.provider);
          return {
            provider: proposal.provider,
            content: improved.changes_made ? { ...improved, changes_made: undefined } : improved,
            generatedAt: new Date().toISOString(),
            version: 2,
            feedbackReceived: feedbackForThis2,
            changesApplied: improved.changes_made || ['Improvements applied based on feedback'],
          } as IteratedProposal;
        })
        .catch(() => {
          const feedbackForThis2 = feedback.filter((f) => f.toProvider === proposal.provider);
          return { ...proposal, version: 1, feedbackReceived: feedbackForThis2, changesApplied: [] } as IteratedProposal;
        });
    })
  );

  const iteratedProposals: IteratedProposal[] = results
    .filter((r): r is PromiseFulfilledResult<IteratedProposal> => r.status === 'fulfilled')
    .map((r) => r.value);

  return { iteratedProposals };
}

// ─── Step 4: Vote ─────────────────────────────────────────────────────────────

export interface VoteStepResult {
  votes: Vote[];
  winner: IteratedProposal;
  runnerUp: IteratedProposal | null;
  summary: string;
  winnerAgentId: string | null;
}

export async function stepVote(
  input: CouncilInput,
  iteratedProposals: IteratedProposal[],
  agentNames: Record<string, string>,
  councilRunId: string,
): Promise<VoteStepResult> {
  const tier = input.modelTier ?? 'premium';
  const agents = await getAgentsByTier(tier);
  const agentMap = buildAgentMap(agents);

  const agentLabel = (provider: string) => agentNames[provider] || provider;

  const voteResults = await Promise.allSettled(
    iteratedProposals.map((voter) => {
      const otherProposals = iteratedProposals.filter((p) => p.provider !== voter.provider);
      const proposalsToJudge = otherProposals
        .map((p) => `=== ${agentLabel(p.provider).toUpperCase()} ===\n${JSON.stringify(p.content, null, 2)}`)
        .join('\n\n');

      return generateWithAI({
        systemPrompt: buildSystemPrompt(agentMap[voter.provider], getVotingSystemPrompt()),
        userPrompt: `You are ${agentLabel(voter.provider)}. Vote for the BEST version (not your own).\n\nOptions:\n${proposalsToJudge}`,
        provider: voter.provider,
        modelTier: input.modelTier,
        operation: 'vote',
        context: 'council',
      }).then((r) => {
        const voteData = parseJSON(r.content);
        let votedFor = normalizeVotedFor(voteData.votedFor, agentMap, otherProposals.map((p) => p.provider));
        if (votedFor === voter.provider) votedFor = otherProposals[0].provider;
        return {
          voter: voter.provider,
          votedFor: votedFor as AIProvider,
          reasoning: voteData.reasoning || 'No reasoning provided',
          scores: voteData.scores || { creativity: 7, ageAppropriateness: 7, engagement: 7, clarity: 7, overall: 7 },
        } as Vote;
      });
    })
  );

  const votes: Vote[] = voteResults
    .filter((r): r is PromiseFulfilledResult<Vote> => r.status === 'fulfilled')
    .map((r) => r.value);

  // Tally
  const voteCounts: Record<string, number> = {};
  const scoreAverages: Record<string, number> = {};
  for (const p of iteratedProposals) { voteCounts[p.provider] = 0; scoreAverages[p.provider] = 0; }
  for (const vote of votes) {
    voteCounts[vote.votedFor] = (voteCounts[vote.votedFor] || 0) + 1;
    scoreAverages[vote.votedFor] = (scoreAverages[vote.votedFor] || 0) + vote.scores.overall;
  }

  const ranked = [...iteratedProposals].sort((a, b) => {
    const d = (voteCounts[b.provider] || 0) - (voteCounts[a.provider] || 0);
    if (d !== 0) return d;
    return (scoreAverages[b.provider] || 0) - (scoreAverages[a.provider] || 0);
  });

  const winner = ranked[0];
  const runnerUp = ranked[1] || null;
  const summary = generateSummary(winner, runnerUp, votes, voteCounts, agentNames);

  // ELO + feedback log (fire-and-forget)
  const winnerAgent = agentMap[winner.provider];
  const winnerAgentId = winnerAgent?.id ?? null;

  if (agents.length === 3 && winnerAgentId) {
    const eloUpdates = calculateEloUpdates(agents, winnerAgentId);
    const today = new Date().toISOString().slice(0, 10);

    const perAgent = iteratedProposals.map((proposal) => {
      const agent = agentMap[proposal.provider];
      const eloUpdate = eloUpdates.find((u) => u.agent.id === agent?.id);
      const feedbackForThis = (proposal.feedbackReceived || []);
      const scores = feedbackForThis.map((f) => f.qualityScore).filter((s) => typeof s === 'number');
      const avgQualityScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      return { proposal, agent, eloUpdate, feedbackForThis, avgQualityScore };
    }).filter((e) => e.agent?.id);

    const feedbackEntries = perAgent.map(({ proposal, agent, eloUpdate, feedbackForThis, avgQualityScore }) => ({
      councilRunId,
      agentId: agent!.id,
      tier,
      productType: input.type,
      theme: input.theme,
      feedbackReceived: feedbackForThis,
      finalContent: proposal.content,
      votesReceived: voteCounts[proposal.provider] || 0,
      won: proposal.provider === winner.provider,
      eloBefore: eloUpdate?.eloBefore ?? agent!.elo,
      eloAfter: eloUpdate?.eloAfter ?? agent!.elo,
      eloDelta: eloUpdate?.eloDelta ?? 0,
      avgQualityScore,
    }));

    const reflectionUpdates = perAgent.map(({ proposal, agent, feedbackForThis, avgQualityScore }) =>
      appendReflectionNotes(agent!.id, agent!.reflection_notes ?? '', {
        date: today,
        productType: input.type,
        theme: input.theme,
        strengths: feedbackForThis.flatMap((f) => f.strengths),
        improvements: feedbackForThis.flatMap((f) => f.improvements),
        suggestions: feedbackForThis.flatMap((f) => f.specificSuggestions),
        avgQualityScore,
        won: proposal.provider === winner.provider,
      })
    );

    Promise.allSettled([
      applyEloUpdates(eloUpdates),
      logAgentFeedback(feedbackEntries),
      ...reflectionUpdates,
    ]).catch((err) => console.error('[Council/vote] ELO/log error:', err));
  }

  return { votes, winner, runnerUp, summary, winnerAgentId };
}

// ─── Optional: Translate winner ───────────────────────────────────────────────

export async function stepTranslate(
  input: CouncilInput,
  winnerContent: any,
): Promise<any> {
  const providers = getAvailableProviders().slice(0, 1) as AIProvider[];
  if (providers.length === 0) throw new Error('No provider available for translation');

  const r = await generateWithAI({
    systemPrompt: getTranslationSystemPrompt(),
    userPrompt: JSON.stringify(winnerContent, null, 2),
    provider: providers[0],
    modelTier: input.modelTier,
    operation: 'translate',
    context: 'council',
  });
  return parseJSON(r.content);
}
