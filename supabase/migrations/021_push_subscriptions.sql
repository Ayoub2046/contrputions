-- Migration: 021_push_subscriptions.sql
-- Table to store Web Push device subscriptions for background notifications

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_class_id ON public.push_subscriptions(class_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated or public devices to register & refresh their push endpoint
DROP POLICY IF EXISTS "push_subs_insert_all" ON public.push_subscriptions;
CREATE POLICY "push_subs_insert_all" ON public.push_subscriptions
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "push_subs_update_all" ON public.push_subscriptions;
CREATE POLICY "push_subs_update_all" ON public.push_subscriptions
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "push_subs_read_all" ON public.push_subscriptions;
CREATE POLICY "push_subs_read_all" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "push_subs_delete_all" ON public.push_subscriptions;
CREATE POLICY "push_subs_delete_all" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (true);
