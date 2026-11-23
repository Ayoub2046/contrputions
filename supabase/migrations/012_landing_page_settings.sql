-- ==============================================================================
-- Migration 012: Landing Page CMS Settings Table & RLS
-- Allows public visitors to view landing page content and admins to customize it
-- ==============================================================================

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

-- Enable RLS
ALTER TABLE landing_page_settings ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "public_read_landing_settings" ON landing_page_settings;
DROP POLICY IF EXISTS "admins_manage_landing_settings" ON landing_page_settings;

-- 1. Anyone (visitors, unauthenticated, authenticated) can read the landing page content
CREATE POLICY "public_read_landing_settings"
  ON landing_page_settings FOR SELECT
  USING (true);

-- 2. Only Admins and Super Admins can update/manage landing page content
CREATE POLICY "admins_manage_landing_settings"
  ON landing_page_settings FOR ALL
  TO authenticated
  USING (user_role() IN ('super_admin', 'admin'))
  WITH CHECK (user_role() IN ('super_admin', 'admin'));

-- Seed initial row
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
