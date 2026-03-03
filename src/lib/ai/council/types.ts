import type { AIProvider, ProductType, AgeGroup, DifficultyLevel, Locale } from '@/types';

export interface CouncilInput {
  type: ProductType;
  theme: string;
  ageGroup: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  additionalInstructions?: string;
  // Type-specific
  numberOfClues?: number;
  numberOfQuestions?: number;
  location?: string;
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
}

export interface CouncilStatus {
  stage: 'generating' | 'feedback' | 'iterating' | 'voting' | 'complete' | 'error';
  currentProvider?: AIProvider;
  progress: number; // 0-100
  message: string;
}
