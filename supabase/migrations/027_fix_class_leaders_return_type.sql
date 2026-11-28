-- ==============================================================================
-- Migration 027: Fix get_class_leaders_for_student Type Casting & Strict Admin Filter
-- Ensures p.role is explicitly cast to TEXT to prevent enum 42804 mismatches
-- Strictly filters role = 'admin' so super_admin is never returned to students
-- ==============================================================================

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
GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO anon;
