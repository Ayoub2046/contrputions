-- Migration: 023_recycle_bin_deleted_by_rls.sql
-- Ensure Class Admins can always view and manage recycle_bin records they deleted
-- (even when an item's class_id is NULL) in addition to items in their assigned classes.

DROP POLICY IF EXISTS "admin_class_recycle_bin" ON public.recycle_bin;
CREATE POLICY "admin_class_recycle_bin"
  ON public.recycle_bin FOR ALL TO authenticated
  USING (
    deleted_by = auth.uid()
    OR class_id IN (
      SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid()
    )
  )
  WITH CHECK (
    deleted_by = auth.uid()
    OR class_id IN (
      SELECT class_id FROM public.class_admins WHERE admin_id = auth.uid()
    )
  );
