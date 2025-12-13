-- Project Files & Folders schema for WedBoardPro
-- Run this in the Supabase SQL Editor.
-- This migration creates:
--   - project_file_folders  (explicit folder tree per project)
--   - project_files         (metadata + link to Supabase Storage)
--   - a private storage bucket `project_files` with basic policies
--
-- NOTE: This assumes your \"projects\" are stored in the `events` table from
-- `supabase_events_pipeline.sql`. If you use a different projects table,
-- adjust the `project_id` FK accordingly.

------------------------------------------------------------
-- 1) Folders table
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Logical scoping
  account_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Folder structure
  name TEXT NOT NULL,
  parent_folder_id UUID NULL REFERENCES project_file_folders(id) ON DELETE CASCADE,

  -- Cached path like `Contracts/Vendors/Photography`
  path_cache TEXT NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT project_file_folders_unique_name_per_parent
    UNIQUE (project_id, parent_folder_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_file_folders_project_parent
  ON project_file_folders(project_id, parent_folder_id);

------------------------------------------------------------
-- 2) Files table
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Logical scoping
  account_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Folder relationship (nullable = root of project)
  folder_id UUID NULL REFERENCES project_file_folders(id) ON DELETE SET NULL,

  -- Supabase Storage location
  storage_bucket TEXT NOT NULL DEFAULT 'project_files',
  storage_path TEXT NOT NULL, -- e.g. accountId/projectId/Contracts/file.pdf

  -- File metadata
  file_name TEXT NOT NULL,
  extension TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading','ready','failed')),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT project_files_unique_storage_path
    UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_folder
  ON project_files(project_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project_created
  ON project_files(project_id, created_at DESC);

------------------------------------------------------------
-- 3) updated_at trigger helpers
------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_project_file_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_file_folders_updated_at ON project_file_folders;
CREATE TRIGGER trg_project_file_folders_updated_at
  BEFORE UPDATE ON project_file_folders
  FOR EACH ROW
  EXECUTE FUNCTION set_project_file_folders_updated_at();


CREATE OR REPLACE FUNCTION set_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_files_updated_at ON project_files;
CREATE TRIGGER trg_project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION set_project_files_updated_at();

------------------------------------------------------------
-- 4) Row Level Security (RLS)
-- Adjust predicates to match your account / team model.
------------------------------------------------------------

ALTER TABLE project_file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Basic policies:
--  - Users can CRUD rows for their own account_id
--  - You can later tighten this to project-level or team-level logic.

DROP POLICY IF EXISTS "Select project file folders by account" ON project_file_folders;
CREATE POLICY "Select project file folders by account"
  ON project_file_folders
  FOR SELECT
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Insert project file folders by account" ON project_file_folders;
CREATE POLICY "Insert project file folders by account"
  ON project_file_folders
  FOR INSERT
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Update project file folders by account" ON project_file_folders;
CREATE POLICY "Update project file folders by account"
  ON project_file_folders
  FOR UPDATE
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Delete project file folders by account" ON project_file_folders;
CREATE POLICY "Delete project file folders by account"
  ON project_file_folders
  FOR DELETE
  USING (account_id = auth.uid());


DROP POLICY IF EXISTS "Select project files by account" ON project_files;
CREATE POLICY "Select project files by account"
  ON project_files
  FOR SELECT
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Insert project files by account" ON project_files;
CREATE POLICY "Insert project files by account"
  ON project_files
  FOR INSERT
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Update project files by account" ON project_files;
CREATE POLICY "Update project files by account"
  ON project_files
  FOR UPDATE
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Delete project files by account" ON project_files;
CREATE POLICY "Delete project files by account"
  ON project_files
  FOR DELETE
  USING (account_id = auth.uid());

------------------------------------------------------------
-- 5) Storage bucket & policies (Supabase Storage)
------------------------------------------------------------

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'project_files', 'project_files', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'project_files'
);

-- Allow authenticated users to manage objects within their own account path:
--   storage_path LIKE `${auth.uid()}/%`

DROP POLICY IF EXISTS "Authenticated users can view their project files" ON storage.objects;
CREATE POLICY "Authenticated users can view their project files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project_files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can upload their project files" ON storage.objects;
CREATE POLICY "Authenticated users can upload their project files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project_files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can update their project files" ON storage.objects;
CREATE POLICY "Authenticated users can update their project files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'project_files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'project_files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete their project files" ON storage.objects;
CREATE POLICY "Authenticated users can delete their project files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project_files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- End of project files schema


