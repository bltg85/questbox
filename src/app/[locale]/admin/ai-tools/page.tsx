'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
} from '@/components/ui';
import {
  Sparkles,
  Trophy,
  Medal,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  Clock,
  ImageIcon,
  Save,
  FileDown,
  Wand2,
  LayoutTemplate,
  ChevronRight,
  Play,
  ArrowRight,
  Star,
  Zap,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'economy' | 'premium' | 'single';
type StepStatus = 'idle' | 'running' | 'done' | 'error';

interface JaktMallOption {
  id: string;
  namn: string;
  beskrivning: string | null;
  steg_typer: string[];
  rekommenderad_alder: string[];
  rekommenderad_tid_minuter: number | null;
}

interface AgentCard {
  id: string;
  name: string;
  icon: string;
  provider: string;
  tier: string;
  elo: number;
  system_prompt: string | null;
  wins: number;
  losses: number;
  total_rounds: number;
}

interface GeneratedProposal {
  provider: string;
  content: any;
  generatedAt: string;
}

interface FeedbackItem {
  fromProvider: string;
  toProvider: string;
  strengths: string[];
  improvements: string[];
  specificSuggestions: string[];
  qualityScore: number;
}

interface IteratedProposal extends GeneratedProposal {
  version: number;
  feedbackReceived: FeedbackItem[];
  changesApplied: string[];
}

interface Vote {
  voter: string;
  votedFor: string;
  reasoning: string;
  scores: { creativity: number; ageAppropriateness: number; engagement: number; clarity: number; overall: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEG_LABELS: Record<string, { label: string; color: string }> = {
  INTRO:          { label: 'Intro',       color: 'bg-purple-100 text-purple-700' },
  FINAL:          { label: 'Final',       color: 'bg-yellow-100 text-yellow-700' },
  SOK:            { label: 'Sökning',     color: 'bg-blue-100 text-blue-700' },
  PUSSEL_FYSISKT: { label: 'Pussel',      color: 'bg-green-100 text-green-700' },
  PUSSEL_LOGIK:   { label: 'Logikpussel', color: 'bg-teal-100 text-teal-700' },
  GATA:           { label: 'Gåta',        color: 'bg-orange-100 text-orange-700' },
  VAL:            { label: 'Bildval',     color: 'bg-pink-100 text-pink-700' },
  LASUPPDRAG:     { label: 'Läsuppdrag', color: 'bg-indigo-100 text-indigo-700' },
  MINISPEL:       { label: 'Minispel',    color: 'bg-red-100 text-red-700' },
};

const PROVIDER_COLOR: Record<string, string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500',
};

const PROVIDER_BORDER: Record<string, string> = {
  openai: 'border-emerald-300',
  anthropic: 'border-orange-300',
  google: 'border-blue-300',
};

const PROVIDER_BG: Record<string, string> = {
  openai: 'bg-emerald-50',
  anthropic: 'bg-orange-50',
  google: 'bg-blue-50',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 'md' }: { agent: AgentCard; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-sm';
  return (
    <div className={`flex items-center justify-center rounded-full ${PROVIDER_COLOR[agent.provider]} text-white ${size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-9 w-9' : 'h-6 w-6'} ${s} font-bold`}>
      {agent.icon}
    </div>
  );
}

function StepButton({
  step, label, icon, status, disabled, onClick,
}: {
  step: number; label: string; icon: React.ReactNode; status: StepStatus; disabled: boolean; onClick: () => void;
}) {
  const isRunning = status === 'running';
  const isDone = status === 'done';
  return (
    <button
      onClick={onClick}
      disabled={disabled || isRunning || isDone}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all
        ${isDone ? 'cursor-default bg-green-100 text-green-700 ring-1 ring-green-300'
          : isRunning ? 'cursor-wait bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
          : disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400'
          : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]'}`}
    >
      {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : isDone ? <CheckCircle className="h-4 w-4" /> : icon}
      {isRunning ? 'Arbetar...' : isDone ? 'Klart' : label}
    </button>
  );
}

// ─── Agent Card Component ─────────────────────────────────────────────────────

function AgentCardUI({
  agent,
  proposal,
  iteratedProposal,
  feedbackReceived,
  vote,
  winner,
  runnerUp,
  stepStatus,
}: {
  agent: AgentCard;
  proposal?: GeneratedProposal;
  iteratedProposal?: IteratedProposal;
  feedbackReceived?: FeedbackItem[];
  vote?: Vote;
  winner?: IteratedProposal;
  runnerUp?: IteratedProposal;
  stepStatus: { generate: StepStatus; feedback: StepStatus; iterate: StepStatus; vote: StepStatus };
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const isWinner = winner?.provider === agent.provider;
  const isRunnerUp = runnerUp?.provider === agent.provider;
  const avgScore = feedbackReceived && feedbackReceived.length > 0
    ? Math.round(feedbackReceived.reduce((s, f) => s + f.qualityScore, 0) / feedbackReceived.length)
    : null;
  const winRate = agent.total_rounds > 0 ? Math.round((agent.wins / agent.total_rounds) * 100) : 0;

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-4 transition-all duration-300
      ${isWinner ? 'border-yellow-400 bg-yellow-50 shadow-lg shadow-yellow-100'
        : isRunnerUp ? 'border-slate-300 bg-slate-50 shadow-sm'
        : PROVIDER_BORDER[agent.provider]} ${!isWinner && !isRunnerUp ? 'bg-white' : ''}`}
    >
      {/* Winner/Runner-up crown */}
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-yellow-900 shadow">
          🏆 Vinnare
        </div>
      )}
      {isRunnerUp && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-400 px-3 py-0.5 text-xs font-bold text-white shadow">
          🥈 Tvåa
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative">
          <AgentAvatar agent={agent} size="md" />
          {stepStatus.generate === 'running' && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{agent.name}</p>
          <div className="flex items-center gap-1.5">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${PROVIDER_COLOR[agent.provider]}`}>
              {agent.provider}
            </span>
            <span className="flex items-center gap-0.5 text-xs text-gray-500">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              {agent.elo}
            </span>
            {agent.total_rounds > 0 && (
              <span className="text-[10px] text-gray-400">{winRate}% win</span>
            )}
          </div>
        </div>
        {avgScore !== null && (
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
            ${avgScore >= 75 ? 'bg-green-100 text-green-700' : avgScore >= 55 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {avgScore}
          </div>
        )}
      </div>

      {/* System prompt toggle */}
      {agent.system_prompt && (
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="mb-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <User className="h-2.5 w-2.5" />
          System prompt
          {showPrompt ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
      )}
      {showPrompt && agent.system_prompt && (
        <div className="mb-2 rounded-lg bg-gray-50 p-2 text-[10px] text-gray-500 leading-relaxed max-h-24 overflow-y-auto">
          {agent.system_prompt}
        </div>
      )}

      {/* Proposal preview */}
      {proposal && (
        <div className={`mb-2 rounded-lg p-2.5 text-xs ${PROVIDER_BG[agent.provider]}`}>
          <p className="font-semibold text-gray-700 truncate">
            {proposal.content?.title || proposal.content?.tema || '(förslag genererat)'}
          </p>
          {proposal.content?.introduction && (
            <p className="mt-0.5 text-gray-500 line-clamp-2">{proposal.content.introduction}</p>
          )}
        </div>
      )}

      {/* Feedback received */}
      {feedbackReceived && feedbackReceived.length > 0 && (
        <div className="mb-2 space-y-1">
          {feedbackReceived.map((fb, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-[10px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-gray-600">Från {fb.fromProvider}</span>
                <span className={`rounded px-1 font-bold ${fb.qualityScore >= 70 ? 'text-green-600' : fb.qualityScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {fb.qualityScore}/100
                </span>
              </div>
              {fb.strengths[0] && <p className="text-green-600 truncate">✓ {fb.strengths[0]}</p>}
              {fb.improvements[0] && <p className="text-orange-600 truncate">↑ {fb.improvements[0]}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Iterated changes */}
      {iteratedProposal?.changesApplied && iteratedProposal.changesApplied.length > 0 && (
        <div className="mb-2 rounded-lg bg-indigo-50 p-2 text-[10px]">
          <p className="mb-1 font-semibold text-indigo-700">Ändringar v2:</p>
          {iteratedProposal.changesApplied.slice(0, 2).map((c, i) => (
            <p key={i} className="text-indigo-600 truncate">• {c}</p>
          ))}
        </div>
      )}

      {/* Vote cast */}
      {vote && stepStatus.vote === 'done' && (
        <div className="mt-auto rounded-lg border border-gray-100 bg-gray-50 p-2 text-[10px]">
          <span className="text-gray-500">Röstade på: </span>
          <span className="font-semibold text-gray-700">{vote.votedFor}</span>
          <p className="mt-0.5 text-gray-500 line-clamp-2">{vote.reasoning}</p>
          <div className="mt-1 flex gap-1 flex-wrap">
            {Object.entries(vote.scores).filter(([k]) => k !== 'overall').map(([k, v]) => (
              <span key={k} className="rounded bg-white px-1 py-0.5 text-[9px] text-gray-600 ring-1 ring-gray-200">
                {k.replace('Age', 'Ålder').replace('appropriateness', '').replace('creativity', 'kreativitet').replace('engagement', 'engagemang').replace('clarity', 'klarhet')}: {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Matrix ──────────────────────────────────────────────────────────

function FeedbackMatrix({ feedback, agents, agentNames }: { feedback: FeedbackItem[]; agents: AgentCard[]; agentNames: Record<string, string> }) {
  const providers = agents.map(a => a.provider);
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Feedbackmatris</p>
      {feedback.map((fb, i) => {
        const fromAgent = agents.find(a => a.provider === fb.fromProvider);
        const toAgent = agents.find(a => a.provider === fb.toProvider);
        return (
          <div key={i} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              {fromAgent && <AgentAvatar agent={fromAgent} size="sm" />}
              <ArrowRight className="h-3 w-3 text-gray-400" />
              {toAgent && <AgentAvatar agent={toAgent} size="sm" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-700">
                  {agentNames[fb.fromProvider] || fb.fromProvider} → {agentNames[fb.toProvider] || fb.toProvider}
                </span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold
                  ${fb.qualityScore >= 75 ? 'bg-green-100 text-green-700' : fb.qualityScore >= 55 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {fb.qualityScore}/100
                </span>
              </div>
              {fb.strengths[0] && <p className="text-green-600 truncate">✓ {fb.strengths[0]}</p>}
              {fb.improvements[0] && <p className="text-orange-500 truncate">↑ {fb.improvements[0]}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIToolsPage() {
  // Form state
  const [type, setType] = useState('treasure_hunt');
  const [theme, setTheme] = useState('');
  const [ageGroup, setAgeGroup] = useState('child');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState<'en' | 'sv' | 'bilingual'>('en');
  const [numberOfClues, setNumberOfClues] = useState(5);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [location, setLocation] = useState('indoor');
  const [quizSubtype, setQuizSubtype] = useState('standard');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [mode, setMode] = useState<Mode>('economy');
  const [singleProvider, setSingleProvider] = useState('openai');
  const [publishDirectly, setPublishDirectly] = useState(true);

  // Template state
  const [mallar, setMallar] = useState<JaktMallOption[]>([]);
  const [selectedMallId, setSelectedMallId] = useState<string>('');

  // Agent cards
  const [agentCards, setAgentCards] = useState<AgentCard[]>([]);

  // Council session state
  const [councilRunId, setCouncilRunId] = useState<string | null>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<GeneratedProposal[] | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [iteratedProposals, setIteratedProposals] = useState<IteratedProposal[] | null>(null);
  const [votes, setVotes] = useState<Vote[] | null>(null);
  const [winner, setWinner] = useState<IteratedProposal | null>(null);
  const [runnerUp, setRunnerUp] = useState<IteratedProposal | null>(null);
  const [translatedContent, setTranslatedContent] = useState<any | null>(null);

  // Step statuses (behålls för bakåtkompatibilitet med AgentCardUI)
  const [generateStatus, setGenerateStatus] = useState<StepStatus>('idle');
  const [feedbackStatus, setFeedbackStatus] = useState<StepStatus>('idle');
  const [iterateStatus, setIterateStatus] = useState<StepStatus>('idle');
  const [voteStatus, setVoteStatus] = useState<StepStatus>('idle');

  // Job queue (async council)
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobRunning, setJobRunning] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobProgressMsg, setJobProgressMsg] = useState('');
  const [jobError, setJobError] = useState<string | null>(null);

  // Image + save
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Single model
  const [singleResult, setSingleResult] = useState<any | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState('');
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);

  // Error per step
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const isCouncilMode = mode === 'economy' || mode === 'premium';
  const selectedMall = mallar.find(m => m.id === selectedMallId) ?? null;
  const councilDone = winner !== null;

  // Load templates
  useEffect(() => {
    if (type === 'treasure_hunt' && mallar.length === 0) {
      fetch('/api/jakt-mallar').then(r => r.json()).then(d => { if (d.success) setMallar(d.data); }).catch(() => {});
    }
  }, [type]);

  // Load agent cards when mode changes
  useEffect(() => {
    if (!isCouncilMode) return;
    const tier = mode as 'economy' | 'premium';
    fetch(`/api/ai/council/agents?tier=${tier}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAgentCards(d.data); })
      .catch(() => {});
  }, [mode, isCouncilMode]);

  // Poll job status var 3:e sekund
  useEffect(() => {
    if (!jobId || !jobRunning) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        if (!data.success) return;
        const job = data.data;
        setJobProgress(job.progress ?? 0);
        setJobProgressMsg(job.progress_msg ?? '');
        if (job.status === 'complete' && job.result) {
          setJobRunning(false);
          const r = job.result;
          setWinner(r.winner ?? null);
          setRunnerUp(r.runnerUp ?? null);
          setVotes(r.votes ?? null);
          setAgentNames(r.agentNames ?? {});
          setTranslatedContent(r.translatedContent ?? null);
          setVoteStatus('done');
        } else if (job.status === 'failed') {
          setJobRunning(false);
          setJobError(job.error ?? 'Jobbet misslyckades');
        }
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId, jobRunning]);

  // Build CouncilInput from form
  const buildInput = useCallback(() => ({
    type,
    theme,
    ageGroup,
    difficulty,
    language: language === 'bilingual' ? 'en' : language,
    bilingualMode: language === 'bilingual',
    modelTier: mode as 'economy' | 'premium',
    numberOfClues: type === 'treasure_hunt' ? numberOfClues : undefined,
    numberOfQuestions: type === 'quiz' ? numberOfQuestions : undefined,
    location: type === 'treasure_hunt' ? location : undefined,
    quizSubtype: type === 'quiz' ? quizSubtype : undefined,
    additionalInstructions: additionalInstructions || undefined,
    mallId: type === 'treasure_hunt' && selectedMall ? selectedMall.id : undefined,
    mallNamn: type === 'treasure_hunt' && selectedMall ? selectedMall.namn : undefined,
    stegTyper: type === 'treasure_hunt' && selectedMall ? selectedMall.steg_typer : undefined,
  }), [type, theme, ageGroup, difficulty, language, mode, numberOfClues, numberOfQuestions, location, quizSubtype, additionalInstructions, selectedMall]);

  // Reset council state
  const resetCouncil = () => {
    setCouncilRunId(null);
    setAgentNames({});
    setProposals(null);
    setFeedback(null);
    setIteratedProposals(null);
    setVotes(null);
    setWinner(null);
    setRunnerUp(null);
    setTranslatedContent(null);
    setGenerateStatus('idle');
    setFeedbackStatus('idle');
    setIterateStatus('idle');
    setVoteStatus('idle');
    setJobId(null);
    setJobRunning(false);
    setJobProgress(0);
    setJobProgressMsg('');
    setJobError(null);
    setProductImage(null);
    setSaveStatus(null);
    setStepErrors({});
    setGenerationTimeMs(null);
  };

  // ── Step handlers ────────────────────────────────────────────────────────

  const handleStartCouncil = async () => {
    resetCouncil();
    setJobError(null);
    setJobRunning(true);
    setJobProgress(0);
    setJobProgressMsg('Startar...');
    try {
      const res = await fetch('/api/ai/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildInput()),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Kunde inte starta council');
      setJobId(data.data.id);
    } catch (err) {
      setJobRunning(false);
      setJobError(err instanceof Error ? err.message : 'Kunde inte starta');
    }
  };

  const generateImage = async () => {
    setImageLoading(true);
    setImageError('');
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, theme, ageGroup, language }),
      });
      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        throw new Error(res.status === 504 ? 'Timeout – försök igen.' : `Serverfel (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Image generation failed');
      setProductImage(data.imageDataUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Kunde inte generera bild');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSave = async () => {
    const content = winner?.content ?? singleResult?.data;
    if (!content) return;
    setSaving(true);
    setSaveStatus(null);
    const apiLanguage = language === 'bilingual' ? 'en' : language;
    const status = publishDirectly ? 'published' : 'draft';
    try {
      const res = await fetch('/api/ai/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content, type, theme, ageGroup, difficulty, language: apiLanguage,
          imageDataUrl: productImage,
          translatedContent: translatedContent ?? null,
          status,
          mallId: type === 'treasure_hunt' && selectedMall ? selectedMall.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      setSaveStatus({ ok: true, message: publishDirectly ? `Publicerad! ID: ${data.data.id.slice(0, 8)}…` : `Sparad som utkast!` });
    } catch (err) {
      setSaveStatus({ ok: false, message: err instanceof Error ? err.message : 'Fel vid sparning' });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    const content = winner?.content ?? singleResult?.data;
    if (!content) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/ai/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'PDF failed'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${content?.title || theme || 'product'}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF failed');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Single model ────────────────────────────────────────────────────────

  const handleSingle = async () => {
    setSingleLoading(true);
    setSingleError('');
    setSingleResult(null);
    setProductImage(null);
    setSaveStatus(null);
    setGenerationTimeMs(null);
    const t0 = Date.now();
    try {
      const params: Record<string, unknown> = { ageGroup, difficulty, language };
      if (type === 'treasure_hunt') { params.theme = theme; params.numberOfClues = numberOfClues; params.location = location; }
      else { params.topic = theme; params.numberOfQuestions = numberOfQuestions; params.quizSubtype = quizSubtype; }
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, params, provider: singleProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenerationTimeMs(Date.now() - t0);
      setSingleResult(data);
    } catch (err) {
      setSingleError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setSingleLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────

  const stepStatuses = { generate: generateStatus, feedback: feedbackStatus, iterate: iterateStatus, vote: voteStatus };

  const getAgentProposal = (provider: string) => proposals?.find(p => p.provider === provider);
  const getAgentFeedback = (provider: string) => feedback?.filter(f => f.toProvider === provider) ?? [];
  const getAgentIterated = (provider: string) => iteratedProposals?.find(p => p.provider === provider);
  const getAgentVote = (provider: string) => votes?.find(v => v.voter === provider);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">AI Tools</h1>
        {generationTimeMs !== null && (
          <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            <Clock className="h-3.5 w-3.5" />
            {(generationTimeMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

        {/* ── Left: Config ─────────────────────────────────────────────── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Konfigurera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Produkttyp"
              options={[
                { value: 'treasure_hunt', label: 'Skattjakt' },
                { value: 'quiz', label: 'Quiz' },
              ]}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />

            <Input
              label={type === 'quiz' && quizSubtype === 'music' ? 'Genre / Era / Artist' : 'Tema'}
              placeholder={type === 'quiz' && quizSubtype === 'music' ? 't.ex. 90s Pop, ABBA, Klassisk rock' : 't.ex. Pirater, Dinosaurier, Rymden'}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            />

            <div className="grid gap-3 grid-cols-2">
              <Select
                label="Åldersgrupp"
                options={[
                  { value: 'toddler', label: '2-4 år' },
                  { value: 'child', label: '5-8 år' },
                  { value: 'teen', label: '9-12 år' },
                  { value: 'adult', label: '13+ år' },
                  { value: 'all', label: 'Alla åldrar' },
                ]}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              />
              <Select
                label="Svårighetsgrad"
                options={[
                  { value: 'easy', label: 'Lätt' },
                  { value: 'medium', label: 'Medel' },
                  { value: 'hard', label: 'Svår' },
                ]}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              />
            </div>

            <Select
              label="Språk"
              options={[
                { value: 'en', label: 'Engelska' },
                { value: 'sv', label: 'Svenska' },
                { value: 'bilingual', label: 'Tvåspråkig (EN → SV)' },
              ]}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'sv' | 'bilingual')}
            />

            {type === 'treasure_hunt' && (
              <>
                <div className="grid gap-3 grid-cols-2">
                  <Input
                    label="Antal ledtrådar"
                    type="number" min={3} max={15}
                    value={numberOfClues}
                    onChange={(e) => setNumberOfClues(parseInt(e.target.value))}
                  />
                  <Select
                    label="Plats"
                    options={[
                      { value: 'indoor', label: 'Inomhus' },
                      { value: 'outdoor', label: 'Utomhus' },
                      { value: 'mixed', label: 'Blandat' },
                    ]}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                {mallar.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <LayoutTemplate className="h-4 w-4" />
                      Mall (valfri)
                    </p>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedMallId('')}
                        className={`w-full rounded-lg border p-2.5 text-left text-sm transition-colors ${selectedMallId === '' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <span className="font-medium text-gray-700">Fri komposition</span>
                        <span className="ml-1 text-xs text-gray-400">AI väljer själv</span>
                      </button>
                      {mallar.map(mall => (
                        <button
                          key={mall.id}
                          type="button"
                          onClick={() => setSelectedMallId(mall.id)}
                          className={`w-full rounded-lg border p-2.5 text-left transition-colors ${selectedMallId === mall.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">{mall.namn}</span>
                            {mall.rekommenderad_tid_minuter && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />{mall.rekommenderad_tid_minuter} min
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {mall.steg_typer.map((typ, i) => (
                              <span key={i} className="flex items-center gap-0.5">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STEG_LABELS[typ]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                  {STEG_LABELS[typ]?.label ?? typ}
                                </span>
                                {i < mall.steg_typer.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-gray-300" />}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {type === 'quiz' && (
              <>
                <Select
                  label="Quiztyp"
                  options={[
                    { value: 'standard', label: 'Standard Quiz' },
                    { value: 'music', label: '🎵 Musikquiz' },
                  ]}
                  value={quizSubtype}
                  onChange={(e) => setQuizSubtype(e.target.value)}
                />
                <Input
                  label="Antal frågor"
                  type="number" min={5} max={30}
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                />
              </>
            )}

            {/* Mode Toggle */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Läge</p>
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                {[
                  { value: 'economy', label: '⚡ Economy', sub: 'Council · 3 modeller' },
                  { value: 'premium', label: '🔥 Premium', sub: 'Council · bästa modeller' },
                  { value: 'single', label: '🚀 Single', sub: 'En modell, snabb' },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value as Mode)}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                      mode === m.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div>{m.label}</div>
                    {mode === m.value && <div className="mt-0.5 opacity-60 font-normal">{m.sub}</div>}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'single' && (
              <Select
                label="AI-provider"
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic Claude' },
                  { value: 'google', label: 'Google Gemini' },
                ]}
                value={singleProvider}
                onChange={(e) => setSingleProvider(e.target.value)}
              />
            )}

            {isCouncilMode && (
              <Textarea
                label="Extra instruktioner (valfritt)"
                placeholder="Specifika krav eller stilpreferenser..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={2}
              />
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={publishDirectly}
                onChange={(e) => setPublishDirectly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Publicera direkt
            </label>

            {/* Single model button */}
            {!isCouncilMode && (
              <>
                {singleError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{singleError}</div>}
                <Button onClick={handleSingle} disabled={singleLoading || !theme} className="w-full">
                  {singleLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Genererar...</> : <><Wand2 className="mr-2 h-4 w-4" />Generera</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Right: Workspace ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* ── Council ──────────────────────────────────────────────────── */}
          {isCouncilMode && (
            <>
              {/* Starta + progress */}
              <Card>
                <CardContent className="space-y-4 pt-5">
                  {/* Starta-knapp */}
                  <button
                    onClick={handleStartCouncil}
                    disabled={jobRunning || !theme}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all
                      ${jobRunning
                        ? 'cursor-wait bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                        : !theme
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]'}`}
                  >
                    {jobRunning
                      ? <><RefreshCw className="h-4 w-4 animate-spin" />Kör council...</>
                      : <><Play className="h-4 w-4" />Starta council</>}
                  </button>

                  {/* Progress bar */}
                  {(jobRunning || jobProgress > 0) && (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                        <span>{jobProgressMsg || 'Arbetar...'}</span>
                        <span>{jobProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-indigo-600 transition-all duration-700"
                          style={{ width: `${jobProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Felmeddelande */}
                  {jobError && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{jobError}</p>
                  )}

                  {/* Agentkortar */}
                  {agentCards.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {agentCards.map((agent) => (
                        <AgentCardUI
                          key={agent.id}
                          agent={agent}
                          winner={winner ?? undefined}
                          runnerUp={runnerUp ?? undefined}
                          vote={getAgentVote(agent.provider)}
                          stepStatus={stepStatuses}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resultat: vinnare + röster */}
              {councilDone && winner && votes && (
                <Card>
                  <CardContent className="pt-5">
                    {/* Winner banner */}
                    <div className="mb-4 rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Trophy className="h-7 w-7 shrink-0 text-yellow-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Vinnare</p>
                          <p className="truncate text-lg font-bold text-gray-900">{agentNames[winner.provider] || winner.provider}</p>
                        </div>
                        {runnerUp && (
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-gray-400">Tvåa</p>
                            <p className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                              <Medal className="h-4 w-4 text-slate-400" />
                              {agentNames[runnerUp.provider] || runnerUp.provider}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Votes */}
                    <div className="space-y-2">
                      {votes.map((vote, i) => {
                        const voterAgent = agentCards.find(a => a.provider === vote.voter);
                        const votedAgent = agentCards.find(a => a.provider === vote.votedFor);
                        return (
                          <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs">
                            <div className="mb-1.5 flex items-center gap-2">
                              <div className="flex shrink-0 items-center gap-1">
                                {voterAgent && <AgentAvatar agent={voterAgent} size="sm" />}
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                {votedAgent && <AgentAvatar agent={votedAgent} size="sm" />}
                              </div>
                              <p className="min-w-0 truncate font-medium text-gray-700">
                                {agentNames[vote.voter] || vote.voter} röstade på {agentNames[vote.votedFor] || vote.votedFor}
                              </p>
                            </div>
                            <p className="mb-1.5 text-gray-500 line-clamp-2">{vote.reasoning}</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(vote.scores).map(([k, v]) => (
                                <span key={k} className={`rounded px-1.5 py-0.5 text-[9px] font-medium
                                  ${v >= 8 ? 'bg-green-100 text-green-700' : v >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {k === 'overall' ? '⭐' : k === 'creativity' ? '🎨' : k === 'ageAppropriateness' ? '👶' : k === 'engagement' ? '🔥' : '📖'} {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Image + Save (visible after voting) */}
              {councilDone && winner && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">5</div>
                      <CardTitle className="text-base">Bild & spara</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Image section */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Produktbild (valfri)</p>
                        <button
                          onClick={generateImage}
                          disabled={imageLoading}
                          className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
                        >
                          {imageLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                          {imageLoading ? 'Genererar...' : 'Generera bild'}
                        </button>
                      </div>
                      {imageLoading && !productImage && (
                        <div className="flex h-40 items-center justify-center rounded-xl bg-purple-50">
                          <div className="text-center text-purple-400">
                            <ImageIcon className="mx-auto mb-2 h-8 w-8 animate-pulse" />
                            <p className="text-xs">Genererar bild med Nano Banana...</p>
                          </div>
                        </div>
                      )}
                      {productImage && (
                        <div className="relative overflow-hidden rounded-xl">
                          <img src={productImage} alt="Produktbild" className="w-full rounded-xl object-cover" />
                          {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                              <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                            </div>
                          )}
                        </div>
                      )}
                      {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
                    </div>

                    {/* Winner content preview */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-600">Vinnande innehåll</p>
                      <div className="max-h-48 overflow-auto rounded-xl bg-gray-900 p-3">
                        <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">{JSON.stringify(winner.content, null, 2)}</pre>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={saving} className="flex-1">
                        {saving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Sparar...</> : <><Save className="mr-2 h-4 w-4" />Spara produkt</>}
                      </Button>
                      <Button variant="outline" onClick={handleGeneratePDF} disabled={pdfLoading}>
                        <FileDown className="mr-1 h-4 w-4" />
                        {pdfLoading ? '...' : 'PDF'}
                      </Button>
                    </div>

                    {saveStatus && (
                      <div className={`rounded-lg p-2.5 text-sm ${saveStatus.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {saveStatus.ok && <CheckCircle className="mr-1.5 inline h-4 w-4" />}
                        {saveStatus.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Single model result ──────────────────────────────────── */}
          {!isCouncilMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultat</CardTitle>
              </CardHeader>
              <CardContent>
                {singleLoading && (
                  <div className="flex h-40 items-center justify-center text-gray-400">
                    <div className="text-center">
                      <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin" />
                      <p className="text-sm">Genererar...</p>
                    </div>
                  </div>
                )}
                {!singleResult && !singleLoading && (
                  <div className="flex h-40 items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Wand2 className="mx-auto mb-3 h-10 w-10" />
                      <p className="text-sm">Konfigurera och generera</p>
                    </div>
                  </div>
                )}
                {singleResult && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      Genererat med {singleResult.meta?.provider} kl {new Date(singleResult.meta?.generatedAt).toLocaleTimeString()}
                    </div>
                    <div className="max-h-64 overflow-auto rounded-xl bg-gray-900 p-4">
                      <pre className="text-xs text-gray-100">{JSON.stringify(singleResult.data, null, 2)}</pre>
                    </div>
                    {/* Image */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Bild (valfri)</p>
                        <button onClick={generateImage} disabled={imageLoading} className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
                          <ImageIcon className="h-3 w-3" />{imageLoading ? 'Genererar...' : 'Generera'}
                        </button>
                      </div>
                      {productImage && <img src={productImage} alt="Produktbild" className="w-full rounded-xl object-cover" />}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={saving} className="flex-1">
                        {saving ? 'Sparar...' : <><Save className="mr-2 h-4 w-4" />Spara</>}
                      </Button>
                      <Button variant="outline" onClick={handleGeneratePDF} disabled={pdfLoading}>
                        <FileDown className="mr-1 h-4 w-4" />{pdfLoading ? '...' : 'PDF'}
                      </Button>
                    </div>
                    {saveStatus && (
                      <div className={`rounded-lg p-2.5 text-sm ${saveStatus.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {saveStatus.message}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Empty state for council ──────────────────────────────── */}
          {isCouncilMode && generateStatus === 'idle' && agentCards.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
              <div className="text-center">
                <Sparkles className="mx-auto mb-4 h-12 w-12" />
                <p className="font-medium">AI Council</p>
                <p className="mt-1 text-sm">Fyll i temat och klicka Starta</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
