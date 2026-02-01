import { Database } from "@/integrations/supabase/types";

export type CommunicationType = Database["public"]["Enums"]["communication_type"];
export type CommunicationDirection = Database["public"]["Enums"]["communication_direction"];

export const COMMUNICATION_TYPES: { value: CommunicationType; label: string; icon: string }[] = [
  { value: "call", label: "Phone Call", icon: "Phone" },
  { value: "email", label: "Email", icon: "Mail" },
  { value: "meeting", label: "Meeting", icon: "Calendar" },
  { value: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
  { value: "chat", label: "Chat", icon: "MessageSquare" },
  { value: "other", label: "Other", icon: "MoreHorizontal" },
];

export const COMMUNICATION_DIRECTIONS: { value: CommunicationDirection; label: string }[] = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

export interface Communication {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject: string | null;
  content: string | null;
  duration_minutes: number | null;
  scheduled_at: string | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  created_by: string;
  created_at: string;
  lead?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string; last_name: string | null } | null;
  deal?: { id: string; name: string } | null;
  creator?: { id: string; full_name: string | null; email: string } | null;
}

export interface CommunicationFormData {
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  content?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
}
