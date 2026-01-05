-- Use this script to remove structured_metadata if it was added by an older migration.
ALTER TABLE public.scan_events
DROP COLUMN IF EXISTS structured_metadata;
