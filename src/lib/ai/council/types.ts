import type { AIProvider, ProductType, AgeGroup, DifficultyLevel, Locale, QuizSubtype, StegTyp } from '@/types';

export interface CouncilInput {
  type: ProductType;
  theme: string;
  ageGroup: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  modelTier?: 'economy' | 'premium';
  bilingualMode?: boolean; // Generate in EN, then translate winner to SV
  additionalInstructions?: string;
  // Type-specific
  numberOfClues?: number;
  numberOfQuestions?: number;
  location?: string;
  // Quiz-specific
  quizSubtype?: QuizSubtype;
  // Treasure hunt: mall & step composition
  mallId?: string;
  mallNamn?: string;
  stegTyper?: StegTyp[];   // ordered list of step types the agent should follow
}

export interface GeneratedProposal {
  provider: AIProvider;
  content: any;
  generatedAt: string;
}

export interface StegTypFeedback {
  temaKompatibilitetsScore: number; // 1-10: hur väl steg-typerna passar temat
  saknadeStegTyper: string[];       // steg-typer som hade passat men saknas
  olämpligaStegTyper: string[];     // steg-typer som inte passar temat/åldern
  kommentar: string;
}

export interface FeedbackItem {
  fromProvider: AIProvider;
  toProvider: AIProvider;
  strengths: string[];
  improvements: string[];
  specificSuggestions: string[];
  qualityScore: number;       // 1-100 peer quality rating
  stegTypFeedback?: StegTypFeedback; // only present for treasure_hunt with stegTyper
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
  translatedContent?: any; // Swedish translation of winner (if bilingualMode)
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
