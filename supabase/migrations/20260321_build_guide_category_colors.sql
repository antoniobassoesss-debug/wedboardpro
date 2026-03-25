-- Add category_colors column to build_guide_configs
-- Stores planner-assigned hex colors per element category for PDF export

ALTER TABLE build_guide_configs
  ADD COLUMN IF NOT EXISTS category_colors JSONB;
