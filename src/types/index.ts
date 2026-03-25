// Product Types
export type ProductType = 'treasure_hunt' | 'quiz' | 'diploma' | 'party_game' | 'escape_game';

// ─── Skattjakt: Steg & Mallar ────────────────────────────────────────────────

export type StegKategori = 'BERATTELSE' | 'SOKNING' | 'PUSSEL' | 'FRAGA' | 'AKTIVITET';

export type StegTyp =
  | 'INTRO'            // BERATTELSE – flaskpost, brev, uppdragstext
  | 'FINAL'            // BERATTELSE – kistan, avslutningsscen
  | 'SOK'              // SOKNING    – hitta föremål fysiskt
  | 'PUSSEL_FYSISKT'   // PUSSEL     – lägg ihop bitar (karta, bild)
  | 'PUSSEL_LOGIK'     // PUSSEL     – tänkpussel, sekvens, kod att knäcka
  | 'GATA'             // FRAGA      – klassisk gåta med ett svar
  | 'VAL'              // FRAGA      – välj rätt bild / alternativ
  | 'LASUPPDRAG'       // FRAGA      – läs och extrahera svar
  | 'MINISPEL';        // AKTIVITET  – fiskedam, kastelek, etc.

export const STEG_KATEGORI: Record<StegTyp, StegKategori> = {
  INTRO:          'BERATTELSE',
  FINAL:          'BERATTELSE',
  SOK:            'SOKNING',
  PUSSEL_FYSISKT: 'PUSSEL',
  PUSSEL_LOGIK:   'PUSSEL',
  GATA:           'FRAGA',
  VAL:            'FRAGA',
  LASUPPDRAG:     'FRAGA',
  MINISPEL:       'AKTIVITET',
};

export interface StegTypDefinition {
  id: string;
  kategori: StegKategori;
  typ: StegTyp;
  namn: LocalizedString;
  beskrivning: LocalizedString;
  tema_kompatibilitet: string[];      // teman det passar för, t.ex. ['pirat', 'detektiv']
  rekommenderad_alder: AgeGroup[];
  estimerad_tid_minuter: number | null;
  material: string[];                 // fysiskt material som krävs
  format: 'FYSISK' | 'DIGITAL' | 'HYBRID';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface JaktMall {
  id: string;
  namn: string;
  beskrivning: string | null;
  steg_typer: StegTyp[];              // ordnad lista – skattjaktens skelett
  passar_teman: string[];
  rekommenderad_alder: AgeGroup[];
  rekommenderad_tid_minuter: number | null;
  is_system_mall: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type ProductStatus = 'draft' | 'published' | 'archived';
export type AgeGroup = 'toddler' | 'child' | 'teen' | 'adult' | 'all';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type Locale = 'en' | 'sv';

// Localized content
export interface LocalizedString {
  en: string;
  sv: string;
}

// Category
export interface Category {
  id: string;
  name: LocalizedString;
  slug: LocalizedString;
  description: LocalizedString | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Product
export interface Product {
  id: string;
  name: LocalizedString;
  slug: LocalizedString;
  description: LocalizedString;
  short_description: LocalizedString | null;
  product_type: ProductType;
  category_id: string | null;
  age_group: AgeGroup;
  difficulty_level: DifficultyLevel;
  duration_minutes: number | null;
  participants_min: number;
  participants_max: number | null;
  price_sek: number;
  is_free: boolean;
  file_url: string | null;
  thumbnail_url: string | null;
  images: string[];
  status: ProductStatus;
  is_featured: boolean;
  download_count: number;
  view_count: number;
  is_ai_generated: boolean;
  ai_generation_data: AIGenerationData | null;
  meta_title: LocalizedString | null;
  meta_description: LocalizedString | null;
  tags: string[];
  review_notes: string | null;
  text_agent_id: string | null;
  image_agent_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

// AI Generation
export interface AIGenerationData {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  prompt: string;
  generated_at: string;
  parameters?: Record<string, unknown>;
}

export type AIProvider = 'openai' | 'anthropic' | 'google';

// Agent
export type AgentTier = 'economy' | 'premium' | 'image';

export interface Agent {
  id: string;
  name: string;
  icon: string;
  tier: AgentTier;
  provider: AIProvider;
  model: string;
  system_prompt: string;
  reflection_notes: string;
  elo: number;
  wins: number;
  losses: number;
  total_rounds: number;
  created_at: string;
  updated_at: string;
}

export interface AIGeneratorInput {
  type: ProductType;
  theme: string;
  age_group: AgeGroup;
  difficulty: DifficultyLevel;
  language: Locale;
  additional_instructions?: string;
  provider?: AIProvider;
}

// Treasure Hunt specific
export interface TreasureHuntClue {
  number: number;
  location_hint: string;
  riddle: string;
  answer: string;
}

export interface TreasureHuntContent {
  title: string;
  introduction: string;
  clues: TreasureHuntClue[];
  final_message: string;
  tips_for_adults: string[];
}

// Quiz specific
export type QuizSubtype = 'standard' | 'music';

export interface QuizQuestion {
  number: number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export interface SpotifyTrack {
  title: string;
  artist: string;
  year?: number;
  note?: string;
}

export interface SpotifyPlaylistSuggestion {
  name: string;
  description: string;
  tracks: SpotifyTrack[];
  search_term?: string;
}

export interface QuizContent {
  title: string;
  introduction: string;
  questions: QuizQuestion[];
  scoring_guide: string;
  quiz_subtype?: QuizSubtype;
  spotify_playlist?: SpotifyPlaylistSuggestion;
}

// Diploma specific
export interface DiplomaContent {
  title: string;
  subtitle: string;
  body_text: string;
  footer_text: string;
}

// Subscriber
export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  confirmed_at: string | null;
  locale: Locale;
  created_at: string;
  updated_at: string;
}

// Download Token
export interface DownloadToken {
  id: string;
  token: string;
  product_id: string;
  email: string;
  expires_at: string;
  max_downloads: number;
  download_count: number;
  created_at: string;
  product?: Product;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Admin Dashboard Stats
export interface DashboardStats {
  total_products: number;
  published_products: number;
  total_downloads: number;
  total_subscribers: number;
  downloads_today: number;
  new_subscribers_today: number;
}

// Form types
export interface ProductFormData {
  name: LocalizedString;
  slug: LocalizedString;
  description: LocalizedString;
  short_description: LocalizedString | null;
  product_type: ProductType;
  category_id: string | null;
  age_group: AgeGroup;
  difficulty_level: DifficultyLevel;
  duration_minutes: number | null;
  participants_min: number;
  participants_max: number | null;
  price_sek: number;
  is_free: boolean;
  status: ProductStatus;
  is_featured: boolean;
  tags: string[];
  thumbnail_url: string | null;
}

export interface CategoryFormData {
  name: LocalizedString;
  slug: LocalizedString;
  description: LocalizedString | null;
  parent_id: string | null;
  sort_order: number;
}
