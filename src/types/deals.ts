import { Database } from "@/integrations/supabase/types";

export type DealStage = Database["public"]["Enums"]["deal_stage"];

export interface Deal {
  id: string;
  name: string;
  lead_id: string | null;
  contact_id: string | null;
  owner_id: string;
  stage: DealStage;
  estimated_value: number | null;
  confirmed_value: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  lead?: {
    id: string;
    name: string;
  } | null;
  contact?: {
    id: string;
    first_name: string;
    last_name: string | null;
    company: string | null;
  } | null;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

export interface DealStageHistory {
  id: string;
  deal_id: string;
  old_stage: DealStage | null;
  new_stage: DealStage;
  changed_by: string;
  notes: string | null;
  created_at: string;
  changed_by_user?: {
    full_name: string | null;
    email: string;
  };
}

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: "inquiry", label: "Inquiry", color: "bg-blue-500" },
  { value: "proposal", label: "Proposal", color: "bg-purple-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-amber-500" },
  { value: "closed_won", label: "Closed Won", color: "bg-green-500" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

export const getDealStageLabel = (stage: DealStage): string => {
  return DEAL_STAGES.find((s) => s.value === stage)?.label || stage;
};

export const getDealStageColor = (stage: DealStage): string => {
  return DEAL_STAGES.find((s) => s.value === stage)?.color || "bg-gray-500";
};
