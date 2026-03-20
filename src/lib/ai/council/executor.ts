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
  CouncilResult,
} from './types';
import type { AIProvider } from '@/types';

export async function runCouncil(
  input: CouncilInput,
  onProgress?: (stage: string, progress: number, message: string) => void
): Promise<CouncilResult> {
  const startTime = Date.now();
  const councilRunId = crypto.randomUUID();
  const providers = getAvailableProviders();

  if (providers.length < 2) {
    throw new Error('At least 2 AI providers must be configured for the council');
  }

  // Use up to 3 providers
  const activeProviders = providers.slice(0, 3) as AIProvider[];

  // Load agents for this tier (fire-and-forget safe — fallback to empty map)
  const tier = input.modelTier ?? 'premium';
  const agents = await getAgentsByTier(tier);
  const agentMap = buildAgentMap(agents);

  // Build display names: provider -> "icon name"
  const agentNames: Record<string, string> = {};
  for (const provider of activeProviders) {
    const agent = agentMap[provider];
    agentNames[provider] = agent ? `${agent.icon} ${agent.name}` : provider;
  }

  const report = (stage: string, progress: number, message: string) => {
    onProgress?.(stage, progress, message);
    console.log(`[Council] ${stage}: ${message} (${progress}%)`);
  };

  // ============== ROUND 1: GENERATE (parallel) ==============
  report('generating', 10, 'Starting generation from all providers...');

  const generationPrompt = buildGenerationPrompt(input);
  const baseGenerationPrompt = getGenerationSystemPrompt(input);

  const generationResults = await Promise.allSettled(
    activeProviders.map((provider) =>
      generateWithAI({
        systemPrompt: buildSystemPrompt(agentMap[provider], baseGenerationPrompt),
        userPrompt: generationPrompt,
        provider,
        modelTier: input.modelTier,
        operation: 'generate',
        context: 'council',
      }).then((response) => ({ provider, content: parseJSON(response.content) }))
    )
  );

  const proposals: GeneratedProposal[] = generationResults
    .filter(
      (r): r is PromiseFulfilledResult<{ provider: AIProvider; content: any }> =>
        r.status === 'fulfilled'
    )
    .map((r) => ({
      provider: r.value.provider,
      content: r.value.content,
      generatedAt: new Date().toISOString(),
    }));

  generationResults
    .filter((r) => r.status === 'rejected')
    .forEach((r, i) =>
      console.error(
        `Generation failed for ${activeProviders[i]}:`,
        (r as PromiseRejectedResult).reason
      )
    );

  if (proposals.length < 2) {
    throw new Error('Not enough successful generations to continue council');
  }

  // ============== ROUND 2: FEEDBACK (parallel) ==============
  report('feedback', 40, 'Gathering feedback from all providers...');

  const baseFeedbackPrompt = getFeedbackSystemPrompt(input);
  const feedbackPairs = proposals.flatMap((reviewer) =>
    proposals
      .filter((target) => target.provider !== reviewer.provider)
      .map((target) => ({ reviewer, target }))
  );

  const feedbackResults = await Promise.allSettled(
    feedbackPairs.map(({ reviewer, target }) =>
      generateWithAI({
        systemPrompt: buildSystemPrompt(agentMap[reviewer.provider], baseFeedbackPrompt),
        userPrompt: `Review this ${input.type}:\n\n${JSON.stringify(target.content, null, 2)}`,
        provider: reviewer.provider,
        modelTier: input.modelTier,
        operation: 'feedback',
        context: 'council',
      }).then((response) => {
        const feedback = parseJSON(response.content);
        return {
          fromProvider: reviewer.provider,
          toProvider: target.provider,
          strengths: feedback.strengths || [],
          improvements: feedback.improvements || [],
          specificSuggestions: feedback.specificSuggestions || [],
          qualityScore: typeof feedback.qualityScore === 'number'
            ? Math.min(100, Math.max(1, Math.round(feedback.qualityScore)))
            : 50,
        } as FeedbackItem;
      })
    )
  );

  const allFeedback: FeedbackItem[] = feedbackResults
    .filter((r): r is PromiseFulfilledResult<FeedbackItem> => r.status === 'fulfilled')
    .map((r) => r.value);

  feedbackResults
    .filter((r) => r.status === 'rejected')
    .forEach((r, i) =>
      console.error(`Feedback failed for pair ${i}:`, (r as PromiseRejectedResult).reason)
    );

  // ============== ROUND 3: ITERATE (parallel) ==============
  report('iterating', 60, 'Each provider is improving their version...');

  const baseIterationPrompt = getIterationSystemPrompt(input);

  const iterationResults = await Promise.allSettled(
    proposals.map((proposal) => {
      const feedbackForThis = allFeedback.filter((f) => f.toProvider === proposal.provider);
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
        .then((response) => {
          const improved = parseJSON(response.content);
          return {
            provider: proposal.provider,
            content: improved.changes_made ? { ...improved, changes_made: undefined } : improved,
            generatedAt: new Date().toISOString(),
            version: 2,
            feedbackReceived: feedbackForThis,
            changesApplied: improved.changes_made || ['Improvements applied based on feedback'],
          } as IteratedProposal;
        })
        .catch((error) => {
          console.error(`Iteration failed for ${proposal.provider}:`, error);
          const feedbackForThis = allFeedback.filter((f) => f.toProvider === proposal.provider);
          return {
            ...proposal,
            version: 1,
            feedbackReceived: feedbackForThis,
            changesApplied: [],
          } as IteratedProposal;
        });
    })
  );

  const iteratedProposals: IteratedProposal[] = iterationResults
    .filter((r): r is PromiseFulfilledResult<IteratedProposal> => r.status === 'fulfilled')
    .map((r) => r.value);

  // ============== ROUND 4: VOTE (parallel) ==============
  report('voting', 80, 'Providers are voting on the best version...');

  const voteResults = await Promise.allSettled(
    iteratedProposals.map((voter) => {
      const otherProposals = iteratedProposals.filter((p) => p.provider !== voter.provider);
      const agentLabel = (provider: string) => agentNames[provider] || provider;
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
      }).then((response) => {
        const voteData = parseJSON(response.content);
        // votedFor may be provider name or agent name — normalize to provider
        let votedFor = normalizeVotedFor(voteData.votedFor, agentMap, otherProposals.map(p => p.provider));
        if (votedFor === voter.provider) votedFor = otherProposals[0].provider;
        return {
          voter: voter.provider,
          votedFor: votedFor as AIProvider,
          reasoning: voteData.reasoning || 'No reasoning provided',
          scores: voteData.scores || {
            creativity: 7,
            ageAppropriateness: 7,
            engagement: 7,
            clarity: 7,
            overall: 7,
          },
        } as Vote;
      });
    })
  );

  const votes: Vote[] = voteResults
    .filter((r): r is PromiseFulfilledResult<Vote> => r.status === 'fulfilled')
    .map((r) => r.value);

  voteResults
    .filter((r) => r.status === 'rejected')
    .forEach((r, i) =>
      console.error(
        `Voting failed for ${iteratedProposals[i]?.provider}:`,
        (r as PromiseRejectedResult).reason
      )
    );

  // ============== TALLY RESULTS ==============
  report('complete', 95, 'Tallying votes and preparing results...');

  const voteCounts: Record<string, number> = {};
  const scoreAverages: Record<string, number> = {};

  for (const proposal of iteratedProposals) {
    voteCounts[proposal.provider] = 0;
    scoreAverages[proposal.provider] = 0;
  }

  for (const vote of votes) {
    voteCounts[vote.votedFor] = (voteCounts[vote.votedFor] || 0) + 1;
    scoreAverages[vote.votedFor] = (scoreAverages[vote.votedFor] || 0) + vote.scores.overall;
  }

  const ranked = [...iteratedProposals].sort((a, b) => {
    const votesDiff = (voteCounts[b.provider] || 0) - (voteCounts[a.provider] || 0);
    if (votesDiff !== 0) return votesDiff;
    return (scoreAverages[b.provider] || 0) - (scoreAverages[a.provider] || 0);
  });

  const winner = ranked[0];
  const runnerUp = ranked[1] || null;

  const summary = generateSummary(winner, runnerUp, votes, voteCounts, agentNames);

  // ============== ROUND 5: TRANSLATE (if bilingualMode) ==============
  let translatedContent: any = undefined;
  if (input.bilingualMode) {
    report('complete', 97, 'Translating winner to Swedish...');
    try {
      const translationResponse = await generateWithAI({
        systemPrompt: getTranslationSystemPrompt(),
        userPrompt: JSON.stringify(winner.content, null, 2),
        provider: activeProviders[0],
        modelTier: input.modelTier,
        operation: 'translate',
        context: 'council',
      });
      translatedContent = parseJSON(translationResponse.content);
    } catch (err) {
      console.error('[Council] Translation failed:', err);
    }
  }

  report('complete', 100, `Winner: ${agentNames[winner.provider] || winner.provider}!`);

  // ============== ELO + FEEDBACK LOG (fire-and-forget) ==============
  const winnerAgent = agentMap[winner.provider];
  const winnerAgentId = winnerAgent?.id ?? null;

  if (agents.length === 3 && winnerAgentId) {
    const eloUpdates = calculateEloUpdates(agents, winnerAgentId);
    const today = new Date().toISOString().slice(0, 10);

    const perAgent = iteratedProposals.map((proposal) => {
      const agent = agentMap[proposal.provider];
      const eloUpdate = eloUpdates.find((u) => u.agent.id === agent?.id);
      const feedbackForThis = allFeedback.filter((f) => f.toProvider === proposal.provider);
      const scores = feedbackForThis.map((f) => f.qualityScore).filter((s) => typeof s === 'number');
      const avgQualityScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
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

    // Fire-and-forget
    Promise.allSettled([
      applyEloUpdates(eloUpdates),
      logAgentFeedback(feedbackEntries),
      ...reflectionUpdates,
    ]).catch((err) => console.error('[Council] ELO/log error:', err));
  }

  return {
    winner,
    runnerUp,
    allProposals: iteratedProposals,
    votes,
    summary,
    totalTimeMs: Date.now() - startTime,
    translatedContent,
    councilRunId,
    winnerAgentId,
    agentNames,
  };
}

// ============== HELPERS ==============

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

function parseJSON(content: string): any {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(content);
}

// Normalize vote target — model may respond with agent name or provider name
function normalizeVotedFor(
  raw: string | undefined,
  agentMap: Record<string, { provider: string; name: string }>,
  candidateProviders: string[]
): string {
  if (!raw) return candidateProviders[0];
  const lower = raw.toLowerCase();

  // Direct provider match
  if (candidateProviders.includes(lower)) return lower;

  // Match by agent name
  for (const provider of candidateProviders) {
    const agent = agentMap[provider];
    if (agent && agent.name.toLowerCase() === lower) return provider;
  }

  // Partial match
  for (const provider of candidateProviders) {
    if (lower.includes(provider)) return provider;
    const agent = agentMap[provider];
    if (agent && lower.includes(agent.name.toLowerCase())) return provider;
  }

  return candidateProviders[0];
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
  winnerReasons.forEach((reason) => {
    summary += `- ${reason}\n`;
  });

  if (runnerUp) {
    const runnerUpVotes = voteCounts[runnerUp.provider] || 0;
    summary += `\n**Runner-up:** ${label(runnerUp.provider)} (${runnerUpVotes} votes)`;
  }

  summary += `\n\n**Changes made by winner after feedback:**\n`;
  winner.changesApplied.forEach((change) => {
    summary += `- ${change}\n`;
  });

  return summary;
}
