
-- Create enums for new modules
CREATE TYPE public.communication_type AS ENUM ('call', 'email', 'meeting', 'whatsapp', 'chat', 'other');
CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- =============================================
-- COMMUNICATIONS TABLE
-- =============================================
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
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communications
CREATE POLICY "Admins can manage all communications"
  ON public.communications FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all communications"
  ON public.communications FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can create communications"
  ON public.communications FOR INSERT
  WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view their own communications"
  ON public.communications FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create their own communications"
  ON public.communications FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- =============================================
-- NOTES TABLE (Immutable for audit)
-- =============================================
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes (no update/delete for immutability)
CREATE POLICY "Admins can view all notes"
  ON public.notes FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all notes"
  ON public.notes FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view notes for their records"
  ON public.notes FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM leads WHERE leads.id = notes.lead_id AND leads.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM contacts WHERE contacts.id = notes.contact_id AND contacts.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM deals WHERE deals.id = notes.deal_id AND deals.owner_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- =============================================
-- TASKS TABLE
-- =============================================
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
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Admins can manage all tasks"
  ON public.tasks FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all tasks"
  ON public.tasks FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can update tasks"
  ON public.tasks FOR UPDATE
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view assigned tasks"
  ON public.tasks FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX idx_communications_contact_id ON public.communications(contact_id);
CREATE INDEX idx_communications_deal_id ON public.communications(deal_id);
CREATE INDEX idx_communications_created_by ON public.communications(created_by);
CREATE INDEX idx_communications_type ON public.communications(type);

CREATE INDEX idx_notes_lead_id ON public.notes(lead_id);
CREATE INDEX idx_notes_contact_id ON public.notes(contact_id);
CREATE INDEX idx_notes_deal_id ON public.notes(deal_id);
CREATE INDEX idx_notes_created_by ON public.notes(created_by);

CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_deal_id ON public.tasks(deal_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
