import type { AIProvider, ProductType, AgeGroup, DifficultyLevel, Locale, QuizSubtype } from '@/types';

export interface CouncilInput {
  type: ProductType;
  theme: string;
  ageGroup: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  modelTier?: 'economy' | 'premium';
  additionalInstructions?: string;
  // Type-specific
  numberOfClues?: number;
  numberOfQuestions?: number;
  location?: string;
  // Quiz-specific
  quizSubtype?: QuizSubtype;
}

export interface GeneratedProposal {
  provider: AIProvider;
  content: any;
  generatedAt: string;
}

export interface FeedbackItem {
  fromProvider: AIProvider;
  toProvider: AIProvider;
  strengths: string[];
  improvements: string[];
  specificSuggestions: string[];
}

export interface IteratedProposal extends GeneratedProposal {
  version: number;
  feedbackReceived: FeedbackItem[];
  changesApplied: string[];
}

export interface Vote {
  voter: AIProvider;
  votedFor: AIProvider;
  reasoning: string;
  scores: {
    creativity: number;
    ageAppropriateness: number;
    engagement: number;
    clarity: number;
    overall: number;
  };
}

export interface CouncilResult {
  winner: IteratedProposal;
  runnerUp: IteratedProposal | null;
  allProposals: IteratedProposal[];
  votes: Vote[];
  summary: string;
  totalTokensUsed?: number;
  totalTimeMs: number;
  // Agent tracking
  councilRunId: string;
  winnerAgentId: string | null;   // DB id of the winning agent
  agentNames: Record<string, string>; // provider -> agent name+icon e.g. "⚡ Spark"
}

export interface CouncilStatus {
  stage: 'generating' | 'feedback' | 'iterating' | 'voting' | 'complete' | 'error';
  currentProvider?: AIProvider;
  progress: number; // 0-100
  message: string;
}
