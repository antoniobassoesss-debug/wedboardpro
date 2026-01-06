-- Create avatars bucket for profile pictures
-- Run this in Supabase SQL Editor

-- Create the avatars storage bucket (public access for profile pictures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Anyone can view avatars (public access)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- RLS Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify the bucket was created
SELECT id, name, public
FROM storage.buckets
WHERE id = 'avatars';

-- Verify RLS policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%avatar%';
