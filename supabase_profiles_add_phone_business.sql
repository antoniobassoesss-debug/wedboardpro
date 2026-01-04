-- Migration: Add phone and business_name columns to profiles table
-- This migration is non-breaking - new columns are nullable
-- Existing users will have NULL values (can fill later in profile settings)
-- New signups will populate these fields from user_metadata
-- Run this in Supabase SQL Editor

-- 1. Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT;

-- 2. Create indexes for performance (useful for search/filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_business_name ON profiles(business_name);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- 3. Update the handle_new_user trigger to populate from user_metadata
-- This trigger runs automatically when a new user is created via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'business_name', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    business_name = COALESCE(EXCLUDED.business_name, profiles.business_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update create_default_team_for_user to use business_name for team name
-- This creates a more personalized default team name
CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  team_name TEXT;
BEGIN
  -- Use business_name from metadata if available, otherwise default to user's name or 'My Team'
  team_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'full_name',
    'My Team'
  );

  -- Create a default team for the new user
  INSERT INTO public.teams (owner_id, name)
  VALUES (NEW.id, team_name)
  RETURNING id INTO new_team_id;

  -- Add the user as owner member
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create default team for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 5. Verify the changes
-- Run this to confirm columns were added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('phone', 'business_name')
ORDER BY ordinal_position;

-- Expected output:
-- column_name   | data_type | is_nullable
-- --------------+-----------+-------------
-- phone         | text      | YES
-- business_name | text      | YES
