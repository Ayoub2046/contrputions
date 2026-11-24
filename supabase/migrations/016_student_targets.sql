-- Per-student contribution target table
-- Allows super_admin AND class admins to set a custom fixed contribution amount per student
-- Completely separate from the class-level contribution_target on the classes table

CREATE TABLE IF NOT EXISTS student_contribution_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  set_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

CREATE INDEX idx_sct_student_id ON student_contribution_targets(student_id);
CREATE INDEX idx_sct_class_id   ON student_contribution_targets(class_id);

-- RLS
ALTER TABLE student_contribution_targets ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "super_admin_full_sct" ON student_contribution_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Class admin: manage targets only for students in their class
CREATE POLICY "admin_manage_sct" ON student_contribution_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM class_admins ca
      WHERE ca.admin_id = auth.uid() AND ca.class_id = student_contribution_targets.class_id
    )
  );

-- Students: read their own target
CREATE POLICY "student_read_own_sct" ON student_contribution_targets
  FOR SELECT USING (
    student_id = auth.uid()
  );

-- Activity log: add login/logout event columns (extend existing table)
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'action';

-- App settings table: for logo and other super_admin-only settings
CREATE TABLE IF NOT EXISTS app_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Super admin only: full control over app_settings
CREATE POLICY "super_admin_app_settings" ON app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Everyone: read app logo setting
CREATE POLICY "read_app_logo" ON app_settings
  FOR SELECT USING (key = 'app_logo_url');

-- Seed default logo setting
INSERT INTO app_settings (key, value) VALUES ('app_logo_url', '/classBankLogo.png')
  ON CONFLICT (key) DO NOTHING;

-- Function to log auth events (called from app)
CREATE OR REPLACE FUNCTION log_auth_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, event_type, metadata)
  VALUES (p_user_id, p_event_type, p_event_type, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
