-- Migration 013: Class Comments & Admin Communications Channel
-- Supports student feedback/comments inside student dashboard and admin contact channel

-- 1. Class Comments (Student Feedback & Class Discussion)
CREATE TABLE IF NOT EXISTS public.class_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_comments_class_id ON public.class_comments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_comments_created_at ON public.class_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.class_comments ENABLE ROW LEVEL SECURITY;

-- Class Comments RLS Policies
-- Super Admin: Full Access
CREATE POLICY "super_admin_all_class_comments" ON public.class_comments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Admin: Can view, insert, and delete comments in their assigned classes
CREATE POLICY "admin_select_class_comments" ON public.class_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_admins
      WHERE class_admins.admin_id = auth.uid()
        AND class_admins.class_id = class_comments.class_id
    )
  );

CREATE POLICY "admin_insert_class_comments" ON public.class_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.class_admins
      WHERE class_admins.admin_id = auth.uid()
        AND class_admins.class_id = class_comments.class_id
    )
  );

CREATE POLICY "admin_delete_class_comments" ON public.class_comments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_admins
      WHERE class_admins.admin_id = auth.uid()
        AND class_admins.class_id = class_comments.class_id
    )
  );

-- Student: Can view comments in their class
CREATE POLICY "student_select_class_comments" ON public.class_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.class_id = class_comments.class_id
    )
  );

-- Student: Can insert their own comment in their class
CREATE POLICY "student_insert_class_comments" ON public.class_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.class_id = class_comments.class_id
    )
  );

-- Student: Can delete their own comment
CREATE POLICY "student_delete_class_comments" ON public.class_comments
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
  );


-- 2. Admin Communications & Direct Contact Messages
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON public.admin_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Admin Messages RLS Policies (Admins and Super Admins ONLY - No student access)
CREATE POLICY "admins_select_admin_messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "admins_insert_admin_messages" ON public.admin_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "admins_delete_admin_messages" ON public.admin_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
    OR sender_id = auth.uid()
  );
