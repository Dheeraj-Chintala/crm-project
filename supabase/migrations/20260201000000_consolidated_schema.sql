-- Consolidated Migration for CRM Project
-- Generated to fix structural issues, remove duplicates, and simplify RLS.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
CREATE TYPE public.lead_source AS ENUM ('website', 'whatsapp', 'instagram', 'referral', 'call', 'email', 'other');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'interested', 'converted', 'lost');
CREATE TYPE public.deal_stage AS ENUM ('inquiry', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE public.communication_type AS ENUM ('call', 'email', 'meeting', 'whatsapp', 'chat', 'other');
CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- =============================================================================
-- HELPER FUNCTIONS (Defined early for RLS)
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- TABLES & SECURITY DEFINITIONS
-- =============================================================================

-- 1. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- ROLE HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager')
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 WHEN 'user' THEN 3 END LIMIT 1
$$;

-- 3. TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Fix: added FK, consistent with owner pattern
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. TEAM MEMBERS
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Fix: added FK
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- TEAM HELPERS
CREATE OR REPLACE FUNCTION public.get_user_teams(_user_id uuid)
RETURNS TABLE(team_id uuid, team_name text, team_role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name, tm.role FROM public.teams t JOIN public.team_members tm ON t.id = tm.team_id WHERE tm.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id)
$$;

CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id AND role IN ('owner', 'manager'))
$$;

-- 5. CONTACTS (Contacts must exist before Deals often, but Leads come first usually. Order: Leads -> Contacts -> Deals)
-- We define Leads first.

-- 5. LEADS
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source lead_source NOT NULL DEFAULT 'other',
  inquiry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Fix: Removed NOT NULL to allow ON DELETE SET NULL
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  converted_to_contact_id UUID, -- References contacts, added via ALTER later to handle circular dependency if needed, but here we can just wait or allow NULL.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_owner_id ON public.leads(owner_id);

-- 6. CONTACTS
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  company TEXT,
  job_title TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Fix: Removed NOT NULL
  notes TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX idx_contacts_lead_id ON public.contacts(lead_id);

-- Add foreign key for leads conversion now that contacts exists
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_converted_contact FOREIGN KEY (converted_to_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 7. DEALS
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Fix: Added FK and removed NOT NULL (assuming consistency)
  stage deal_stage NOT NULL DEFAULT 'inquiry',
  estimated_value NUMERIC(15, 2),
  confirmed_value NUMERIC(15, 2),
  expected_close_date DATE,
  actual_close_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX idx_deals_lead_id ON public.deals(lead_id);
CREATE INDEX idx_deals_contact_id ON public.deals(contact_id);

-- 8. COMMUNICATIONS
CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type communication_type NOT NULL,
  direction communication_direction NOT NULL DEFAULT 'outbound',
  subject TEXT,
  content TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Fix: Added FK
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX idx_communications_contact_id ON public.communications(contact_id);
CREATE INDEX idx_communications_deal_id ON public.communications(deal_id);
CREATE INDEX idx_communications_created_by ON public.communications(created_by);
CREATE INDEX idx_communications_type ON public.communications(type);

-- 9. NOTES
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Fix: Added FK
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notes_lead_id ON public.notes(lead_id);
CREATE INDEX idx_notes_contact_id ON public.notes(contact_id);
CREATE INDEX idx_notes_deal_id ON public.notes(deal_id);
CREATE INDEX idx_notes_created_by ON public.notes(created_by);

-- 10. DOCUMENTS
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Fix: Added FK
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT documents_entity_check CHECK (
    (lead_id IS NOT NULL)::int + (contact_id IS NOT NULL)::int + (deal_id IS NOT NULL)::int <= 1
  )
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX idx_documents_contact_id ON public.documents(contact_id);
CREATE INDEX idx_documents_deal_id ON public.documents(deal_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);

-- 11. TASKS
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_at TIMESTAMP WITH TIME ZONE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Fix FK
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Fix FK
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_deal_id ON public.tasks(deal_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

-- 12. AUX TABLES (Phones, Emails, Activities, History)
CREATE TABLE public.contact_phones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_type TEXT NOT NULL DEFAULT 'mobile',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_phones ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contact_phones_contact_id ON public.contact_phones(contact_id); -- Fix missing index

CREATE TABLE public.contact_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'work',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_emails ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contact_emails_contact_id ON public.contact_emails(contact_id); -- Fix missing index

CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id); -- Fix missing index

CREATE TABLE public.contact_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contact_activities_contact_id ON public.contact_activities(contact_id); -- Fix missing index

CREATE TABLE public.deal_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Fix: added FK
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deal_activities_deal_id ON public.deal_activities(deal_id); -- Fix missing index

CREATE TABLE public.lead_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status lead_status,
  new_status lead_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lead_status_history_lead_id ON public.lead_status_history(lead_id); -- Fix missing index

CREATE TABLE public.deal_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  old_stage deal_stage,
  new_stage deal_stage NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Fix: FK
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deal_stage_history_deal_id ON public.deal_stage_history(deal_id); -- Fix missing index

-- 13. LOGS & SYSTEM
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  trigger_event TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_type TEXT,
  trigger_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- LOGGING & TRIGGER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text,
  _entity_id uuid DEFAULT NULL,
  _old_values jsonb DEFAULT NULL,
  _new_values jsonb DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _old_values, _new_values)
  RETURNING id INTO _log_id;
  RETURN _log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_automation_event(
  _automation_type text,
  _entity_type text,
  _trigger_event text,
  _action_taken text,
  _entity_id uuid DEFAULT NULL,
  _status text DEFAULT 'success',
  _error_message text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.automation_logs (automation_type, entity_type, entity_id, trigger_event, action_taken, status, error_message)
  VALUES (_automation_type, _entity_type, _entity_id, _trigger_event, _action_taken, _status, _error_message)
  RETURNING id INTO _log_id;
  RETURN _log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_lead_status_change_trigger AFTER UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();

CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.deal_stage_history (deal_id, old_stage, new_stage, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_deal_stage_change_trigger AFTER UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.log_deal_stage_change();

-- AUTH TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile and role on signup
-- Note: In a real migration, checks if trigger exists, but here we assume fresh start
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BUSINESS LOGIC TRIGGERS

-- 1. Prevent Multiple conversions
CREATE OR REPLACE FUNCTION public.prevent_lead_reconversion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.converted_to_contact_id IS NOT NULL AND NEW.converted_to_contact_id IS DISTINCT FROM OLD.converted_to_contact_id THEN
    RAISE EXCEPTION 'Lead has already been converted and cannot be converted again.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_lead_conversion_trigger BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.prevent_lead_reconversion();

-- 2. Tasks Completion Permission
CREATE OR REPLACE FUNCTION public.check_task_completion_permission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- If status is changing to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if auth user is the assigned user
    IF auth.uid() != NEW.assigned_to THEN
      RAISE EXCEPTION 'Only the assigned user can complete this task.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_task_completion_trigger BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_task_completion_permission();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- STORAGE (Documents)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Auth users upload docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "View own docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "Delete own docs" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- PROFILES
CREATE POLICY "View own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view all profiles" ON public.profiles FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));

-- USER ROLES
CREATE POLICY "View own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- TEAMS
CREATE POLICY "View public teams" ON public.teams FOR SELECT USING (true); -- Usually strictly internal, but if users can see teams they are in...
-- Reverting to stricter logic:
DROP POLICY IF EXISTS "View public teams" ON public.teams;
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view all teams" ON public.teams FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers create teams" ON public.teams FOR INSERT WITH CHECK (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Owners update teams" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Members view their teams" ON public.teams FOR SELECT USING (public.is_team_member(auth.uid(), id));

-- TEAM MEMBERS
CREATE POLICY "Admins manage members" ON public.team_members FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view members" ON public.team_members FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Team Managers manage members" ON public.team_members FOR ALL USING (public.is_team_manager(auth.uid(), team_id));
CREATE POLICY "View own membership" ON public.team_members FOR SELECT USING (user_id = auth.uid());

-- LEADS
CREATE POLICY "Admins manage leads" ON public.leads FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view all leads" ON public.leads FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers update all leads" ON public.leads FOR UPDATE USING (public.is_manager_or_above(auth.uid()));
-- Managers can create? Yes.
CREATE POLICY "Managers create leads" ON public.leads FOR INSERT WITH CHECK (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view own leads" ON public.leads FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users update own leads" ON public.leads FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users create own leads" ON public.leads FOR INSERT WITH CHECK (owner_id = auth.uid());

-- CONTACTS
CREATE POLICY "Admins manage contacts" ON public.contacts FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view all contacts" ON public.contacts FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers update all contacts" ON public.contacts FOR UPDATE USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers create contacts" ON public.contacts FOR INSERT WITH CHECK (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view own contacts" ON public.contacts FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users update own contacts" ON public.contacts FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users create open contacts" ON public.contacts FOR INSERT WITH CHECK (owner_id = auth.uid());

-- DEALS
CREATE POLICY "Admins manage deals" ON public.deals FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view all deals" ON public.deals FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers update all deals" ON public.deals FOR UPDATE USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers create deals" ON public.deals FOR INSERT WITH CHECK (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view own deals" ON public.deals FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users update own deals" ON public.deals FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users create own deals" ON public.deals FOR INSERT WITH CHECK (owner_id = auth.uid());

-- TASKS
CREATE POLICY "Admins manage tasks" ON public.tasks FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view all tasks" ON public.tasks FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Managers create tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view assigned tasks" ON public.tasks FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users create tasks" ON public.tasks FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update tasks" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid() OR created_by = auth.uid());
-- Note: Completion restriction handled by Trigger check_task_completion_permission

-- COMMUNICATIONS & NOTES
CREATE POLICY "Admins manage communications" ON public.communications FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view communications" ON public.communications FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view own communications" ON public.communications FOR SELECT USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.leads WHERE leads.id = communications.lead_id AND leads.owner_id = auth.uid())); -- Expanded visibility to owners of related entities
CREATE POLICY "Users create communications" ON public.communications FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins manage notes" ON public.notes FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view notes" ON public.notes FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view relevant notes" ON public.notes FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = notes.lead_id AND leads.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM contacts WHERE contacts.id = notes.contact_id AND contacts.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM deals WHERE deals.id = notes.deal_id AND deals.owner_id = auth.uid())
);
CREATE POLICY "Users create notes" ON public.notes FOR INSERT WITH CHECK (created_by = auth.uid());

-- DOCUMENTS
CREATE POLICY "Admins manage documents" ON public.documents FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view documents" ON public.documents FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Users view relevant documents" ON public.documents FOR SELECT USING (
  uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = documents.lead_id AND leads.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM contacts WHERE contacts.id = documents.contact_id AND contacts.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM deals WHERE deals.id = documents.deal_id AND deals.owner_id = auth.uid())
);
CREATE POLICY "Users upload documents" ON public.documents FOR INSERT WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Users delete own documents" ON public.documents FOR DELETE USING (uploaded_by = auth.uid());

-- LOGS
-- Audit Logs: View Only. Insert reserved for function (SECURITY DEFINER bypasses RLS if owner is admin/postgres, or if we grant insert to public but check calling mechanism impossible in SQL directly. 
-- Best practice: No INSERT policy for auth users. Function is SECURITY DEFINER.
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view own audit logs" ON public.audit_logs FOR SELECT USING (user_id = auth.uid() AND public.is_manager_or_above(auth.uid()));

CREATE POLICY "Admins view automation logs" ON public.automation_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- SYSTEM & CONFIG
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users view settings" ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Managers view email templates" ON public.email_templates FOR SELECT USING (public.is_manager_or_above(auth.uid()));

-- SUB-TABLE RLS (Phones, Emails, Activities)
-- Inherit ownership from parent or allow creator
CREATE POLICY "Access contact details" ON public.contact_phones FOR ALL USING (EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_phones.contact_id AND (contacts.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));
CREATE POLICY "Access contact emails" ON public.contact_emails FOR ALL USING (EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_emails.contact_id AND (contacts.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));

CREATE POLICY "Access lead activities" ON public.lead_activities FOR ALL USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND (leads.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));
CREATE POLICY "Access contact activities" ON public.contact_activities FOR ALL USING (EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_activities.contact_id AND (contacts.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));
CREATE POLICY "Access deal activities" ON public.deal_activities FOR ALL USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_activities.deal_id AND (deals.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));

CREATE POLICY "Access lead history" ON public.lead_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_status_history.lead_id AND (leads.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));
CREATE POLICY "Access deal history" ON public.deal_stage_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_stage_history.deal_id AND (deals.owner_id = auth.uid() OR public.is_manager_or_above(auth.uid()))));
