'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  ArrowLeft,
  Trophy,
  Medal,
  MessageSquare,
  RefreshCw,
  Vote,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface ProposalView {
  provider: string;
  content: any;
  version: number;
  changesApplied?: string[];
}

interface VoteView {
  voter: string;
  votedFor: string;
  reasoning: string;
  scores: {
    creativity: number;
    ageAppropriateness: number;
    engagement: number;
    clarity: number;
    overall: number;
  };
}

interface PipelineResultView {
  winner: ProposalView;
  runnerUp: ProposalView | null;
  allProposals: ProposalView[];
  votes: VoteView[];
  summary: string;
  totalTimeMs: number;
}

export default function PipelinePage() {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PipelineResultView | null>(null);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<string>('winner');

  // Form state
  const [type, setType] = useState('treasure_hunt');
  const [theme, setTheme] = useState('');
  const [ageGroup, setAgeGroup] = useState('child');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('sv');
  const [numberOfClues, setNumberOfClues] = useState(5);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [location, setLocation] = useState('indoor');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setStage('generating');
    setProgress(0);

    // Simulate progress updates (since we can't stream from API easily)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 2000);

    const stages = ['generating', 'feedback', 'iterating', 'voting', 'complete'];
    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      stageIndex++;
      if (stageIndex < stages.length) {
        setStage(stages[stageIndex]);
      }
    }, 8000);

    try {
      const res = await fetch('/api/ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          theme,
          ageGroup,
          difficulty,
          language,
          numberOfClues: type === 'treasure_hunt' ? numberOfClues : undefined,
          numberOfQuestions: type === 'quiz' ? numberOfQuestions : undefined,
          location: type === 'treasure_hunt' ? location : undefined,
          additionalInstructions: additionalInstructions || undefined,
        }),
      });

      clearInterval(progressInterval);
      clearInterval(stageInterval);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pipeline failed');
      }

      setResult(data.data);
      setStage('complete');
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStage('');
    } finally {
      setLoading(false);
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'bg-orange-500';
      case 'openai': return 'bg-green-500';
      case 'google': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Claude Sonnet 4';
      case 'openai': return 'OpenAI o3';
      case 'google': return 'Gemini 2.0';
      default: return provider;
    }
  };

  const getStageIcon = (s: string) => {
    switch (s) {
      case 'generating': return <Sparkles className="h-5 w-5 animate-pulse" />;
      case 'feedback': return <MessageSquare className="h-5 w-5 animate-pulse" />;
      case 'iterating': return <RefreshCw className="h-5 w-5 animate-spin" />;
      case 'voting': return <Vote className="h-5 w-5 animate-pulse" />;
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getStageText = (s: string) => {
    switch (s) {
      case 'generating': return 'All AI models are creating their proposals...';
      case 'feedback': return 'Models are reviewing each other\'s work...';
      case 'iterating': return 'Each model is improving based on feedback...';
      case 'voting': return 'Models are voting for the best version...';
      case 'complete': return 'Pipeline complete!';
      default: return 'Starting...';
    }
  };

  const getCurrentProposal = (): ProposalView | null => {
    if (!result) return null;
    if (selectedProposal === 'winner') return result.winner;
    if (selectedProposal === 'runnerUp') return result.runnerUp;
    return result.allProposals.find(p => p.provider === selectedProposal) || null;
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin/ai-tools">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Creative Pipeline</h1>
          <p className="text-gray-500">Multi-agent generation with feedback and voting</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Product Type"
              options={[
                { value: 'treasure_hunt', label: 'Treasure Hunt' },
                { value: 'quiz', label: 'Quiz' },
              ]}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />

            <Input
              label="Theme"
              placeholder="e.g., Pirates, Dinosaurs, Space, Swedish History"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Age Group"
                options={[
                  { value: 'toddler', label: '2-4 years' },
                  { value: 'child', label: '5-8 years' },
                  { value: 'teen', label: '9-12 years' },
                  { value: 'adult', label: '13+ years' },
                  { value: 'all', label: 'All ages' },
                ]}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              />
              <Select
                label="Difficulty"
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              />
            </div>

            <Select
              label="Language"
              options={[
                { value: 'sv', label: 'Swedish' },
                { value: 'en', label: 'English' },
              ]}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />

            {type === 'treasure_hunt' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Number of Clues"
                  type="number"
                  min={3}
                  max={15}
                  value={numberOfClues}
                  onChange={(e) => setNumberOfClues(parseInt(e.target.value))}
                />
                <Select
                  label="Location"
                  options={[
                    { value: 'indoor', label: 'Indoor' },
                    { value: 'outdoor', label: 'Outdoor' },
                    { value: 'mixed', label: 'Mixed' },
                  ]}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            )}

            {type === 'quiz' && (
              <Input
                label="Number of Questions"
                type="number"
                min={5}
                max={30}
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
              />
            )}

            <Textarea
              label="Additional Instructions (optional)"
              placeholder="Any specific requirements or style preferences..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={2}
            />

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={loading || !theme}
              className="w-full"
            >
              {loading ? (
                <>
                  {getStageIcon(stage)}
                  <span className="ml-2">{getStageText(stage)}</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Creative Pipeline
                </>
              )}
            </Button>

            {loading && (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {stage === 'generating' && '1/4 Generating'}
                    {stage === 'feedback' && '2/4 Feedback'}
                    {stage === 'iterating' && '3/4 Iterating'}
                    {stage === 'voting' && '4/4 Voting'}
                    {stage === 'complete' && 'Complete!'}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="flex h-64 items-center justify-center text-gray-400">
                <div className="text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12" />
                  <p>Configure and run the pipeline to see results</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Winner announcement */}
                <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Winner</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {getProviderName(result.winner.provider)}
                      </p>
                    </div>
                    <Badge className={`ml-auto ${getProviderColor(result.winner.provider)} text-white`}>
                      v{result.winner.version}
                    </Badge>
                  </div>
                </div>

                {/* Proposal selector */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedProposal === 'winner' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedProposal('winner')}
                  >
                    <Trophy className="mr-1 h-3 w-3" />
                    Winner
                  </Button>
                  {result.runnerUp && (
                    <Button
                      variant={selectedProposal === 'runnerUp' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedProposal('runnerUp')}
                    >
                      <Medal className="mr-1 h-3 w-3" />
                      Runner-up
                    </Button>
                  )}
                  {result.allProposals
                    .filter(p => p.provider !== result.winner.provider && p.provider !== result.runnerUp?.provider)
                    .map(p => (
                      <Button
                        key={p.provider}
                        variant={selectedProposal === p.provider ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedProposal(p.provider)}
                      >
                        {getProviderName(p.provider)}
                      </Button>
                    ))}
                </div>

                {/* Selected content */}
                <div className="max-h-80 overflow-auto rounded-lg bg-gray-900 p-4">
                  <pre className="text-sm text-gray-100">
                    {JSON.stringify(getCurrentProposal()?.content, null, 2)}
                  </pre>
                </div>

                {/* Votes */}
                <div>
                  <h4 className="mb-2 font-semibold text-gray-900">Votes</h4>
                  <div className="space-y-2">
                    {result.votes.map((vote, i) => (
                      <div key={i} className="rounded-lg bg-gray-50 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getProviderName(vote.voter)}</Badge>
                          <span className="text-gray-500">voted for</span>
                          <Badge className={`${getProviderColor(vote.votedFor)} text-white`}>
                            {getProviderName(vote.votedFor)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-gray-600">{vote.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Total time: {(result.totalTimeMs / 1000).toFixed(1)}s</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Save as Product
                    </Button>
                    <Button variant="outline" size="sm">
                      Generate PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
