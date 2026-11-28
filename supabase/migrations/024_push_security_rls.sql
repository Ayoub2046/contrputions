-- Migration: 024_push_security_rls.sql
-- Harden RLS policies for push_subscriptions & notifications so private data is never exposed to unauthorized users

-- 1. push_subscriptions: each user only reads/deletes their own device subscriptions (super_admin sees all)
DROP POLICY IF EXISTS "push_subs_insert_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_update_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_read_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_delete_all" ON public.push_subscriptions;

DROP POLICY IF EXISTS "push_subs_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_select_own" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_role() = 'super_admin');

DROP POLICY IF EXISTS "push_subs_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      user_role() IN ('super_admin', 'finance_manager')
      OR (user_role() = 'student' AND (class_id IS NULL OR class_id = user_class_id()))
      OR (user_role() = 'admin' AND (class_id IS NULL OR class_id IN (SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid())))
    )
  );

DROP POLICY IF EXISTS "push_subs_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_update_own" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_role() = 'super_admin')
  WITH CHECK (
    user_id = auth.uid()
    AND (
      user_role() IN ('super_admin', 'finance_manager')
      OR (user_role() = 'student' AND (class_id IS NULL OR class_id = user_class_id()))
      OR (user_role() = 'admin' AND (class_id IS NULL OR class_id IN (SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid())))
    )
  );

DROP POLICY IF EXISTS "push_subs_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_role() = 'super_admin');

-- 2. notifications: restrict reads by class assignment / role
DROP POLICY IF EXISTS "notifications_read_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_read_scoped" ON public.notifications;
CREATE POLICY "notifications_read_scoped" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_role() IN ('super_admin', 'finance_manager')
    OR class_id IS NULL
    OR (user_role() = 'student' AND class_id = user_class_id())
    OR (user_role() = 'admin' AND class_id IN (SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid()))
  );

DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_scoped" ON public.notifications;
CREATE POLICY "notifications_insert_scoped" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_role() IN ('super_admin', 'finance_manager')
    OR (user_role() = 'admin' AND class_id IN (SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid()))
    OR (user_role() = 'student' AND class_id = user_class_id() AND type = 'news')
  );

DROP POLICY IF EXISTS "notifications_delete_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_scoped" ON public.notifications;
CREATE POLICY "notifications_delete_scoped" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_role() = 'super_admin');
