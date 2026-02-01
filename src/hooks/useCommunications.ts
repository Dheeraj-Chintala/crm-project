import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Communication, CommunicationFormData } from "@/types/communications";

export function useCommunications(filters?: {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCommunications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("communications")
        .select(`
          *,
          lead:leads(id, name),
          contact:contacts(id, first_name, last_name),
          deal:deals(id, name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.leadId) {
        query = query.eq("lead_id", filters.leadId);
      }
      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
      }
      if (filters?.dealId) {
        query = query.eq("deal_id", filters.dealId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching communications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, filters?.leadId, filters?.contactId, filters?.dealId, toast]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const addCommunication = async (data: CommunicationFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("communications").insert({
        type: data.type,
        direction: data.direction,
        subject: data.subject || null,
        content: data.content || null,
        duration_minutes: data.duration_minutes || null,
        scheduled_at: data.scheduled_at || null,
        lead_id: data.lead_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Communication logged",
        description: "The communication record has been saved.",
      });

      fetchCommunications();
    } catch (error: any) {
      toast({
        title: "Error logging communication",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    communications,
    loading,
    addCommunication,
    refetch: fetchCommunications,
  };
}
