-- Migration 018: Secure Class Leadership Directory & Calling for Students

-- Function to allow students and admins to retrieve assigned class leaders and their contact phone numbers
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
  FROM profiles p
  WHERE p.id IN (
    SELECT ca.admin_id FROM class_admins ca WHERE ca.class_id = p_class_id
  )
  OR p.role = 'super_admin'
  ORDER BY p.role DESC, p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_leaders_for_student(UUID) TO anon;

-- Policy to allow students to see their class admins in class_admins table
DROP POLICY IF EXISTS "students_read_class_admins" ON class_admins;
CREATE POLICY "students_read_class_admins" ON class_admins
  FOR SELECT USING (
    class_id IN (SELECT class_id FROM profiles WHERE id = auth.uid())
  );

-- Policy to allow students to view contact info (name, phone, role) of their assigned class admins and super admins
DROP POLICY IF EXISTS "students_read_class_leaders" ON profiles;
CREATE POLICY "students_read_class_leaders" ON profiles
  FOR SELECT USING (
    user_role() = 'student' AND (
      id IN (
        SELECT ca.admin_id FROM class_admins ca
        WHERE ca.class_id IN (SELECT class_id FROM profiles WHERE id = auth.uid())
      )
      OR role = 'super_admin'
    )
  );

