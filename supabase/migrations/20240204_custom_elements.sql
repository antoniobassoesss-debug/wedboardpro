-- Custom Element Templates Table
CREATE TABLE custom_element_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  svg_path TEXT NOT NULL,
  width DECIMAL(10,3) NOT NULL,
  height DECIMAL(10,3) NOT NULL,
  vertices JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_custom_elements_planner ON custom_element_templates(planner_id);
CREATE INDEX idx_custom_elements_name ON custom_element_templates(planner_id, name);
CREATE INDEX idx_custom_elements_created ON custom_element_templates(created_at DESC);

-- Layout Instances Table (for usage tracking)
CREATE TABLE layout_custom_element_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES custom_element_templates(id) ON DELETE RESTRICT,
  element_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_layout_custom_instances ON layout_custom_element_instances(template_id);

-- Enable RLS
ALTER TABLE custom_element_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_custom_element_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can CRUD their own custom elements"
  ON custom_element_templates
  FOR ALL
  USING (auth.uid() = planner_id);

CREATE POLICY "Users can CRUD their layout instances"
  ON layout_custom_element_instances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM layouts
      WHERE layouts.id = layout_custom_element_instances.layout_id
        AND layouts.planner_id = auth.uid()
    )
  );
