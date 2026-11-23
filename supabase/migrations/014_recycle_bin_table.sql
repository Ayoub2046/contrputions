-- Migration: 014_recycle_bin_table.sql
-- Creates a persistent recycle bin table for soft-deleted items

CREATE TABLE IF NOT EXISTS public.recycle_bin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('contribution', 'expense', 'student', 'class')),
  item_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_recycle_bin_class_id ON public.recycle_bin(class_id);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON public.recycle_bin(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_item_type ON public.recycle_bin(item_type);

ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
DROP POLICY IF EXISTS "super_admin_all_recycle_bin" ON public.recycle_bin;
CREATE POLICY "super_admin_all_recycle_bin"
  ON public.recycle_bin FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Class admin: access to their class only
DROP POLICY IF EXISTS "admin_class_recycle_bin" ON public.recycle_bin;
CREATE POLICY "admin_class_recycle_bin"
  ON public.recycle_bin FOR ALL TO authenticated
  USING (class_id IN (
    SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid()
  ))
  WITH CHECK (class_id IN (
    SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid()
  ));
