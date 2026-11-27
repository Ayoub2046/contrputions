-- Migration: 015_notifications_table.sql
-- Push Notifications & Announcements Table
-- Stores all class announcements, payment reminders, and contribution notices in the database

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement',
  sender_name TEXT,
  sender_role TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_class_id ON public.notifications(class_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Any authenticated user can read notifications
DROP POLICY IF EXISTS "notifications_read_all" ON public.notifications;
CREATE POLICY "notifications_read_all"
  ON public.notifications FOR SELECT TO authenticated
  USING (true);

-- 2. Insert Policy: Authenticated users can insert notifications
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
CREATE POLICY "notifications_insert_all"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Delete Policy: Authenticated users can clear/delete notifications
DROP POLICY IF EXISTS "notifications_delete_all" ON public.notifications;
CREATE POLICY "notifications_delete_all"
  ON public.notifications FOR DELETE TO authenticated
  USING (true);

-- 4. Enable Supabase Realtime for notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
