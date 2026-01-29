-- Remove the overly permissive INSERT policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

-- Create a new INSERT policy that only allows authenticated users (admins)
-- Note: Public lead submissions now go through the Edge Function which uses service role
CREATE POLICY "Authenticated users can insert leads" 
ON public.leads 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);