-- Add condition field to posts table for item quality tracking (FB Marketplace pattern)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition text;
