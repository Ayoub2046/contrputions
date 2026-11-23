-- Add soft-delete support to contributions
ALTER TABLE contributions
  ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Partial index: fast queries on non-deleted rows only
CREATE INDEX idx_contributions_active
  ON contributions(class_id, date DESC)
  WHERE deleted_at IS NULL;

-- Update RPC to exclude soft-deleted contributions
CREATE OR REPLACE FUNCTION get_student_payment_status(p_class_id UUID)
RETURNS TABLE (
  student_id UUID,
  status TEXT,
  total NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH class_target AS (
    SELECT contribution_target FROM classes WHERE id = p_class_id
  ),
  student_totals AS (
    SELECT
      p.id AS student_id,
      COALESCE(SUM(c.amount), 0) AS total
    FROM profiles p
    LEFT JOIN contributions c ON c.student_id = p.id AND c.deleted_at IS NULL
    WHERE p.class_id = p_class_id AND p.role = 'student'
    GROUP BY p.id
  )
  SELECT
    st.student_id,
    CASE
      WHEN st.total >= ct.contribution_target THEN 'paid'
      WHEN st.total > 0 THEN 'partial'
      ELSE 'unpaid'
    END::TEXT AS status,
    st.total
  FROM student_totals st
  CROSS JOIN class_target ct;
$$;
