// Product Types
export type ProductType = 'treasure_hunt' | 'quiz' | 'diploma' | 'party_game' | 'escape_game';
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
export interface QuizQuestion {
  number: number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export interface QuizContent {
  title: string;
  introduction: string;
  questions: QuizQuestion[];
  scoring_guide: string;
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
