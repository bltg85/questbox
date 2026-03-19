import { generateWithAI, getAvailableProviders } from '../providers';
import {
  getGenerationSystemPrompt,
  getFeedbackSystemPrompt,
  getIterationSystemPrompt,
  getVotingSystemPrompt,
} from './prompts';
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
  const providers = getAvailableProviders();

  if (providers.length < 2) {
    throw new Error('At least 2 AI providers must be configured for the council');
  }

  // Use up to 3 providers
  const activeProviders = providers.slice(0, 3) as AIProvider[];

  const report = (stage: string, progress: number, message: string) => {
    onProgress?.(stage, progress, message);
    console.log(`[Council] ${stage}: ${message} (${progress}%)`);
  };

  // ============== ROUND 1: GENERATE (parallel) ==============
  report('generating', 10, 'Starting generation from all providers...');

  const generationPrompt = buildGenerationPrompt(input);

  const generationResults = await Promise.allSettled(
    activeProviders.map(provider =>
      generateWithAI({
        systemPrompt: getGenerationSystemPrompt(input),
        userPrompt: generationPrompt,
        provider,
        modelTier: input.modelTier,
        operation: 'generate',
        context: 'council',
      }).then(response => ({ provider, content: parseJSON(response.content) }))
    )
  );

  const proposals: GeneratedProposal[] = generationResults
    .filter((r): r is PromiseFulfilledResult<{ provider: AIProvider; content: any }> => r.status === 'fulfilled')
    .map(r => ({ provider: r.value.provider, content: r.value.content, generatedAt: new Date().toISOString() }));

  generationResults.filter(r => r.status === 'rejected').forEach((r, i) =>
    console.error(`Generation failed for ${activeProviders[i]}:`, (r as PromiseRejectedResult).reason)
  );

  if (proposals.length < 2) {
    throw new Error('Not enough successful generations to continue council');
  }

  // ============== ROUND 2: FEEDBACK (parallel) ==============
  report('feedback', 40, 'Gathering feedback from all providers...');

  const feedbackPairs = proposals.flatMap(reviewer =>
    proposals
      .filter(target => target.provider !== reviewer.provider)
      .map(target => ({ reviewer, target }))
  );

  const feedbackResults = await Promise.allSettled(
    feedbackPairs.map(({ reviewer, target }) =>
      generateWithAI({
        systemPrompt: getFeedbackSystemPrompt(input),
        userPrompt: `Review this ${input.type}:\n\n${JSON.stringify(target.content, null, 2)}`,
        provider: reviewer.provider,
        modelTier: input.modelTier,
        operation: 'feedback',
        context: 'council',
      }).then(response => {
        const feedback = parseJSON(response.content);
        return {
          fromProvider: reviewer.provider,
          toProvider: target.provider,
          strengths: feedback.strengths || [],
          improvements: feedback.improvements || [],
          specificSuggestions: feedback.specificSuggestions || [],
        } as FeedbackItem;
      })
    )
  );

  const allFeedback: FeedbackItem[] = feedbackResults
    .filter((r): r is PromiseFulfilledResult<FeedbackItem> => r.status === 'fulfilled')
    .map(r => r.value);

  feedbackResults.filter(r => r.status === 'rejected').forEach((r, i) =>
    console.error(`Feedback failed for pair ${i}:`, (r as PromiseRejectedResult).reason)
  );

  // ============== ROUND 3: ITERATE (parallel) ==============
  report('iterating', 60, 'Each provider is improving their version...');

  const iterationResults = await Promise.allSettled(
    proposals.map(proposal => {
      const feedbackForThis = allFeedback.filter(f => f.toProvider === proposal.provider);
      const feedbackSummary = feedbackForThis.map(f =>
        `Feedback from ${f.fromProvider}:\n` +
        `Strengths: ${f.strengths.join(', ')}\n` +
        `Improvements: ${f.improvements.join(', ')}\n` +
        `Suggestions: ${f.specificSuggestions.join(', ')}`
      ).join('\n\n');

      return generateWithAI({
        systemPrompt: getIterationSystemPrompt(input),
        userPrompt: `Your original ${input.type}:\n${JSON.stringify(proposal.content, null, 2)}\n\nFeedback received:\n${feedbackSummary}\n\nPlease improve your content based on this feedback.`,
        provider: proposal.provider,
        modelTier: input.modelTier,
        operation: 'iterate',
        context: 'council',
      }).then(response => {
        const improved = parseJSON(response.content);
        return {
          provider: proposal.provider,
          content: improved.changes_made ? { ...improved, changes_made: undefined } : improved,
          generatedAt: new Date().toISOString(),
          version: 2,
          feedbackReceived: feedbackForThis,
          changesApplied: improved.changes_made || ['Improvements applied based on feedback'],
        } as IteratedProposal;
      }).catch(error => {
        console.error(`Iteration failed for ${proposal.provider}:`, error);
        const feedbackForThis = allFeedback.filter(f => f.toProvider === proposal.provider);
        return { ...proposal, version: 1, feedbackReceived: feedbackForThis, changesApplied: [] } as IteratedProposal;
      });
    })
  );

  const iteratedProposals: IteratedProposal[] = iterationResults
    .filter((r): r is PromiseFulfilledResult<IteratedProposal> => r.status === 'fulfilled')
    .map(r => r.value);

  // ============== ROUND 4: VOTE (parallel) ==============
  report('voting', 80, 'Providers are voting on the best version...');

  const voteResults = await Promise.allSettled(
    iteratedProposals.map(voter => {
      const otherProposals = iteratedProposals.filter(p => p.provider !== voter.provider);
      const proposalsToJudge = otherProposals.map(p =>
        `=== ${p.provider.toUpperCase()}'s VERSION ===\n${JSON.stringify(p.content, null, 2)}`
      ).join('\n\n');

      return generateWithAI({
        systemPrompt: getVotingSystemPrompt(),
        userPrompt: `You are ${voter.provider}. Vote for the BEST version (not your own).\n\nOptions:\n${proposalsToJudge}`,
        provider: voter.provider,
        modelTier: input.modelTier,
        operation: 'vote',
        context: 'council',
      }).then(response => {
        const voteData = parseJSON(response.content);
        let votedFor = voteData.votedFor?.toLowerCase();
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
    .map(r => r.value);

  voteResults.filter(r => r.status === 'rejected').forEach((r, i) =>
    console.error(`Voting failed for ${iteratedProposals[i]?.provider}:`, (r as PromiseRejectedResult).reason)
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

  // Sort by votes, then by average score
  const ranked = iteratedProposals.sort((a, b) => {
    const votesDiff = (voteCounts[b.provider] || 0) - (voteCounts[a.provider] || 0);
    if (votesDiff !== 0) return votesDiff;
    return (scoreAverages[b.provider] || 0) - (scoreAverages[a.provider] || 0);
  });

  const winner = ranked[0];
  const runnerUp = ranked[1] || null;

  // Generate summary
  const summary = generateSummary(winner, runnerUp, votes, voteCounts);

  report('complete', 100, `Winner: ${winner.provider}!`);

  return {
    winner,
    runnerUp,
    allProposals: iteratedProposals,
    votes,
    summary,
    totalTimeMs: Date.now() - startTime,
  };
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

function parseJSON(content: string): any {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(content);
}

function generateSummary(
  winner: IteratedProposal,
  runnerUp: IteratedProposal | null,
  votes: Vote[],
  voteCounts: Record<string, number>
): string {
  const winnerVotes = voteCounts[winner.provider] || 0;
  const winnerReasons = votes
    .filter(v => v.votedFor === winner.provider)
    .map(v => v.reasoning);

  let summary = `🏆 **${winner.provider.toUpperCase()} WINS** with ${winnerVotes} vote(s)!\n\n`;
  summary += `**Why ${winner.provider} won:**\n`;
  winnerReasons.forEach(reason => {
    summary += `- ${reason}\n`;
  });

  if (runnerUp) {
    const runnerUpVotes = voteCounts[runnerUp.provider] || 0;
    summary += `\n**Runner-up:** ${runnerUp.provider} (${runnerUpVotes} votes)`;
  }

  summary += `\n\n**Changes made by winner after feedback:**\n`;
  winner.changesApplied.forEach(change => {
    summary += `- ${change}\n`;
  });

  return summary;
}
