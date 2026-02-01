-- Fix the permissive RLS policy on automation_logs
DROP POLICY IF EXISTS "System can insert automation logs" ON public.automation_logs;

-- Create a more restrictive policy for automation_logs insert
CREATE POLICY "Authenticated users can insert automation logs"
  ON public.automation_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');