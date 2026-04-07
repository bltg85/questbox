-- Sprint 2: XP-system för agenter
-- Lägger till xp + level på agents, samt logg-tabell för XP-events

-- 1. Kolumner på agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS xp    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1;

-- 2. XP-events-tabell
CREATE TABLE IF NOT EXISTS agent_xp_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  job_id      TEXT        NULL,          -- valfri referens till council_run_id
  xp_awarded  INT         NOT NULL,
  reason      TEXT        NOT NULL,      -- t.ex. 'council_winner', 'council_runner_up', 'council_participant'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index för snabb uppslag per agent
CREATE INDEX IF NOT EXISTS idx_agent_xp_events_agent_id ON agent_xp_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_xp_events_created_at ON agent_xp_events(created_at DESC);

-- RLS
ALTER TABLE agent_xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_xp_events"
  ON agent_xp_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anon read agent_xp_events"
  ON agent_xp_events FOR SELECT
  USING (true);
