-- Sudoku Evolved — Storage bucket + policies for avatars
-- Run after 004_views.sql.
--
-- Path convention: avatars/<user_id>/<timestamp>.jpg
-- Public read; users can only write inside their own user_id folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ============================================================
-- Read: public.
-- ============================================================
DROP POLICY IF EXISTS storage_avatars_select_public ON storage.objects;
CREATE POLICY storage_avatars_select_public
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'avatars');

-- ============================================================
-- Write: only the owner of the user_id folder may insert/update/delete.
-- ============================================================
DROP POLICY IF EXISTS storage_avatars_insert_self ON storage.objects;
CREATE POLICY storage_avatars_insert_self
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS storage_avatars_update_self ON storage.objects;
CREATE POLICY storage_avatars_update_self
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS storage_avatars_delete_self ON storage.objects;
CREATE POLICY storage_avatars_delete_self
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
