-- Migration: 015_notifications_table.sql
-- Push Notifications & Announcements Table

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

-- Read policy: Any authenticated user can read notifications (global or for their class)
DROP POLICY IF EXISTS "notifications_read_all" ON public.notifications;
CREATE POLICY "notifications_read_all"
  ON public.notifications FOR SELECT TO authenticated
  USING (true);

-- Insert policy: Admins and Super Admins can insert notifications
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  ));