-- ─── 009: Bakgrundsjobbkö ────────────────────────────────────────────────────
--
-- Jobs körs steg-för-steg av Vercel Cron (var 60s).
-- Varje steg sparar sitt utfall i state-kolumnen och avancerar step-fältet.
-- UI:t pollar /api/jobs/[id] för progress.

CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,
  -- 'council'       – generera produkt (4 steg)
  -- 'illustrate'    – generera bild för produkt
  -- 'validate_all'  – kör validator på alla produkter (schemalagt)
  -- 'review_loop'   – läs recensioner och skapa tickets (schemalagt)
  -- 'evolve_agent'  – agentens self-reflection vid level-up (schemalagt)

  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','complete','failed')),

  step          TEXT,
  -- council: 'generate' → 'feedback' → 'iterate' → 'vote' → 'finalize'

  input         JSONB NOT NULL DEFAULT '{}',
  -- CouncilInput eller liknande – vad som ska göras

  state         JSONB NOT NULL DEFAULT '{}',
  -- Mellanresultat mellan steg:
  -- { proposals, allFeedback, iteratedProposals, votes, agentNames, ... }

  result        JSONB,
  -- Slutresultatet när status = 'complete'

  error         TEXT,
  -- Felmeddelande om status = 'failed'

  progress      INT NOT NULL DEFAULT 0,
  -- 0–100

  progress_msg  TEXT,
  -- Ex: "Genererar förslag... (steg 1/4)"

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status   ON jobs(status);
CREATE INDEX idx_jobs_type     ON jobs(type);
CREATE INDEX idx_jobs_created  ON jobs(created_at DESC);

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to jobs"
  ON jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view and create jobs"
  ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
