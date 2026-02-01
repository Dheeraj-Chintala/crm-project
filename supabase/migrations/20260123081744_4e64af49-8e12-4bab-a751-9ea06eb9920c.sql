-- Create enum for lead sources
CREATE TYPE public.lead_source AS ENUM ('website', 'whatsapp', 'instagram', 'referral', 'call', 'email', 'other');

-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'interested', 'converted', 'lost');

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source lead_source NOT NULL DEFAULT 'other',
  inquiry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead status history table
CREATE TABLE public.lead_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status lead_status,
  new_status lead_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead activities table
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Leads RLS Policies
CREATE POLICY "Admins can manage all leads"
  ON public.leads FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all leads"
  ON public.leads FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view their own leads"
  ON public.leads FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own leads"
  ON public.leads FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Managers can update any lead"
  ON public.leads FOR UPDATE
  USING (is_manager_or_above(auth.uid()));

-- Lead Status History RLS Policies
CREATE POLICY "Admins can view all status history"
  ON public.lead_status_history FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all status history"
  ON public.lead_status_history FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view status history for their leads"
  ON public.lead_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_status_history.lead_id
    AND leads.owner_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can insert status history"
  ON public.lead_status_history FOR INSERT
  WITH CHECK (changed_by = auth.uid());

-- Lead Activities RLS Policies
CREATE POLICY "Admins can manage all activities"
  ON public.lead_activities FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all activities"
  ON public.lead_activities FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view activities for their leads"
  ON public.lead_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_activities.lead_id
    AND leads.owner_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can insert activities"
  ON public.lead_activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log lead status change
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for automatic status history logging
CREATE TRIGGER log_lead_status_change_trigger
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_status_change();