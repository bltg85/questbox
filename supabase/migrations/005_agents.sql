-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'premium', 'image')),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  elo INTEGER NOT NULL DEFAULT 1600,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent feedback log (one row per agent per council run)
CREATE TABLE agent_feedback_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_run_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id),
  tier TEXT NOT NULL,
  product_type TEXT,
  theme TEXT,
  feedback_received JSONB,    -- feedback this agent received from others
  final_content JSONB,        -- the agent's final iterated proposal
  votes_received INTEGER DEFAULT 0,
  won BOOLEAN DEFAULT FALSE,
  elo_before INTEGER,
  elo_after INTEGER,
  elo_delta INTEGER,
  component_wins JSONB DEFAULT '{"overall": null}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add creator attribution to products
ALTER TABLE products ADD COLUMN text_agent_id UUID REFERENCES agents(id);
ALTER TABLE products ADD COLUMN image_agent_id UUID REFERENCES agents(id);

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feedback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Service role manage agents" ON agents FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manage feedback_log" ON agent_feedback_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated read feedback_log" ON agent_feedback_log FOR SELECT USING (auth.role() = 'authenticated');

-- Seed: 7 agents
INSERT INTO agents (name, icon, tier, provider, model, system_prompt) VALUES
  -- Economy tier
  ('Spark',  '⚡', 'economy', 'openai',     'gpt-5-mini',                    ''),
  ('Echo',   '🎵', 'economy', 'anthropic',  'claude-haiku-4-5',              ''),
  ('Blink',  '💨', 'economy', 'google',     'gemini-2.5-flash',              ''),
  -- Premium tier
  ('Forge',  '🔥', 'premium', 'openai',     'gpt-5.2',                       ''),
  ('Sage',   '🦉', 'premium', 'anthropic',  'claude-sonnet-4-6',             ''),
  ('Nova',   '✨', 'premium', 'google',     'gemini-2.5-pro',                ''),
  -- Image agent
  ('Lens',   '📷', 'image',   'google',     'gemini-3.1-flash-image-preview','');
