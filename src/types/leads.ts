export type LeadSource = 'website' | 'whatsapp' | 'instagram' | 'referral' | 'call' | 'email' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  inquiry_date: string;
  owner_id: string;
  status: LeadStatus;
  notes: string | null;
  converted_to_contact_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    full_name: string | null;
    email: string;
  };
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status: LeadStatus | null;
  new_status: LeadStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
  changer?: {
    full_name: string | null;
    email: string;
  };
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referral' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { value: 'interested', label: 'Interested', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export const ACTIVITY_TYPES = [
  'note',
  'call',
  'email',
  'meeting',
  'follow_up',
  'other',
] as const;
