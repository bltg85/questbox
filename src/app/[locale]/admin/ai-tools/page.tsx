'use client';

import { useState } from 'react';
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
  Vote,
  CheckCircle,
  Clock,
  ImageIcon,
  Save,
  FileDown,
  Wand2,
} from 'lucide-react';

type Mode = 'economy' | 'premium' | 'single';

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

interface CouncilResultView {
  winner: ProposalView;
  runnerUp: ProposalView | null;
  allProposals: ProposalView[];
  votes: VoteView[];
  summary: string;
  totalTimeMs: number;
  translatedContent: any | null;
}

interface SingleResultView {
  data: any;
  meta: { provider: string; generatedAt: string };
}

export default function AIToolsPage() {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [councilResult, setCouncilResult] = useState<CouncilResultView | null>(null);
  const [singleResult, setSingleResult] = useState<SingleResultView | null>(null);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<string>('winner');

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
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
  const [generateImageEnabled, setGenerateImageEnabled] = useState(false);

  const isCouncilMode = mode === 'economy' || mode === 'premium';

  const generateImage = async (): Promise<string | null> => {
    setImageLoading(true);
    setImageError('');
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, theme, ageGroup, language }),
      });
      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        throw new Error(res.status === 504 ? 'Image generation timed out. Try again.' : `Server error (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Image generation failed');
      setProductImage(data.imageDataUrl);
      return data.imageDataUrl as string;
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not generate image');
      return null;
    } finally {
      setImageLoading(false);
    }
  };

  const autoSaveProduct = async (content: any, imageDataUrl: string | null, translatedContent?: any) => {
    if (!content) return;
    setSaving(true);
    setSaveStatus(null);
    const apiLanguage = language === 'bilingual' ? 'en' : language;
    try {
      const res = await fetch('/api/ai/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type, theme, ageGroup, difficulty, language: apiLanguage, imageDataUrl, translatedContent: translatedContent ?? null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      setSaveStatus({ ok: true, message: `Sparad som utkast! ID: ${data.data.id.slice(0, 8)}…` });
    } catch (err) {
      setSaveStatus({ ok: false, message: err instanceof Error ? err.message : 'Fel vid sparning' });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentContent = () => {
    if (isCouncilMode && councilResult) {
      if (selectedProposal === 'winner') return councilResult.winner?.content;
      if (selectedProposal === 'runnerUp') return councilResult.runnerUp?.content;
      return councilResult.allProposals.find(p => p.provider === selectedProposal)?.content;
    }
    return singleResult?.data;
  };


  const handleGeneratePDF = async () => {
    const content = getCurrentContent();
    if (!content) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/ai/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'PDF generation failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content?.title || theme || 'product'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF generation failed');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setCouncilResult(null);
    setSingleResult(null);
    setProductImage(null);
    setSaveStatus(null);
    setGenerationTimeMs(null);
    const startTime = Date.now();

    if (!isCouncilMode) {
      // Single model generation
      try {
        const params: Record<string, unknown> = { ageGroup, difficulty, language };
        if (type === 'treasure_hunt') {
          params.theme = theme;
          params.numberOfClues = numberOfClues;
          params.location = location;
        } else if (type === 'quiz') {
          params.topic = theme;
          params.numberOfQuestions = numberOfQuestions;
          params.quizSubtype = quizSubtype;
        }

        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, params, provider: singleProvider }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        setGenerationTimeMs(Date.now() - startTime);
        setSingleResult(data);
        let imageUrl: string | null = null;
        if (generateImageEnabled) imageUrl = await generateImage();
        await autoSaveProduct(data.data, imageUrl, undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Council generation
    setStage('generating');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? prev : prev + Math.random() * 10);
    }, 2000);

    const stages = ['generating', 'feedback', 'iterating', 'voting', 'complete'];
    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      stageIndex++;
      if (stageIndex < stages.length) setStage(stages[stageIndex]);
    }, 8000);

    try {
      const councilLanguage = language === 'bilingual' ? 'en' : language;
      const res = await fetch('/api/ai/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          theme,
          ageGroup,
          difficulty,
          language: councilLanguage,
          bilingualMode: language === 'bilingual',
          modelTier: mode,
          numberOfClues: type === 'treasure_hunt' ? numberOfClues : undefined,
          numberOfQuestions: type === 'quiz' ? numberOfQuestions : undefined,
          location: type === 'treasure_hunt' ? location : undefined,
          quizSubtype: type === 'quiz' ? quizSubtype : undefined,
          additionalInstructions: additionalInstructions || undefined,
        }),
      });

      clearInterval(progressInterval);
      clearInterval(stageInterval);

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Council failed');

      setCouncilResult(data.data);
      setGenerationTimeMs(Date.now() - startTime);
      setStage('complete');
      setProgress(100);
      let imageUrl: string | null = null;
      if (generateImageEnabled) imageUrl = await generateImage();
      await autoSaveProduct(data.data.winner?.content ?? null, imageUrl, data.data.translatedContent ?? undefined);
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
      case 'anthropic': return 'Claude';
      case 'openai': return 'OpenAI';
      case 'google': return 'Gemini';
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
      case 'translating': return 'Translating winner to Swedish...';
      case 'complete': return 'Council complete!';
      default: return 'Starting...';
    }
  };

  const hasResult = councilResult || singleResult;

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">AI Tools</h1>

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
              label={type === 'quiz' && quizSubtype === 'music' ? 'Genre / Era / Artist' : 'Theme'}
              placeholder={
                type === 'quiz' && quizSubtype === 'music'
                  ? 'e.g., 90s Pop, ABBA, Swedish Music, Classic Rock'
                  : 'e.g., Pirates, Dinosaurs, Space, Swedish History'
              }
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
                { value: 'en', label: 'English' },
                { value: 'sv', label: 'Swedish' },
                { value: 'bilingual', label: 'Bilingual (EN → translate to SV)' },
              ]}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'sv' | 'bilingual')}
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
              <>
                <Select
                  label="Quiz Type"
                  options={[
                    { value: 'standard', label: 'Standard Quiz' },
                    { value: 'music', label: '🎵 Music Quiz (with Spotify playlist)' },
                  ]}
                  value={quizSubtype}
                  onChange={(e) => setQuizSubtype(e.target.value)}
                />
                <Input
                  label="Number of Questions"
                  type="number"
                  min={5}
                  max={30}
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                />
              </>
            )}

            {isCouncilMode && (
              <Textarea
                label="Additional Instructions (optional)"
                placeholder="Any specific requirements or style preferences..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={2}
              />
            )}

            {/* Mode Toggle */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Mode</p>
              <div className="flex rounded-lg border border-gray-200 p-1">
                {[
                  { value: 'economy', label: 'Economy', sub: 'Council · 3 models' },
                  { value: 'premium', label: 'Premium', sub: 'Council · best models' },
                  { value: 'single', label: 'Single', sub: 'One model, fast' },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value as Mode)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                      mode === m.value
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {m.label}
                    {mode === m.value && (
                      <span className="ml-1 block text-xs opacity-75">{m.sub}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Single model provider selector */}
            {mode === 'single' && (
              <Select
                label="AI Provider"
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic Claude' },
                  { value: 'google', label: 'Google Gemini' },
                ]}
                value={singleProvider}
                onChange={(e) => setSingleProvider(e.target.value)}
              />
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={generateImageEnabled}
                onChange={(e) => setGenerateImageEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Generate product image
            </label>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <Button onClick={handleGenerate} disabled={loading || !theme} className="w-full">
              {loading ? (
                <>
                  {isCouncilMode ? getStageIcon(stage) : <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span className="ml-2">{isCouncilMode ? getStageText(stage) : 'Generating...'}</span>
                </>
              ) : (
                <>
                  {isCouncilMode ? <Sparkles className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isCouncilMode ? 'Run AI Council' : 'Generate'}
                </>
              )}
            </Button>

            {loading && isCouncilMode && (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }} />
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
            <div className="flex items-center justify-between">
              <CardTitle>Results</CardTitle>
              {generationTimeMs !== null && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                  <Clock className="h-3.5 w-3.5" />
                  {(generationTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hasResult && !loading && (
              <div className="flex h-64 items-center justify-center text-gray-400">
                <div className="text-center">
                  <Sparkles className="mx-auto mb-4 h-12 w-12" />
                  <p>Configure and generate to see results</p>
                </div>
              </div>
            )}

            {/* Single model result */}
            {singleResult && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  Generated with {singleResult.meta.provider} at{' '}
                  {new Date(singleResult.meta.generatedAt).toLocaleTimeString()}
                </div>
                <div className="max-h-80 overflow-auto rounded-lg bg-gray-900 p-4">
                  <pre className="text-sm text-gray-100">
                    {JSON.stringify(singleResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Council result */}
            {councilResult && (
              <div className="space-y-6">
                <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Winner</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {getProviderName(councilResult.winner.provider)}
                      </p>
                    </div>
                    <Badge className={`ml-auto ${getProviderColor(councilResult.winner.provider)} text-white`}>
                      v{councilResult.winner.version}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant={selectedProposal === 'winner' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedProposal('winner')}>
                    <Trophy className="mr-1 h-3 w-3" />Winner
                  </Button>
                  {councilResult.runnerUp && (
                    <Button variant={selectedProposal === 'runnerUp' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedProposal('runnerUp')}>
                      <Medal className="mr-1 h-3 w-3" />Runner-up
                    </Button>
                  )}
                  {councilResult.allProposals
                    .filter(p => p.provider !== councilResult.winner.provider && p.provider !== councilResult.runnerUp?.provider)
                    .map(p => (
                      <Button key={p.provider} variant={selectedProposal === p.provider ? 'default' : 'outline'} size="sm" onClick={() => setSelectedProposal(p.provider)}>
                        {getProviderName(p.provider)}
                      </Button>
                    ))}
                </div>

                <div className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-4">
                  <pre className="text-sm text-gray-100">
                    {JSON.stringify(getCurrentContent(), null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold text-gray-900">Votes</h4>
                  <div className="space-y-2">
                    {councilResult.votes.map((vote, i) => (
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
              </div>
            )}

            {/* Product image (shared) */}
            {hasResult && (
              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">Product Image</h4>
                    <button
                      onClick={generateImage}
                      disabled={imageLoading}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${imageLoading ? 'animate-spin' : ''}`} />
                      {imageLoading ? 'Generating...' : 'Regenerate'}
                    </button>
                  </div>
                  {imageLoading && !productImage && (
                    <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50">
                      <div className="text-center text-gray-400">
                        <ImageIcon className="mx-auto mb-2 h-8 w-8 animate-pulse" />
                        <p className="text-sm">Generating product image...</p>
                      </div>
                    </div>
                  )}
                  {productImage && (
                    <div className="relative overflow-hidden rounded-lg">
                      <img src={productImage} alt="Generated product image" className="w-full rounded-lg object-cover" />
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
                          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                        </div>
                      )}
                    </div>
                  )}
                  {imageError && <p className="text-xs text-red-500">{imageError}</p>}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {saving && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Save className="h-3.5 w-3.5 animate-pulse" />
                          Sparar utkast...
                        </span>
                      )}
                      {saveStatus && !saving && (
                        <span className={saveStatus.ok ? 'text-green-600' : 'text-red-600'}>
                          {saveStatus.ok ? <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> : null}
                          {saveStatus.message}
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={pdfLoading}>
                      <FileDown className="mr-1 h-3 w-3" />
                      {pdfLoading ? 'Genererar...' : 'Download PDF'}
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
