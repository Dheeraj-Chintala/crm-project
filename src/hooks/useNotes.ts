import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Note, NoteFormData } from "@/types/notes";

export function useNotes(filters?: {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("notes")
        .select("*")
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
      setNotes(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching notes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, filters?.leadId, filters?.contactId, filters?.dealId, toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (data: NoteFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("notes").insert({
        content: data.content,
        lead_id: data.lead_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Your note has been saved.",
      });

      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    notes,
    loading,
    addNote,
    refetch: fetchNotes,
  };
}
