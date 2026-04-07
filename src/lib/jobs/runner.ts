/**
 * jobs/runner.ts
 *
 * Plockar upp ett pending council-jobb och kör nästa steg.
 * Varje steg triggar nästa via self-chain (fire-and-forget fetch).
 * Vercel Cron (daglig) är ett säkerhetsnät för fastnade jobb.
 *
 * Steg-ordning för 'council':
 *   pending → generate → feedback → iterate → vote → finalize → complete
 *
 * Varje steg tar < 40s (parallella LLM-anrop), klart inom Vercel Hobby 60s-limit.
 */

import { createClient } from '@/lib/supabase/server';
import {
  stepGenerate,
  stepFeedback,
  stepIterate,
  stepVote,
  stepTranslate,
} from '@/lib/ai/council/steps';
import type { CouncilInput } from '@/lib/ai/council/types';

// ─── Steg-definitioner ───────────────────────────────────────────────────────

const COUNCIL_STEPS = ['generate', 'feedback', 'iterate', 'vote', 'finalize'] as const;
type CouncilStep = typeof COUNCIL_STEPS[number];

function nextStep(current: CouncilStep | null): CouncilStep {
  if (!current) return 'generate';
  const idx = COUNCIL_STEPS.indexOf(current);
  return COUNCIL_STEPS[idx + 1] ?? 'finalize';
}

function progressForStep(step: CouncilStep): number {
  const map: Record<CouncilStep, number> = {
    generate: 20,
    feedback: 40,
    iterate:  60,
    vote:     80,
    finalize: 100,
  };
  return map[step];
}

function msgForStep(step: CouncilStep): string {
  const map: Record<CouncilStep, string> = {
    generate: 'Genererar förslag... (steg 1/4)',
    feedback: 'Samlar in feedback... (steg 2/4)',
    iterate:  'Förbättrar innehåll... (steg 3/4)',
    vote:     'Röstar på bästa version... (steg 4/4)',
    finalize: 'Slutför och sparar...',
  };
  return map[step];
}

// ─── Huvud-runner ────────────────────────────────────────────────────────────

export async function processNextJob(): Promise<{ processed: boolean; jobId?: string; step?: string; done?: boolean; error?: string }> {
  const supabase = await createClient();

  // Hämta äldsta pending-jobb (1 åt gången)
  const { data: job, error: fetchErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error('[JobRunner] Fetch error:', fetchErr);
    return { processed: false, error: fetchErr.message };
  }

  if (!job) return { processed: false };

  // Lås jobbet (status → running)
  const step: CouncilStep = nextStep(job.step as CouncilStep | null);

  await supabase
    .from('jobs')
    .update({
      status:       'running',
      step,
      progress:     progressForStep(step),
      progress_msg: msgForStep(step),
      started_at:   job.started_at ?? new Date().toISOString(),
    })
    .eq('id', job.id);

  try {
    const input: CouncilInput = job.input;
    const state = job.state ?? {};
    let nextState = { ...state };
    let finalResult: any = null;

    // ── Kör rätt steg ──
    if (step === 'generate') {
      const { proposals, agentNames, councilRunId } = await stepGenerate(input);
      nextState = { ...nextState, proposals, agentNames, councilRunId };

    } else if (step === 'feedback') {
      const { feedback } = await stepFeedback(input, state.proposals);
      nextState = { ...nextState, feedback };

    } else if (step === 'iterate') {
      const { iteratedProposals } = await stepIterate(input, state.proposals, state.feedback);
      nextState = { ...nextState, iteratedProposals };

    } else if (step === 'vote') {
      const voteResult = await stepVote(input, state.iteratedProposals, state.agentNames, state.councilRunId);
      nextState = { ...nextState, voteResult };

    } else if (step === 'finalize') {
      const { voteResult, agentNames, councilRunId } = nextState;

      let translatedContent = null;
      if (input.bilingualMode) {
        try {
          translatedContent = await stepTranslate(input, voteResult.winner.content);
        } catch { /* silent */ }
      }

      finalResult = {
        winner: {
          provider:      voteResult.winner.provider,
          content:       voteResult.winner.content,
          version:       voteResult.winner.version,
          changesApplied: voteResult.winner.changesApplied,
        },
        runnerUp: voteResult.runnerUp ? {
          provider: voteResult.runnerUp.provider,
          content:  voteResult.runnerUp.content,
          version:  voteResult.runnerUp.version,
        } : null,
        allProposals: state.iteratedProposals?.map((p: any) => ({
          provider: p.provider,
          content:  p.content,
          version:  p.version,
        })),
        votes:            voteResult.votes,
        summary:          voteResult.summary,
        translatedContent,
        councilRunId,
        winnerAgentId:    voteResult.winnerAgentId,
        agentNames,
      };
    }

    // ── Spara state och avancera ──
    const isComplete = step === 'finalize';

    await supabase
      .from('jobs')
      .update({
        status:       isComplete ? 'complete' : 'pending',
        step:         step,
        state:        nextState,
        result:       finalResult,
        progress:     progressForStep(step),
        progress_msg: isComplete ? 'Klart! 🎉' : msgForStep(step),
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq('id', job.id);

    return { processed: true, jobId: job.id, step, done: isComplete };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[JobRunner] Step ${step} failed for job ${job.id}:`, msg);

    await supabase
      .from('jobs')
      .update({
        status:      'failed',
        error:       msg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return { processed: true, jobId: job.id, step, error: msg };
  }
}
