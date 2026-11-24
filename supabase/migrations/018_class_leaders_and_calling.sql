-- Migration 018: Fix RLS Infinite Recursion & Secure Class Leadership Directory
-- Drop any recursive policies that were causing "infinite recursion detected in policy for relation 'profiles'"
DROP POLICY IF EXISTS "students_read_class_leaders" ON public.profiles;
DROP POLICY IF EXISTS "students_read_class_admins" ON public.class_admins;

-- Function to allow students and admins to retrieve assigned class leaders and their contact phone numbers
-- SECURITY DEFINER allows it to bypass RLS safely and cleanly without creating any recursion loops
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
    p.name,
    p.phone,
    p.role,
    p.student_id
  FROM public.profiles p
  WHERE p.id IN (
    SELECT ca.admin_id FROM public.class_admins ca WHERE ca.class_id = p_class_id
  )
  OR p.role = 'super_admin'
  ORDER BY p.role DESC, p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO anon;


