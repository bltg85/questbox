-- AI Usage Tracking
-- Logs all AI API calls with token counts and estimated costs

CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  model TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'generate', 'feedback', 'iterate', 'vote', 'image', 'single'
  context TEXT NOT NULL,   -- 'council', 'generate', 'generate-image'
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_provider ON ai_usage(provider);
CREATE INDEX idx_ai_usage_context ON ai_usage(context);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to ai_usage"
  ON ai_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view ai_usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (true);
