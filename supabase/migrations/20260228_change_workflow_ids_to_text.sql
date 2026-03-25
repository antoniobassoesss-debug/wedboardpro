-- Change workflow_notes.id from UUID to TEXT to support local note IDs
ALTER TABLE workflow_notes ALTER COLUMN id TYPE TEXT;

-- Change workflow_connections.id from UUID to TEXT
ALTER TABLE workflow_connections ALTER COLUMN id TYPE TEXT;

-- Also change from_id and to_id to TEXT (they're already TEXT based on earlier migration)
