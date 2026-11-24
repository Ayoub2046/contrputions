-- Migration 017: App Branding (Dynamic Application Name & Logo Access)

-- Allow public read access to branding settings (app_logo_url, app_name)
DROP POLICY IF EXISTS "read_app_logo" ON app_settings;
DROP POLICY IF EXISTS "read_app_branding" ON app_settings;

CREATE POLICY "read_app_branding" ON app_settings
  FOR SELECT USING (key IN ('app_logo_url', 'app_name'));

-- Ensure default app_name is seeded
INSERT INTO app_settings (key, value)
VALUES ('app_name', 'ClassBank')
ON CONFLICT (key) DO NOTHING;

-- Ensure default app_logo_url is seeded
INSERT INTO app_settings (key, value)
VALUES ('app_logo_url', '/classBankLogo.png')
ON CONFLICT (key) DO NOTHING;
