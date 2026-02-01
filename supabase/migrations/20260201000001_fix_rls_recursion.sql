-- Fix infinite recursion in RLS policies for teams and team_members

-- 1. Create helper function for team manager check (security definer breaks recursion)
CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id AND role IN ('owner', 'manager'))
$$;

-- 2. Update "Team Managers manage members" policy to use the security definer function
DROP POLICY IF EXISTS "Team Managers manage members" ON public.team_members;
CREATE POLICY "Team Managers manage members" ON public.team_members FOR ALL USING (public.is_team_manager(auth.uid(), team_id));

-- 3. Update "Members view their teams" policy to use the existing security definer function
-- This improves performance and avoids potential recursion in some edge cases
DROP POLICY IF EXISTS "Members view their teams" ON public.teams;
CREATE POLICY "Members view their teams" ON public.teams FOR SELECT USING (public.is_team_member(auth.uid(), id));
