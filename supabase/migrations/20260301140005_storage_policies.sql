-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Allow authenticated users to upload to post-images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Allow public read access to post-images
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

-- Allow users to delete their own post images
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
