-- Chat Media Attachments System
-- Supports images, videos, documents, audio files in chat messages
-- Run this in Supabase SQL Editor

-- Create Supabase Storage buckets for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('chat-images', 'chat-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic']),
  ('chat-videos', 'chat-videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  ('chat-documents', 'chat-documents', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv', 'application/zip', 'application/x-rar-compressed']),
  ('chat-audio', 'chat-audio', true, 20971520, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for chat-images bucket
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS Policies for chat-videos bucket
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-videos');

CREATE POLICY "Anyone can view chat videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-videos');

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS Policies for chat-documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-documents');

CREATE POLICY "Anyone can view chat documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-documents');

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS Policies for chat-audio bucket
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-audio');

CREATE POLICY "Anyone can view chat audio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-audio');

CREATE POLICY "Users can delete their own audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add media columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_filename TEXT,
  ADD COLUMN IF NOT EXISTS media_size INTEGER,
  ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS media_width INTEGER,
  ADD COLUMN IF NOT EXISTS media_height INTEGER,
  ADD COLUMN IF NOT EXISTS media_duration NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for media queries
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(media_type) WHERE media_type IS NOT NULL;

-- Create media_attachments table for multiple attachments per message (future enhancement)
CREATE TABLE IF NOT EXISTS media_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL, -- 'image', 'video', 'document', 'audio'
  media_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER,
  height INTEGER,
  duration NUMERIC(10,2),
  thumbnail_url TEXT,
  caption TEXT,
  upload_progress INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_media_attachments_message ON media_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_type ON media_attachments(media_type);

-- RLS Policies for media_attachments
ALTER TABLE media_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media in their team"
  ON media_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert media attachments"
  ON media_attachments FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM messages m
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own media attachments"
  ON media_attachments FOR UPDATE
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own media attachments"
  ON media_attachments FOR DELETE
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      WHERE m.user_id = auth.uid()
    )
  );

-- Function to get media storage bucket based on MIME type
CREATE OR REPLACE FUNCTION get_media_bucket(mime_type TEXT)
RETURNS TEXT AS $$
BEGIN
  IF mime_type LIKE 'image/%' THEN
    RETURN 'chat-images';
  ELSIF mime_type LIKE 'video/%' THEN
    RETURN 'chat-videos';
  ELSIF mime_type LIKE 'audio/%' THEN
    RETURN 'chat-audio';
  ELSE
    RETURN 'chat-documents';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format file size
CREATE OR REPLACE FUNCTION format_file_size(bytes BIGINT)
RETURNS TEXT AS $$
BEGIN
  IF bytes < 1024 THEN
    RETURN bytes || ' B';
  ELSIF bytes < 1048576 THEN
    RETURN ROUND(bytes / 1024.0, 1) || ' KB';
  ELSIF bytes < 1073741824 THEN
    RETURN ROUND(bytes / 1048576.0, 1) || ' MB';
  ELSE
    RETURN ROUND(bytes / 1073741824.0, 1) || ' GB';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify setup
SELECT 'Media attachments system created successfully' AS status;
