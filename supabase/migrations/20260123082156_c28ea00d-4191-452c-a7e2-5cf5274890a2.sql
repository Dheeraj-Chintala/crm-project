-- Allow users to create their own leads (they become the owner)
CREATE POLICY "Users can create their own leads"
  ON public.leads FOR INSERT
  WITH CHECK (owner_id = auth.uid());