-- Migration 025: Fix get_class_leaders_for_student return type mismatch (user_role vs TEXT)
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
  WHERE p.id IN (
    SELECT ca.admin_id FROM public.class_admins ca WHERE ca.class_id = p_class_id
  )
  OR p.role = 'super_admin'
  ORDER BY p.role::TEXT DESC, p.name::TEXT ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO authenticated;
