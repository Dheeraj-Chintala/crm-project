-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  company TEXT,
  job_title TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  -- Location fields
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact phones table (multiple phones per contact)
CREATE TABLE public.contact_phones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_type TEXT NOT NULL DEFAULT 'mobile',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact emails table (multiple emails per contact)
CREATE TABLE public.contact_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'work',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact activities table
CREATE TABLE public.contact_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add converted_to_contact_id to leads for tracking conversion
ALTER TABLE public.leads ADD COLUMN converted_to_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

-- Contacts RLS Policies
CREATE POLICY "Admins can manage all contacts"
  ON public.contacts FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view all contacts"
  ON public.contacts FOR SELECT
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can create contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (is_manager_or_above(auth.uid()));

CREATE POLICY "Managers can update contacts"
  ON public.contacts FOR UPDATE
  USING (is_manager_or_above(auth.uid()));

CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  USING (owner_id = auth.uid());

-- Contact Phones RLS (inherit from contact ownership)
CREATE POLICY "Users can manage phones for their contacts"
  ON public.contact_phones FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_phones.contact_id
    AND (contacts.owner_id = auth.uid() OR is_manager_or_above(auth.uid()))
  ));

-- Contact Emails RLS (inherit from contact ownership)
CREATE POLICY "Users can manage emails for their contacts"
  ON public.contact_emails FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_emails.contact_id
    AND (contacts.owner_id = auth.uid() OR is_manager_or_above(auth.uid()))
  ));

-- Contact Activities RLS
CREATE POLICY "Users can view activities for their contacts"
  ON public.contact_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_activities.contact_id
    AND (contacts.owner_id = auth.uid() OR is_manager_or_above(auth.uid()))
  ));

CREATE POLICY "Users can insert activities for their contacts"
  ON public.contact_activities FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_activities.contact_id
    AND (contacts.owner_id = auth.uid() OR is_manager_or_above(auth.uid()))
  ));

-- Triggers for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();