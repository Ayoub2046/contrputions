-- Migration 020: Super Admin Password Vault for Admin & Finance Manager Accounts
-- Strictly restricted to super_admin ONLY via RLS.

CREATE TABLE IF NOT EXISTS public.admin_passwords (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plain_password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_passwords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_only_admin_passwords" ON public.admin_passwords;
CREATE POLICY "super_admin_only_admin_passwords"
  ON public.admin_passwords FOR ALL
  USING (user_role()::text = 'super_admin')
  WITH CHECK (user_role()::text = 'super_admin');
