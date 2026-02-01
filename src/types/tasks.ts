import { Database } from "@/integrations/supabase/types";

export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-slate-500" },
  { value: "medium", label: "Medium", color: "bg-blue-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  reminder_at: string | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  assigned_to: string;
  created_by: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  lead?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string; last_name: string | null } | null;
  deal?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string | null; email: string } | null;
  creator?: { id: string; full_name: string | null; email: string } | null;
}

export interface TaskFormData {
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date?: string;
  reminder_at?: string;
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to: string;
}
