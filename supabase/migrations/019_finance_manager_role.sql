-- Migration 019: Finance Manager Role & Security Restrictions
-- NOTE: Top-level ALTER TYPE + ::text comparisons in policies allow safe execution in Supabase SQL Editor.

-- 1. Add 'finance_manager' role to the PostgreSQL enum if not already present
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'finance_manager';

-- 2. Strictly secure activity_logs: ONLY super_admin can view activity logs!
DROP POLICY IF EXISTS "admin_read_own_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "super_admin_all_logs" ON public.activity_logs;
CREATE POLICY "super_admin_all_logs"
  ON public.activity_logs FOR ALL
  USING (user_role()::text = 'super_admin');

-- 3. Strictly Read-Only permissions for finance_manager across all classes (NO INSERT, UPDATE, or DELETE)
DROP POLICY IF EXISTS "finance_manager_read_all_classes" ON public.classes;
CREATE POLICY "finance_manager_read_all_classes"
  ON public.classes FOR SELECT
  USING (user_role()::text = 'finance_manager');

DROP POLICY IF EXISTS "finance_manager_read_all_profiles" ON public.profiles;
CREATE POLICY "finance_manager_read_all_profiles"
  ON public.profiles FOR SELECT
  USING (user_role()::text = 'finance_manager');

DROP POLICY IF EXISTS "finance_manager_read_all_contributions" ON public.contributions;
CREATE POLICY "finance_manager_read_all_contributions"
  ON public.contributions FOR SELECT
  USING (user_role()::text = 'finance_manager');

DROP POLICY IF EXISTS "finance_manager_read_all_expenses" ON public.expenses;
CREATE POLICY "finance_manager_read_all_expenses"
  ON public.expenses FOR SELECT
  USING (user_role()::text = 'finance_manager');

-- 4. Target reading permission (read-only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_contribution_targets') THEN
    DROP POLICY IF EXISTS "finance_manager_read_targets" ON public.student_contribution_targets;
    CREATE POLICY "finance_manager_read_targets"
      ON public.student_contribution_targets FOR SELECT
      USING (user_role()::text = 'finance_manager');
  END IF;
END $$;

-- 5. Discussion comments permission: finance_manager can view and post comments to communicate with Super Admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'class_comments') THEN
    DROP POLICY IF EXISTS "finance_manager_read_class_comments" ON public.class_comments;
    CREATE POLICY "finance_manager_read_class_comments"
      ON public.class_comments FOR SELECT
      USING (user_role()::text = 'finance_manager');

    DROP POLICY IF EXISTS "finance_manager_insert_class_comments" ON public.class_comments;
    CREATE POLICY "finance_manager_insert_class_comments"
      ON public.class_comments FOR INSERT
      WITH CHECK (auth.uid() = user_id AND user_role()::text = 'finance_manager');
  END IF;
END $$;

-- 6. Admin communications / noticeboard permission: finance_manager can read and post messages to Super Admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_messages') THEN
    DROP POLICY IF EXISTS "admins_select_admin_messages" ON public.admin_messages;
    CREATE POLICY "admins_select_admin_messages" ON public.admin_messages
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role::text IN ('super_admin', 'admin', 'finance_manager')
        )
      );

    DROP POLICY IF EXISTS "admins_insert_admin_messages" ON public.admin_messages;
    CREATE POLICY "admins_insert_admin_messages" ON public.admin_messages
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role::text IN ('super_admin', 'admin', 'finance_manager')
        )
      );
  END IF;
END $$;
