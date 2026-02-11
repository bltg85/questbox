-- QuestBox Database Schema
-- Initial migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name JSONB NOT NULL DEFAULT '{"en": "", "sv": ""}',
  slug JSONB NOT NULL DEFAULT '{"en": "", "sv": ""}',
  description JSONB DEFAULT '{"en": "", "sv": ""}',
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name JSONB NOT NULL DEFAULT '{"en": "", "sv": ""}',
  slug JSONB NOT NULL DEFAULT '{"en": "", "sv": ""}',
  description JSONB NOT NULL DEFAULT '{"en": "", "sv": ""}',
  short_description JSONB DEFAULT '{"en": "", "sv": ""}',
  product_type TEXT NOT NULL CHECK (product_type IN ('treasure_hunt', 'quiz', 'diploma', 'party_game', 'escape_game')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  age_group TEXT NOT NULL DEFAULT 'all' CHECK (age_group IN ('toddler', 'child', 'teen', 'adult', 'all')),
  difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  duration_minutes INTEGER,
  participants_min INTEGER DEFAULT 1,
  participants_max INTEGER,
  price_sek DECIMAL(10, 2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  file_url TEXT,
  thumbnail_url TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_generation_data JSONB,
  meta_title JSONB DEFAULT '{"en": "", "sv": ""}',
  meta_description JSONB DEFAULT '{"en": "", "sv": ""}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirmed_at TIMESTAMPTZ,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'sv')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Download tokens table
CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_downloads INTEGER DEFAULT 3,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Download logs table (for analytics)
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  token_id UUID REFERENCES download_tokens(id) ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page views table (for analytics)
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_is_free ON products(is_free);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_download_tokens_token ON download_tokens(token);
CREATE INDEX idx_download_tokens_product ON download_tokens(product_id);
CREATE INDEX idx_download_logs_product ON download_logs(product_id);
CREATE INDEX idx_page_views_product ON page_views(product_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Public read access for published products and categories
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  TO anon
  USING (true);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access to products"
  ON products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to categories"
  ON categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to subscribers"
  ON subscribers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to download_tokens"
  ON download_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to download_logs"
  ON download_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to page_views"
  ON page_views FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users (admins) have full access
CREATE POLICY "Authenticated users can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view subscribers"
  ON subscribers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view download_tokens"
  ON download_tokens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view download_logs"
  ON download_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view page_views"
  ON page_views FOR SELECT
  TO authenticated
  USING (true);
