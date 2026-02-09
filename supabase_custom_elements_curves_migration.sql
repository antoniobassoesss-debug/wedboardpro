-- Migration: Add curves column to custom_element_templates
-- This allows storing bezier curve control points for custom elements

-- Add curves column (JSONB array of Point objects or null values)
ALTER TABLE custom_element_templates
ADD COLUMN IF NOT EXISTS curves JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN custom_element_templates.curves IS 'Array of control points for curved edges. Each element is either {x, y} for a curved edge or null for a straight edge.';
