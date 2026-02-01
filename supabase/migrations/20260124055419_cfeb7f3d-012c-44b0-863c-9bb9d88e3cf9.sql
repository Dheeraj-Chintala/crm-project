-- Create enum for deal stages
CREATE TYPE public.deal_stage AS ENUM ('inquiry', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

-- Create deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL,
  stage deal_stage NOT NULL DEFAULT 'inquiry',
  estimated_value NUMERIC(15, 2),
  confirmed_value NUMERIC(15, 2),
  expected_close_date DATE,
  actual_close_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal stage history table
CREATE TABLE public.deal_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  old_stage deal_stage,
  new_stage deal_stage NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal activities table
CREATE TABLE public.deal_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for deals
CREATE POLICY "Admins can manage all deals" 
ON public.deals FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all deals" 
ON public.deals FOR SELECT 
USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can create deals" 
ON public.deals FOR INSERT 
WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can update deals" 
ON public.deals FOR UPDATE 
USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view their own deals" 
ON public.deals FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own deals" 
ON public.deals FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own deals" 
ON public.deals FOR UPDATE 
USING (owner_id = auth.uid());

-- RLS policies for deal_stage_history
CREATE POLICY "Admins can view all stage history" 
ON public.deal_stage_history FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all stage history" 
ON public.deal_stage_history FOR SELECT 
USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view stage history for their deals" 
ON public.deal_stage_history FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.deals 
  WHERE deals.id = deal_stage_history.deal_id 
  AND deals.owner_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert stage history" 
ON public.deal_stage_history FOR INSERT 
WITH CHECK (changed_by = auth.uid());

-- RLS policies for deal_activities
CREATE POLICY "Admins can manage all deal activities" 
ON public.deal_activities FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all deal activities" 
ON public.deal_activities FOR SELECT 
USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view activities for their deals" 
ON public.deal_activities FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.deals 
  WHERE deals.id = deal_activities.deal_id 
  AND deals.owner_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert deal activities" 
ON public.deal_activities FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for stage history logging
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.deal_stage_history (deal_id, old_stage, new_stage, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_deal_stage_change_trigger
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_stage_change();