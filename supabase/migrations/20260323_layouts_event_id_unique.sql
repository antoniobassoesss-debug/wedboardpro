-- One layout file per event. Before adding the constraint, collapse any duplicate
-- rows per event_id: keep the most recently updated row, delete the rest.
DELETE FROM layouts
WHERE id NOT IN (
  SELECT DISTINCT ON (event_id) id
  FROM layouts
  WHERE event_id IS NOT NULL
  ORDER BY event_id, updated_at DESC
);

-- Now safe to add the unique constraint.
ALTER TABLE layouts
ADD CONSTRAINT layouts_event_id_unique UNIQUE (event_id);
