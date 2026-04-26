-- Visual feedback: ui_target speichert Klick-Position + Route als JSON-Blob
ALTER TABLE review_feedback ADD COLUMN ui_target TEXT;

-- Performance: Reviews pro Backlog-Item filtern (für /api/sprints/:id/visual-feedback)
CREATE INDEX IF NOT EXISTS idx_review_feedback_backlog ON review_feedback(backlog_id);
