'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Textarea } from '@/components/ui';
import { Sparkles, Wand2, FileText, Award, Users, ArrowRight } from 'lucide-react';

type GeneratorType = 'treasure_hunt' | 'quiz' | 'diploma';

export default function AIToolsPage() {
  const [activeGenerator, setActiveGenerator] = useState<GeneratorType>('treasure_hunt');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Treasure Hunt state
  const [theme, setTheme] = useState('');
  const [numberOfClues, setNumberOfClues] = useState(5);
  const [location, setLocation] = useState('indoor');

  // Quiz state
  const [topic, setTopic] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);

  // Diploma state
  const [achievementType, setAchievementType] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Common state
  const [ageGroup, setAgeGroup] = useState('child');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('en');
  const [provider, setProvider] = useState('');

  const generators = [
    { id: 'treasure_hunt', name: 'Treasure Hunt', icon: Sparkles, color: 'bg-amber-500' },
    { id: 'quiz', name: 'Quiz', icon: FileText, color: 'bg-blue-500' },
    { id: 'diploma', name: 'Diploma', icon: Award, color: 'bg-green-500' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params: Record<string, unknown> = {
        ageGroup,
        difficulty,
        language,
      };

      if (activeGenerator === 'treasure_hunt') {
        params.theme = theme;
        params.numberOfClues = numberOfClues;
        params.location = location;
      } else if (activeGenerator === 'quiz') {
        params.topic = topic;
        params.numberOfQuestions = numberOfQuestions;
      } else if (activeGenerator === 'diploma') {
        params.achievementType = achievementType;
        params.recipientName = recipientName;
        params.customMessage = customMessage;
      }

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeGenerator,
          params,
          provider: provider || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const ageGroupOptions = [
    { value: 'toddler', label: '2-4 years' },
    { value: 'child', label: '5-8 years' },
    { value: 'teen', label: '9-12 years' },
    { value: 'adult', label: '13+ years' },
    { value: 'all', label: 'All ages' },
  ];

  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'sv', label: 'Swedish' },
  ];

  const providerOptions = [
    { value: '', label: 'Auto (recommended)' },
    { value: 'openai', label: 'OpenAI GPT-4' },
    { value: 'anthropic', label: 'Anthropic Claude' },
    { value: 'google', label: 'Google Gemini' },
  ];

  const locationOptions = [
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'mixed', label: 'Mixed' },
  ];

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">AI Tools</h1>

      {/* Council CTA */}
      <Link href="/admin/ai-tools/council">
        <div className="mb-8 flex items-center justify-between rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 transition-all hover:border-indigo-400">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-600 p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Council</h2>
              <p className="text-sm text-gray-600">
                Multi-agent collaboration: 3 AI models generate, give feedback, iterate, and vote for the best result
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-indigo-600" />
        </div>
      </Link>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Quick Generation (Single Model)</h2>
        <p className="text-sm text-gray-500">For fast results with a single AI provider</p>
      </div>

      {/* Generator Selection */}
      <div className="mb-8 flex gap-4">
        {generators.map((gen) => (
          <button
            key={gen.id}
            onClick={() => {
              setActiveGenerator(gen.id as GeneratorType);
              setResult(null);
            }}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              activeGenerator === gen.id
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`rounded-lg p-2 ${gen.color} text-white`}>
              <gen.icon className="h-5 w-5" />
            </div>
            <span className="font-medium">{gen.name}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeGenerator === 'treasure_hunt' && 'Treasure Hunt Generator'}
              {activeGenerator === 'quiz' && 'Quiz Generator'}
              {activeGenerator === 'diploma' && 'Diploma Generator'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Treasure Hunt Fields */}
            {activeGenerator === 'treasure_hunt' && (
              <>
                <Input
                  label="Theme"
                  placeholder="e.g., Pirates, Dinosaurs, Space"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                />
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
                    options={locationOptions}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Quiz Fields */}
            {activeGenerator === 'quiz' && (
              <>
                <Input
                  label="Topic"
                  placeholder="e.g., Animals, History, Science"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
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

            {/* Diploma Fields */}
            {activeGenerator === 'diploma' && (
              <>
                <Input
                  label="Achievement Type"
                  placeholder="e.g., Treasure Hunt Completion, Best Helper"
                  value={achievementType}
                  onChange={(e) => setAchievementType(e.target.value)}
                />
                <Input
                  label="Recipient Name (optional)"
                  placeholder="Leave empty for template"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <Textarea
                  label="Custom Message (optional)"
                  placeholder="Add any custom text to include"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={2}
                />
              </>
            )}

            {/* Common Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Age Group"
                options={ageGroupOptions}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              />
              <Select
                label="Difficulty"
                options={difficultyOptions}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Language"
                options={languageOptions}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
              <Select
                label="AI Provider"
                options={providerOptions}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <Button onClick={handleGenerate} loading={loading} className="w-full">
              <Wand2 className="mr-2 h-4 w-4" />
              Generate
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex h-64 items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="mb-4 animate-spin text-4xl">✨</div>
                  <p>Generating...</p>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="flex h-64 items-center justify-center text-gray-400">
                <div className="text-center">
                  <Wand2 className="mx-auto mb-4 h-12 w-12" />
                  <p>Generated content will appear here</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  Generated with {result.meta.provider} at {new Date(result.meta.generatedAt).toLocaleTimeString()}
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))}>
                    Copy JSON
                  </Button>
                  <Button variant="outline">Generate PDF</Button>
                  <Button>Save as Product</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
