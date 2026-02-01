export interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  lead_id: string | null;
  owner_id: string;
  notes: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    full_name: string | null;
    email: string;
  };
  phones?: ContactPhone[];
  emails?: ContactEmail[];
}

export interface ContactPhone {
  id: string;
  contact_id: string;
  phone_number: string;
  phone_type: string;
  is_primary: boolean;
  created_at: string;
}

export interface ContactEmail {
  id: string;
  contact_id: string;
  email: string;
  email_type: string;
  is_primary: boolean;
  created_at: string;
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

export const PHONE_TYPES = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'work', label: 'Work' },
  { value: 'home', label: 'Home' },
  { value: 'other', label: 'Other' },
];

export const EMAIL_TYPES = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export const ACTIVITY_TYPES = [
  'note',
  'call',
  'email',
  'meeting',
  'follow_up',
  'other',
] as const;
