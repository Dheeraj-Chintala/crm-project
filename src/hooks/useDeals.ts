import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Deal, DealActivity, DealStageHistory, DealStage } from "@/types/deals";
import { toast } from "sonner";

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDeals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          lead:leads(id, name),
          contact:contacts(id, first_name, last_name, company)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const dealsData = data || [];

      // Fetch owner profiles separately
      const ownerIds = [...new Set(dealsData.map((d) => d.owner_id).filter(Boolean))];
      
      let profiles: any[] = [];
      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ownerIds);
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      const dealsWithOwners = dealsData.map((deal) => ({
        ...deal,
        owner: deal.owner_id ? profileMap.get(deal.owner_id) : undefined,
      }));

      setDeals(dealsWithOwners as Deal[]);
    } catch (err: any) {
      console.error("Error fetching deals:", err);
      setError(err.message);
      toast.error("Failed to fetch deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [user]);

  const createDeal = async (dealData: {
    name: string;
    lead_id?: string | null;
    contact_id?: string | null;
    estimated_value?: number | null;
    confirmed_value?: number | null;
    expected_close_date?: string | null;
    notes?: string | null;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...dealData,
          owner_id: user.id,
          stage: "inquiry" as DealStage,
        })
        .select()
        .single();

      if (error) throw error;

      // Log initial stage in history
      await supabase.from("deal_stage_history").insert({
        deal_id: data.id,
        new_stage: "inquiry" as DealStage,
        changed_by: user.id,
        notes: "Deal created",
      });

      toast.success("Deal created successfully");
      await fetchDeals();
      return data;
    } catch (err: any) {
      toast.error("Failed to create deal: " + err.message);
      return null;
    }
  };

  const updateDeal = async (
    dealId: string,
    updates: Partial<Deal>
  ) => {
    try {
      const { error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", dealId);

      if (error) throw error;

      toast.success("Deal updated successfully");
      await fetchDeals();
      return true;
    } catch (err: any) {
      toast.error("Failed to update deal: " + err.message);
      return false;
    }
  };

  const updateDealStage = async (
    dealId: string,
    newStage: DealStage,
    notes?: string
  ) => {
    if (!user) return false;

    try {
      const updates: Partial<Deal> = { stage: newStage };
      
      // Set actual close date for closed stages
      if (newStage === "closed_won" || newStage === "closed_lost") {
        updates.actual_close_date = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", dealId);

      if (error) throw error;

      toast.success(`Deal moved to ${newStage.replace("_", " ")}`);
      await fetchDeals();
      return true;
    } catch (err: any) {
      toast.error("Failed to update deal stage: " + err.message);
      return false;
    }
  };

  const reassignDeal = async (dealId: string, newOwnerId: string) => {
    try {
      const { error } = await supabase
        .from("deals")
        .update({ owner_id: newOwnerId })
        .eq("id", dealId);

      if (error) throw error;

      toast.success("Deal reassigned successfully");
      await fetchDeals();
      return true;
    } catch (err: any) {
      toast.error("Failed to reassign deal: " + err.message);
      return false;
    }
  };

  return {
    deals,
    loading,
    error,
    createDeal,
    updateDeal,
    updateDealStage,
    reassignDeal,
    refetch: fetchDeals,
  };
}

export function useDeal(dealId: string) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("deals")
          .select(`
            *,
            lead:leads(id, name),
            contact:contacts(id, first_name, last_name, company)
          `)
          .eq("id", dealId)
          .single();

        if (error) throw error;

        // Fetch owner profile
        const { data: owner } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", data.owner_id)
          .single();

        setDeal({ ...data, owner } as Deal);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (dealId) {
      fetchDeal();
    }
  }, [dealId]);

  return { deal, loading, error };
}

export function useDealActivities(dealId: string) {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("deal_activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const activitiesWithUsers = data.map((activity) => ({
        ...activity,
        user: profileMap.get(activity.user_id),
      }));

      setActivities(activitiesWithUsers as DealActivity[]);
    } catch (err: any) {
      toast.error("Failed to fetch activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      fetchActivities();
    }
  }, [dealId]);

  const addActivity = async (
    activityType: string,
    description: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("deal_activities")
        .insert({
          deal_id: dealId,
          user_id: user.id,
          activity_type: activityType,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Activity added");
      await fetchActivities();
      return data;
    } catch (err: any) {
      toast.error("Failed to add activity: " + err.message);
      return null;
    }
  };

  return { activities, loading, addActivity, refetch: fetchActivities };
}

export function useDealStageHistory(dealId: string) {
  const [history, setHistory] = useState<DealStageHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("deal_stage_history")
          .select("*")
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch user profiles
        const userIds = [...new Set(data.map((h) => h.changed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const historyWithUsers = data.map((item) => ({
          ...item,
          changed_by_user: profileMap.get(item.changed_by),
        }));

        setHistory(historyWithUsers as DealStageHistory[]);
      } catch (err: any) {
        toast.error("Failed to fetch stage history");
      } finally {
        setLoading(false);
      }
    };

    if (dealId) {
      fetchHistory();
    }
  }, [dealId]);

  return { history, loading };
}
