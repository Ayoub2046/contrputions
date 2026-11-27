
-- Migration: 022_notification_reads.sql
-- Tracks per-user read status for notifications without deleting messages for other users

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notif_id ON public.notification_reads(notification_id);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_reads_select_own" ON public.notification_reads;
CREATE POLICY "notification_reads_select_own"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_reads_insert_own" ON public.notification_reads;
CREATE POLICY "notification_reads_insert_own"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_reads_update_own" ON public.notification_reads;
CREATE POLICY "notification_reads_update_own"
  ON public.notification_reads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_reads_delete_own" ON public.notification_reads;
CREATE POLICY "notification_reads_delete_own"
  ON public.notification_reads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
