-- ==============================================================================
-- ClassBank Full Database Schema, Security (RLS), and Functions
-- Single consolidated migration script for Supabase
-- Single Source of Truth: prd.md
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'student');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  contribution_target NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  phone      TEXT,
  role       user_role NOT NULL DEFAULT 'student',
  class_id   UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Class Admins join table
CREATE TABLE IF NOT EXISTS class_admins (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id  UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  admin_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT unique_class_admin UNIQUE(class_id, admin_id)
);

-- Contributions table (includes soft-delete support)
CREATE TABLE IF NOT EXISTS contributions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ NULL
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  added_by    UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity Logs table (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action    TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_class_id ON profiles(class_id);

CREATE INDEX IF NOT EXISTS idx_class_admins_class_id ON class_admins(class_id);
CREATE INDEX IF NOT EXISTS idx_class_admins_admin_id ON class_admins(admin_id);

CREATE INDEX IF NOT EXISTS idx_contributions_student_id ON contributions(student_id);
CREATE INDEX IF NOT EXISTS idx_contributions_class_id ON contributions(class_id);
CREATE INDEX IF NOT EXISTS idx_contributions_date ON contributions(date);
CREATE INDEX IF NOT EXISTS idx_contributions_active ON contributions(class_id, date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_class_id ON expenses(class_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. HELPER FUNCTIONS (SECURITY DEFINER to avoid infinite recursion)
CREATE OR REPLACE FUNCTION user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION user_class_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM profiles WHERE id = auth.uid();
$$;

-- 6. RLS POLICIES

-- Drop existing policies to allow clean re-runs
DROP POLICY IF EXISTS "super_admin_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_manage_assigned_students" ON profiles;
DROP POLICY IF EXISTS "student_read_own" ON profiles;
DROP POLICY IF EXISTS "student_update_own" ON profiles;

DROP POLICY IF EXISTS "super_admin_all_classes" ON classes;
DROP POLICY IF EXISTS "admin_read_assigned_classes" ON classes;
DROP POLICY IF EXISTS "student_read_own_class" ON classes;

DROP POLICY IF EXISTS "super_admin_all_class_admins" ON class_admins;
DROP POLICY IF EXISTS "admin_read_class_admins" ON class_admins;

DROP POLICY IF EXISTS "super_admin_all_contributions" ON contributions;
DROP POLICY IF EXISTS "admin_manage_class_contributions" ON contributions;
DROP POLICY IF EXISTS "student_read_own_contributions" ON contributions;

DROP POLICY IF EXISTS "super_admin_all_expenses" ON expenses;
DROP POLICY IF EXISTS "admin_manage_class_expenses" ON expenses;
DROP POLICY IF EXISTS "student_read_class_expenses" ON expenses;

DROP POLICY IF EXISTS "super_admin_all_logs" ON activity_logs;
DROP POLICY IF EXISTS "admin_read_own_logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_insert_logs" ON activity_logs;

-- PROFILES
CREATE POLICY "super_admin_all_profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (user_role() = 'super_admin')
  WITH CHECK (user_role() = 'super_admin');

CREATE POLICY "admin_manage_assigned_students"
  ON profiles FOR ALL
  TO authenticated
  USING (
    user_role() = 'admin'
    AND (
      profiles.class_id IN (
        SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
      )
      OR profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    user_role() = 'admin'
    AND (
      profiles.class_id IN (
        SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
      )
      OR profiles.id = auth.uid()
    )
  );

CREATE POLICY "student_read_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_role() = 'student' AND profiles.id = auth.uid());

CREATE POLICY "student_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_role() = 'student' AND profiles.id = auth.uid())
  WITH CHECK (user_role() = 'student' AND profiles.id = auth.uid());

-- CLASSES
CREATE POLICY "super_admin_all_classes"
  ON classes FOR ALL
  TO authenticated
  USING (user_role() = 'super_admin')
  WITH CHECK (user_role() = 'super_admin');

CREATE POLICY "admin_read_assigned_classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    user_role() = 'admin'
    AND classes.id IN (
      SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "student_read_own_class"
  ON classes FOR SELECT
  TO authenticated
  USING (
    user_role() = 'student'
    AND classes.id = user_class_id()
  );

-- CLASS ADMINS
CREATE POLICY "super_admin_all_class_admins"
  ON class_admins FOR ALL
  TO authenticated
  USING (user_role() = 'super_admin')
  WITH CHECK (user_role() = 'super_admin');

CREATE POLICY "admin_read_class_admins"
  ON class_admins FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

-- CONTRIBUTIONS
CREATE POLICY "super_admin_all_contributions"
  ON contributions FOR ALL
  TO authenticated
  USING (user_role() = 'super_admin')
  WITH CHECK (user_role() = 'super_admin');

CREATE POLICY "admin_manage_class_contributions"
  ON contributions FOR ALL
  TO authenticated
  USING (
    user_role() = 'admin'
    AND contributions.class_id IN (
      SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
    )
  )
  WITH CHECK (
    user_role() = 'admin'
    AND contributions.class_id IN (
      SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "student_read_own_contributions"
  ON contributions FOR SELECT
  TO authenticated
  USING (
    user_role() = 'student'
    AND contributions.student_id = auth.uid()
    AND contributions.deleted_at IS NULL
  );

-- EXPENSES
CREATE POLICY "super_admin_all_expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (user_role() = 'super_admin')
  WITH CHECK (user_role() = 'super_admin');

CREATE POLICY "admin_manage_class_expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    user_role() = 'admin'
    AND expenses.class_id IN (
      SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
    )
  )
  WITH CHECK (
    user_role() = 'admin'
    AND expenses.class_id IN (
      SELECT class_id FROM class_admins WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "student_read_class_expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    user_role() = 'student'
    AND expenses.class_id = user_class_id()
  );

-- ACTIVITY LOGS
CREATE POLICY "super_admin_all_logs"
  ON activity_logs FOR ALL
  TO authenticated
  USING (user_role() = 'super_admin');

CREATE POLICY "admin_read_own_logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_insert_logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7. ANALYTICAL RPC FUNCTION
-- Compute student payment status dynamically
-- Returns: student_id, status (paid/partial/unpaid), total
CREATE OR REPLACE FUNCTION get_student_payment_status(p_class_id UUID)
RETURNS TABLE (
  student_id UUID,
  status TEXT,
  total NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
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
      WHEN ct.contribution_target > 0 AND st.total >= ct.contribution_target THEN 'paid'
      WHEN ct.contribution_target > 0 AND st.total > 0 THEN 'partial'
      WHEN ct.contribution_target = 0 AND st.total > 0 THEN 'paid'
      ELSE 'unpaid'
    END::TEXT AS status,
    st.total
  FROM student_totals st
  CROSS JOIN class_target ct;
$$;

-- 8. LANDING PAGE CMS SETTINGS
CREATE TABLE IF NOT EXISTS landing_page_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_badge TEXT NOT NULL DEFAULT '✦ Class Contribution Transparency System',
  hero_title TEXT NOT NULL DEFAULT 'Transparent Class Finances, Made Effortless.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Real-time student contribution tracking, audited expense logs, and automated balance reports for universities and student groups.',
  hero_bg_image TEXT NOT NULL DEFAULT '',
  hero_bg_overlay_opacity INTEGER NOT NULL DEFAULT 85 CHECK (hero_bg_overlay_opacity BETWEEN 10 AND 100),
  cta_primary_text TEXT NOT NULL DEFAULT 'Access Portal',
  cta_primary_link TEXT NOT NULL DEFAULT '/login',
  cta_secondary_text TEXT NOT NULL DEFAULT 'View Features',
  cta_secondary_link TEXT NOT NULL DEFAULT '#features',
  show_announcement BOOLEAN NOT NULL DEFAULT true,
  announcement_text TEXT NOT NULL DEFAULT '✨ Real-time transparency: All contributions and expenses audited live with zero hidden balances.',
  announcement_link TEXT NOT NULL DEFAULT '',
  features_data JSONB NOT NULL DEFAULT '[
    {"title": "Real-time Auditing", "desc": "Every contribution and expense is instantly tracked. No delayed ledgers or discrepancies.", "icon": "ShieldCheck"},
    {"title": "Zero Stored Computed Values", "desc": "All student balances and payment statuses are derived dynamically on-the-fly from verified raw records.", "icon": "Calculator"},
    {"title": "Role-Based Clarity", "desc": "Tailored dashboards for students, class treasurers, and university administrators.", "icon": "Users"},
    {"title": "1-Click PDF Statements", "desc": "Export comprehensive, audit-ready financial summaries for class meetings and university reviews.", "icon": "FileSpreadsheet"}
  ]'::jsonb,
  stats_data JSONB NOT NULL DEFAULT '[
    {"value": "100%", "label": "Financial Transparency"},
    {"value": "0", "label": "Hidden Balances"},
    {"value": "< 2s", "label": "Instant Dashboard Updates"},
    {"value": "Bank-Grade", "label": "Row-Level Security"}
  ]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE landing_page_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_landing_settings" ON landing_page_settings;
DROP POLICY IF EXISTS "admins_manage_landing_settings" ON landing_page_settings;

CREATE POLICY "public_read_landing_settings"
  ON landing_page_settings FOR SELECT
  USING (true);

CREATE POLICY "admins_manage_landing_settings"
  ON landing_page_settings FOR ALL
  TO authenticated
  USING (user_role() IN ('super_admin', 'admin'))
  WITH CHECK (user_role() IN ('super_admin', 'admin'));

INSERT INTO landing_page_settings (
  id,
  hero_badge,
  hero_title,
  hero_subtitle,
  hero_bg_image,
  hero_bg_overlay_opacity,
  cta_primary_text,
  cta_primary_link,
  cta_secondary_text,
  cta_secondary_link,
  show_announcement,
  announcement_text,
  announcement_link
) VALUES (
  'default',
  '✦ Class Contribution Transparency System',
  'Transparent Class Finances, Made Effortless.',
  'Real-time student contribution tracking, audited expense logs, and automated balance reports for universities and student groups.',
  '',
  85,
  'Access Portal',
  '/login',
  'View Features',
  '#features',
  true,
  '✨ Real-time transparency: All contributions and expenses audited live with zero hidden balances.',
  ''
) ON CONFLICT (id) DO NOTHING;
