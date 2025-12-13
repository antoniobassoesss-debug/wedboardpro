-- Migration: Add is_won column to crm_deals table
-- Run this if you already created the crm_deals table without is_won

-- Add is_won column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_deals' AND column_name = 'is_won'
  ) THEN
    ALTER TABLE crm_deals 
    ADD COLUMN is_won BOOLEAN NOT NULL DEFAULT FALSE;
    
    RAISE NOTICE 'Added is_won column to crm_deals';
  ELSE
    RAISE NOTICE 'Column is_won already exists in crm_deals';
  END IF;
END $$;

