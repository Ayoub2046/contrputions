-- Migration 026: Strict Super Admin hiding & 1-on-1 private student-admin messaging RLS
-- 1. Update get_class_leaders_for_student to NEVER return super_admin to students
CREATE OR REPLACE FUNCTION get_class_leaders_for_student(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  role TEXT,
  student_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name::TEXT,
    p.phone::TEXT,
    p.role::TEXT,
    p.student_id::TEXT
  FROM public.profiles p
  INNER JOIN public.class_admins ca ON ca.admin_id = p.id
  WHERE ca.class_id = p_class_id
    AND p.role::TEXT = 'admin'
  ORDER BY p.name::TEXT ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO authenticated;

-- 2. Harden admin_messages RLS so students can participate ONLY in their own 1-on-1 DM threads
--    with assigned class admins, and admins never expose DMs to unauthorized roles.
DROP POLICY IF EXISTS "admins_select_admin_messages" ON public.admin_messages;
DROP POLICY IF EXISTS "students_select_own_dms" ON public.admin_messages;
DROP POLICY IF EXISTS "students_insert_own_dms" ON public.admin_messages;
DROP POLICY IF EXISTS "users_delete_own_dms" ON public.admin_messages;

CREATE POLICY "admins_select_admin_messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role::TEXT = 'super_admin'
          OR (p.role::TEXT IN ('admin', 'finance_manager') AND category NOT LIKE 'dm:%')
          OR (p.role::TEXT = 'admin' AND (sender_id = auth.uid() OR category = 'dm:' || auth.uid()::text))
        )
    )
  );

CREATE POLICY "students_select_own_dms" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (
    category LIKE 'dm:%'
    AND (
      sender_id = auth.uid()
      OR category = 'dm:' || auth.uid()::text
    )
  );

CREATE POLICY "students_insert_own_dms" ON public.admin_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND category LIKE 'dm:%'
    AND EXISTS (
      SELECT 1
      FROM public.profiles student_prof
      JOIN public.class_admins ca ON ca.class_id = student_prof.class_id
      JOIN public.profiles admin_prof ON admin_prof.id = ca.admin_id
      WHERE student_prof.id = auth.uid()
        AND student_prof.role::TEXT = 'student'
        AND admin_prof.role::TEXT = 'admin'
        AND category = 'dm:' || admin_prof.id::text
    )
  );

CREATE POLICY "users_delete_own_dms" ON public.admin_messages
  FOR DELETE TO authenticated
  USING (
    category LIKE 'dm:%'
    AND (
      sender_id = auth.uid()
      OR category = 'dm:' || auth.uid()::text
    )
  );
