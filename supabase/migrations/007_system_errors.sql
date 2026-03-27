CREATE TABLE system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context TEXT,
  model TEXT,
  provider TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX idx_system_errors_type ON system_errors(error_type, created_at DESC);
