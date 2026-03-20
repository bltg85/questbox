-- Add reflection_notes to agents (accumulated learnings from council feedback)
ALTER TABLE agents ADD COLUMN reflection_notes TEXT NOT NULL DEFAULT '';

-- Add avg_quality_score to feedback_log (average 1-100 score received from peer agents)
ALTER TABLE agent_feedback_log ADD COLUMN avg_quality_score FLOAT;
