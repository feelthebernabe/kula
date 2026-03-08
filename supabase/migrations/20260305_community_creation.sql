-- Allow authenticated users to create communities
CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT TO authenticated
  WITH CHECK (true);
