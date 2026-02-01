import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AnalyticsData {
  totalLeads: number;
  totalContacts: number;
  totalDeals: number;
  totalTasks: number;
  leadsByStatus: { status: string; count: number }[];
  leadsBySource: { source: string; count: number }[];
  dealsByStage: { stage: string; count: number; value: number }[];
  conversionRate: number;
  totalDealValue: number;
  closedWonValue: number;
  overdueTasks: number;
  pendingTasks: number;
  recentActivities: { date: string; count: number }[];
}

export function useAnalytics(dateRange?: { start: string; end: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Helper to adjust end date to include the full day
        const getAdjustedEndDate = (dateStr: string) => {
          if (!dateStr) return dateStr;
          // If it's just a date string (YYYY-MM-DD), append time to cover the whole day
          if (dateStr.length === 10) return `${dateStr}T23:59:59.999Z`;
          return dateStr;
        };

        const adjustedEnd = dateRange?.end ? getAdjustedEndDate(dateRange.end) : undefined;

        // Fetch leads data
        let leadsQuery = supabase.from("leads").select("id, status, source, created_at");
        if (dateRange?.start) {
          leadsQuery = leadsQuery.gte("created_at", dateRange.start);
        }
        if (adjustedEnd) {
          leadsQuery = leadsQuery.lte("created_at", adjustedEnd);
        }
        const { data: leads, error: leadsError } = await leadsQuery;
        if (leadsError) console.error("Error fetching leads:", leadsError);

        // Fetch contacts count (HEAD only for performance)
        let contactsQuery = supabase.from("contacts").select("*", { count: "exact", head: true });
        if (dateRange?.start) {
          contactsQuery = contactsQuery.gte("created_at", dateRange.start);
        }
        if (adjustedEnd) {
          contactsQuery = contactsQuery.lte("created_at", adjustedEnd);
        }
        const { count: totalContacts, error: contactsError } = await contactsQuery;
        if (contactsError) console.error("Error fetching contacts:", contactsError);

        // Fetch deals
        let dealsQuery = supabase.from("deals").select("id, stage, estimated_value, confirmed_value, created_at");
        if (dateRange?.start) {
          dealsQuery = dealsQuery.gte("created_at", dateRange.start);
        }
        if (adjustedEnd) {
          dealsQuery = dealsQuery.lte("created_at", adjustedEnd);
        }
        const { data: deals, error: dealsError } = await dealsQuery;
        if (dealsError) console.error("Error fetching deals:", dealsError);

        // Fetch tasks
        let tasksQuery = supabase.from("tasks").select("id, status, due_date");
        const { data: tasks, error: tasksError } = await tasksQuery;
        if (tasksError) console.error("Error fetching tasks:", tasksError);

        const safeLeads = leads || [];
        const safeDeals = deals || [];
        const safeTasks = tasks || [];

        // Calculate leads by status
        const leadsByStatus = Object.entries(
          safeLeads.reduce((acc: Record<string, number>, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
          }, {})
        ).map(([status, count]) => ({ status, count }));

        // Calculate leads by source
        const leadsBySource = Object.entries(
          safeLeads.reduce((acc: Record<string, number>, lead) => {
            acc[lead.source] = (acc[lead.source] || 0) + 1;
            return acc;
          }, {})
        ).map(([source, count]) => ({ source, count }));

        // Calculate deals by stage
        const dealsByStage = Object.entries(
          safeDeals.reduce((acc: Record<string, { count: number; value: number }>, deal) => {
            if (!acc[deal.stage]) {
              acc[deal.stage] = { count: 0, value: 0 };
            }
            acc[deal.stage].count += 1;
            acc[deal.stage].value += deal.confirmed_value || deal.estimated_value || 0;
            return acc;
          }, {})
        ).map(([stage, data]) => ({ stage, ...data }));

        // Calculate totals
        const totalLeads = safeLeads.length;
        const convertedLeads = safeLeads.filter(l => l.status === "converted").length;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        const totalDealValue = safeDeals.reduce(
          (sum, deal) => sum + (deal.confirmed_value || deal.estimated_value || 0),
          0
        );

        const closedWonValue = safeDeals
          .filter(deal => deal.stage === "closed_won")
          .reduce((sum, deal) => sum + (deal.confirmed_value || deal.estimated_value || 0), 0);

        const now = new Date();
        const overdueTasks = safeTasks.filter(
          task => task.due_date && new Date(task.due_date) < now && 
            (task.status === "pending" || task.status === "in_progress")
        ).length;

        const pendingTasks = safeTasks.filter(
          task => task.status === "pending" || task.status === "in_progress"
        ).length;

        // Calculate recent activity (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split("T")[0];
        });

        const recentActivities = last7Days.map(date => {
          const count = safeLeads.filter(
            lead => lead.created_at.startsWith(date)
          ).length;
          return { date, count };
        });

        setData({
          totalLeads,
          totalContacts: totalContacts || 0,
          totalDeals: safeDeals.length,
          totalTasks: safeTasks.length,
          leadsByStatus,
          leadsBySource,
          dealsByStage,
          conversionRate,
          totalDealValue,
          closedWonValue,
          overdueTasks,
          pendingTasks,
          recentActivities,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, dateRange?.start, dateRange?.end]);

  return { data, loading };
}
