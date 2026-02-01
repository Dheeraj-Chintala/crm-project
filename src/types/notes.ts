export interface Note {
  id: string;
  content: string;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_by: string;
  created_at: string;
  creator?: { id: string; full_name: string | null; email: string } | null;
}

export interface NoteFormData {
  content: string;
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
}
