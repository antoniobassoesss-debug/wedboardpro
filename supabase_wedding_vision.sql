-- Wedding Vision & Style schema for WedBoardPro
-- Run this in the Supabase SQL editor.

-- =========================================================
-- 1) Wedding Vision table (one per event/wedding)
-- =========================================================
CREATE TABLE IF NOT EXISTS wedding_vision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Mood Board: array of image URLs from Supabase Storage
  mood_board_images TEXT[] DEFAULT '{}',

  -- Style Quiz Result: single choice enum
  style_quiz_result TEXT CHECK (
    style_quiz_result IS NULL OR
    style_quiz_result IN ('romantic', 'modern', 'rustic', 'bohemian', 'classic', 'industrial')
  ),

  -- Color Palette: array of hex codes (max 6)
  color_palette TEXT[] DEFAULT '{}',

  -- Keywords/Tags: array of strings (max 15)
  keywords TEXT[] DEFAULT '{}',

  -- Must-Haves: array of bullet point strings
  must_haves TEXT[] DEFAULT '{}',

  -- Inspiration Links: array of URLs
  inspiration_links TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT wedding_vision_event_unique UNIQUE (event_id),
  CONSTRAINT color_palette_max_6 CHECK (
    array_length(color_palette, 1) IS NULL OR array_length(color_palette, 1) <= 6
  ),
  CONSTRAINT keywords_max_15 CHECK (
    array_length(keywords, 1) IS NULL OR array_length(keywords, 1) <= 15
  ),
  CONSTRAINT mood_board_max_20 CHECK (
    array_length(mood_board_images, 1) IS NULL OR array_length(mood_board_images, 1) <= 20
  )
);

-- Index for fast lookup by event_id
CREATE INDEX IF NOT EXISTS idx_wedding_vision_event_id ON wedding_vision(event_id);

-- =========================================================
-- 2) Auto-update updated_at timestamp trigger
-- =========================================================
CREATE OR REPLACE FUNCTION set_wedding_vision_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wedding_vision_updated_at ON wedding_vision;
CREATE TRIGGER trg_wedding_vision_updated_at
  BEFORE UPDATE ON wedding_vision
  FOR EACH ROW
  EXECUTE FUNCTION set_wedding_vision_updated_at();

-- =========================================================
-- 3) Enable Realtime for this table
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE wedding_vision;

-- =========================================================
-- 4) Create storage bucket for mood board images
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-mood-boards', 'wedding-mood-boards', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 5) Storage policies for mood board images
-- =========================================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload mood board images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wedding-mood-boards');

-- Allow authenticated users to read images
CREATE POLICY "Authenticated users can read mood board images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wedding-mood-boards');

-- Allow authenticated users to update their images
CREATE POLICY "Authenticated users can update mood board images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wedding-mood-boards');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete mood board images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wedding-mood-boards');

-- Public read access for mood board images (for sharing)
CREATE POLICY "Public can view mood board images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'wedding-mood-boards');
