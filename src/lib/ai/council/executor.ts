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

  // ============== ROUND 1: GENERATE ==============
  report('generating', 10, 'Starting generation from all providers...');

  const proposals: GeneratedProposal[] = [];
  const generationPrompt = buildGenerationPrompt(input);

  for (let i = 0; i < activeProviders.length; i++) {
    const provider = activeProviders[i];
    report('generating', 10 + (i + 1) * 10, `${provider} is creating...`);

    try {
      const response = await generateWithAI({
        systemPrompt: getGenerationSystemPrompt(input),
        userPrompt: generationPrompt,
        provider,
        modelTier: input.modelTier,
      });

      const content = parseJSON(response.content);
      proposals.push({
        provider,
        content,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Generation failed for ${provider}:`, error);
    }
  }

  if (proposals.length < 2) {
    throw new Error('Not enough successful generations to continue council');
  }

  // ============== ROUND 2: FEEDBACK ==============
  report('feedback', 40, 'Gathering feedback from all providers...');

  const allFeedback: FeedbackItem[] = [];

  for (const reviewer of proposals) {
    for (const target of proposals) {
      if (reviewer.provider === target.provider) continue;

      report('feedback', 45, `${reviewer.provider} reviewing ${target.provider}'s work...`);

      try {
        const response = await generateWithAI({
          systemPrompt: getFeedbackSystemPrompt(input),
          userPrompt: `Review this ${input.type}:\n\n${JSON.stringify(target.content, null, 2)}`,
          provider: reviewer.provider,
          modelTier: input.modelTier,
        });

        const feedback = parseJSON(response.content);
        allFeedback.push({
          fromProvider: reviewer.provider,
          toProvider: target.provider,
          strengths: feedback.strengths || [],
          improvements: feedback.improvements || [],
          specificSuggestions: feedback.specificSuggestions || [],
        });
      } catch (error) {
        console.error(`Feedback failed from ${reviewer.provider} to ${target.provider}:`, error);
      }
    }
  }

  // ============== ROUND 3: ITERATE ==============
  report('iterating', 60, 'Each provider is improving their version...');

  const iteratedProposals: IteratedProposal[] = [];

  for (const proposal of proposals) {
    const feedbackForThis = allFeedback.filter(f => f.toProvider === proposal.provider);

    report('iterating', 65, `${proposal.provider} is refining based on feedback...`);

    try {
      const feedbackSummary = feedbackForThis.map(f =>
        `Feedback from ${f.fromProvider}:\n` +
        `Strengths: ${f.strengths.join(', ')}\n` +
        `Improvements: ${f.improvements.join(', ')}\n` +
        `Suggestions: ${f.specificSuggestions.join(', ')}`
      ).join('\n\n');

      const response = await generateWithAI({
        systemPrompt: getIterationSystemPrompt(input),
        userPrompt: `Your original ${input.type}:\n${JSON.stringify(proposal.content, null, 2)}\n\nFeedback received:\n${feedbackSummary}\n\nPlease improve your content based on this feedback.`,
        provider: proposal.provider,
        modelTier: input.modelTier,
      });

      const improved = parseJSON(response.content);
      iteratedProposals.push({
        provider: proposal.provider,
        content: improved.changes_made ? { ...improved, changes_made: undefined } : improved,
        generatedAt: new Date().toISOString(),
        version: 2,
        feedbackReceived: feedbackForThis,
        changesApplied: improved.changes_made || ['Improvements applied based on feedback'],
      });
    } catch (error) {
      console.error(`Iteration failed for ${proposal.provider}:`, error);
      // Fall back to original
      iteratedProposals.push({
        ...proposal,
        version: 1,
        feedbackReceived: feedbackForThis,
        changesApplied: [],
      });
    }
  }

  // ============== ROUND 4: VOTE ==============
  report('voting', 80, 'Providers are voting on the best version...');

  const votes: Vote[] = [];

  for (const voter of iteratedProposals) {
    const otherProposals = iteratedProposals.filter(p => p.provider !== voter.provider);

    const proposalsToJudge = otherProposals.map(p =>
      `=== ${p.provider.toUpperCase()}'s VERSION ===\n${JSON.stringify(p.content, null, 2)}`
    ).join('\n\n');

    report('voting', 85, `${voter.provider} is casting their vote...`);

    try {
      const response = await generateWithAI({
        systemPrompt: getVotingSystemPrompt(),
        userPrompt: `You are ${voter.provider}. Vote for the BEST version (not your own).\n\nOptions:\n${proposalsToJudge}`,
        provider: voter.provider,
        modelTier: input.modelTier,
      });

      const voteData = parseJSON(response.content);

      // Validate vote is not for self
      let votedFor = voteData.votedFor?.toLowerCase();
      if (votedFor === voter.provider) {
        // Force vote for someone else
        votedFor = otherProposals[0].provider;
      }

      votes.push({
        voter: voter.provider,
        votedFor: votedFor as AIProvider,
        reasoning: voteData.reasoning || 'No reasoning provided',
        scores: voteData.scores || { creativity: 7, ageAppropriateness: 7, engagement: 7, clarity: 7, overall: 7 },
      });
    } catch (error) {
      console.error(`Voting failed for ${voter.provider}:`, error);
    }
  }

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
