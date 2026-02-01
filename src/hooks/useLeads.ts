import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { Lead, LeadSource, LeadStatus, LeadActivity, LeadStatusHistory } from "@/types/leads";

export function useLeads() {
  const { user } = useAuth();
  const { logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch owner profiles separately
      const ownerIds = [...new Set(data.map(l => l.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(lead => ({
        ...lead,
        owner: profileMap.get(lead.owner_id),
      })) as Lead[];
    },
    enabled: !!user,
  });

  const createLead = useMutation({
    mutationFn: async (lead: {
      name: string;
      phone?: string;
      email?: string;
      source: LeadSource;
      inquiry_date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("leads")
        .insert([{
          ...lead,
          owner_id: user!.id,
          inquiry_date: lead.inquiry_date || new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      
      await logAudit({
        action: "team.create",
        entityType: "team",
        entityId: data.id,
        newValues: lead,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'owner'>>;
    }) => {
      const { data: oldLead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAudit({
        action: "team.update",
        entityType: "team",
        entityId: id,
        oldValues: oldLead || undefined,
        newValues: updates,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-status-history"] });
    },
  });

  const reassignLead = useMutation({
    mutationFn: async ({ id, newOwnerId }: { id: string; newOwnerId: string }) => {
      const { data: oldLead } = await supabase
        .from("leads")
        .select("owner_id")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("leads")
        .update({ owner_id: newOwnerId })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await logAudit({
        action: "team.update",
        entityType: "team",
        entityId: id,
        oldValues: { owner_id: oldLead?.owner_id },
        newValues: { owner_id: newOwnerId },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  return {
    leads: leadsQuery.data || [],
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    createLead,
    updateLead,
    updateLeadStatus,
    reassignLead,
  };
}

export function useLead(leadId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (error) throw error;
      
      // Fetch owner profile separately
      const { data: owner } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", data.owner_id)
        .single();
      
      return { ...data, owner } as Lead;
    },
    enabled: !!user && !!leadId,
  });
}

export function useLeadActivities(leadId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const activitiesQuery = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(activity => ({
        ...activity,
        user: profileMap.get(activity.user_id),
      })) as LeadActivity[];
    },
    enabled: !!user && !!leadId,
  });

  const addActivity = useMutation({
    mutationFn: async (activity: {
      activity_type: string;
      description: string;
    }) => {
      const { data, error } = await supabase
        .from("lead_activities")
        .insert([{
          ...activity,
          lead_id: leadId,
          user_id: user!.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
    },
  });

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
    addActivity,
  };
}

export function useLeadStatusHistory(leadId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lead-status-history", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_status_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch changer profiles separately
      const changerIds = [...new Set(data.map(h => h.changed_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", changerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(history => ({
        ...history,
        changer: profileMap.get(history.changed_by),
      })) as LeadStatusHistory[];
    },
    enabled: !!user && !!leadId,
  });
}
