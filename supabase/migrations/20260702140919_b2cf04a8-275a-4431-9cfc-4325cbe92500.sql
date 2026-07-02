
CREATE POLICY "Members can read org logo"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = public.my_org()::text
  );

CREATE POLICY "Admins can upload org logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = public.my_org()::text
    AND public.is_admin()
  );

CREATE POLICY "Admins can update org logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = public.my_org()::text
    AND public.is_admin()
  );

CREATE POLICY "Admins can delete org logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (storage.foldername(name))[1] = public.my_org()::text
    AND public.is_admin()
  );
