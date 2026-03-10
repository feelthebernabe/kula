-- Add condition column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition TEXT;
