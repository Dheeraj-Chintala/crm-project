-- Create documents table for file attachments
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT documents_entity_check CHECK (
    (lead_id IS NOT NULL)::int + (contact_id IS NOT NULL)::int + (deal_id IS NOT NULL)::int <= 1
  )
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX idx_documents_contact_id ON public.documents(contact_id);
CREATE INDEX idx_documents_deal_id ON public.documents(deal_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);

-- RLS Policies for documents
CREATE POLICY "Admins can manage all documents"
  ON public.documents FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all documents"
  ON public.documents FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view documents for their records"
  ON public.documents FOR SELECT
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM leads WHERE leads.id = documents.lead_id AND leads.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM contacts WHERE contacts.id = documents.contact_id AND contacts.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM deals WHERE deals.id = documents.deal_id AND deals.owner_id = auth.uid())
  );

CREATE POLICY "Users can upload documents for their records"
  ON public.documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      lead_id IS NULL OR EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_id AND leads.owner_id = auth.uid()) OR
      contact_id IS NULL OR EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_id AND contacts.owner_id = auth.uid()) OR
      deal_id IS NULL OR EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND deals.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create email_templates table for automation
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_type TEXT, -- 'lead_status_change', 'deal_stage_change', 'task_reminder', etc.
  trigger_value TEXT, -- specific status/stage value
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates (admin only)
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view email templates"
  ON public.email_templates FOR SELECT
  USING (is_manager_or_above(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create automation_logs table for tracking automated actions
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

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_logs (admin only view)
CREATE POLICY "Admins can view automation logs"
  ON public.automation_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert automation logs"
  ON public.automation_logs FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create system_settings table for configuration
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_settings (admin only)
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "All users can view system settings"
  ON public.system_settings FOR SELECT
  USING (auth.role() = 'authenticated');