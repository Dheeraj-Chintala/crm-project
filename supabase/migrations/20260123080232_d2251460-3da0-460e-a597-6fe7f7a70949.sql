-- Add status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Teams RLS policies
CREATE POLICY "Admins can manage all teams" ON public.teams
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all teams" ON public.teams
  FOR SELECT USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can create teams" ON public.teams
  FOR INSERT WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
  );

-- Team members RLS policies
CREATE POLICY "Admins can manage all team members" ON public.team_members
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all team members" ON public.team_members
  FOR SELECT USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can add team members" ON public.team_members
  FOR INSERT WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Team managers can manage their team members" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = team_members.team_id 
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Users can view their own team memberships" ON public.team_members
  FOR SELECT USING (user_id = auth.uid());

-- Audit logs RLS policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view audit logs for their actions" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid() AND is_manager_or_above(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text,
  _entity_id uuid DEFAULT NULL,
  _old_values jsonb DEFAULT NULL,
  _new_values jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _old_values, _new_values)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Function to get user's teams
CREATE OR REPLACE FUNCTION public.get_user_teams(_user_id uuid)
RETURNS TABLE(team_id uuid, team_name text, team_role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, tm.role
  FROM public.teams t
  JOIN public.team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = _user_id
$$;

-- Function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Function to check team manager status
CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id 
      AND team_id = _team_id 
      AND role IN ('owner', 'manager')
  )
$$;